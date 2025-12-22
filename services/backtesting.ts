/**
 * Backtesting Engine for TradeVision
 * Historical strategy testing with performance metrics
 */

import type { CandleData } from '../types';
import { calculateSMA, calculateEMA, calculateRSI } from '../utils/indicators';

// ============================================
// Types
// ============================================
export interface BacktestConfig {
  symbol: string;
  timeframe: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  positionSize: number; // Percentage of capital per trade
  slippage: number; // Percentage
  commission: number; // Percentage per trade
}

export interface TradeSignal {
  type: 'entry' | 'exit';
  side: 'long' | 'short';
  price: number;
  time: number;
  reason: string;
}

export interface BacktestTrade {
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  side: 'long' | 'short';
  quantity: number;
  pnl: number;
  pnlPercent: number;
  commission: number;
  holdingPeriod: number; // in candles
}

export interface BacktestResult {
  config: BacktestConfig;
  strategyName: string;
  trades: BacktestTrade[];
  metrics: BacktestMetrics;
  equityCurve: { time: number; equity: number }[];
  drawdownCurve: { time: number; drawdown: number }[];
}

export interface BacktestMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  expectancy: number;
  netProfit: number;
  netProfitPercent: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  avgHoldingPeriod: number;
  totalCommission: number;
}

// ============================================
// Strategy Interface
// ============================================
export interface Strategy {
  name: string;
  description: string;
  parameters: Record<string, number | string | boolean>;
  onInit(data: CandleData[]): void;
  onCandle(candle: CandleData, index: number): TradeSignal | null;
}

// Helper to convert indicator result to value-only array indexed by time
function indicatorToValueMap(
  data: CandleData[],
  indicatorData: { time: number; value: number }[]
): Map<number, number> {
  const map = new Map<number, number>();
  for (const item of indicatorData) {
    map.set(item.time, item.value);
  }
  return map;
}

// ============================================
// Built-in Strategies
// ============================================

export class SMACrossoverStrategy implements Strategy {
  name = 'SMA Crossover';
  description = 'Buy when fast SMA crosses above slow SMA, sell when it crosses below';
  parameters = { fastPeriod: 10, slowPeriod: 20 };
  
  private fastSMAMap: Map<number, number> = new Map();
  private slowSMAMap: Map<number, number> = new Map();
  private candles: CandleData[] = [];
  private position: 'long' | 'short' | null = null;
  
  onInit(data: CandleData[]): void {
    this.candles = data;
    const fastSMA = calculateSMA(data, this.parameters.fastPeriod as number);
    const slowSMA = calculateSMA(data, this.parameters.slowPeriod as number);
    this.fastSMAMap = indicatorToValueMap(data, fastSMA);
    this.slowSMAMap = indicatorToValueMap(data, slowSMA);
    this.position = null;
  }
  
  onCandle(candle: CandleData, index: number): TradeSignal | null {
    if (index < 2) return null;
    
    const prevCandle = this.candles[index - 1];
    const fastCurr = this.fastSMAMap.get(candle.time);
    const fastPrev = this.fastSMAMap.get(prevCandle?.time);
    const slowCurr = this.slowSMAMap.get(candle.time);
    const slowPrev = this.slowSMAMap.get(prevCandle?.time);
    
    if (fastCurr === undefined || fastPrev === undefined || 
        slowCurr === undefined || slowPrev === undefined) return null;
    
    // Bullish crossover
    if (fastPrev <= slowPrev && fastCurr > slowCurr && this.position !== 'long') {
      if (this.position === 'short') {
        this.position = null;
        return { type: 'exit', side: 'short', price: candle.close, time: candle.time, reason: 'SMA Crossover Exit' };
      }
      this.position = 'long';
      return { type: 'entry', side: 'long', price: candle.close, time: candle.time, reason: 'Bullish SMA Crossover' };
    }
    
    // Bearish crossover
    if (fastPrev >= slowPrev && fastCurr < slowCurr && this.position !== 'short') {
      if (this.position === 'long') {
        this.position = null;
        return { type: 'exit', side: 'long', price: candle.close, time: candle.time, reason: 'SMA Crossover Exit' };
      }
      this.position = 'short';
      return { type: 'entry', side: 'short', price: candle.close, time: candle.time, reason: 'Bearish SMA Crossover' };
    }
    
    return null;
  }
}

export class RSIMeanReversionStrategy implements Strategy {
  name = 'RSI Mean Reversion';
  description = 'Buy when RSI is oversold, sell when overbought';
  parameters = { period: 14, oversold: 30, overbought: 70 };
  
  private rsiMap: Map<number, number> = new Map();
  private position: 'long' | null = null;
  
  onInit(data: CandleData[]): void {
    const rsi = calculateRSI(data, this.parameters.period as number);
    this.rsiMap = indicatorToValueMap(data, rsi);
    this.position = null;
  }
  
  onCandle(candle: CandleData, index: number): TradeSignal | null {
    const rsiValue = this.rsiMap.get(candle.time);
    if (rsiValue === undefined) return null;
    
    // Oversold - Buy signal
    if (rsiValue < (this.parameters.oversold as number) && !this.position) {
      this.position = 'long';
      return { type: 'entry', side: 'long', price: candle.close, time: candle.time, reason: 'RSI Oversold' };
    }
    
    // Overbought - Sell signal
    if (rsiValue > (this.parameters.overbought as number) && this.position === 'long') {
      this.position = null;
      return { type: 'exit', side: 'long', price: candle.close, time: candle.time, reason: 'RSI Overbought' };
    }
    
    return null;
  }
}

export class MACDStrategy implements Strategy {
  name = 'MACD Crossover';
  description = 'Trade based on MACD line crossing signal line';
  parameters = { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 };
  
  private fastEMAMap: Map<number, number> = new Map();
  private slowEMAMap: Map<number, number> = new Map();
  private candles: CandleData[] = [];
  private position: 'long' | 'short' | null = null;
  
  onInit(data: CandleData[]): void {
    this.candles = data;
    const fastEMA = calculateEMA(data, this.parameters.fastPeriod as number);
    const slowEMA = calculateEMA(data, this.parameters.slowPeriod as number);
    this.fastEMAMap = indicatorToValueMap(data, fastEMA);
    this.slowEMAMap = indicatorToValueMap(data, slowEMA);
    this.position = null;
  }
  
  private getMacd(time: number): number | undefined {
    const fast = this.fastEMAMap.get(time);
    const slow = this.slowEMAMap.get(time);
    if (fast === undefined || slow === undefined) return undefined;
    return fast - slow;
  }
  
  onCandle(candle: CandleData, index: number): TradeSignal | null {
    if (index < 2) return null;
    
    const prevCandle = this.candles[index - 1];
    const macdCurr = this.getMacd(candle.time);
    const macdPrev = this.getMacd(prevCandle?.time);
    
    if (macdCurr === undefined || macdPrev === undefined) return null;
    
    // MACD crosses above zero
    if (macdPrev <= 0 && macdCurr > 0 && this.position !== 'long') {
      if (this.position === 'short') {
        this.position = null;
        return { type: 'exit', side: 'short', price: candle.close, time: candle.time, reason: 'MACD Cross Zero Exit' };
      }
      this.position = 'long';
      return { type: 'entry', side: 'long', price: candle.close, time: candle.time, reason: 'MACD Bullish Cross' };
    }
    
    // MACD crosses below zero
    if (macdPrev >= 0 && macdCurr < 0 && this.position !== 'short') {
      if (this.position === 'long') {
        this.position = null;
        return { type: 'exit', side: 'long', price: candle.close, time: candle.time, reason: 'MACD Cross Zero Exit' };
      }
      this.position = 'short';
      return { type: 'entry', side: 'short', price: candle.close, time: candle.time, reason: 'MACD Bearish Cross' };
    }
    
    return null;
  }
}

// ============================================
// Backtest Engine
// ============================================
export class BacktestEngine {
  private config: BacktestConfig;
  private strategy: Strategy;
  private data: CandleData[] = [];
  
  constructor(config: BacktestConfig, strategy: Strategy) {
    this.config = config;
    this.strategy = strategy;
  }
  
  setData(data: CandleData[]): void {
    // Filter data by date range
    const startTime = this.config.startDate.getTime() / 1000;
    const endTime = this.config.endDate.getTime() / 1000;
    this.data = data.filter(c => c.time >= startTime && c.time <= endTime);
  }
  
  run(): BacktestResult {
    if (this.data.length === 0) {
      throw new Error('No data loaded for backtesting');
    }
    
    // Initialize strategy
    this.strategy.onInit(this.data);
    
    const trades: BacktestTrade[] = [];
    const equityCurve: { time: number; equity: number }[] = [];
    const drawdownCurve: { time: number; drawdown: number }[] = [];
    
    let capital = this.config.initialCapital;
    let peakEquity = capital;
    let currentTrade: Partial<BacktestTrade> | null = null;
    let totalCommission = 0;
    
    // Process each candle
    for (let i = 0; i < this.data.length; i++) {
      const candle = this.data[i];
      const signal = this.strategy.onCandle(candle, i);
      
      if (signal) {
        const adjustedPrice = signal.type === 'entry'
          ? signal.price * (1 + this.config.slippage / 100)
          : signal.price * (1 - this.config.slippage / 100);
        
        if (signal.type === 'entry' && !currentTrade) {
          // Open new trade
          const positionValue = capital * (this.config.positionSize / 100);
          const quantity = positionValue / adjustedPrice;
          const commission = positionValue * (this.config.commission / 100);
          totalCommission += commission;
          
          currentTrade = {
            entryTime: signal.time,
            entryPrice: adjustedPrice,
            side: signal.side,
            quantity,
            commission,
          };
        } else if (signal.type === 'exit' && currentTrade && currentTrade.side === signal.side) {
          // Close trade
          const exitCommission = (currentTrade.quantity! * adjustedPrice) * (this.config.commission / 100);
          totalCommission += exitCommission;
          
          const pnl = currentTrade.side === 'long'
            ? (adjustedPrice - currentTrade.entryPrice!) * currentTrade.quantity! - currentTrade.commission! - exitCommission
            : (currentTrade.entryPrice! - adjustedPrice) * currentTrade.quantity! - currentTrade.commission! - exitCommission;
          
          const pnlPercent = (pnl / (currentTrade.entryPrice! * currentTrade.quantity!)) * 100;
          
          trades.push({
            entryTime: currentTrade.entryTime!,
            entryPrice: currentTrade.entryPrice!,
            exitTime: signal.time,
            exitPrice: adjustedPrice,
            side: currentTrade.side!,
            quantity: currentTrade.quantity!,
            pnl,
            pnlPercent,
            commission: currentTrade.commission! + exitCommission,
            holdingPeriod: i - this.data.findIndex(c => c.time === currentTrade!.entryTime),
          });
          
          capital += pnl;
          currentTrade = null;
        }
      }
      
      // Track equity and drawdown
      equityCurve.push({ time: candle.time, equity: capital });
      peakEquity = Math.max(peakEquity, capital);
      const drawdown = ((peakEquity - capital) / peakEquity) * 100;
      drawdownCurve.push({ time: candle.time, drawdown });
    }
    
    // Calculate metrics
    const metrics = this.calculateMetrics(trades, this.config.initialCapital, capital, totalCommission);
    
    return {
      config: this.config,
      strategyName: this.strategy.name,
      trades,
      metrics,
      equityCurve,
      drawdownCurve,
    };
  }
  
  private calculateMetrics(
    trades: BacktestTrade[],
    initialCapital: number,
    finalCapital: number,
    totalCommission: number
  ): BacktestMetrics {
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);
    
    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    
    const netProfit = finalCapital - initialCapital;
    const netProfitPercent = (netProfit / initialCapital) * 100;
    
    // Calculate returns for Sharpe/Sortino
    const returns = trades.map(t => t.pnlPercent);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = returns.length > 1 
      ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1))
      : 0;
    const negativeReturns = returns.filter(r => r < 0);
    const downDev = negativeReturns.length > 1
      ? Math.sqrt(negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / (negativeReturns.length - 1))
      : 0;
    
    // Max drawdown
    let maxDrawdown = 0;
    let peak = initialCapital;
    let equity = initialCapital;
    for (const trade of trades) {
      equity += trade.pnl;
      peak = Math.max(peak, equity);
      const dd = (peak - equity) / peak;
      maxDrawdown = Math.max(maxDrawdown, dd);
    }
    
    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      avgWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
      largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0,
      largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0,
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
      expectancy: trades.length > 0 ? netProfit / trades.length : 0,
      netProfit,
      netProfitPercent,
      maxDrawdown: maxDrawdown * 100,
      maxDrawdownPercent: maxDrawdown * 100,
      sharpeRatio: stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0,
      sortinoRatio: downDev > 0 ? (avgReturn / downDev) * Math.sqrt(252) : 0,
      calmarRatio: maxDrawdown > 0 ? netProfitPercent / (maxDrawdown * 100) : 0,
      avgHoldingPeriod: trades.length > 0 ? trades.reduce((sum, t) => sum + t.holdingPeriod, 0) / trades.length : 0,
      totalCommission,
    };
  }
}

// Factory to create strategies
export function createStrategy(name: string): Strategy {
  switch (name) {
    case 'sma_crossover':
      return new SMACrossoverStrategy();
    case 'rsi_mean_reversion':
      return new RSIMeanReversionStrategy();
    case 'macd':
      return new MACDStrategy();
    default:
      throw new Error(`Unknown strategy: ${name}`);
  }
}

// Get available strategies
export function getAvailableStrategies(): { id: string; name: string; description: string }[] {
  return [
    { id: 'sma_crossover', name: 'SMA Crossover', description: 'Buy when fast SMA crosses above slow SMA' },
    { id: 'rsi_mean_reversion', name: 'RSI Mean Reversion', description: 'Buy oversold, sell overbought' },
    { id: 'macd', name: 'MACD Crossover', description: 'Trade on MACD zero-line crosses' },
  ];
}

export default BacktestEngine;
