/**
 * Multi-Exchange API Support - TradeVision
 * Unified interface for Coinbase, Kraken, OKX, Bybit, KuCoin
 */

import type { CandleData } from '../types';
import type { Exchange, ExchangeConfig, Ticker, OrderBook, Order, Balance, Trade } from './exchangeApi';

// ============================================
// Coinbase Pro/Advanced Trade Implementation
// ============================================
export class CoinbaseExchange implements Exchange {
  name = 'Coinbase';
  id = 'coinbase';
  
  private config: ExchangeConfig;
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, Set<(ticker: Ticker) => void>>();
  
  private get baseUrl(): string {
    return this.config.testnet 
      ? 'https://api-public.sandbox.exchange.coinbase.com'
      : 'https://api.exchange.coinbase.com';
  }
  
  private get wsUrl(): string {
    return this.config.testnet
      ? 'wss://ws-feed-public.sandbox.exchange.coinbase.com'
      : 'wss://ws-feed.exchange.coinbase.com';
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
          console.error('Failed to parse Coinbase message:', e);
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
  
  private handleMessage(data: { type?: string; product_id?: string; price?: string; best_bid?: string; best_ask?: string; volume_24h?: string }): void {
    if (data.type === 'ticker') {
      const symbol = data.product_id || '';
      const callbacks = this.subscriptions.get(symbol.toLowerCase());
      if (callbacks) {
        const ticker: Ticker = {
          symbol,
          lastPrice: parseFloat(data.price || '0'),
          bidPrice: parseFloat(data.best_bid || '0'),
          askPrice: parseFloat(data.best_ask || '0'),
          volume24h: parseFloat(data.volume_24h || '0'),
          change24h: 0, // Calculate separately if needed
          high24h: 0,
          low24h: 0,
          timestamp: Date.now(),
        };
        callbacks.forEach((cb) => cb(ticker));
      }
    }
  }
  
  async getTicker(symbol: string): Promise<Ticker> {
    const productId = this.formatSymbol(symbol);
    const [tickerRes, statsRes] = await Promise.all([
      fetch(`${this.baseUrl}/products/${productId}/ticker`),
      fetch(`${this.baseUrl}/products/${productId}/stats`),
    ]);
    
    const ticker = await tickerRes.json();
    const stats = await statsRes.json();
    
    return {
      symbol: productId,
      lastPrice: parseFloat(ticker.price),
      bidPrice: parseFloat(ticker.bid),
      askPrice: parseFloat(ticker.ask),
      volume24h: parseFloat(ticker.volume),
      change24h: ((parseFloat(ticker.price) - parseFloat(stats.open)) / parseFloat(stats.open)) * 100,
      high24h: parseFloat(stats.high),
      low24h: parseFloat(stats.low),
      timestamp: Date.now(),
    };
  }
  
  async getOrderBook(symbol: string, limit = 20): Promise<OrderBook> {
    const productId = this.formatSymbol(symbol);
    const response = await fetch(`${this.baseUrl}/products/${productId}/book?level=2`);
    const data = await response.json();
    
    return {
      bids: data.bids.slice(0, limit).map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]),
      asks: data.asks.slice(0, limit).map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]),
      timestamp: Date.now(),
    };
  }
  
  async getCandles(symbol: string, timeframe: string, limit = 300): Promise<CandleData[]> {
    const productId = this.formatSymbol(symbol);
    const granularity = this.timeframeToGranularity(timeframe);
    const response = await fetch(`${this.baseUrl}/products/${productId}/candles?granularity=${granularity}`);
    const data = await response.json();
    
    return data.slice(0, limit).reverse().map((c: number[]) => ({
      time: c[0],
      low: c[1],
      high: c[2],
      open: c[3],
      close: c[4],
      volume: c[5],
    }));
  }
  
  subscribeToTicker(symbol: string, callback: (ticker: Ticker) => void): () => void {
    const productId = this.formatSymbol(symbol);
    const key = productId.toLowerCase();
    
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
      this.ws?.send(JSON.stringify({
        type: 'subscribe',
        product_ids: [productId],
        channels: ['ticker'],
      }));
    }
    
    this.subscriptions.get(key)!.add(callback);
    
    return () => {
      const callbacks = this.subscriptions.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(key);
          this.ws?.send(JSON.stringify({
            type: 'unsubscribe',
            product_ids: [productId],
            channels: ['ticker'],
          }));
        }
      }
    };
  }
  
  async getBalances(): Promise<Balance[]> {
    // Requires authentication
    throw new Error('Authentication required');
  }
  
  async getOpenOrders(): Promise<Order[]> {
    throw new Error('Authentication required');
  }
  
  async getOrderHistory(): Promise<Order[]> {
    throw new Error('Authentication required');
  }
  
  async getTradeHistory(): Promise<Trade[]> {
    throw new Error('Authentication required');
  }
  
  async placeOrder(): Promise<Order> {
    throw new Error('Authentication required');
  }
  
  async cancelOrder(): Promise<void> {
    throw new Error('Authentication required');
  }
  
  async cancelAllOrders(): Promise<void> {
    throw new Error('Authentication required');
  }
  
  private formatSymbol(symbol: string): string {
    const upper = symbol.toUpperCase();
    if (upper.includes('-')) return upper;
    if (upper.endsWith('USD')) return upper.replace('USD', '-USD');
    if (upper.endsWith('USDT')) return upper.replace('USDT', '-USD');
    return `${upper}-USD`;
  }
  
  private timeframeToGranularity(tf: string): number {
    const map: Record<string, number> = {
      '1m': 60, '5m': 300, '15m': 900,
      '1H': 3600, '4H': 14400, '1D': 86400,
    };
    return map[tf] || 3600;
  }
}

// ============================================
// Kraken Implementation
// ============================================
export class KrakenExchange implements Exchange {
  name = 'Kraken';
  id = 'kraken';
  
  private config: ExchangeConfig;
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, Set<(ticker: Ticker) => void>>();
  
  private get baseUrl(): string {
    return 'https://api.kraken.com/0/public';
  }
  
  private get wsUrl(): string {
    return 'wss://ws.kraken.com';
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
          console.error('Failed to parse Kraken message:', e);
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
  
  private handleMessage(data: unknown[]): void {
    if (Array.isArray(data) && data[2] === 'ticker') {
      const tickerData = data[1] as Record<string, unknown>;
      const symbol = data[3] as string;
      const callbacks = this.subscriptions.get(symbol.toLowerCase());
      
      if (callbacks && tickerData) {
        const c = tickerData.c as string[];
        const b = tickerData.b as string[];
        const a = tickerData.a as string[];
        const v = tickerData.v as string[];
        const h = tickerData.h as string[];
        const l = tickerData.l as string[];
        const p = tickerData.p as string[];
        
        const ticker: Ticker = {
          symbol,
          lastPrice: parseFloat(c?.[0] || '0'),
          bidPrice: parseFloat(b?.[0] || '0'),
          askPrice: parseFloat(a?.[0] || '0'),
          volume24h: parseFloat(v?.[1] || '0'),
          change24h: parseFloat(p?.[1] || '0'),
          high24h: parseFloat(h?.[1] || '0'),
          low24h: parseFloat(l?.[1] || '0'),
          timestamp: Date.now(),
        };
        callbacks.forEach((cb) => cb(ticker));
      }
    }
  }
  
  async getTicker(symbol: string): Promise<Ticker> {
    const pair = this.formatSymbol(symbol);
    const response = await fetch(`${this.baseUrl}/Ticker?pair=${pair}`);
    const data = await response.json();
    const result = Object.values(data.result)[0] as Record<string, string[]>;
    
    return {
      symbol: pair,
      lastPrice: parseFloat(result.c[0]),
      bidPrice: parseFloat(result.b[0]),
      askPrice: parseFloat(result.a[0]),
      volume24h: parseFloat(result.v[1]),
      change24h: parseFloat(result.p[1]),
      high24h: parseFloat(result.h[1]),
      low24h: parseFloat(result.l[1]),
      timestamp: Date.now(),
    };
  }
  
  async getOrderBook(symbol: string, limit = 20): Promise<OrderBook> {
    const pair = this.formatSymbol(symbol);
    const response = await fetch(`${this.baseUrl}/Depth?pair=${pair}&count=${limit}`);
    const data = await response.json();
    const result = Object.values(data.result)[0] as { bids: string[][]; asks: string[][] };
    
    return {
      bids: result.bids.map((b) => [parseFloat(b[0]), parseFloat(b[1])]),
      asks: result.asks.map((a) => [parseFloat(a[0]), parseFloat(a[1])]),
      timestamp: Date.now(),
    };
  }
  
  async getCandles(symbol: string, timeframe: string, limit = 300): Promise<CandleData[]> {
    const pair = this.formatSymbol(symbol);
    const interval = this.timeframeToInterval(timeframe);
    const response = await fetch(`${this.baseUrl}/OHLC?pair=${pair}&interval=${interval}`);
    const data = await response.json();
    const result = Object.values(data.result)[0] as number[][];
    
    return result.slice(-limit).map((c) => ({
      time: c[0] as number,
      open: parseFloat(c[1] as unknown as string),
      high: parseFloat(c[2] as unknown as string),
      low: parseFloat(c[3] as unknown as string),
      close: parseFloat(c[4] as unknown as string),
      volume: parseFloat(c[6] as unknown as string),
    }));
  }
  
  subscribeToTicker(symbol: string, callback: (ticker: Ticker) => void): () => void {
    const pair = this.formatSymbol(symbol);
    const key = pair.toLowerCase();
    
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
      this.ws?.send(JSON.stringify({
        event: 'subscribe',
        pair: [pair],
        subscription: { name: 'ticker' },
      }));
    }
    
    this.subscriptions.get(key)!.add(callback);
    
    return () => {
      const callbacks = this.subscriptions.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(key);
          this.ws?.send(JSON.stringify({
            event: 'unsubscribe',
            pair: [pair],
            subscription: { name: 'ticker' },
          }));
        }
      }
    };
  }
  
  async getBalances(): Promise<Balance[]> { throw new Error('Authentication required'); }
  async getOpenOrders(): Promise<Order[]> { throw new Error('Authentication required'); }
  async getOrderHistory(): Promise<Order[]> { throw new Error('Authentication required'); }
  async getTradeHistory(): Promise<Trade[]> { throw new Error('Authentication required'); }
  async placeOrder(): Promise<Order> { throw new Error('Authentication required'); }
  async cancelOrder(): Promise<void> { throw new Error('Authentication required'); }
  async cancelAllOrders(): Promise<void> { throw new Error('Authentication required'); }
  
  private formatSymbol(symbol: string): string {
    const upper = symbol.toUpperCase();
    if (upper.endsWith('USD')) return `X${upper.replace('USD', '')}ZUSD`;
    if (upper.endsWith('USDT')) return `${upper.replace('USDT', '')}USDT`;
    return `${upper}USD`;
  }
  
  private timeframeToInterval(tf: string): number {
    const map: Record<string, number> = {
      '1m': 1, '5m': 5, '15m': 15,
      '1H': 60, '4H': 240, '1D': 1440,
    };
    return map[tf] || 60;
  }
}

// ============================================
// OKX Implementation
// ============================================
export class OKXExchange implements Exchange {
  name = 'OKX';
  id = 'okx';
  
  private config: ExchangeConfig;
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, Set<(ticker: Ticker) => void>>();
  
  private get baseUrl(): string {
    return this.config.testnet 
      ? 'https://www.okx.com'
      : 'https://www.okx.com';
  }
  
  private get wsUrl(): string {
    return this.config.testnet
      ? 'wss://wspap.okx.com:8443/ws/v5/public'
      : 'wss://ws.okx.com:8443/ws/v5/public';
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
          console.error('Failed to parse OKX message:', e);
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
  
  private handleMessage(data: { arg?: { instId?: string }; data?: { last?: string; bidPx?: string; askPx?: string; vol24h?: string; high24h?: string; low24h?: string; ts?: string }[] }): void {
    if (data.arg?.instId && data.data?.[0]) {
      const symbol = data.arg.instId;
      const callbacks = this.subscriptions.get(symbol.toLowerCase());
      
      if (callbacks) {
        const d = data.data[0];
        const ticker: Ticker = {
          symbol,
          lastPrice: parseFloat(d.last || '0'),
          bidPrice: parseFloat(d.bidPx || '0'),
          askPrice: parseFloat(d.askPx || '0'),
          volume24h: parseFloat(d.vol24h || '0'),
          change24h: 0,
          high24h: parseFloat(d.high24h || '0'),
          low24h: parseFloat(d.low24h || '0'),
          timestamp: parseInt(d.ts || '0'),
        };
        callbacks.forEach((cb) => cb(ticker));
      }
    }
  }
  
  async getTicker(symbol: string): Promise<Ticker> {
    const instId = this.formatSymbol(symbol);
    const response = await fetch(`${this.baseUrl}/api/v5/market/ticker?instId=${instId}`);
    const data = await response.json();
    const d = data.data[0];
    
    return {
      symbol: instId,
      lastPrice: parseFloat(d.last),
      bidPrice: parseFloat(d.bidPx),
      askPrice: parseFloat(d.askPx),
      volume24h: parseFloat(d.vol24h),
      change24h: parseFloat(d.sodUtc0) ? ((parseFloat(d.last) - parseFloat(d.sodUtc0)) / parseFloat(d.sodUtc0)) * 100 : 0,
      high24h: parseFloat(d.high24h),
      low24h: parseFloat(d.low24h),
      timestamp: parseInt(d.ts),
    };
  }
  
  async getOrderBook(symbol: string, limit = 20): Promise<OrderBook> {
    const instId = this.formatSymbol(symbol);
    const response = await fetch(`${this.baseUrl}/api/v5/market/books?instId=${instId}&sz=${limit}`);
    const data = await response.json();
    const book = data.data[0];
    
    return {
      bids: book.bids.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]),
      asks: book.asks.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]),
      timestamp: parseInt(book.ts),
    };
  }
  
  async getCandles(symbol: string, timeframe: string, limit = 300): Promise<CandleData[]> {
    const instId = this.formatSymbol(symbol);
    const bar = this.timeframeToBar(timeframe);
    const response = await fetch(`${this.baseUrl}/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`);
    const data = await response.json();
    
    return data.data.reverse().map((c: string[]) => ({
      time: Math.floor(parseInt(c[0]) / 1000),
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5]),
    }));
  }
  
  subscribeToTicker(symbol: string, callback: (ticker: Ticker) => void): () => void {
    const instId = this.formatSymbol(symbol);
    const key = instId.toLowerCase();
    
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
      this.ws?.send(JSON.stringify({
        op: 'subscribe',
        args: [{ channel: 'tickers', instId }],
      }));
    }
    
    this.subscriptions.get(key)!.add(callback);
    
    return () => {
      const callbacks = this.subscriptions.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(key);
          this.ws?.send(JSON.stringify({
            op: 'unsubscribe',
            args: [{ channel: 'tickers', instId }],
          }));
        }
      }
    };
  }
  
  async getBalances(): Promise<Balance[]> { throw new Error('Authentication required'); }
  async getOpenOrders(): Promise<Order[]> { throw new Error('Authentication required'); }
  async getOrderHistory(): Promise<Order[]> { throw new Error('Authentication required'); }
  async getTradeHistory(): Promise<Trade[]> { throw new Error('Authentication required'); }
  async placeOrder(): Promise<Order> { throw new Error('Authentication required'); }
  async cancelOrder(): Promise<void> { throw new Error('Authentication required'); }
  async cancelAllOrders(): Promise<void> { throw new Error('Authentication required'); }
  
  private formatSymbol(symbol: string): string {
    const upper = symbol.toUpperCase();
    if (upper.includes('-')) return upper;
    if (upper.endsWith('USD')) return `${upper.replace('USD', '')}-USDT`;
    if (upper.endsWith('USDT')) return `${upper.replace('USDT', '')}-USDT`;
    return `${upper}-USDT`;
  }
  
  private timeframeToBar(tf: string): string {
    const map: Record<string, string> = {
      '1m': '1m', '5m': '5m', '15m': '15m',
      '1H': '1H', '4H': '4H', '1D': '1D',
    };
    return map[tf] || '1H';
  }
}

// ============================================
// Bybit Implementation
// ============================================
export class BybitExchange implements Exchange {
  name = 'Bybit';
  id = 'bybit';
  
  private config: ExchangeConfig;
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, Set<(ticker: Ticker) => void>>();
  
  private get baseUrl(): string {
    return this.config.testnet 
      ? 'https://api-testnet.bybit.com'
      : 'https://api.bybit.com';
  }
  
  private get wsUrl(): string {
    return this.config.testnet
      ? 'wss://stream-testnet.bybit.com/v5/public/spot'
      : 'wss://stream.bybit.com/v5/public/spot';
  }
  
  constructor(config: ExchangeConfig = {}) {
    this.config = config;
  }
  
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => {
        // Bybit requires ping/pong to keep connection alive
        setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ op: 'ping' }));
          }
        }, 20000);
        resolve();
      };
      this.ws.onerror = (err) => reject(err);
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error('Failed to parse Bybit message:', e);
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
  
  private handleMessage(data: { topic?: string; data?: { symbol?: string; lastPrice?: string; bid1Price?: string; ask1Price?: string; volume24h?: string; highPrice24h?: string; lowPrice24h?: string; price24hPcnt?: string } }): void {
    if (data.topic?.startsWith('tickers.') && data.data) {
      const d = data.data;
      const symbol = d.symbol || '';
      const callbacks = this.subscriptions.get(symbol.toLowerCase());
      
      if (callbacks) {
        const ticker: Ticker = {
          symbol,
          lastPrice: parseFloat(d.lastPrice || '0'),
          bidPrice: parseFloat(d.bid1Price || '0'),
          askPrice: parseFloat(d.ask1Price || '0'),
          volume24h: parseFloat(d.volume24h || '0'),
          change24h: parseFloat(d.price24hPcnt || '0') * 100,
          high24h: parseFloat(d.highPrice24h || '0'),
          low24h: parseFloat(d.lowPrice24h || '0'),
          timestamp: Date.now(),
        };
        callbacks.forEach((cb) => cb(ticker));
      }
    }
  }
  
  async getTicker(symbol: string): Promise<Ticker> {
    const sym = this.formatSymbol(symbol);
    const response = await fetch(`${this.baseUrl}/v5/market/tickers?category=spot&symbol=${sym}`);
    const data = await response.json();
    const d = data.result.list[0];
    
    return {
      symbol: sym,
      lastPrice: parseFloat(d.lastPrice),
      bidPrice: parseFloat(d.bid1Price),
      askPrice: parseFloat(d.ask1Price),
      volume24h: parseFloat(d.volume24h),
      change24h: parseFloat(d.price24hPcnt) * 100,
      high24h: parseFloat(d.highPrice24h),
      low24h: parseFloat(d.lowPrice24h),
      timestamp: Date.now(),
    };
  }
  
  async getOrderBook(symbol: string, limit = 20): Promise<OrderBook> {
    const sym = this.formatSymbol(symbol);
    const response = await fetch(`${this.baseUrl}/v5/market/orderbook?category=spot&symbol=${sym}&limit=${limit}`);
    const data = await response.json();
    const book = data.result;
    
    return {
      bids: book.b.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]),
      asks: book.a.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]),
      timestamp: parseInt(book.ts),
    };
  }
  
  async getCandles(symbol: string, timeframe: string, limit = 300): Promise<CandleData[]> {
    const sym = this.formatSymbol(symbol);
    const interval = this.timeframeToInterval(timeframe);
    const response = await fetch(`${this.baseUrl}/v5/market/kline?category=spot&symbol=${sym}&interval=${interval}&limit=${limit}`);
    const data = await response.json();
    
    return data.result.list.reverse().map((c: string[]) => ({
      time: Math.floor(parseInt(c[0]) / 1000),
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5]),
    }));
  }
  
  subscribeToTicker(symbol: string, callback: (ticker: Ticker) => void): () => void {
    const sym = this.formatSymbol(symbol);
    const key = sym.toLowerCase();
    
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
      this.ws?.send(JSON.stringify({
        op: 'subscribe',
        args: [`tickers.${sym}`],
      }));
    }
    
    this.subscriptions.get(key)!.add(callback);
    
    return () => {
      const callbacks = this.subscriptions.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(key);
          this.ws?.send(JSON.stringify({
            op: 'unsubscribe',
            args: [`tickers.${sym}`],
          }));
        }
      }
    };
  }
  
  async getBalances(): Promise<Balance[]> { throw new Error('Authentication required'); }
  async getOpenOrders(): Promise<Order[]> { throw new Error('Authentication required'); }
  async getOrderHistory(): Promise<Order[]> { throw new Error('Authentication required'); }
  async getTradeHistory(): Promise<Trade[]> { throw new Error('Authentication required'); }
  async placeOrder(): Promise<Order> { throw new Error('Authentication required'); }
  async cancelOrder(): Promise<void> { throw new Error('Authentication required'); }
  async cancelAllOrders(): Promise<void> { throw new Error('Authentication required'); }
  
  private formatSymbol(symbol: string): string {
    const upper = symbol.toUpperCase();
    if (upper.endsWith('USD')) return `${upper.replace('USD', '')}USDT`;
    if (upper.endsWith('USDT')) return upper;
    return `${upper}USDT`;
  }
  
  private timeframeToInterval(tf: string): string {
    const map: Record<string, string> = {
      '1m': '1', '5m': '5', '15m': '15',
      '1H': '60', '4H': '240', '1D': 'D',
    };
    return map[tf] || '60';
  }
}

// ============================================
// KuCoin Implementation
// ============================================
export class KuCoinExchange implements Exchange {
  name = 'KuCoin';
  id = 'kucoin';
  
  private config: ExchangeConfig;
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, Set<(ticker: Ticker) => void>>();
  
  private get baseUrl(): string {
    return 'https://api.kucoin.com';
  }
  
  constructor(config: ExchangeConfig = {}) {
    this.config = config;
  }
  
  async connect(): Promise<void> {
    // KuCoin requires getting a token first
    const tokenRes = await fetch(`${this.baseUrl}/api/v1/bullet-public`, { method: 'POST' });
    const tokenData = await tokenRes.json();
    const { token, instanceServers } = tokenData.data;
    const wsEndpoint = `${instanceServers[0].endpoint}?token=${token}`;
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsEndpoint);
      this.ws.onopen = () => {
        // KuCoin requires ping/pong
        setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping', id: Date.now().toString() }));
          }
        }, 20000);
        resolve();
      };
      this.ws.onerror = (err) => reject(err);
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error('Failed to parse KuCoin message:', e);
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
  
  private handleMessage(data: { topic?: string; data?: { symbol?: string; price?: string; bestBid?: string; bestAsk?: string; size?: string; high?: string; low?: string; changeRate?: string } }): void {
    if (data.topic?.startsWith('/market/ticker:') && data.data) {
      const d = data.data;
      const symbol = d.symbol || '';
      const callbacks = this.subscriptions.get(symbol.toLowerCase());
      
      if (callbacks) {
        const ticker: Ticker = {
          symbol,
          lastPrice: parseFloat(d.price || '0'),
          bidPrice: parseFloat(d.bestBid || '0'),
          askPrice: parseFloat(d.bestAsk || '0'),
          volume24h: parseFloat(d.size || '0'),
          change24h: parseFloat(d.changeRate || '0') * 100,
          high24h: parseFloat(d.high || '0'),
          low24h: parseFloat(d.low || '0'),
          timestamp: Date.now(),
        };
        callbacks.forEach((cb) => cb(ticker));
      }
    }
  }
  
  async getTicker(symbol: string): Promise<Ticker> {
    const sym = this.formatSymbol(symbol);
    const response = await fetch(`${this.baseUrl}/api/v1/market/stats?symbol=${sym}`);
    const data = await response.json();
    const d = data.data;
    
    return {
      symbol: sym,
      lastPrice: parseFloat(d.last),
      bidPrice: parseFloat(d.buy),
      askPrice: parseFloat(d.sell),
      volume24h: parseFloat(d.vol),
      change24h: parseFloat(d.changeRate) * 100,
      high24h: parseFloat(d.high),
      low24h: parseFloat(d.low),
      timestamp: Date.now(),
    };
  }
  
  async getOrderBook(symbol: string, limit = 20): Promise<OrderBook> {
    const sym = this.formatSymbol(symbol);
    const response = await fetch(`${this.baseUrl}/api/v1/market/orderbook/level2_${limit}?symbol=${sym}`);
    const data = await response.json();
    
    return {
      bids: data.data.bids.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]),
      asks: data.data.asks.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]),
      timestamp: Date.now(),
    };
  }
  
  async getCandles(symbol: string, timeframe: string, limit = 300): Promise<CandleData[]> {
    const sym = this.formatSymbol(symbol);
    const type = this.timeframeToType(timeframe);
    const endAt = Math.floor(Date.now() / 1000);
    const startAt = endAt - (limit * this.getSecondsInTimeframe(timeframe));
    const response = await fetch(`${this.baseUrl}/api/v1/market/candles?type=${type}&symbol=${sym}&startAt=${startAt}&endAt=${endAt}`);
    const data = await response.json();
    
    return data.data.reverse().map((c: string[]) => ({
      time: parseInt(c[0]),
      open: parseFloat(c[1]),
      close: parseFloat(c[2]),
      high: parseFloat(c[3]),
      low: parseFloat(c[4]),
      volume: parseFloat(c[5]),
    }));
  }
  
  subscribeToTicker(symbol: string, callback: (ticker: Ticker) => void): () => void {
    const sym = this.formatSymbol(symbol);
    const key = sym.toLowerCase();
    
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
      this.ws?.send(JSON.stringify({
        type: 'subscribe',
        topic: `/market/ticker:${sym}`,
        privateChannel: false,
        response: true,
        id: Date.now().toString(),
      }));
    }
    
    this.subscriptions.get(key)!.add(callback);
    
    return () => {
      const callbacks = this.subscriptions.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(key);
          this.ws?.send(JSON.stringify({
            type: 'unsubscribe',
            topic: `/market/ticker:${sym}`,
            id: Date.now().toString(),
          }));
        }
      }
    };
  }
  
  async getBalances(): Promise<Balance[]> { throw new Error('Authentication required'); }
  async getOpenOrders(): Promise<Order[]> { throw new Error('Authentication required'); }
  async getOrderHistory(): Promise<Order[]> { throw new Error('Authentication required'); }
  async getTradeHistory(): Promise<Trade[]> { throw new Error('Authentication required'); }
  async placeOrder(): Promise<Order> { throw new Error('Authentication required'); }
  async cancelOrder(): Promise<void> { throw new Error('Authentication required'); }
  async cancelAllOrders(): Promise<void> { throw new Error('Authentication required'); }
  
  private formatSymbol(symbol: string): string {
    const upper = symbol.toUpperCase();
    if (upper.includes('-')) return upper;
    if (upper.endsWith('USD')) return `${upper.replace('USD', '')}-USDT`;
    if (upper.endsWith('USDT')) return `${upper.replace('USDT', '')}-USDT`;
    return `${upper}-USDT`;
  }
  
  private timeframeToType(tf: string): string {
    const map: Record<string, string> = {
      '1m': '1min', '5m': '5min', '15m': '15min',
      '1H': '1hour', '4H': '4hour', '1D': '1day',
    };
    return map[tf] || '1hour';
  }
  
  private getSecondsInTimeframe(tf: string): number {
    const map: Record<string, number> = {
      '1m': 60, '5m': 300, '15m': 900,
      '1H': 3600, '4H': 14400, '1D': 86400,
    };
    return map[tf] || 3600;
  }
}

// ============================================
// Enhanced Exchange Manager
// ============================================
export const SUPPORTED_EXCHANGES = [
  { id: 'binance', name: 'Binance', logo: '🅱️', color: '#F3BA2F' },
  { id: 'coinbase', name: 'Coinbase', logo: '🔵', color: '#0052FF' },
  { id: 'kraken', name: 'Kraken', logo: '🦑', color: '#5741D9' },
  { id: 'okx', name: 'OKX', logo: '⭕', color: '#000000' },
  { id: 'bybit', name: 'Bybit', logo: '🟡', color: '#F7A600' },
  { id: 'kucoin', name: 'KuCoin', logo: '🟢', color: '#23AF91' },
] as const;

export type ExchangeId = typeof SUPPORTED_EXCHANGES[number]['id'];

export function createExchangeById(id: ExchangeId, config: ExchangeConfig = {}): Exchange {
  switch (id) {
    case 'coinbase':
      return new CoinbaseExchange(config);
    case 'kraken':
      return new KrakenExchange(config);
    case 'okx':
      return new OKXExchange(config);
    case 'bybit':
      return new BybitExchange(config);
    case 'kucoin':
      return new KuCoinExchange(config);
    case 'binance':
    default:
      // Import from existing exchangeApi
      const { BinanceExchange } = require('./exchangeApi');
      return new BinanceExchange(config);
  }
}

export default {
  CoinbaseExchange,
  KrakenExchange,
  OKXExchange,
  BybitExchange,
  KuCoinExchange,
  SUPPORTED_EXCHANGES,
  createExchangeById,
};
