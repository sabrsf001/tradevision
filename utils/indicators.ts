
import { CandleData } from '../types';

// ============================================
// Memoization Cache for Expensive Calculations
// ============================================

interface CacheEntry<T> {
    data: T;
    dataHash: string;
    period: number;
}

const smaCache = new Map<string, CacheEntry<{ time: number; value: number }[]>>();
const emaCache = new Map<string, CacheEntry<{ time: number; value: number }[]>>();
const rsiCache = new Map<string, CacheEntry<{ time: number; value: number }[]>>();
const bollingerCache = new Map<string, CacheEntry<BollingerBands>>();
const vwapCache = new Map<string, CacheEntry<{ time: number; value: number }[]>>();

// Maximum cache size to prevent memory leaks
const MAX_CACHE_SIZE = 50;

/**
 * Generate a simple hash for cache key based on data length and last few candles
 */
const generateDataHash = (data: CandleData[]): string => {
    if (data.length === 0) return 'empty';
    const last = data[data.length - 1];
    const first = data[0];
    return `${data.length}-${first.time}-${last.time}-${last.close.toFixed(2)}`;
};

/**
 * Clean up cache if it exceeds max size
 */
const cleanupCache = <T>(cache: Map<string, CacheEntry<T>>): void => {
    if (cache.size > MAX_CACHE_SIZE) {
        const keysToDelete = Array.from(cache.keys()).slice(0, cache.size - MAX_CACHE_SIZE);
        keysToDelete.forEach(key => cache.delete(key));
    }
};

/**
 * Get cached result or compute and cache
 */
const getCachedOrCompute = <T>(
    cache: Map<string, CacheEntry<T>>,
    cacheKey: string,
    data: CandleData[],
    period: number,
    computeFn: () => T
): T => {
    const dataHash = generateDataHash(data);
    const cached = cache.get(cacheKey);
    
    if (cached && cached.dataHash === dataHash && cached.period === period) {
        return cached.data;
    }
    
    const result = computeFn();
    cache.set(cacheKey, { data: result, dataHash, period });
    cleanupCache(cache);
    
    return result;
};

// ============================================
// Technical Indicators
// ============================================

export const calculateSMA = (data: CandleData[], period: number): { time: number; value: number }[] => {
    if (data.length < period) return [];
    
    const cacheKey = `sma-${period}`;
    
    return getCachedOrCompute(smaCache, cacheKey, data, period, () => {
        const smaData: { time: number; value: number }[] = [];
        
        // Use sliding window for O(n) instead of O(n*period)
        let sum = 0;
        
        // Calculate initial sum
        for (let i = 0; i < period; i++) {
            sum += data[i].close;
        }
        
        smaData.push({
            time: data[period - 1].time,
            value: sum / period
        });
        
        // Slide the window
        for (let i = period; i < data.length; i++) {
            sum = sum - data[i - period].close + data[i].close;
            smaData.push({
                time: data[i].time,
                value: sum / period
            });
        }
        
        return smaData;
    });
};

export const calculateEMA = (data: CandleData[], period: number): { time: number; value: number }[] => {
    if (data.length === 0) return [];
    
    const cacheKey = `ema-${period}`;
    
    return getCachedOrCompute(emaCache, cacheKey, data, period, () => {
        const k = 2 / (period + 1);
        const emaData: { time: number; value: number }[] = [];
        let ema = data[0].close;

        for (let i = 0; i < data.length; i++) {
            const price = data[i].close;
            if (i === 0) {
                ema = price;
            } else {
                ema = price * k + ema * (1 - k);
            }
            
            if (i >= period - 1) {
                emaData.push({
                    time: data[i].time,
                    value: ema
                });
            }
        }
        return emaData;
    });
};

export const calculateRSI = (data: CandleData[], period: number = 14): { time: number; value: number }[] => {
    if (data.length < period + 1) return [];

    const cacheKey = `rsi-${period}`;
    
    return getCachedOrCompute(rsiCache, cacheKey, data, period, () => {
        const rsiData: { time: number; value: number }[] = [];
        let gains = 0;
        let losses = 0;

        // Initial calculation
        for (let i = 1; i <= period; i++) {
            const change = data[i].close - data[i - 1].close;
            if (change >= 0) gains += change;
            else losses += Math.abs(change);
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        for (let i = period + 1; i < data.length; i++) {
            const change = data[i].close - data[i - 1].close;
            const gain = change > 0 ? change : 0;
            const loss = change < 0 ? Math.abs(change) : 0;

            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;

            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            const rsi = 100 - (100 / (1 + rs));

            rsiData.push({
                time: data[i].time,
                value: rsi
            });
        }
        
        return rsiData;
    });
};

// ============================================
// Additional Indicators (Optimized)
// ============================================

export interface BollingerBands {
    upper: { time: number; value: number }[];
    middle: { time: number; value: number }[];
    lower: { time: number; value: number }[];
}

export const calculateBollingerBands = (
    data: CandleData[], 
    period: number = 20, 
    stdDevMultiplier: number = 2
): BollingerBands => {
    if (data.length < period) {
        return { upper: [], middle: [], lower: [] };
    }
    
    const cacheKey = `bb-${period}-${stdDevMultiplier}`;
    
    return getCachedOrCompute(bollingerCache, cacheKey, data, period, () => {
        const upper: { time: number; value: number }[] = [];
        const middle: { time: number; value: number }[] = [];
        const lower: { time: number; value: number }[] = [];
        
        for (let i = period - 1; i < data.length; i++) {
            // Calculate SMA
            let sum = 0;
            for (let j = i - period + 1; j <= i; j++) {
                sum += data[j].close;
            }
            const sma = sum / period;
            
            // Calculate standard deviation
            let sqSum = 0;
            for (let j = i - period + 1; j <= i; j++) {
                sqSum += Math.pow(data[j].close - sma, 2);
            }
            const stdDev = Math.sqrt(sqSum / period);
            
            const time = data[i].time;
            upper.push({ time, value: sma + stdDev * stdDevMultiplier });
            middle.push({ time, value: sma });
            lower.push({ time, value: sma - stdDev * stdDevMultiplier });
        }
        
        return { upper, middle, lower };
    });
};

export const calculateVWAP = (data: CandleData[]): { time: number; value: number }[] => {
    if (data.length === 0) return [];
    
    const cacheKey = 'vwap';
    
    return getCachedOrCompute(vwapCache, cacheKey, data, 0, () => {
        const vwapData: { time: number; value: number }[] = [];
        let cumulativeTPV = 0; // Typical Price * Volume
        let cumulativeVolume = 0;
        
        for (let i = 0; i < data.length; i++) {
            const candle = data[i];
            const typicalPrice = (candle.high + candle.low + candle.close) / 3;
            const volume = candle.volume || 1; // Default to 1 if no volume
            
            cumulativeTPV += typicalPrice * volume;
            cumulativeVolume += volume;
            
            vwapData.push({
                time: candle.time,
                value: cumulativeTPV / cumulativeVolume
            });
        }
        
        return vwapData;
    });
};

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export interface MACDResult {
    macd: { time: number; value: number }[];
    signal: { time: number; value: number }[];
    histogram: { time: number; value: number }[];
}

export const calculateMACD = (
    data: CandleData[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
): MACDResult => {
    if (data.length < slowPeriod) {
        return { macd: [], signal: [], histogram: [] };
    }
    
    const fastEMA = calculateEMA(data, fastPeriod);
    const slowEMA = calculateEMA(data, slowPeriod);
    
    // Calculate MACD line
    const macdLine: { time: number; value: number }[] = [];
    const slowStart = slowPeriod - fastPeriod;
    
    for (let i = 0; i < slowEMA.length; i++) {
        const fastValue = fastEMA[i + slowStart]?.value;
        const slowValue = slowEMA[i]?.value;
        
        if (fastValue !== undefined && slowValue !== undefined) {
            macdLine.push({
                time: slowEMA[i].time,
                value: fastValue - slowValue
            });
        }
    }
    
    // Calculate signal line (EMA of MACD)
    if (macdLine.length < signalPeriod) {
        return { macd: macdLine, signal: [], histogram: [] };
    }
    
    const k = 2 / (signalPeriod + 1);
    const signalLine: { time: number; value: number }[] = [];
    const histogram: { time: number; value: number }[] = [];
    let signal = macdLine[0].value;
    
    for (let i = 0; i < macdLine.length; i++) {
        if (i === 0) {
            signal = macdLine[i].value;
        } else {
            signal = macdLine[i].value * k + signal * (1 - k);
        }
        
        if (i >= signalPeriod - 1) {
            signalLine.push({
                time: macdLine[i].time,
                value: signal
            });
            histogram.push({
                time: macdLine[i].time,
                value: macdLine[i].value - signal
            });
        }
    }
    
    return { macd: macdLine, signal: signalLine, histogram };
};

/**
 * Clear all indicator caches (useful when switching symbols)
 */
export const clearIndicatorCaches = (): void => {
    smaCache.clear();
    emaCache.clear();
    rsiCache.clear();
    bollingerCache.clear();
    vwapCache.clear();
};
