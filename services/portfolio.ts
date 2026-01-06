/**
 * Portfolio Management Service - TradeVision
 * Real-time portfolio tracking, risk metrics, and P&L analysis
 */

import type { CandleData } from '../types';
import { storeExchangeCredentials, getExchangeCredentials } from '../services/security';

// ============================================
// Types
// ============================================

export interface PortfolioAsset {
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  allocation: number; // Percentage of portfolio
  exchange?: string;
  lastUpdated: number;
}

export interface PortfolioPosition {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  leverage: number;
  margin: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  liquidationPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: number;
  exchange?: string;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercent: number;
  dayPnl: number;
  dayPnlPercent: number;
  weekPnl: number;
  monthPnl: number;
  yearPnl: number;
  allTimePnl: number;
  
  // Risk Metrics
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  beta: number;
  alpha: number;
  volatility: number;
  valueAtRisk95: number; // 95% VaR
  valueAtRisk99: number; // 99% VaR
  
  // Allocation
  topHoldings: { symbol: string; allocation: number }[];
  assetTypeBreakdown: { type: string; allocation: number }[];
  exchangeBreakdown: { exchange: string; value: number }[];
}

export interface PortfolioSnapshot {
  timestamp: number;
  totalValue: number;
  cash: number;
  assets: { symbol: string; value: number }[];
}

export interface TradeRecord {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  total: number;
  fee: number;
  timestamp: number;
  exchange?: string;
  notes?: string;
  tags?: string[];
}

export interface PortfolioConfig {
  baseCurrency: string;
  trackingMode: 'manual' | 'connected' | 'hybrid';
  riskFreeRate: number; // For Sharpe ratio calculation
  benchmarkSymbol: string; // For beta/alpha calculation
  rebalanceThreshold: number; // Percent deviation to trigger rebalance alert
  targetAllocations?: Record<string, number>;
}

// ============================================
// Storage Keys
// ============================================

const PORTFOLIO_KEY = 'tv_portfolio';
const TRADES_KEY = 'tv_trade_history';
const SNAPSHOTS_KEY = 'tv_portfolio_snapshots';
const CONFIG_KEY = 'tv_portfolio_config';

// ============================================
// Portfolio Manager Class
// ============================================

export class PortfolioManager {
  private assets: Map<string, PortfolioAsset> = new Map();
  private positions: Map<string, PortfolioPosition> = new Map();
  private trades: TradeRecord[] = [];
  private snapshots: PortfolioSnapshot[] = [];
  private config: PortfolioConfig;
  private cashBalance: number = 0;
  
  constructor() {
    this.config = this.loadConfig();
    this.loadData();
  }
  
  // ============================================
  // Asset Management
  // ============================================
  
  /**
   * Add or update an asset in the portfolio
   */
  addAsset(asset: Omit<PortfolioAsset, 'value' | 'pnl' | 'pnlPercent' | 'allocation'>): void {
    const existing = this.assets.get(asset.symbol);
    
    if (existing) {
      // Average the cost basis
      const totalQuantity = existing.quantity + asset.quantity;
      const totalCost = (existing.quantity * existing.avgCost) + (asset.quantity * asset.avgCost);
      
      existing.quantity = totalQuantity;
      existing.avgCost = totalCost / totalQuantity;
      existing.currentPrice = asset.currentPrice;
      existing.lastUpdated = Date.now();
    } else {
      const newAsset: PortfolioAsset = {
        ...asset,
        value: asset.quantity * asset.currentPrice,
        pnl: (asset.currentPrice - asset.avgCost) * asset.quantity,
        pnlPercent: ((asset.currentPrice - asset.avgCost) / asset.avgCost) * 100,
        allocation: 0, // Will be recalculated
        lastUpdated: Date.now(),
      };
      this.assets.set(asset.symbol, newAsset);
    }
    
    this.recalculateAllocations();
    this.saveData();
  }
  
  /**
   * Remove an asset from the portfolio
   */
  removeAsset(symbol: string): boolean {
    const deleted = this.assets.delete(symbol);
    if (deleted) {
      this.recalculateAllocations();
      this.saveData();
    }
    return deleted;
  }
  
  /**
   * Update current prices for all assets
   */
  updatePrices(prices: Record<string, number>): void {
    for (const [symbol, price] of Object.entries(prices)) {
      const asset = this.assets.get(symbol);
      if (asset) {
        asset.currentPrice = price;
        asset.value = asset.quantity * price;
        asset.pnl = (price - asset.avgCost) * asset.quantity;
        asset.pnlPercent = ((price - asset.avgCost) / asset.avgCost) * 100;
        asset.lastUpdated = Date.now();
      }
      
      const position = this.positions.get(symbol);
      if (position) {
        position.currentPrice = price;
        this.updatePositionPnl(position);
      }
    }
    
    this.recalculateAllocations();
    this.saveData();
  }
  
  /**
   * Get all assets
   */
  getAssets(): PortfolioAsset[] {
    return Array.from(this.assets.values());
  }
  
  // ============================================
  // Position Management
  // ============================================
  
  /**
   * Open a new position
   */
  openPosition(position: Omit<PortfolioPosition, 'id' | 'unrealizedPnl' | 'unrealizedPnlPercent'>): PortfolioPosition {
    const newPosition: PortfolioPosition = {
      ...position,
      id: crypto.randomUUID(),
      unrealizedPnl: 0,
      unrealizedPnlPercent: 0,
    };
    
    this.updatePositionPnl(newPosition);
    this.positions.set(newPosition.id, newPosition);
    this.saveData();
    
    return newPosition;
  }
  
  /**
   * Close a position
   */
  closePosition(id: string, closePrice: number): TradeRecord | null {
    const position = this.positions.get(id);
    if (!position) return null;
    
    // Calculate final PnL
    const pnl = position.side === 'long'
      ? (closePrice - position.entryPrice) * position.quantity * position.leverage
      : (position.entryPrice - closePrice) * position.quantity * position.leverage;
    
    // Record the trade
    const trade: TradeRecord = {
      id: crypto.randomUUID(),
      symbol: position.symbol,
      side: position.side === 'long' ? 'sell' : 'buy',
      price: closePrice,
      quantity: position.quantity,
      total: closePrice * position.quantity,
      fee: 0,
      timestamp: Date.now(),
      exchange: position.exchange,
      notes: `Closed ${position.side} position. PnL: ${pnl.toFixed(2)}`,
    };
    
    this.trades.push(trade);
    this.positions.delete(id);
    this.cashBalance += pnl + position.margin;
    this.saveData();
    
    return trade;
  }
  
  /**
   * Update position with stop loss / take profit
   */
  updatePositionLevels(id: string, stopLoss?: number, takeProfit?: number): PortfolioPosition | null {
    const position = this.positions.get(id);
    if (!position) return null;
    
    if (stopLoss !== undefined) position.stopLoss = stopLoss;
    if (takeProfit !== undefined) position.takeProfit = takeProfit;
    
    this.saveData();
    return position;
  }
  
  /**
   * Get all open positions
   */
  getPositions(): PortfolioPosition[] {
    return Array.from(this.positions.values());
  }
  
  // ============================================
  // Trade History
  // ============================================
  
  /**
   * Record a manual trade
   */
  recordTrade(trade: Omit<TradeRecord, 'id'>): TradeRecord {
    const newTrade: TradeRecord = {
      ...trade,
      id: crypto.randomUUID(),
    };
    
    this.trades.push(newTrade);
    
    // Update asset quantities
    if (trade.side === 'buy') {
      this.addAsset({
        symbol: trade.symbol,
        name: trade.symbol,
        quantity: trade.quantity,
        avgCost: trade.price,
        currentPrice: trade.price,
        exchange: trade.exchange,
        lastUpdated: trade.timestamp,
      });
    } else {
      const asset = this.assets.get(trade.symbol);
      if (asset) {
        asset.quantity -= trade.quantity;
        if (asset.quantity <= 0) {
          this.assets.delete(trade.symbol);
        }
      }
    }
    
    this.saveData();
    return newTrade;
  }
  
  /**
   * Get trade history
   */
  getTradeHistory(options?: {
    symbol?: string;
    startDate?: number;
    endDate?: number;
    limit?: number;
  }): TradeRecord[] {
    let trades = [...this.trades];
    
    if (options?.symbol) {
      trades = trades.filter(t => t.symbol === options.symbol);
    }
    if (options?.startDate) {
      trades = trades.filter(t => t.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      trades = trades.filter(t => t.timestamp <= options.endDate!);
    }
    
    trades.sort((a, b) => b.timestamp - a.timestamp);
    
    if (options?.limit) {
      trades = trades.slice(0, options.limit);
    }
    
    return trades;
  }
  
  // ============================================
  // Portfolio Metrics
  // ============================================
  
  /**
   * Calculate comprehensive portfolio metrics
   */
  calculateMetrics(): PortfolioMetrics {
    const assets = this.getAssets();
    const positions = this.getPositions();
    
    // Total values
    const assetValue = assets.reduce((sum, a) => sum + a.value, 0);
    const positionValue = positions.reduce((sum, p) => sum + p.margin + p.unrealizedPnl, 0);
    const totalValue = assetValue + positionValue + this.cashBalance;
    const totalCost = assets.reduce((sum, a) => sum + (a.avgCost * a.quantity), 0);
    const totalPnl = totalValue - totalCost - this.cashBalance;
    const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    
    // Period P&L from snapshots
    const dayPnl = this.calculatePeriodPnl(24 * 60 * 60 * 1000);
    const weekPnl = this.calculatePeriodPnl(7 * 24 * 60 * 60 * 1000);
    const monthPnl = this.calculatePeriodPnl(30 * 24 * 60 * 60 * 1000);
    const yearPnl = this.calculatePeriodPnl(365 * 24 * 60 * 60 * 1000);
    
    // Risk metrics
    const returns = this.calculateDailyReturns();
    const volatility = this.calculateVolatility(returns);
    const sharpeRatio = this.calculateSharpeRatio(returns, volatility);
    const sortinoRatio = this.calculateSortinoRatio(returns);
    const { maxDrawdown, currentDrawdown } = this.calculateDrawdown();
    const var95 = this.calculateVaR(returns, 0.95);
    const var99 = this.calculateVaR(returns, 0.99);
    
    // Allocation breakdown
    const topHoldings = assets
      .sort((a, b) => b.allocation - a.allocation)
      .slice(0, 5)
      .map(a => ({ symbol: a.symbol, allocation: a.allocation }));
    
    const exchangeBreakdown = this.calculateExchangeBreakdown(assets);
    
    return {
      totalValue,
      totalCost,
      totalPnl,
      totalPnlPercent,
      dayPnl: dayPnl.pnl,
      dayPnlPercent: dayPnl.percent,
      weekPnl: weekPnl.pnl,
      monthPnl: monthPnl.pnl,
      yearPnl: yearPnl.pnl,
      allTimePnl: totalPnl,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      currentDrawdown,
      beta: 1, // Would need benchmark data
      alpha: 0, // Would need benchmark data
      volatility,
      valueAtRisk95: var95,
      valueAtRisk99: var99,
      topHoldings,
      assetTypeBreakdown: [
        { type: 'Crypto', allocation: 100 }, // Simplified
      ],
      exchangeBreakdown,
    };
  }
  
  /**
   * Take a portfolio snapshot
   */
  takeSnapshot(): PortfolioSnapshot {
    const assets = this.getAssets();
    const snapshot: PortfolioSnapshot = {
      timestamp: Date.now(),
      totalValue: assets.reduce((sum, a) => sum + a.value, 0) + this.cashBalance,
      cash: this.cashBalance,
      assets: assets.map(a => ({ symbol: a.symbol, value: a.value })),
    };
    
    this.snapshots.push(snapshot);
    
    // Keep only last 365 days of daily snapshots
    const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    this.snapshots = this.snapshots.filter(s => s.timestamp > yearAgo);
    
    this.saveSnapshots();
    return snapshot;
  }
  
  /**
   * Get portfolio value history
   */
  getValueHistory(days: number = 30): { timestamp: number; value: number }[] {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.snapshots
      .filter(s => s.timestamp > cutoff)
      .map(s => ({ timestamp: s.timestamp, value: s.totalValue }));
  }
  
  // ============================================
  // Cash Management
  // ============================================
  
  /**
   * Add cash to portfolio
   */
  deposit(amount: number): void {
    this.cashBalance += amount;
    this.recordTrade({
      symbol: 'CASH',
      side: 'buy',
      price: 1,
      quantity: amount,
      total: amount,
      fee: 0,
      timestamp: Date.now(),
      notes: 'Deposit',
    });
  }
  
  /**
   * Withdraw cash from portfolio
   */
  withdraw(amount: number): boolean {
    if (amount > this.cashBalance) return false;
    
    this.cashBalance -= amount;
    this.recordTrade({
      symbol: 'CASH',
      side: 'sell',
      price: 1,
      quantity: amount,
      total: amount,
      fee: 0,
      timestamp: Date.now(),
      notes: 'Withdrawal',
    });
    
    return true;
  }
  
  /**
   * Get cash balance
   */
  getCashBalance(): number {
    return this.cashBalance;
  }
  
  // ============================================
  // Configuration
  // ============================================
  
  /**
   * Update portfolio configuration
   */
  updateConfig(updates: Partial<PortfolioConfig>): void {
    this.config = { ...this.config, ...updates };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
  }
  
  /**
   * Get current configuration
   */
  getConfig(): PortfolioConfig {
    return { ...this.config };
  }
  
  // ============================================
  // Private Helpers
  // ============================================
  
  private updatePositionPnl(position: PortfolioPosition): void {
    if (position.side === 'long') {
      position.unrealizedPnl = (position.currentPrice - position.entryPrice) * position.quantity * position.leverage;
    } else {
      position.unrealizedPnl = (position.entryPrice - position.currentPrice) * position.quantity * position.leverage;
    }
    position.unrealizedPnlPercent = (position.unrealizedPnl / position.margin) * 100;
  }
  
  private recalculateAllocations(): void {
    const totalValue = Array.from(this.assets.values()).reduce((sum, a) => sum + a.value, 0);
    
    for (const asset of this.assets.values()) {
      asset.allocation = totalValue > 0 ? (asset.value / totalValue) * 100 : 0;
    }
  }
  
  private calculatePeriodPnl(periodMs: number): { pnl: number; percent: number } {
    const cutoff = Date.now() - periodMs;
    const oldSnapshot = this.snapshots.find(s => s.timestamp <= cutoff);
    
    if (!oldSnapshot) {
      return { pnl: 0, percent: 0 };
    }
    
    const currentValue = Array.from(this.assets.values()).reduce((sum, a) => sum + a.value, 0) + this.cashBalance;
    const pnl = currentValue - oldSnapshot.totalValue;
    const percent = oldSnapshot.totalValue > 0 ? (pnl / oldSnapshot.totalValue) * 100 : 0;
    
    return { pnl, percent };
  }
  
  private calculateDailyReturns(): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < this.snapshots.length; i++) {
      const prev = this.snapshots[i - 1].totalValue;
      const curr = this.snapshots[i].totalValue;
      if (prev > 0) {
        returns.push((curr - prev) / prev);
      }
    }
    
    return returns;
  }
  
  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;
    
    // Annualize (assuming daily returns)
    return Math.sqrt(variance * 365) * 100;
  }
  
  private calculateSharpeRatio(returns: number[], volatility: number): number {
    if (returns.length === 0 || volatility === 0) return 0;
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const annualizedReturn = avgReturn * 365;
    
    return (annualizedReturn - this.config.riskFreeRate) / (volatility / 100);
  }
  
  private calculateSortinoRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const negativeReturns = returns.filter(r => r < 0);
    
    if (negativeReturns.length === 0) return 0;
    
    const downsideVariance = negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length;
    const downsideDeviation = Math.sqrt(downsideVariance * 365);
    
    if (downsideDeviation === 0) return 0;
    
    const annualizedReturn = avgReturn * 365;
    return (annualizedReturn - this.config.riskFreeRate) / downsideDeviation;
  }
  
  private calculateDrawdown(): { maxDrawdown: number; currentDrawdown: number } {
    if (this.snapshots.length === 0) {
      return { maxDrawdown: 0, currentDrawdown: 0 };
    }
    
    let peak = this.snapshots[0].totalValue;
    let maxDrawdown = 0;
    
    for (const snapshot of this.snapshots) {
      if (snapshot.totalValue > peak) {
        peak = snapshot.totalValue;
      }
      const drawdown = (peak - snapshot.totalValue) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    const currentValue = Array.from(this.assets.values()).reduce((sum, a) => sum + a.value, 0) + this.cashBalance;
    const currentDrawdown = peak > 0 ? (peak - currentValue) / peak : 0;
    
    return {
      maxDrawdown: maxDrawdown * 100,
      currentDrawdown: Math.max(0, currentDrawdown * 100),
    };
  }
  
  private calculateVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;
    
    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sorted.length);
    
    const currentValue = Array.from(this.assets.values()).reduce((sum, a) => sum + a.value, 0) + this.cashBalance;
    
    return Math.abs(sorted[index] || 0) * currentValue;
  }
  
  private calculateExchangeBreakdown(assets: PortfolioAsset[]): { exchange: string; value: number }[] {
    const breakdown = new Map<string, number>();
    
    for (const asset of assets) {
      const exchange = asset.exchange || 'Unknown';
      breakdown.set(exchange, (breakdown.get(exchange) || 0) + asset.value);
    }
    
    return Array.from(breakdown.entries()).map(([exchange, value]) => ({ exchange, value }));
  }
  
  // ============================================
  // Persistence
  // ============================================
  
  private loadData(): void {
    try {
      const portfolioData = localStorage.getItem(PORTFOLIO_KEY);
      if (portfolioData) {
        const data = JSON.parse(portfolioData);
        data.assets?.forEach((a: PortfolioAsset) => this.assets.set(a.symbol, a));
        data.positions?.forEach((p: PortfolioPosition) => this.positions.set(p.id, p));
        this.cashBalance = data.cashBalance || 0;
      }
      
      const tradesData = localStorage.getItem(TRADES_KEY);
      if (tradesData) {
        this.trades = JSON.parse(tradesData);
      }
      
      const snapshotsData = localStorage.getItem(SNAPSHOTS_KEY);
      if (snapshotsData) {
        this.snapshots = JSON.parse(snapshotsData);
      }
    } catch (error) {
      console.error('Failed to load portfolio data:', error);
    }
  }
  
  private saveData(): void {
    const data = {
      assets: Array.from(this.assets.values()),
      positions: Array.from(this.positions.values()),
      cashBalance: this.cashBalance,
    };
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(data));
    localStorage.setItem(TRADES_KEY, JSON.stringify(this.trades));
  }
  
  private saveSnapshots(): void {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(this.snapshots));
  }
  
  private loadConfig(): PortfolioConfig {
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    
    return {
      baseCurrency: 'USD',
      trackingMode: 'manual',
      riskFreeRate: 0.05, // 5% risk-free rate
      benchmarkSymbol: 'BTCUSD',
      rebalanceThreshold: 5, // 5% deviation
    };
  }
  
  // ============================================
  // Export/Import
  // ============================================
  
  /**
   * Export portfolio data for backup
   */
  exportData(): string {
    return JSON.stringify({
      assets: Array.from(this.assets.values()),
      positions: Array.from(this.positions.values()),
      trades: this.trades,
      snapshots: this.snapshots,
      cashBalance: this.cashBalance,
      config: this.config,
      exportedAt: Date.now(),
    }, null, 2);
  }
  
  /**
   * Import portfolio data from backup
   */
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      this.assets.clear();
      this.positions.clear();
      
      data.assets?.forEach((a: PortfolioAsset) => this.assets.set(a.symbol, a));
      data.positions?.forEach((p: PortfolioPosition) => this.positions.set(p.id, p));
      this.trades = data.trades || [];
      this.snapshots = data.snapshots || [];
      this.cashBalance = data.cashBalance || 0;
      
      if (data.config) {
        this.config = data.config;
      }
      
      this.saveData();
      this.saveSnapshots();
      
      return true;
    } catch (error) {
      console.error('Failed to import portfolio data:', error);
      return false;
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

export const portfolioManager = new PortfolioManager();

export default portfolioManager;
