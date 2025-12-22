
import { CandleData, Timeframe, WatchlistItem } from '../types';

// Data source tracking
export type DataSource = 'live' | 'mock';
export interface FetchResult {
    data: CandleData[];
    source: DataSource;
    error?: string;
}

// Helper to get seconds per timeframe
export const getSecondsInTimeframe = (tf: Timeframe): number => {
    const map: Record<Timeframe, number> = {
        '1m': 60,
        '5m': 300,
        '15m': 900,
        '1H': 3600,
        '4H': 14400,
        '1D': 86400
    };
    return map[tf];
};

// Map App Timeframe to Binance API Interval
const binanceTimeframeMap: Record<Timeframe, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '1H': '1h',
    '4H': '4h',
    '1D': '1d'
};

const getBinanceSymbol = (symbol: string): string => {
    // Handle various symbol formats
    const upperSymbol = symbol.toUpperCase();
    
    // If already has USDT, return as is
    if (upperSymbol.endsWith('USDT')) {
        return upperSymbol;
    }
    
    // If ends with USD, replace with USDT
    if (upperSymbol.endsWith('USD')) {
        return upperSymbol.replace('USD', 'USDT');
    }
    
    // Otherwise append USDT
    return upperSymbol + 'USDT';
};

export const generateInitialData = (symbol: string, timeframe: Timeframe, count = 1000): CandleData[] => {
    // Base prices for different assets
    const basePrices: Record<string, number> = {
        'BTCUSD': 95000,
        'ETHUSD': 3500,
        'SOLUSD': 220,
        'XRPUSD': 2.3,
        'BNBUSD': 700,
        'ADAUSD': 1.1,
        'DOGEUSD': 0.42,
        'DOTUSD': 9,
        'MATICUSD': 0.5,
        'AVAXUSD': 50,
        'LINKUSD': 25,
        'LTCUSD': 120,
        'UNIUSD': 15,
        'ATOMUSD': 12,
        'NEARUSD': 7,
    };
    
    // Get base price or generate random one for unknown symbols
    let basePrice = basePrices[symbol.toUpperCase()] || (Math.random() * 100 + 10);
    const data: CandleData[] = [];
    
    // End time is "now", adjusted to the nearest timeframe interval
    const interval = getSecondsInTimeframe(timeframe);
    const now = Math.floor(Date.now() / 1000);
    // Align time to grid
    let time = now - (now % interval) - (count * interval);
    
    for (let i = 0; i < count; i++) {
        const volatility = symbol === 'BTCUSD' ? 0.005 : 0.01; // 0.5% to 1% variance per candle
        const change = (Math.random() - 0.5) * volatility;
        
        const open = basePrice;
        const close = basePrice * (1 + change);
        
        // Ensure High/Low encapsulate Open/Close
        const bodyHigh = Math.max(open, close);
        const bodyLow = Math.min(open, close);
        
        const high = bodyHigh * (1 + Math.random() * volatility * 0.5);
        const low = bodyLow * (1 - Math.random() * volatility * 0.5);

        data.push({ time, open, high, low, close });
        
        // Set next open to current close
        basePrice = close;
        time += interval;
    }
    
    return data;
};

// --- Real-time API Integration ---

export const fetchHistoricalData = async (symbol: string, timeframe: Timeframe): Promise<FetchResult> => {
    const binanceSymbol = getBinanceSymbol(symbol);
    const interval = binanceTimeframeMap[timeframe];
    
    console.log(`Fetching data for ${symbol} -> ${binanceSymbol}`);
    
    // Create abort controller for timeout - increased to 10 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // Retry logic
    const maxRetries = 3;
    let lastError: string = '';
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(
                `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=500`,
                { signal: controller.signal }
            );
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Binance API Error: ${response.status} ${response.statusText}`);
            }

            const rawData = await response.json();
            
            if (!rawData || rawData.length === 0) {
                console.warn(`No data returned for ${binanceSymbol}, using mock data`);
                return {
                    data: generateInitialData(symbol, timeframe),
                    source: 'mock',
                    error: 'No data available from exchange'
                };
            }
            
            // Binance Format: [Open Time, Open, High, Low, Close, Volume, Close Time, ...]
            const data = rawData.map((d: any) => ({
                time: d[0] / 1000, // Convert ms to seconds
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4]),
                volume: parseFloat(d[5])
            }));
            
            console.log(`✓ Fetched ${data.length} candles for ${symbol} (attempt ${attempt})`);
            return { data, source: 'live' };
            
        } catch (error: any) {
            lastError = error.message || 'Unknown error';
            
            if (error.name === 'AbortError') {
                lastError = 'Request timed out';
                console.warn(`Attempt ${attempt}/${maxRetries}: Request timed out`);
            } else {
                console.warn(`Attempt ${attempt}/${maxRetries}: ${lastError}`);
            }
            
            // Wait before retry (exponential backoff)
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
    
    clearTimeout(timeoutId);
    console.warn(`All ${maxRetries} attempts failed, using mock data. Last error: ${lastError}`);
    
    return {
        data: generateInitialData(symbol, timeframe),
        source: 'mock',
        error: lastError
    };
};

export const subscribeToLiveTicker = (
    symbol: string, 
    timeframe: Timeframe, 
    onUpdate: (candle: CandleData) => void
): (() => void) => {
    const binanceSymbol = getBinanceSymbol(symbol).toLowerCase();
    const interval = binanceTimeframeMap[timeframe];
    const wsUrl = `wss://stream.binance.com:9443/ws/${binanceSymbol}@kline_${interval}`;
    
    let ws: WebSocket | null = null;
    let isCleanedUp = false;
    
    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            if (!isCleanedUp) {
                console.log(`Connected to Binance WS for ${symbol}`);
            }
        };

        ws.onmessage = (event) => {
            // Don't process if already cleaned up
            if (isCleanedUp) return;
            
            const message = JSON.parse(event.data);
            if (message.e === 'kline') {
                const k = message.k;
                const candle: CandleData = {
                    time: k.t / 1000,
                    open: parseFloat(k.o),
                    high: parseFloat(k.h),
                    low: parseFloat(k.l),
                    close: parseFloat(k.c),
                    volume: parseFloat(k.v)
                };
                onUpdate(candle);
            }
        };

        ws.onerror = () => {
             // Silently handle error
        };

    } catch (e) {
        console.error("WebSocket setup failed:", e);
    }

    // Return cleanup function
    return () => {
        isCleanedUp = true;
        if (ws) {
            ws.close();
            ws = null;
        }
    };
};

export const subscribeToMultiTicker = (
    symbols: string[],
    onUpdate: (data: Record<string, { price: number, change: number }>) => void
): (() => void) => {
    // !miniTicker@arr gives us 24h ticker data for all symbols
    const wsUrl = 'wss://stream.binance.com:9443/ws/!miniTicker@arr';
    let ws: WebSocket | null = null;
    let fallbackInterval: any = null;
    
    const relevantSymbols = new Set(symbols.map(s => getBinanceSymbol(s)));

    try {
        ws = new WebSocket(wsUrl);
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (Array.isArray(data)) {
                const updates: Record<string, { price: number, change: number }> = {};
                
                data.forEach((ticker: any) => {
                    if (relevantSymbols.has(ticker.s)) {
                        // Map back to our symbol format (BTCUSDT -> BTCUSD)
                        const ourSymbol = ticker.s.replace('USDT', 'USD');
                        
                        const currentPrice = parseFloat(ticker.c);
                        const openPrice = parseFloat(ticker.o);
                        
                        // Calculate 24h Change Percentage: (Close - Open) / Open * 100
                        let changePercent = 0;
                        if (openPrice !== 0) {
                            changePercent = ((currentPrice - openPrice) / openPrice) * 100;
                        }

                        updates[ourSymbol] = {
                            price: currentPrice,
                            change: changePercent
                        };
                    }
                });
                onUpdate(updates);
            }
        };

        ws.onerror = () => {
             // Silently switch to fallback - WebSocket errors are common in some networks
             if (!fallbackInterval) {
                 fallbackInterval = setInterval(() => {
                    const mockUpdates: Record<string, { price: number, change: number }> = {};
                    symbols.forEach(sym => {
                         // Simple random walk for fallback
                         const change = (Math.random() - 0.5) * 0.5;
                         mockUpdates[sym] = { price: 0, change: change }; 
                         // Note: Price 0 indicates to UI "keep previous", change is just simulated
                    });
                    // In a real fallback we'd need state to increment price, 
                    // but for now we just keep the socket alive logic or let it fail gracefully.
                 }, 2000);
             }
        };

    } catch (e) {
        console.error("MultiTicker WS failed", e);
    }

    return () => {
        if (ws) ws.close();
        if (fallbackInterval) clearInterval(fallbackInterval);
    };
};
