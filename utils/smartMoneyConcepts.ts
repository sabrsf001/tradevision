/**
 * Smart Money Concepts (SMC) Analysis - TradeVision
 * Professional-grade institutional trading pattern detection
 * 
 * Features:
 * - Order Blocks (OB)
 * - Fair Value Gaps (FVG) / Imbalances
 * - Break of Structure (BOS)
 * - Change of Character (CHoCH)
 * - Liquidity Sweeps
 * - Premium/Discount Zones
 * - Swing Highs/Lows
 */

import type { CandleData } from '../types';

// ============================================
// Types
// ============================================

export interface SwingPoint {
  time: number;
  price: number;
  type: 'high' | 'low';
  index: number;
  strength: number; // Number of candles on each side that confirm this swing
}

export interface OrderBlock {
  id: string;
  type: 'bullish' | 'bearish';
  zone: {
    top: number;
    bottom: number;
    startTime: number;
    endTime: number;
  };
  mitigated: boolean;
  mitigationTime?: number;
  strength: 'strong' | 'medium' | 'weak';
  origin: 'bos' | 'choch' | 'displacement';
  respectCount: number;
}

export interface FairValueGap {
  id: string;
  type: 'bullish' | 'bearish';
  zone: {
    top: number;
    bottom: number;
    startTime: number;
    endTime: number;
  };
  filled: boolean;
  fillPercentage: number;
  size: number; // Percentage of price
  isInversion: boolean; // FVG that becomes opposite after fill
}

export interface StructureBreak {
  id: string;
  type: 'bos' | 'choch';
  direction: 'bullish' | 'bearish';
  brokenLevel: number;
  breakTime: number;
  confirmationCandle: number;
  swingPoint: SwingPoint;
}

export interface LiquiditySweep {
  id: string;
  type: 'buy-side' | 'sell-side';
  sweptLevel: number;
  sweepTime: number;
  wickSize: number;
  closeAbove: boolean; // True if closed back above/below the swept level
  isValid: boolean;
}

export interface PremiumDiscountZone {
  equilibrium: number;
  premium: { top: number; bottom: number };
  discount: { top: number; bottom: number };
  swingHigh: number;
  swingLow: number;
}

export interface SMCAnalysisResult {
  swingPoints: SwingPoint[];
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  structureBreaks: StructureBreak[];
  liquiditySweeps: LiquiditySweep[];
  premiumDiscount: PremiumDiscountZone | null;
  trend: 'bullish' | 'bearish' | 'ranging';
  bias: 'long' | 'short' | 'neutral';
  keyLevels: { price: number; type: string; strength: number }[];
}

// ============================================
// Swing Point Detection
// ============================================

export function detectSwingPoints(
  candles: CandleData[],
  lookback: number = 5
): SwingPoint[] {
  const swings: SwingPoint[] = [];
  
  for (let i = lookback; i < candles.length - lookback; i++) {
    const candle = candles[i];
    let isSwingHigh = true;
    let isSwingLow = true;
    let strengthHigh = 0;
    let strengthLow = 0;
    
    // Check left and right for swing high
    for (let j = 1; j <= lookback; j++) {
      if (candles[i - j].high >= candle.high) isSwingHigh = false;
      else strengthHigh++;
      
      if (candles[i + j].high >= candle.high) isSwingHigh = false;
      else strengthHigh++;
    }
    
    // Check left and right for swing low
    for (let j = 1; j <= lookback; j++) {
      if (candles[i - j].low <= candle.low) isSwingLow = false;
      else strengthLow++;
      
      if (candles[i + j].low <= candle.low) isSwingLow = false;
      else strengthLow++;
    }
    
    if (isSwingHigh) {
      swings.push({
        time: candle.time,
        price: candle.high,
        type: 'high',
        index: i,
        strength: strengthHigh,
      });
    }
    
    if (isSwingLow) {
      swings.push({
        time: candle.time,
        price: candle.low,
        type: 'low',
        index: i,
        strength: strengthLow,
      });
    }
  }
  
  return swings.sort((a, b) => a.time - b.time);
}

// ============================================
// Order Block Detection
// ============================================

export function detectOrderBlocks(
  candles: CandleData[],
  swingPoints: SwingPoint[]
): OrderBlock[] {
  const orderBlocks: OrderBlock[] = [];
  const avgRange = calculateATR(candles, 14);
  
  for (let i = 3; i < candles.length - 1; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    const next = candles[i + 1];
    
    // Bullish Order Block: Last bearish candle before impulsive bullish move
    const isBullishOB = 
      prev.close < prev.open && // Bearish candle
      current.close > current.open && // Bullish candle
      (current.close - current.open) > avgRange * 1.5 && // Impulsive
      next.close > current.close; // Continuation
    
    // Bearish Order Block: Last bullish candle before impulsive bearish move
    const isBearishOB =
      prev.close > prev.open && // Bullish candle
      current.close < current.open && // Bearish candle
      (current.open - current.close) > avgRange * 1.5 && // Impulsive
      next.close < current.close; // Continuation
    
    if (isBullishOB) {
      const ob: OrderBlock = {
        id: `ob_bull_${current.time}`,
        type: 'bullish',
        zone: {
          top: Math.max(prev.open, prev.close),
          bottom: prev.low,
          startTime: prev.time,
          endTime: current.time,
        },
        mitigated: false,
        strength: calculateOBStrength(candles, i, 'bullish'),
        origin: 'displacement',
        respectCount: 0,
      };
      
      // Check if mitigated
      for (let j = i + 1; j < candles.length; j++) {
        if (candles[j].low <= ob.zone.top) {
          ob.mitigated = true;
          ob.mitigationTime = candles[j].time;
          break;
        }
        if (candles[j].low <= ob.zone.bottom && candles[j].low >= ob.zone.bottom) {
          ob.respectCount++;
        }
      }
      
      orderBlocks.push(ob);
    }
    
    if (isBearishOB) {
      const ob: OrderBlock = {
        id: `ob_bear_${current.time}`,
        type: 'bearish',
        zone: {
          top: prev.high,
          bottom: Math.min(prev.open, prev.close),
          startTime: prev.time,
          endTime: current.time,
        },
        mitigated: false,
        strength: calculateOBStrength(candles, i, 'bearish'),
        origin: 'displacement',
        respectCount: 0,
      };
      
      // Check if mitigated
      for (let j = i + 1; j < candles.length; j++) {
        if (candles[j].high >= ob.zone.bottom) {
          ob.mitigated = true;
          ob.mitigationTime = candles[j].time;
          break;
        }
        if (candles[j].high >= ob.zone.top) {
          ob.respectCount++;
        }
      }
      
      orderBlocks.push(ob);
    }
  }
  
  return orderBlocks;
}

function calculateOBStrength(
  candles: CandleData[],
  index: number,
  type: 'bullish' | 'bearish'
): 'strong' | 'medium' | 'weak' {
  const avgVolume = candles.slice(Math.max(0, index - 20), index)
    .reduce((sum, c) => sum + (c.volume || 0), 0) / 20;
  
  const obVolume = candles[index].volume || 0;
  const volumeRatio = obVolume / (avgVolume || 1);
  
  // Calculate displacement (move size after OB)
  let displacement = 0;
  for (let i = index + 1; i < Math.min(index + 5, candles.length); i++) {
    if (type === 'bullish') {
      displacement = Math.max(displacement, candles[i].high - candles[index].close);
    } else {
      displacement = Math.max(displacement, candles[index].close - candles[i].low);
    }
  }
  
  const avgRange = calculateATR(candles.slice(0, index), 14);
  const displacementRatio = displacement / avgRange;
  
  if (volumeRatio > 1.5 && displacementRatio > 2) return 'strong';
  if (volumeRatio > 1 || displacementRatio > 1.5) return 'medium';
  return 'weak';
}

// ============================================
// Fair Value Gap Detection
// ============================================

export function detectFairValueGaps(candles: CandleData[]): FairValueGap[] {
  const fvgs: FairValueGap[] = [];
  
  for (let i = 2; i < candles.length; i++) {
    const candle1 = candles[i - 2];
    const candle2 = candles[i - 1];
    const candle3 = candles[i];
    
    // Bullish FVG: Gap between candle 1 high and candle 3 low
    if (candle3.low > candle1.high) {
      const gapSize = ((candle3.low - candle1.high) / candle2.close) * 100;
      
      if (gapSize > 0.1) { // Minimum gap size threshold
        const fvg: FairValueGap = {
          id: `fvg_bull_${candle2.time}`,
          type: 'bullish',
          zone: {
            top: candle3.low,
            bottom: candle1.high,
            startTime: candle2.time,
            endTime: candle3.time,
          },
          filled: false,
          fillPercentage: 0,
          size: gapSize,
          isInversion: false,
        };
        
        // Check fill status
        for (let j = i + 1; j < candles.length; j++) {
          if (candles[j].low <= fvg.zone.bottom) {
            fvg.filled = true;
            fvg.fillPercentage = 100;
            // Check for inversion (price returns and uses as resistance)
            if (candles[j].close < fvg.zone.bottom) {
              fvg.isInversion = true;
            }
            break;
          } else if (candles[j].low < fvg.zone.top) {
            const fillDepth = fvg.zone.top - candles[j].low;
            const totalGap = fvg.zone.top - fvg.zone.bottom;
            fvg.fillPercentage = Math.max(fvg.fillPercentage, (fillDepth / totalGap) * 100);
          }
        }
        
        fvgs.push(fvg);
      }
    }
    
    // Bearish FVG: Gap between candle 1 low and candle 3 high
    if (candle3.high < candle1.low) {
      const gapSize = ((candle1.low - candle3.high) / candle2.close) * 100;
      
      if (gapSize > 0.1) {
        const fvg: FairValueGap = {
          id: `fvg_bear_${candle2.time}`,
          type: 'bearish',
          zone: {
            top: candle1.low,
            bottom: candle3.high,
            startTime: candle2.time,
            endTime: candle3.time,
          },
          filled: false,
          fillPercentage: 0,
          size: gapSize,
          isInversion: false,
        };
        
        // Check fill status
        for (let j = i + 1; j < candles.length; j++) {
          if (candles[j].high >= fvg.zone.top) {
            fvg.filled = true;
            fvg.fillPercentage = 100;
            if (candles[j].close > fvg.zone.top) {
              fvg.isInversion = true;
            }
            break;
          } else if (candles[j].high > fvg.zone.bottom) {
            const fillDepth = candles[j].high - fvg.zone.bottom;
            const totalGap = fvg.zone.top - fvg.zone.bottom;
            fvg.fillPercentage = Math.max(fvg.fillPercentage, (fillDepth / totalGap) * 100);
          }
        }
        
        fvgs.push(fvg);
      }
    }
  }
  
  return fvgs;
}

// ============================================
// Break of Structure / Change of Character
// ============================================

export function detectStructureBreaks(
  candles: CandleData[],
  swingPoints: SwingPoint[]
): StructureBreak[] {
  const breaks: StructureBreak[] = [];
  let currentTrend: 'bullish' | 'bearish' | 'none' = 'none';
  
  // Need at least 2 swing highs and 2 swing lows
  const highs = swingPoints.filter(s => s.type === 'high');
  const lows = swingPoints.filter(s => s.type === 'low');
  
  if (highs.length < 2 || lows.length < 2) return breaks;
  
  // Determine initial trend
  const recentHighs = highs.slice(-2);
  const recentLows = lows.slice(-2);
  
  if (recentHighs[1].price > recentHighs[0].price && recentLows[1].price > recentLows[0].price) {
    currentTrend = 'bullish';
  } else if (recentHighs[1].price < recentHighs[0].price && recentLows[1].price < recentLows[0].price) {
    currentTrend = 'bearish';
  }
  
  // Check for structure breaks
  for (let i = 1; i < swingPoints.length; i++) {
    const swing = swingPoints[i];
    
    // Find the previous opposite swing
    const prevOpposite = swingPoints
      .slice(0, i)
      .filter(s => s.type !== swing.type)
      .pop();
    
    if (!prevOpposite) continue;
    
    // BOS: Break in trend direction
    // CHoCH: Break against trend direction (trend change)
    
    if (swing.type === 'high') {
      // Price making higher high - check if it breaks previous swing high
      const prevHigh = swingPoints.slice(0, i).filter(s => s.type === 'high').pop();
      
      if (prevHigh) {
        // Check if any candle broke above previous high
        for (let j = prevHigh.index + 1; j < candles.length; j++) {
          if (candles[j].high > prevHigh.price) {
            const isCHoCH = currentTrend === 'bearish';
            breaks.push({
              id: `struct_${isCHoCH ? 'choch' : 'bos'}_bull_${candles[j].time}`,
              type: isCHoCH ? 'choch' : 'bos',
              direction: 'bullish',
              brokenLevel: prevHigh.price,
              breakTime: candles[j].time,
              confirmationCandle: j,
              swingPoint: prevHigh,
            });
            
            if (isCHoCH) currentTrend = 'bullish';
            break;
          }
        }
      }
    } else {
      // Price making lower low - check if it breaks previous swing low
      const prevLow = swingPoints.slice(0, i).filter(s => s.type === 'low').pop();
      
      if (prevLow) {
        for (let j = prevLow.index + 1; j < candles.length; j++) {
          if (candles[j].low < prevLow.price) {
            const isCHoCH = currentTrend === 'bullish';
            breaks.push({
              id: `struct_${isCHoCH ? 'choch' : 'bos'}_bear_${candles[j].time}`,
              type: isCHoCH ? 'choch' : 'bos',
              direction: 'bearish',
              brokenLevel: prevLow.price,
              breakTime: candles[j].time,
              confirmationCandle: j,
              swingPoint: prevLow,
            });
            
            if (isCHoCH) currentTrend = 'bearish';
            break;
          }
        }
      }
    }
  }
  
  // Remove duplicates (keep first occurrence)
  const uniqueBreaks = breaks.reduce((acc, curr) => {
    const exists = acc.find(b => b.brokenLevel === curr.brokenLevel && b.direction === curr.direction);
    if (!exists) acc.push(curr);
    return acc;
  }, [] as StructureBreak[]);
  
  return uniqueBreaks;
}

// ============================================
// Liquidity Sweep Detection
// ============================================

export function detectLiquiditySweeps(
  candles: CandleData[],
  swingPoints: SwingPoint[]
): LiquiditySweep[] {
  const sweeps: LiquiditySweep[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    
    // Check for sweeps of swing highs (buy-side liquidity)
    for (const swing of swingPoints.filter(s => s.type === 'high' && s.index < i)) {
      // Wick above swing high but close below
      if (candle.high > swing.price && candle.close < swing.price) {
        const wickSize = candle.high - Math.max(candle.open, candle.close);
        const bodySize = Math.abs(candle.close - candle.open);
        
        if (wickSize > bodySize * 0.5) {
          sweeps.push({
            id: `sweep_buy_${candle.time}_${swing.time}`,
            type: 'buy-side',
            sweptLevel: swing.price,
            sweepTime: candle.time,
            wickSize: candle.high - swing.price,
            closeAbove: false,
            isValid: true,
          });
        }
      }
    }
    
    // Check for sweeps of swing lows (sell-side liquidity)
    for (const swing of swingPoints.filter(s => s.type === 'low' && s.index < i)) {
      // Wick below swing low but close above
      if (candle.low < swing.price && candle.close > swing.price) {
        const wickSize = Math.min(candle.open, candle.close) - candle.low;
        const bodySize = Math.abs(candle.close - candle.open);
        
        if (wickSize > bodySize * 0.5) {
          sweeps.push({
            id: `sweep_sell_${candle.time}_${swing.time}`,
            type: 'sell-side',
            sweptLevel: swing.price,
            sweepTime: candle.time,
            wickSize: swing.price - candle.low,
            closeAbove: true,
            isValid: true,
          });
        }
      }
    }
  }
  
  return sweeps;
}

// ============================================
// Premium/Discount Zone
// ============================================

export function calculatePremiumDiscount(
  swingPoints: SwingPoint[],
  currentPrice: number
): PremiumDiscountZone | null {
  const recentHighs = swingPoints.filter(s => s.type === 'high').slice(-3);
  const recentLows = swingPoints.filter(s => s.type === 'low').slice(-3);
  
  if (recentHighs.length === 0 || recentLows.length === 0) return null;
  
  const swingHigh = Math.max(...recentHighs.map(s => s.price));
  const swingLow = Math.min(...recentLows.map(s => s.price));
  const range = swingHigh - swingLow;
  const equilibrium = swingLow + range * 0.5;
  
  return {
    equilibrium,
    premium: {
      top: swingHigh,
      bottom: equilibrium,
    },
    discount: {
      top: equilibrium,
      bottom: swingLow,
    },
    swingHigh,
    swingLow,
  };
}

// ============================================
// Helper Functions
// ============================================

function calculateATR(candles: CandleData[], period: number): number {
  if (candles.length < period + 1) return 0;
  
  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1]?.close || candles[i].open;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    sum += tr;
  }
  
  return sum / period;
}

// ============================================
// Main Analysis Function
// ============================================

export function analyzeSMC(candles: CandleData[]): SMCAnalysisResult {
  if (candles.length < 50) {
    return {
      swingPoints: [],
      orderBlocks: [],
      fairValueGaps: [],
      structureBreaks: [],
      liquiditySweeps: [],
      premiumDiscount: null,
      trend: 'ranging',
      bias: 'neutral',
      keyLevels: [],
    };
  }
  
  // Detect swing points
  const swingPoints = detectSwingPoints(candles, 5);
  
  // Detect order blocks
  const orderBlocks = detectOrderBlocks(candles, swingPoints);
  
  // Detect fair value gaps
  const fairValueGaps = detectFairValueGaps(candles);
  
  // Detect structure breaks
  const structureBreaks = detectStructureBreaks(candles, swingPoints);
  
  // Detect liquidity sweeps
  const liquiditySweeps = detectLiquiditySweeps(candles, swingPoints);
  
  // Calculate premium/discount
  const currentPrice = candles[candles.length - 1].close;
  const premiumDiscount = calculatePremiumDiscount(swingPoints, currentPrice);
  
  // Determine trend
  const recentBreaks = structureBreaks.slice(-3);
  const bullishBreaks = recentBreaks.filter(b => b.direction === 'bullish').length;
  const bearishBreaks = recentBreaks.filter(b => b.direction === 'bearish').length;
  
  let trend: 'bullish' | 'bearish' | 'ranging' = 'ranging';
  if (bullishBreaks > bearishBreaks) trend = 'bullish';
  else if (bearishBreaks > bullishBreaks) trend = 'bearish';
  
  // Determine bias
  let bias: 'long' | 'short' | 'neutral' = 'neutral';
  if (premiumDiscount) {
    if (currentPrice < premiumDiscount.equilibrium && trend === 'bullish') {
      bias = 'long'; // In discount zone with bullish trend
    } else if (currentPrice > premiumDiscount.equilibrium && trend === 'bearish') {
      bias = 'short'; // In premium zone with bearish trend
    }
  }
  
  // Compile key levels
  const keyLevels: { price: number; type: string; strength: number }[] = [];
  
  // Add unmitigated order blocks
  orderBlocks
    .filter(ob => !ob.mitigated)
    .forEach(ob => {
      keyLevels.push({
        price: (ob.zone.top + ob.zone.bottom) / 2,
        type: `${ob.type} OB`,
        strength: ob.strength === 'strong' ? 3 : ob.strength === 'medium' ? 2 : 1,
      });
    });
  
  // Add unfilled FVGs
  fairValueGaps
    .filter(fvg => !fvg.filled)
    .forEach(fvg => {
      keyLevels.push({
        price: (fvg.zone.top + fvg.zone.bottom) / 2,
        type: `${fvg.type} FVG`,
        strength: fvg.size > 0.5 ? 3 : fvg.size > 0.2 ? 2 : 1,
      });
    });
  
  // Add recent swing points
  swingPoints.slice(-6).forEach(swing => {
    keyLevels.push({
      price: swing.price,
      type: `Swing ${swing.type}`,
      strength: swing.strength / 2,
    });
  });
  
  return {
    swingPoints,
    orderBlocks,
    fairValueGaps,
    structureBreaks,
    liquiditySweeps,
    premiumDiscount,
    trend,
    bias,
    keyLevels: keyLevels.sort((a, b) => b.strength - a.strength).slice(0, 10),
  };
}

// ============================================
// Export for AI Panel
// ============================================

export function generateSMCAnalysisText(result: SMCAnalysisResult): string {
  const lines: string[] = [];
  
  lines.push(`📊 **SMC Analysis**`);
  lines.push(`Trend: ${result.trend.toUpperCase()} | Bias: ${result.bias.toUpperCase()}`);
  lines.push('');
  
  // Order Blocks
  const activeOBs = result.orderBlocks.filter(ob => !ob.mitigated);
  if (activeOBs.length > 0) {
    lines.push(`🟦 **Order Blocks** (${activeOBs.length} active)`);
    activeOBs.slice(0, 3).forEach(ob => {
      lines.push(`  • ${ob.type} OB @ ${ob.zone.bottom.toFixed(2)}-${ob.zone.top.toFixed(2)} [${ob.strength}]`);
    });
    lines.push('');
  }
  
  // Fair Value Gaps
  const openFVGs = result.fairValueGaps.filter(fvg => !fvg.filled);
  if (openFVGs.length > 0) {
    lines.push(`📐 **Fair Value Gaps** (${openFVGs.length} unfilled)`);
    openFVGs.slice(0, 3).forEach(fvg => {
      lines.push(`  • ${fvg.type} FVG @ ${fvg.zone.bottom.toFixed(2)}-${fvg.zone.top.toFixed(2)}`);
    });
    lines.push('');
  }
  
  // Structure Breaks
  if (result.structureBreaks.length > 0) {
    const recent = result.structureBreaks.slice(-3);
    lines.push(`🔀 **Recent Structure**`);
    recent.forEach(b => {
      lines.push(`  • ${b.type.toUpperCase()} ${b.direction} @ ${b.brokenLevel.toFixed(2)}`);
    });
    lines.push('');
  }
  
  // Premium/Discount
  if (result.premiumDiscount) {
    const pd = result.premiumDiscount;
    lines.push(`⚖️ **Premium/Discount**`);
    lines.push(`  EQ: ${pd.equilibrium.toFixed(2)}`);
    lines.push(`  Premium: ${pd.premium.bottom.toFixed(2)} - ${pd.premium.top.toFixed(2)}`);
    lines.push(`  Discount: ${pd.discount.bottom.toFixed(2)} - ${pd.discount.top.toFixed(2)}`);
  }
  
  return lines.join('\n');
}

export default {
  analyzeSMC,
  detectSwingPoints,
  detectOrderBlocks,
  detectFairValueGaps,
  detectStructureBreaks,
  detectLiquiditySweeps,
  calculatePremiumDiscount,
  generateSMCAnalysisText,
};
