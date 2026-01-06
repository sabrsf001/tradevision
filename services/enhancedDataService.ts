/**
 * Enhanced Data Service - TradeVision
 * Multi-source data with fallbacks, IndexedDB caching, and health monitoring
 */

import type { CandleData } from '../types';

// ============================================
// Types
// ============================================

export interface DataSource {
  id: string;
  name: string;
  type: 'primary' | 'fallback';
  priority: number;
  baseUrl: string;
  wsUrl?: string;
  
  // Health
  isHealthy: boolean;
  lastCheck: number;
  latency: number;
  errorCount: number;
  successRate: number;
  
  // Rate limiting
  rateLimit: number;
  requestCount: number;
  lastReset: number;
}

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  expiry: number;
  source: string;
}

export interface DataRequest {
  symbol: string;
  interval: string;
  limit?: number;
  startTime?: number;
  endTime?: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap?: number;
  lastUpdate: number;
}

export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  sources: DataSource[];
  cacheStats: {
    totalEntries: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
  };
  lastChecked: number;
}

// ============================================
// Constants
// ============================================

const DB_NAME = 'tradevision_cache';
const DB_VERSION = 1;
const CACHE_STORE = 'cache';
const CANDLE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MARKET_CACHE_TTL = 30 * 1000; // 30 seconds
const HEALTH_CHECK_INTERVAL = 60 * 1000; // 1 minute

// ============================================
// Data Sources Configuration
// ============================================

const DATA_SOURCES: Omit<DataSource, 'isHealthy' | 'lastCheck' | 'latency' | 'errorCount' | 'successRate' | 'requestCount' | 'lastReset'>[] = [
  {
    id: 'binance',
    name: 'Binance',
    type: 'primary',
    priority: 1,
    baseUrl: 'https://api.binance.com/api/v3',
    wsUrl: 'wss://stream.binance.com:9443/ws',
    rateLimit: 1200,
  },
  {
    id: 'coingecko',
    name: 'CoinGecko',
    type: 'fallback',
    priority: 2,
    baseUrl: 'https://api.coingecko.com/api/v3',
    rateLimit: 50,
  },
  {
    id: 'cryptocompare',
    name: 'CryptoCompare',
    type: 'fallback',
    priority: 3,
    baseUrl: 'https://min-api.cryptocompare.com/data',
    rateLimit: 100,
  },
  {
    id: 'coinpaprika',
    name: 'CoinPaprika',
    type: 'fallback',
    priority: 4,
    baseUrl: 'https://api.coinpaprika.com/v1',
    rateLimit: 100,
  },
];

// ============================================
// IndexedDB Cache Manager
// ============================================

class IndexedDBCache {
  private db: IDBDatabase | null = null;
  private cacheHits = 0;
  private cacheMisses = 0;
  
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          const store = db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('expiry', 'expiry', { unique: false });
        }
      };
    });
  }
  
  async get<T>(key: string): Promise<T | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readonly');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined;
        
        if (!entry) {
          this.cacheMisses++;
          resolve(null);
          return;
        }
        
        // Check expiry
        if (Date.now() > entry.expiry) {
          this.delete(key);
          this.cacheMisses++;
          resolve(null);
          return;
        }
        
        this.cacheHits++;
        resolve(entry.data);
      };
      
      request.onerror = () => {
        this.cacheMisses++;
        resolve(null);
      };
    });
  }
  
  async set<T>(key: string, data: T, ttl: number, source: string): Promise<void> {
    if (!this.db) await this.init();
    
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl,
      source,
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.put(entry);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async delete(key: string): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      store.delete(key);
      resolve();
    });
  }
  
  async clear(): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      store.clear();
      resolve();
    });
  }
  
  async getEntryCount(): Promise<number> {
    if (!this.db) await this.init();
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readonly');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  }
  
  async cleanExpired(): Promise<number> {
    if (!this.db) await this.init();
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      const index = store.index('expiry');
      const range = IDBKeyRange.upperBound(Date.now());
      
      let deleted = 0;
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          deleted++;
          cursor.continue();
        } else {
          resolve(deleted);
        }
      };
      
      request.onerror = () => resolve(deleted);
    });
  }
  
  getStats() {
    const total = this.cacheHits + this.cacheMisses;
    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: total > 0 ? (this.cacheHits / total) * 100 : 0,
    };
  }
}

// ============================================
// Enhanced Data Service
// ============================================

export class EnhancedDataService {
  private sources: DataSource[] = [];
  private cache: IndexedDBCache;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  
  constructor() {
    this.sources = DATA_SOURCES.map(s => ({
      ...s,
      isHealthy: true,
      lastCheck: 0,
      latency: 0,
      errorCount: 0,
      successRate: 100,
      requestCount: 0,
      lastReset: Date.now(),
    }));
    
    this.cache = new IndexedDBCache();
    this.init();
  }
  
  private async init(): Promise<void> {
    try {
      await this.cache.init();
      this.startHealthChecks();
      
      // Clean expired cache entries periodically
      setInterval(() => this.cache.cleanExpired(), 5 * 60 * 1000);
    } catch (error) {
      console.error('Failed to initialize enhanced data service:', error);
    }
  }
  
  // ============================================
  // Health Monitoring
  // ============================================
  
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      this.checkAllSourcesHealth();
    }, HEALTH_CHECK_INTERVAL);
    
    // Initial check
    this.checkAllSourcesHealth();
  }
  
  private async checkAllSourcesHealth(): Promise<void> {
    await Promise.all(this.sources.map(source => this.checkSourceHealth(source)));
  }
  
  private async checkSourceHealth(source: DataSource): Promise<void> {
    const startTime = Date.now();
    
    try {
      let testUrl: string;
      
      switch (source.id) {
        case 'binance':
          testUrl = `${source.baseUrl}/ping`;
          break;
        case 'coingecko':
          testUrl = `${source.baseUrl}/ping`;
          break;
        case 'cryptocompare':
          testUrl = `${source.baseUrl}/price?fsym=BTC&tsyms=USD`;
          break;
        case 'coinpaprika':
          testUrl = `${source.baseUrl}/global`;
          break;
        default:
          return;
      }
      
      const response = await fetch(testUrl, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      
      const latency = Date.now() - startTime;
      
      source.latency = latency;
      source.lastCheck = Date.now();
      source.isHealthy = response.ok;
      
      if (response.ok) {
        source.errorCount = Math.max(0, source.errorCount - 1);
      }
      
      this.updateSuccessRate(source, response.ok);
    } catch (error) {
      source.latency = Date.now() - startTime;
      source.lastCheck = Date.now();
      source.isHealthy = false;
      source.errorCount++;
      this.updateSuccessRate(source, false);
    }
  }
  
  private updateSuccessRate(source: DataSource, success: boolean): void {
    // Exponential moving average of success rate
    const alpha = 0.2;
    const current = success ? 100 : 0;
    source.successRate = alpha * current + (1 - alpha) * source.successRate;
  }
  
  /**
   * Get overall health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const totalEntries = await this.cache.getEntryCount();
    const cacheStats = this.cache.getStats();
    
    const healthySources = this.sources.filter(s => s.isHealthy).length;
    let overall: HealthStatus['overall'] = 'healthy';
    
    if (healthySources === 0) {
      overall = 'unhealthy';
    } else if (healthySources < this.sources.length / 2) {
      overall = 'degraded';
    }
    
    return {
      overall,
      sources: [...this.sources],
      cacheStats: {
        totalEntries,
        ...cacheStats,
      },
      lastChecked: Date.now(),
    };
  }
  
  // ============================================
  // Source Selection
  // ============================================
  
  private getAvailableSources(): DataSource[] {
    const now = Date.now();
    
    return this.sources
      .filter(source => {
        // Check if healthy
        if (!source.isHealthy) return false;
        
        // Check rate limits
        if (now - source.lastReset > 60000) {
          source.requestCount = 0;
          source.lastReset = now;
        }
        
        if (source.requestCount >= source.rateLimit) return false;
        
        return true;
      })
      .sort((a, b) => a.priority - b.priority);
  }
  
  private recordRequest(sourceId: string, success: boolean): void {
    const source = this.sources.find(s => s.id === sourceId);
    if (source) {
      source.requestCount++;
      this.updateSuccessRate(source, success);
      if (!success) source.errorCount++;
    }
  }
  
  // ============================================
  // Data Fetching with Fallbacks
  // ============================================
  
  /**
   * Get candle data with automatic fallbacks
   */
  async getCandleData(request: DataRequest): Promise<CandleData[]> {
    const cacheKey = `candles:${request.symbol}:${request.interval}:${request.limit || 500}`;
    
    // Try cache first
    const cached = await this.cache.get<CandleData[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const sources = this.getAvailableSources();
    
    for (const source of sources) {
      try {
        const data = await this.fetchCandlesFromSource(source, request);
        
        if (data && data.length > 0) {
          // Cache the result
          await this.cache.set(cacheKey, data, CANDLE_CACHE_TTL, source.id);
          this.recordRequest(source.id, true);
          return data;
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${source.name}:`, error);
        this.recordRequest(source.id, false);
        continue;
      }
    }
    
    throw new Error('All data sources failed');
  }
  
  private async fetchCandlesFromSource(source: DataSource, request: DataRequest): Promise<CandleData[]> {
    switch (source.id) {
      case 'binance':
        return this.fetchBinanceCandles(source, request);
      case 'cryptocompare':
        return this.fetchCryptoCompareCandles(source, request);
      default:
        throw new Error(`Candle data not supported for ${source.name}`);
    }
  }
  
  private async fetchBinanceCandles(source: DataSource, request: DataRequest): Promise<CandleData[]> {
    const params = new URLSearchParams({
      symbol: request.symbol.toUpperCase(),
      interval: request.interval,
      limit: String(request.limit || 500),
    });
    
    if (request.startTime) params.set('startTime', String(request.startTime));
    if (request.endTime) params.set('endTime', String(request.endTime));
    
    const response = await fetch(`${source.baseUrl}/klines?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) throw new Error(`Binance API error: ${response.status}`);
    
    const data = await response.json();
    
    return data.map((item: any[]) => ({
      time: Math.floor(item[0] / 1000),
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
    }));
  }
  
  private async fetchCryptoCompareCandles(source: DataSource, request: DataRequest): Promise<CandleData[]> {
    // Parse symbol (e.g., BTCUSDT -> BTC, USD)
    const symbol = request.symbol.toUpperCase();
    const fsym = symbol.replace(/USDT?$/, '');
    const tsym = symbol.includes('USDT') ? 'USDT' : 'USD';
    
    // Map interval
    const intervalMap: Record<string, { endpoint: string; aggregate: number }> = {
      '1m': { endpoint: 'histominute', aggregate: 1 },
      '5m': { endpoint: 'histominute', aggregate: 5 },
      '15m': { endpoint: 'histominute', aggregate: 15 },
      '1h': { endpoint: 'histohour', aggregate: 1 },
      '4h': { endpoint: 'histohour', aggregate: 4 },
      '1d': { endpoint: 'histoday', aggregate: 1 },
    };
    
    const mapping = intervalMap[request.interval] || intervalMap['1h'];
    
    const params = new URLSearchParams({
      fsym,
      tsym,
      limit: String(request.limit || 500),
      aggregate: String(mapping.aggregate),
    });
    
    const response = await fetch(`${source.baseUrl}/${mapping.endpoint}?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) throw new Error(`CryptoCompare API error: ${response.status}`);
    
    const { Data } = await response.json();
    
    return Data.Data.map((item: any) => ({
      time: item.time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volumefrom,
    }));
  }
  
  /**
   * Get market data (price, 24h change, etc.)
   */
  async getMarketData(symbol: string): Promise<MarketData> {
    const cacheKey = `market:${symbol}`;
    
    // Try cache first
    const cached = await this.cache.get<MarketData>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const sources = this.getAvailableSources();
    
    for (const source of sources) {
      try {
        const data = await this.fetchMarketFromSource(source, symbol);
        
        if (data) {
          await this.cache.set(cacheKey, data, MARKET_CACHE_TTL, source.id);
          this.recordRequest(source.id, true);
          return data;
        }
      } catch (error) {
        console.warn(`Failed to fetch market from ${source.name}:`, error);
        this.recordRequest(source.id, false);
        continue;
      }
    }
    
    throw new Error('All data sources failed');
  }
  
  private async fetchMarketFromSource(source: DataSource, symbol: string): Promise<MarketData> {
    switch (source.id) {
      case 'binance':
        return this.fetchBinanceMarket(source, symbol);
      case 'coingecko':
        return this.fetchCoinGeckoMarket(source, symbol);
      default:
        throw new Error(`Market data not supported for ${source.name}`);
    }
  }
  
  private async fetchBinanceMarket(source: DataSource, symbol: string): Promise<MarketData> {
    const response = await fetch(
      `${source.baseUrl}/ticker/24hr?symbol=${symbol.toUpperCase()}`,
      { signal: AbortSignal.timeout(5000) }
    );
    
    if (!response.ok) throw new Error(`Binance API error: ${response.status}`);
    
    const data = await response.json();
    
    return {
      symbol,
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChange),
      changePercent24h: parseFloat(data.priceChangePercent),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      volume24h: parseFloat(data.volume),
      lastUpdate: Date.now(),
    };
  }
  
  private async fetchCoinGeckoMarket(source: DataSource, symbol: string): Promise<MarketData> {
    // Map common symbols to CoinGecko IDs
    const symbolMap: Record<string, string> = {
      'BTCUSDT': 'bitcoin',
      'ETHUSDT': 'ethereum',
      'BNBUSDT': 'binancecoin',
      'SOLUSDT': 'solana',
      'XRPUSDT': 'ripple',
      'ADAUSDT': 'cardano',
      'DOGEUSDT': 'dogecoin',
    };
    
    const coinId = symbolMap[symbol.toUpperCase()] || symbol.toLowerCase().replace(/usdt?$/i, '');
    
    const response = await fetch(
      `${source.baseUrl}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`,
      { signal: AbortSignal.timeout(5000) }
    );
    
    if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);
    
    const data = await response.json();
    const coin = data[coinId];
    
    if (!coin) throw new Error('Coin not found on CoinGecko');
    
    return {
      symbol,
      price: coin.usd,
      change24h: 0, // Not directly available
      changePercent24h: coin.usd_24h_change || 0,
      high24h: 0, // Not available from this endpoint
      low24h: 0,
      volume24h: coin.usd_24h_vol || 0,
      marketCap: coin.usd_market_cap,
      lastUpdate: Date.now(),
    };
  }
  
  /**
   * Get multiple symbols' market data
   */
  async getMultipleMarkets(symbols: string[]): Promise<Map<string, MarketData>> {
    const results = new Map<string, MarketData>();
    
    // Batch fetch where possible
    await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const data = await this.getMarketData(symbol);
          results.set(symbol, data);
        } catch (error) {
          console.warn(`Failed to get market data for ${symbol}:`, error);
        }
      })
    );
    
    return results;
  }
  
  // ============================================
  // Symbol Search
  // ============================================
  
  async searchSymbols(query: string): Promise<{ symbol: string; name: string; type: string }[]> {
    const cacheKey = `search:${query.toLowerCase()}`;
    
    const cached = await this.cache.get<{ symbol: string; name: string; type: string }[]>(cacheKey);
    if (cached) return cached;
    
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/exchangeInfo`,
        { signal: AbortSignal.timeout(10000) }
      );
      
      if (!response.ok) throw new Error('Exchange info fetch failed');
      
      const { symbols } = await response.json();
      
      const results = symbols
        .filter((s: any) => 
          s.symbol.toLowerCase().includes(query.toLowerCase()) &&
          s.status === 'TRADING' &&
          (s.quoteAsset === 'USDT' || s.quoteAsset === 'BUSD' || s.quoteAsset === 'BTC')
        )
        .slice(0, 20)
        .map((s: any) => ({
          symbol: s.symbol,
          name: `${s.baseAsset}/${s.quoteAsset}`,
          type: 'crypto',
        }));
      
      await this.cache.set(cacheKey, results, 30 * 60 * 1000, 'binance'); // 30 min cache
      
      return results;
    } catch (error) {
      console.error('Symbol search failed:', error);
      return [];
    }
  }
  
  // ============================================
  // Cache Management
  // ============================================
  
  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }
  
  /**
   * Preload data for watchlist
   */
  async preloadWatchlist(symbols: string[], interval: string = '1h'): Promise<void> {
    await Promise.all(
      symbols.map(symbol => 
        this.getCandleData({ symbol, interval, limit: 100 }).catch(() => null)
      )
    );
  }
  
  // ============================================
  // Cleanup
  // ============================================
  
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

export const enhancedDataService = new EnhancedDataService();

export default enhancedDataService;
