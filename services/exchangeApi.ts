/**
 * Exchange API Abstraction Layer
 * Unified interface for multiple cryptocurrency exchanges
 */

import type { CandleData } from '../types';

// ============================================
// Types
// ============================================
export interface ExchangeConfig {
  apiKey?: string;
  apiSecret?: string;
  testnet?: boolean;
}

export interface Ticker {
  symbol: string;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  volume24h: number;
  change24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

export interface OrderBook {
  bids: [number, number][]; // [price, quantity][]
  asks: [number, number][];
  timestamp: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop-limit';
  price?: number;
  stopPrice?: number;
  quantity: number;
  filled: number;
  status: 'new' | 'partial' | 'filled' | 'cancelled' | 'rejected';
  timestamp: number;
}

export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

export interface Trade {
  id: string;
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  fee: number;
  feeAsset: string;
  timestamp: number;
}

// ============================================
// Exchange Interface
// ============================================
export interface Exchange {
  name: string;
  id: string;
  
  // Connection
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  
  // Market Data
  getTicker(symbol: string): Promise<Ticker>;
  getOrderBook(symbol: string, limit?: number): Promise<OrderBook>;
  getCandles(symbol: string, timeframe: string, limit?: number): Promise<CandleData[]>;
  subscribeToTicker(symbol: string, callback: (ticker: Ticker) => void): () => void;
  
  // Account (requires auth)
  getBalances(): Promise<Balance[]>;
  getOpenOrders(symbol?: string): Promise<Order[]>;
  getOrderHistory(symbol?: string, limit?: number): Promise<Order[]>;
  getTradeHistory(symbol?: string, limit?: number): Promise<Trade[]>;
  
  // Trading (requires auth)
  placeOrder(order: Omit<Order, 'id' | 'filled' | 'status' | 'timestamp'>): Promise<Order>;
  cancelOrder(orderId: string, symbol: string): Promise<void>;
  cancelAllOrders(symbol?: string): Promise<void>;
}

// ============================================
// Binance Exchange Implementation
// ============================================
export class BinanceExchange implements Exchange {
  name = 'Binance';
  id = 'binance';
  
  private config: ExchangeConfig;
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, Set<(ticker: Ticker) => void>>();
  
  private get baseUrl(): string {
    return this.config.testnet 
      ? 'https://testnet.binance.vision/api/v3'
      : 'https://api.binance.com/api/v3';
  }
  
  private get wsUrl(): string {
    return this.config.testnet
      ? 'wss://testnet.binance.vision/ws'
      : 'wss://stream.binance.com:9443/ws';
  }
  
  constructor(config: ExchangeConfig = {}) {
    this.config = config;
  }
  
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error('Failed to parse Binance message:', e);
        }
      };
    });
  }
  
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
  }
  
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
  
  private handleMessage(data: { e?: string; s?: string; c?: string; b?: string; a?: string; v?: string; P?: string; h?: string; l?: string; E?: number }): void {
    if (data.e === '24hrTicker') {
      const symbol = data.s || '';
      const callbacks = this.subscriptions.get(symbol.toLowerCase());
      if (callbacks) {
        const ticker: Ticker = {
          symbol,
          lastPrice: parseFloat(data.c || '0'),
          bidPrice: parseFloat(data.b || '0'),
          askPrice: parseFloat(data.a || '0'),
          volume24h: parseFloat(data.v || '0'),
          change24h: parseFloat(data.P || '0'),
          high24h: parseFloat(data.h || '0'),
          low24h: parseFloat(data.l || '0'),
          timestamp: data.E || Date.now(),
        };
        callbacks.forEach((cb) => cb(ticker));
      }
    }
  }
  
  async getTicker(symbol: string): Promise<Ticker> {
    const response = await fetch(`${this.baseUrl}/ticker/24hr?symbol=${symbol.toUpperCase()}`);
    const data = await response.json();
    
    return {
      symbol: data.symbol,
      lastPrice: parseFloat(data.lastPrice),
      bidPrice: parseFloat(data.bidPrice),
      askPrice: parseFloat(data.askPrice),
      volume24h: parseFloat(data.volume),
      change24h: parseFloat(data.priceChangePercent),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      timestamp: data.closeTime,
    };
  }
  
  async getOrderBook(symbol: string, limit = 20): Promise<OrderBook> {
    const response = await fetch(`${this.baseUrl}/depth?symbol=${symbol.toUpperCase()}&limit=${limit}`);
    const data = await response.json();
    
    return {
      bids: data.bids.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]),
      asks: data.asks.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]),
      timestamp: Date.now(),
    };
  }
  
  async getCandles(symbol: string, timeframe: string, limit = 500): Promise<CandleData[]> {
    const interval = this.mapTimeframe(timeframe);
    const response = await fetch(
      `${this.baseUrl}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`
    );
    const data = await response.json();
    
    return data.map((k: (string | number)[]) => ({
      time: Math.floor((k[0] as number) / 1000),
      open: parseFloat(k[1] as string),
      high: parseFloat(k[2] as string),
      low: parseFloat(k[3] as string),
      close: parseFloat(k[4] as string),
      volume: parseFloat(k[5] as string),
    }));
  }
  
  private mapTimeframe(tf: string): string {
    const map: Record<string, string> = {
      '1m': '1m', '5m': '5m', '15m': '15m', '1H': '1h', '4H': '4h', '1D': '1d',
    };
    return map[tf] || '1d';
  }
  
  subscribeToTicker(symbol: string, callback: (ticker: Ticker) => void): () => void {
    const key = symbol.toLowerCase();
    
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
      // Subscribe via WebSocket
      if (this.ws && this.isConnected()) {
        this.ws.send(JSON.stringify({
          method: 'SUBSCRIBE',
          params: [`${key}@ticker`],
          id: Date.now(),
        }));
      }
    }
    
    this.subscriptions.get(key)!.add(callback);
    
    return () => {
      const callbacks = this.subscriptions.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(key);
          if (this.ws && this.isConnected()) {
            this.ws.send(JSON.stringify({
              method: 'UNSUBSCRIBE',
              params: [`${key}@ticker`],
              id: Date.now(),
            }));
          }
        }
      }
    };
  }
  
  // Account methods (require API keys)
  async getBalances(): Promise<Balance[]> {
    throw new Error('API keys required for account operations');
  }
  
  async getOpenOrders(): Promise<Order[]> {
    throw new Error('API keys required for account operations');
  }
  
  async getOrderHistory(): Promise<Order[]> {
    throw new Error('API keys required for account operations');
  }
  
  async getTradeHistory(): Promise<Trade[]> {
    throw new Error('API keys required for account operations');
  }
  
  async placeOrder(): Promise<Order> {
    throw new Error('API keys required for trading operations');
  }
  
  async cancelOrder(): Promise<void> {
    throw new Error('API keys required for trading operations');
  }
  
  async cancelAllOrders(): Promise<void> {
    throw new Error('API keys required for trading operations');
  }
}

// ============================================
// Exchange Factory
// ============================================
export type ExchangeId = 'binance' | 'coinbase' | 'kraken' | 'ftx';

export function createExchange(id: ExchangeId, config: ExchangeConfig = {}): Exchange {
  switch (id) {
    case 'binance':
      return new BinanceExchange(config);
    default:
      throw new Error(`Exchange "${id}" is not yet supported`);
  }
}

// ============================================
// Multi-Exchange Manager
// ============================================
export class ExchangeManager {
  private exchanges = new Map<string, Exchange>();
  
  addExchange(id: ExchangeId, config: ExchangeConfig = {}): Exchange {
    const exchange = createExchange(id, config);
    this.exchanges.set(id, exchange);
    return exchange;
  }
  
  getExchange(id: string): Exchange | undefined {
    return this.exchanges.get(id);
  }
  
  async connectAll(): Promise<void> {
    await Promise.all(
      Array.from(this.exchanges.values()).map((ex) => ex.connect())
    );
  }
  
  disconnectAll(): void {
    this.exchanges.forEach((ex) => ex.disconnect());
  }
  
  getAllExchanges(): Exchange[] {
    return Array.from(this.exchanges.values());
  }
}

export const exchangeManager = new ExchangeManager();
