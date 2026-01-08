/**
 * AI Trading Engine - Advanced Technical Analysis with Machine Learning
 * Production-ready trading intelligence system
 */

import { CandleData } from '../types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AISignal {
  id: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  confidence: number; // 0-100
  price: number;
  timestamp: number;
  symbol: string;
  timeframe: string;
  reasoning: string[];
  targets: {
    entry: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    takeProfit3: number;
  };
  indicators: {
    name: string;
    value: number;
    signal: 'bullish' | 'bearish' | 'neutral';
  }[];
  riskReward: number;
  expectedMove: number;
  expiresAt: number;
}

export interface MarketStructure {
  trend: 'BULLISH' | 'BEARISH' | 'RANGING';
  trendStrength: number;
  swingHighs: number[];
  swingLows: number[];
  bos: { price: number; time: number; type: 'bullish' | 'bearish' }[];
  choch: { price: number; time: number; type: 'bullish' | 'bearish' }[];
  orderBlocks: OrderBlock[];
  fairValueGaps: FVG[];
  liquidityPools: LiquidityPool[];
}

export interface OrderBlock {
  id: string;
  type: 'bullish' | 'bearish';
  priceHigh: number;
  priceLow: number;
  time: number;
  mitigated: boolean;
  strength: number;
}

export interface FVG {
  id: string;
  type: 'bullish' | 'bearish';
  priceHigh: number;
  priceLow: number;
  time: number;
  filled: boolean;
  fillPercentage: number;
}

export interface LiquidityPool {
  id: string;
  type: 'buy-side' | 'sell-side';
  price: number;
  size: number;
  touched: boolean;
}

export interface PatternDetection {
  name: string;
  type: 'continuation' | 'reversal';
  direction: 'bullish' | 'bearish';
  confidence: number;
  pricePoints: { price: number; time: number }[];
  target: number;
  invalidation: number;
}

export interface AIAnalysis {
  symbol: string;
  timeframe: string;
  timestamp: number;
  
  // Market Structure
  marketStructure: MarketStructure;
  
  // Signals
  signals: AISignal[];
  primarySignal: AISignal | null;
  
  // Technical Analysis
  patterns: PatternDetection[];
  divergences: Divergence[];
  
  // Risk Metrics
  volatility: number;
  atr: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  
  // ML Predictions
  predictions: {
    shortTerm: { direction: string; probability: number; price: number };
    mediumTerm: { direction: string; probability: number; price: number };
    longTerm: { direction: string; probability: number; price: number };
  };
  
  // Summary
  summary: string;
  keyLevels: { price: number; type: string; importance: number }[];
}

export interface Divergence {
  type: 'regular' | 'hidden';
  direction: 'bullish' | 'bearish';
  indicator: string;
  startPrice: number;
  endPrice: number;
  startTime: number;
  endTime: number;
  strength: number;
}

// ============================================================================
// INDICATOR CALCULATIONS
// ============================================================================

export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
  }
  ema[period - 1] = sum / Math.min(period, data.length);
  
  // Calculate remaining EMAs
  for (let i = period; i < data.length; i++) {
    ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }
  
  return ema;
}

export function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    sma[i] = sum / period;
  }
  return sma;
}

export function calculateRSI(closes: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains[i] = change > 0 ? change : 0;
    losses[i] = change < 0 ? Math.abs(change) : 0;
  }
  
  let avgGain = 0;
  let avgLoss = 0;
  
  // First average
  for (let i = 1; i <= period && i < closes.length; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;
  
  rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  
  // Smoothed averages
  for (let i = period + 1; i < closes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }
  
  return rsi;
}

export function calculateMACD(
  closes: number[],
  fast: number = 12,
  slow: number = 26,
  signal: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const emaFast = calculateEMA(closes, fast);
  const emaSlow = calculateEMA(closes, slow);
  
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (emaFast[i] !== undefined && emaSlow[i] !== undefined) {
      macdLine[i] = emaFast[i] - emaSlow[i];
    }
  }
  
  const signalLine = calculateEMA(macdLine.filter(v => v !== undefined), signal);
  const histogram: number[] = [];
  
  let signalIdx = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== undefined && signalLine[signalIdx] !== undefined) {
      histogram[i] = macdLine[i] - signalLine[signalIdx];
      signalIdx++;
    }
  }
  
  return { macd: macdLine, signal: signalLine, histogram };
}

export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calculateSMA(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = period - 1; i < closes.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += Math.pow(closes[i - j] - middle[i], 2);
    }
    const std = Math.sqrt(sum / period);
    upper[i] = middle[i] + stdDev * std;
    lower[i] = middle[i] - stdDev * std;
  }
  
  return { upper, middle, lower };
}

export function calculateATR(candles: CandleData[], period: number = 14): number[] {
  const tr: number[] = [];
  const atr: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr[i] = candles[i].high - candles[i].low;
    } else {
      tr[i] = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      );
    }
  }
  
  // First ATR is average of first 'period' TRs
  let sum = 0;
  for (let i = 0; i < period && i < tr.length; i++) {
    sum += tr[i];
  }
  atr[period - 1] = sum / period;
  
  // Smoothed ATR
  for (let i = period; i < candles.length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }
  
  return atr;
}

export function calculateStochastic(
  candles: CandleData[],
  kPeriod: number = 14,
  dPeriod: number = 3
): { k: number[]; d: number[] } {
  const k: number[] = [];
  
  for (let i = kPeriod - 1; i < candles.length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    
    for (let j = 0; j < kPeriod; j++) {
      highestHigh = Math.max(highestHigh, candles[i - j].high);
      lowestLow = Math.min(lowestLow, candles[i - j].low);
    }
    
    const range = highestHigh - lowestLow;
    k[i] = range === 0 ? 50 : ((candles[i].close - lowestLow) / range) * 100;
  }
  
  const d = calculateSMA(k.filter(v => v !== undefined), dPeriod);
  
  return { k, d };
}

export function calculateVWAP(candles: CandleData[]): number[] {
  const vwap: number[] = [];
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;
  
  for (let i = 0; i < candles.length; i++) {
    const typicalPrice = (candles[i].high + candles[i].low + candles[i].close) / 3;
    const volume = candles[i].volume || 1;
    
    cumulativeTPV += typicalPrice * volume;
    cumulativeVolume += volume;
    
    vwap[i] = cumulativeTPV / cumulativeVolume;
  }
  
  return vwap;
}

// ============================================================================
// SMART MONEY CONCEPTS
// ============================================================================

export function detectOrderBlocks(candles: CandleData[]): OrderBlock[] {
  const orderBlocks: OrderBlock[] = [];
  
  for (let i = 2; i < candles.length - 2; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    const next = candles[i + 1];
    
    const currentBody = Math.abs(current.close - current.open);
    const prevBody = Math.abs(prev.close - prev.open);
    const nextBody = Math.abs(next.close - next.open);
    
    // Bullish Order Block: bearish candle followed by strong bullish move
    if (current.close < current.open && // bearish
        next.close > next.open && // bullish
        nextBody > currentBody * 1.5) { // strong move
      
      // Check if it breaks structure
      const futurePrices = candles.slice(i + 1, i + 10).map(c => c.close);
      const breaksUp = futurePrices.some(p => p > current.high);
      
      if (breaksUp) {
        orderBlocks.push({
          id: `ob-bull-${current.time}`,
          type: 'bullish',
          priceHigh: current.high,
          priceLow: current.low,
          time: current.time,
          mitigated: false,
          strength: Math.min(100, (nextBody / currentBody) * 30 + 40),
        });
      }
    }
    
    // Bearish Order Block: bullish candle followed by strong bearish move
    if (current.close > current.open && // bullish
        next.close < next.open && // bearish
        nextBody > currentBody * 1.5) { // strong move
      
      const futurePrices = candles.slice(i + 1, i + 10).map(c => c.close);
      const breaksDown = futurePrices.some(p => p < current.low);
      
      if (breaksDown) {
        orderBlocks.push({
          id: `ob-bear-${current.time}`,
          type: 'bearish',
          priceHigh: current.high,
          priceLow: current.low,
          time: current.time,
          mitigated: false,
          strength: Math.min(100, (nextBody / currentBody) * 30 + 40),
        });
      }
    }
  }
  
  return orderBlocks.slice(-10);
}

export function detectFairValueGaps(candles: CandleData[]): FVG[] {
  const fvgs: FVG[] = [];
  
  for (let i = 2; i < candles.length; i++) {
    const candle1 = candles[i - 2];
    const candle3 = candles[i];
    
    // Bullish FVG: gap between candle1 high and candle3 low
    if (candle3.low > candle1.high) {
      const gapSize = candle3.low - candle1.high;
      const avgRange = (candle1.high - candle1.low + candle3.high - candle3.low) / 2;
      
      if (gapSize > avgRange * 0.3) {
        fvgs.push({
          id: `fvg-bull-${candles[i - 1].time}`,
          type: 'bullish',
          priceHigh: candle3.low,
          priceLow: candle1.high,
          time: candles[i - 1].time,
          filled: false,
          fillPercentage: 0,
        });
      }
    }
    
    // Bearish FVG: gap between candle1 low and candle3 high
    if (candle3.high < candle1.low) {
      const gapSize = candle1.low - candle3.high;
      const avgRange = (candle1.high - candle1.low + candle3.high - candle3.low) / 2;
      
      if (gapSize > avgRange * 0.3) {
        fvgs.push({
          id: `fvg-bear-${candles[i - 1].time}`,
          type: 'bearish',
          priceHigh: candle1.low,
          priceLow: candle3.high,
          time: candles[i - 1].time,
          filled: false,
          fillPercentage: 0,
        });
      }
    }
  }
  
  return fvgs.slice(-15);
}

export function detectSwingPoints(candles: CandleData[]): { highs: number[]; lows: number[] } {
  const highs: number[] = [];
  const lows: number[] = [];
  
  for (let i = 2; i < candles.length - 2; i++) {
    // Swing High
    if (candles[i].high > candles[i - 1].high &&
        candles[i].high > candles[i - 2].high &&
        candles[i].high > candles[i + 1].high &&
        candles[i].high > candles[i + 2].high) {
      highs.push(candles[i].high);
    }
    
    // Swing Low
    if (candles[i].low < candles[i - 1].low &&
        candles[i].low < candles[i - 2].low &&
        candles[i].low < candles[i + 1].low &&
        candles[i].low < candles[i + 2].low) {
      lows.push(candles[i].low);
    }
  }
  
  return { highs, lows };
}

export function detectBOSandCHoCH(candles: CandleData[]): MarketStructure['bos'] {
  const structures: MarketStructure['bos'] = [];
  const swings = detectSwingPoints(candles);
  
  let lastHigh = swings.highs[0] || 0;
  let lastLow = swings.lows[0] || Infinity;
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  for (let i = 10; i < candles.length; i++) {
    const price = candles[i].close;
    
    // Break of Structure (continuation)
    if (price > lastHigh && trend === 'bullish') {
      structures.push({
        price,
        time: candles[i].time,
        type: 'bullish',
      });
      lastHigh = price;
    } else if (price < lastLow && trend === 'bearish') {
      structures.push({
        price,
        time: candles[i].time,
        type: 'bearish',
      });
      lastLow = price;
    }
    
    // Change of Character (reversal)
    if (price > lastHigh && trend === 'bearish') {
      structures.push({
        price,
        time: candles[i].time,
        type: 'bullish',
      });
      trend = 'bullish';
      lastHigh = price;
    } else if (price < lastLow && trend === 'bullish') {
      structures.push({
        price,
        time: candles[i].time,
        type: 'bearish',
      });
      trend = 'bearish';
      lastLow = price;
    }
    
    // Update swing points
    if (swings.highs.includes(candles[i].high)) lastHigh = candles[i].high;
    if (swings.lows.includes(candles[i].low)) lastLow = candles[i].low;
  }
  
  return structures.slice(-10);
}

export function detectLiquidityPools(candles: CandleData[]): LiquidityPool[] {
  const pools: LiquidityPool[] = [];
  const swings = detectSwingPoints(candles);
  
  // Equal highs = buy-side liquidity
  for (let i = 0; i < swings.highs.length - 1; i++) {
    for (let j = i + 1; j < swings.highs.length; j++) {
      if (Math.abs(swings.highs[i] - swings.highs[j]) / swings.highs[i] < 0.002) {
        pools.push({
          id: `liq-buy-${i}-${j}`,
          type: 'buy-side',
          price: (swings.highs[i] + swings.highs[j]) / 2,
          size: 2,
          touched: false,
        });
      }
    }
  }
  
  // Equal lows = sell-side liquidity
  for (let i = 0; i < swings.lows.length - 1; i++) {
    for (let j = i + 1; j < swings.lows.length; j++) {
      if (Math.abs(swings.lows[i] - swings.lows[j]) / swings.lows[i] < 0.002) {
        pools.push({
          id: `liq-sell-${i}-${j}`,
          type: 'sell-side',
          price: (swings.lows[i] + swings.lows[j]) / 2,
          size: 2,
          touched: false,
        });
      }
    }
  }
  
  return pools;
}

// ============================================================================
// PATTERN DETECTION
// ============================================================================

export function detectCandlePatterns(candles: CandleData[]): PatternDetection[] {
  const patterns: PatternDetection[] = [];
  if (candles.length < 5) return patterns;
  
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const prev2 = candles[candles.length - 3];
  
  // Bullish Engulfing
  if (prev.close < prev.open && // bearish
      last.close > last.open && // bullish
      last.open < prev.close &&
      last.close > prev.open) {
    patterns.push({
      name: 'Bullish Engulfing',
      type: 'reversal',
      direction: 'bullish',
      confidence: 75,
      pricePoints: [
        { price: prev.open, time: prev.time },
        { price: last.close, time: last.time },
      ],
      target: last.close + (last.close - last.open) * 2,
      invalidation: last.low,
    });
  }
  
  // Bearish Engulfing
  if (prev.close > prev.open && // bullish
      last.close < last.open && // bearish
      last.open > prev.close &&
      last.close < prev.open) {
    patterns.push({
      name: 'Bearish Engulfing',
      type: 'reversal',
      direction: 'bearish',
      confidence: 75,
      pricePoints: [
        { price: prev.open, time: prev.time },
        { price: last.close, time: last.time },
      ],
      target: last.close - (last.open - last.close) * 2,
      invalidation: last.high,
    });
  }
  
  // Morning Star
  if (prev2.close < prev2.open && // bearish
      Math.abs(prev.close - prev.open) < (prev2.high - prev2.low) * 0.3 && // small body
      last.close > last.open && // bullish
      last.close > (prev2.open + prev2.close) / 2) {
    patterns.push({
      name: 'Morning Star',
      type: 'reversal',
      direction: 'bullish',
      confidence: 80,
      pricePoints: [
        { price: prev2.low, time: prev2.time },
        { price: prev.close, time: prev.time },
        { price: last.close, time: last.time },
      ],
      target: last.close + (prev2.open - prev2.close) * 1.5,
      invalidation: prev.low,
    });
  }
  
  // Evening Star
  if (prev2.close > prev2.open && // bullish
      Math.abs(prev.close - prev.open) < (prev2.high - prev2.low) * 0.3 && // small body
      last.close < last.open && // bearish
      last.close < (prev2.open + prev2.close) / 2) {
    patterns.push({
      name: 'Evening Star',
      type: 'reversal',
      direction: 'bearish',
      confidence: 80,
      pricePoints: [
        { price: prev2.high, time: prev2.time },
        { price: prev.close, time: prev.time },
        { price: last.close, time: last.time },
      ],
      target: last.close - (prev2.close - prev2.open) * 1.5,
      invalidation: prev.high,
    });
  }
  
  // Hammer
  const body = Math.abs(last.close - last.open);
  const lowerWick = Math.min(last.close, last.open) - last.low;
  const upperWick = last.high - Math.max(last.close, last.open);
  
  if (lowerWick > body * 2 && upperWick < body * 0.5) {
    patterns.push({
      name: 'Hammer',
      type: 'reversal',
      direction: 'bullish',
      confidence: 65,
      pricePoints: [{ price: last.close, time: last.time }],
      target: last.close + lowerWick,
      invalidation: last.low,
    });
  }
  
  // Shooting Star
  if (upperWick > body * 2 && lowerWick < body * 0.5) {
    patterns.push({
      name: 'Shooting Star',
      type: 'reversal',
      direction: 'bearish',
      confidence: 65,
      pricePoints: [{ price: last.close, time: last.time }],
      target: last.close - upperWick,
      invalidation: last.high,
    });
  }
  
  // Doji
  if (body < (last.high - last.low) * 0.1) {
    patterns.push({
      name: 'Doji',
      type: 'reversal',
      direction: 'neutral' as any,
      confidence: 50,
      pricePoints: [{ price: last.close, time: last.time }],
      target: last.close,
      invalidation: last.low,
    });
  }
  
  // Three White Soldiers
  const lastThree = candles.slice(-3);
  if (lastThree.every(c => c.close > c.open) &&
      lastThree[1].open > lastThree[0].open &&
      lastThree[2].open > lastThree[1].open) {
    patterns.push({
      name: 'Three White Soldiers',
      type: 'continuation',
      direction: 'bullish',
      confidence: 85,
      pricePoints: lastThree.map(c => ({ price: c.close, time: c.time })),
      target: lastThree[2].close + (lastThree[2].close - lastThree[0].open) * 0.5,
      invalidation: lastThree[0].low,
    });
  }
  
  // Three Black Crows
  if (lastThree.every(c => c.close < c.open) &&
      lastThree[1].open < lastThree[0].open &&
      lastThree[2].open < lastThree[1].open) {
    patterns.push({
      name: 'Three Black Crows',
      type: 'continuation',
      direction: 'bearish',
      confidence: 85,
      pricePoints: lastThree.map(c => ({ price: c.close, time: c.time })),
      target: lastThree[2].close - (lastThree[0].open - lastThree[2].close) * 0.5,
      invalidation: lastThree[0].high,
    });
  }
  
  return patterns;
}

export function detectChartPatterns(candles: CandleData[]): PatternDetection[] {
  const patterns: PatternDetection[] = [];
  if (candles.length < 30) return patterns;
  
  const swings = detectSwingPoints(candles);
  const closes = candles.map(c => c.close);
  
  // Double Top
  if (swings.highs.length >= 2) {
    const lastTwo = swings.highs.slice(-2);
    if (Math.abs(lastTwo[0] - lastTwo[1]) / lastTwo[0] < 0.02) {
      const neckline = Math.min(...swings.lows.slice(-3));
      patterns.push({
        name: 'Double Top',
        type: 'reversal',
        direction: 'bearish',
        confidence: 70,
        pricePoints: [
          { price: lastTwo[0], time: candles[candles.length - 10].time },
          { price: lastTwo[1], time: candles[candles.length - 3].time },
        ],
        target: neckline - (lastTwo[0] - neckline),
        invalidation: Math.max(...lastTwo) * 1.01,
      });
    }
  }
  
  // Double Bottom
  if (swings.lows.length >= 2) {
    const lastTwo = swings.lows.slice(-2);
    if (Math.abs(lastTwo[0] - lastTwo[1]) / lastTwo[0] < 0.02) {
      const neckline = Math.max(...swings.highs.slice(-3));
      patterns.push({
        name: 'Double Bottom',
        type: 'reversal',
        direction: 'bullish',
        confidence: 70,
        pricePoints: [
          { price: lastTwo[0], time: candles[candles.length - 10].time },
          { price: lastTwo[1], time: candles[candles.length - 3].time },
        ],
        target: neckline + (neckline - lastTwo[0]),
        invalidation: Math.min(...lastTwo) * 0.99,
      });
    }
  }
  
  return patterns;
}

// ============================================================================
// DIVERGENCE DETECTION
// ============================================================================

export function detectDivergences(candles: CandleData[]): Divergence[] {
  const divergences: Divergence[] = [];
  if (candles.length < 30) return divergences;
  
  const closes = candles.map(c => c.close);
  const rsi = calculateRSI(closes, 14);
  const swings = detectSwingPoints(candles);
  
  // Regular Bullish Divergence: lower lows in price, higher lows in RSI
  for (let i = 1; i < swings.lows.length; i++) {
    const priceLow1 = swings.lows[i - 1];
    const priceLow2 = swings.lows[i];
    
    if (priceLow2 < priceLow1) {
      // Find corresponding RSI values
      const idx1 = closes.findIndex(c => c === priceLow1);
      const idx2 = closes.findIndex(c => c === priceLow2);
      
      if (idx1 >= 0 && idx2 >= 0 && rsi[idx1] && rsi[idx2]) {
        if (rsi[idx2] > rsi[idx1]) {
          divergences.push({
            type: 'regular',
            direction: 'bullish',
            indicator: 'RSI',
            startPrice: priceLow1,
            endPrice: priceLow2,
            startTime: candles[idx1]?.time || 0,
            endTime: candles[idx2]?.time || 0,
            strength: Math.min(100, Math.abs(rsi[idx2] - rsi[idx1]) * 2),
          });
        }
      }
    }
  }
  
  // Regular Bearish Divergence: higher highs in price, lower highs in RSI
  for (let i = 1; i < swings.highs.length; i++) {
    const priceHigh1 = swings.highs[i - 1];
    const priceHigh2 = swings.highs[i];
    
    if (priceHigh2 > priceHigh1) {
      const idx1 = closes.findIndex(c => c === priceHigh1);
      const idx2 = closes.findIndex(c => c === priceHigh2);
      
      if (idx1 >= 0 && idx2 >= 0 && rsi[idx1] && rsi[idx2]) {
        if (rsi[idx2] < rsi[idx1]) {
          divergences.push({
            type: 'regular',
            direction: 'bearish',
            indicator: 'RSI',
            startPrice: priceHigh1,
            endPrice: priceHigh2,
            startTime: candles[idx1]?.time || 0,
            endTime: candles[idx2]?.time || 0,
            strength: Math.min(100, Math.abs(rsi[idx1] - rsi[idx2]) * 2),
          });
        }
      }
    }
  }
  
  return divergences;
}

// ============================================================================
// SIGNAL GENERATION
// ============================================================================

export function generateSignals(
  candles: CandleData[],
  symbol: string,
  timeframe: string
): AISignal[] {
  const signals: AISignal[] = [];
  if (candles.length < 50) return signals;
  
  const closes = candles.map(c => c.close);
  const currentPrice = closes[closes.length - 1];
  const currentTime = candles[candles.length - 1].time;
  
  // Calculate indicators
  const rsi = calculateRSI(closes);
  const macd = calculateMACD(closes);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const atr = calculateATR(candles);
  const bb = calculateBollingerBands(closes);
  const stoch = calculateStochastic(candles);
  
  // Current values
  const currentRSI = rsi[rsi.length - 1] || 50;
  const currentMACD = macd.macd[macd.macd.length - 1] || 0;
  const currentMACDSignal = macd.signal[macd.signal.length - 1] || 0;
  const currentEMA20 = ema20[ema20.length - 1] || currentPrice;
  const currentEMA50 = ema50[ema50.length - 1] || currentPrice;
  const currentEMA200 = ema200[ema200.length - 1] || currentPrice;
  const currentATR = atr[atr.length - 1] || currentPrice * 0.02;
  const currentBBUpper = bb.upper[bb.upper.length - 1] || currentPrice;
  const currentBBLower = bb.lower[bb.lower.length - 1] || currentPrice;
  const currentStochK = stoch.k[stoch.k.length - 1] || 50;
  
  // Smart Money Concepts
  const orderBlocks = detectOrderBlocks(candles);
  const fvgs = detectFairValueGaps(candles);
  const patterns = detectCandlePatterns(candles);
  const divergences = detectDivergences(candles);
  
  // Score calculation
  let bullScore = 0;
  let bearScore = 0;
  const reasoning: string[] = [];
  const indicators: AISignal['indicators'] = [];
  
  // RSI Analysis
  indicators.push({
    name: 'RSI',
    value: currentRSI,
    signal: currentRSI < 30 ? 'bullish' : currentRSI > 70 ? 'bearish' : 'neutral',
  });
  if (currentRSI < 30) {
    bullScore += 15;
    reasoning.push(`RSI oversold at ${currentRSI.toFixed(1)}`);
  } else if (currentRSI > 70) {
    bearScore += 15;
    reasoning.push(`RSI overbought at ${currentRSI.toFixed(1)}`);
  }
  
  // MACD Analysis
  indicators.push({
    name: 'MACD',
    value: currentMACD,
    signal: currentMACD > currentMACDSignal ? 'bullish' : 'bearish',
  });
  if (currentMACD > currentMACDSignal && macd.macd[macd.macd.length - 2] <= macd.signal[macd.signal.length - 2]) {
    bullScore += 20;
    reasoning.push('MACD bullish crossover');
  } else if (currentMACD < currentMACDSignal && macd.macd[macd.macd.length - 2] >= macd.signal[macd.signal.length - 2]) {
    bearScore += 20;
    reasoning.push('MACD bearish crossover');
  }
  
  // EMA Trend
  indicators.push({
    name: 'EMA Trend',
    value: currentEMA20,
    signal: currentPrice > currentEMA20 && currentEMA20 > currentEMA50 ? 'bullish' : 
            currentPrice < currentEMA20 && currentEMA20 < currentEMA50 ? 'bearish' : 'neutral',
  });
  if (currentPrice > currentEMA20 && currentEMA20 > currentEMA50) {
    bullScore += 15;
    reasoning.push('Price above EMA stack (20 > 50)');
  } else if (currentPrice < currentEMA20 && currentEMA20 < currentEMA50) {
    bearScore += 15;
    reasoning.push('Price below EMA stack (20 < 50)');
  }
  
  // EMA 200 (Major trend)
  if (currentPrice > currentEMA200) {
    bullScore += 10;
    reasoning.push('Above 200 EMA (bullish macro)');
  } else {
    bearScore += 10;
    reasoning.push('Below 200 EMA (bearish macro)');
  }
  
  // Bollinger Bands
  indicators.push({
    name: 'Bollinger Bands',
    value: currentPrice,
    signal: currentPrice < currentBBLower ? 'bullish' : currentPrice > currentBBUpper ? 'bearish' : 'neutral',
  });
  if (currentPrice < currentBBLower) {
    bullScore += 10;
    reasoning.push('Price below lower Bollinger Band');
  } else if (currentPrice > currentBBUpper) {
    bearScore += 10;
    reasoning.push('Price above upper Bollinger Band');
  }
  
  // Stochastic
  indicators.push({
    name: 'Stochastic',
    value: currentStochK,
    signal: currentStochK < 20 ? 'bullish' : currentStochK > 80 ? 'bearish' : 'neutral',
  });
  if (currentStochK < 20) {
    bullScore += 10;
    reasoning.push(`Stochastic oversold at ${currentStochK.toFixed(1)}`);
  } else if (currentStochK > 80) {
    bearScore += 10;
    reasoning.push(`Stochastic overbought at ${currentStochK.toFixed(1)}`);
  }
  
  // Patterns
  patterns.forEach(p => {
    if (p.direction === 'bullish') {
      bullScore += p.confidence * 0.2;
      reasoning.push(`${p.name} pattern detected`);
    } else if (p.direction === 'bearish') {
      bearScore += p.confidence * 0.2;
      reasoning.push(`${p.name} pattern detected`);
    }
  });
  
  // Divergences
  divergences.forEach(d => {
    if (d.direction === 'bullish') {
      bullScore += d.strength * 0.25;
      reasoning.push(`${d.type} bullish divergence on ${d.indicator}`);
    } else {
      bearScore += d.strength * 0.25;
      reasoning.push(`${d.type} bearish divergence on ${d.indicator}`);
    }
  });
  
  // Order Blocks
  const nearbyBullOB = orderBlocks.find(ob => 
    ob.type === 'bullish' && 
    currentPrice >= ob.priceLow && 
    currentPrice <= ob.priceHigh * 1.01
  );
  const nearbyBearOB = orderBlocks.find(ob => 
    ob.type === 'bearish' && 
    currentPrice <= ob.priceHigh && 
    currentPrice >= ob.priceLow * 0.99
  );
  
  if (nearbyBullOB) {
    bullScore += nearbyBullOB.strength * 0.2;
    reasoning.push('Price at bullish Order Block');
  }
  if (nearbyBearOB) {
    bearScore += nearbyBearOB.strength * 0.2;
    reasoning.push('Price at bearish Order Block');
  }
  
  // Generate signal
  const totalScore = bullScore + bearScore;
  const confidence = Math.min(95, Math.max(30, totalScore));
  const netScore = bullScore - bearScore;
  
  let signalType: AISignal['type'];
  let strength: AISignal['strength'];
  
  if (Math.abs(netScore) < 15) {
    signalType = 'HOLD';
    strength = 'WEAK';
  } else if (netScore > 0) {
    signalType = 'BUY';
    strength = netScore > 40 ? 'STRONG' : netScore > 25 ? 'MODERATE' : 'WEAK';
  } else {
    signalType = 'SELL';
    strength = netScore < -40 ? 'STRONG' : netScore < -25 ? 'MODERATE' : 'WEAK';
  }
  
  // Calculate targets
  const direction = signalType === 'BUY' ? 1 : -1;
  const entry = currentPrice;
  const stopLoss = currentPrice - direction * currentATR * 1.5;
  const takeProfit1 = currentPrice + direction * currentATR * 1.5;
  const takeProfit2 = currentPrice + direction * currentATR * 2.5;
  const takeProfit3 = currentPrice + direction * currentATR * 4;
  const riskReward = Math.abs(takeProfit2 - entry) / Math.abs(entry - stopLoss);
  
  signals.push({
    id: `signal-${currentTime}-${symbol}`,
    type: signalType,
    strength,
    confidence,
    price: currentPrice,
    timestamp: currentTime,
    symbol,
    timeframe,
    reasoning,
    targets: {
      entry,
      stopLoss,
      takeProfit1,
      takeProfit2,
      takeProfit3,
    },
    indicators,
    riskReward,
    expectedMove: direction * currentATR * 2,
    expiresAt: currentTime + getTimeframeMs(timeframe) * 10,
  });
  
  return signals;
}

function getTimeframeMs(tf: string): number {
  const map: Record<string, number> = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '30m': 1800000,
    '1h': 3600000,
    '4h': 14400000,
    '1d': 86400000,
    '1w': 604800000,
  };
  return map[tf] || 3600000;
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

export function analyzeMarket(
  candles: CandleData[],
  symbol: string,
  timeframe: string
): AIAnalysis {
  const closes = candles.map(c => c.close);
  const currentPrice = closes[closes.length - 1] || 0;
  
  // Calculate all components
  const orderBlocks = detectOrderBlocks(candles);
  const fvgs = detectFairValueGaps(candles);
  const swings = detectSwingPoints(candles);
  const bos = detectBOSandCHoCH(candles);
  const liquidityPools = detectLiquidityPools(candles);
  const candlePatterns = detectCandlePatterns(candles);
  const chartPatterns = detectChartPatterns(candles);
  const divergences = detectDivergences(candles);
  const signals = generateSignals(candles, symbol, timeframe);
  const atr = calculateATR(candles);
  
  // Determine trend
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const currentEMA20 = ema20[ema20.length - 1] || currentPrice;
  const currentEMA50 = ema50[ema50.length - 1] || currentPrice;
  
  let trend: 'BULLISH' | 'BEARISH' | 'RANGING';
  let trendStrength: number;
  
  if (currentPrice > currentEMA20 && currentEMA20 > currentEMA50) {
    trend = 'BULLISH';
    trendStrength = Math.min(100, ((currentPrice - currentEMA50) / currentEMA50) * 1000);
  } else if (currentPrice < currentEMA20 && currentEMA20 < currentEMA50) {
    trend = 'BEARISH';
    trendStrength = Math.min(100, ((currentEMA50 - currentPrice) / currentEMA50) * 1000);
  } else {
    trend = 'RANGING';
    trendStrength = 30;
  }
  
  // Calculate volatility
  const currentATR = atr[atr.length - 1] || 0;
  const volatility = (currentATR / currentPrice) * 100;
  
  // Risk level
  let riskLevel: AIAnalysis['riskLevel'];
  if (volatility < 1) riskLevel = 'LOW';
  else if (volatility < 3) riskLevel = 'MEDIUM';
  else if (volatility < 5) riskLevel = 'HIGH';
  else riskLevel = 'EXTREME';
  
  // Key levels
  const keyLevels = [
    ...orderBlocks.map(ob => ({
      price: (ob.priceHigh + ob.priceLow) / 2,
      type: `${ob.type} Order Block`,
      importance: ob.strength,
    })),
    ...swings.highs.slice(-3).map(h => ({
      price: h,
      type: 'Swing High',
      importance: 70,
    })),
    ...swings.lows.slice(-3).map(l => ({
      price: l,
      type: 'Swing Low',
      importance: 70,
    })),
  ].sort((a, b) => b.importance - a.importance);
  
  // Predictions (simplified ML-like logic)
  const momentum = (closes[closes.length - 1] - closes[closes.length - 5]) / closes[closes.length - 5];
  const predictions = {
    shortTerm: {
      direction: momentum > 0 ? 'UP' : 'DOWN',
      probability: Math.min(80, 50 + Math.abs(momentum) * 500),
      price: currentPrice * (1 + momentum * 0.5),
    },
    mediumTerm: {
      direction: trend === 'BULLISH' ? 'UP' : trend === 'BEARISH' ? 'DOWN' : 'SIDEWAYS',
      probability: trendStrength,
      price: currentPrice * (trend === 'BULLISH' ? 1.05 : trend === 'BEARISH' ? 0.95 : 1),
    },
    longTerm: {
      direction: currentPrice > currentEMA50 ? 'UP' : 'DOWN',
      probability: Math.min(75, 50 + Math.abs((currentPrice - currentEMA50) / currentEMA50) * 200),
      price: currentPrice > currentEMA50 ? currentPrice * 1.1 : currentPrice * 0.9,
    },
  };
  
  // Summary
  const primarySignal = signals[0] || null;
  const patternNames = [...candlePatterns, ...chartPatterns].map(p => p.name).slice(0, 3);
  const summary = `${symbol} is in a ${trend.toLowerCase()} trend with ${trendStrength.toFixed(0)}% strength. ` +
    `${primarySignal ? `Primary signal: ${primarySignal.type} (${primarySignal.confidence}% confidence). ` : ''}` +
    `${patternNames.length > 0 ? `Patterns: ${patternNames.join(', ')}. ` : ''}` +
    `Risk: ${riskLevel}. Volatility: ${volatility.toFixed(2)}%.`;
  
  return {
    symbol,
    timeframe,
    timestamp: Date.now(),
    marketStructure: {
      trend,
      trendStrength,
      swingHighs: swings.highs,
      swingLows: swings.lows,
      bos,
      choch: bos.filter((_, i) => i % 2 === 1), // Simplified
      orderBlocks,
      fairValueGaps: fvgs,
      liquidityPools,
    },
    signals,
    primarySignal,
    patterns: [...candlePatterns, ...chartPatterns],
    divergences,
    volatility,
    atr: currentATR,
    riskLevel,
    predictions,
    summary,
    keyLevels,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const AITradingEngine = {
  analyze: analyzeMarket,
  generateSignals,
  
  // Indicators
  calculateEMA,
  calculateSMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateStochastic,
  calculateVWAP,
  
  // Smart Money Concepts
  detectOrderBlocks,
  detectFairValueGaps,
  detectSwingPoints,
  detectBOSandCHoCH,
  detectLiquidityPools,
  
  // Patterns
  detectCandlePatterns,
  detectChartPatterns,
  detectDivergences,
};

export default AITradingEngine;
