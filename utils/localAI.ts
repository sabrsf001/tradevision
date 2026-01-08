/**
 * Local AI Analysis - No API Key Required
 * Pattern recognition for supply/demand zones, support/resistance, etc.
 * Enhanced with AI Trading Engine integration
 */

import { CandleData } from '../types';
import { AITradingEngine, AIAnalysis } from '../services/aiTradingEngine';

export interface Zone {
  id: string;
  type: 'supply' | 'demand';
  priceTop: number;
  priceBottom: number;
  startTime: number;
  endTime: number;
  strength: 'strong' | 'medium' | 'weak';
  tested: number;
}

export interface SupportResistance {
  price: number;
  type: 'support' | 'resistance';
  strength: number;
  touches: number;
}

export interface TrendLine {
  startPrice: number;
  endPrice: number;
  startTime: number;
  endTime: number;
  type: 'uptrend' | 'downtrend';
}

export interface AIAnalysisResult {
  zones: Zone[];
  supportResistance: SupportResistance[];
  trendLines: TrendLine[];
  patterns: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

// Re-export AI Trading Engine for convenience
export { AITradingEngine };
export type { AIAnalysis };

function calculateAverageRange(candles: CandleData[]): number {
  const ranges = candles.map(c => c.high - c.low);
  return ranges.reduce((a, b) => a + b, 0) / ranges.length;
}

function isDemandZone(candle: CandleData, prev: CandleData[], next: CandleData[], threshold: number): boolean {
  const isBullish = candle.close > candle.open;
  const bodySize = Math.abs(candle.close - candle.open);
  const isStrongMove = bodySize > threshold;
  const wasConsolidating = prev.every(c => Math.abs(c.close - c.open) < bodySize * 0.5);
  const continuedUp = next.length > 0 && next[0].close > candle.close;
  return isBullish && isStrongMove && wasConsolidating && continuedUp;
}

function isSupplyZone(candle: CandleData, prev: CandleData[], next: CandleData[], threshold: number): boolean {
  const isBearish = candle.close < candle.open;
  const bodySize = Math.abs(candle.close - candle.open);
  const isStrongMove = bodySize > threshold;
  const wasConsolidating = prev.every(c => Math.abs(c.close - c.open) < bodySize * 0.5);
  const continuedDown = next.length > 0 && next[0].close < candle.close;
  return isBearish && isStrongMove && wasConsolidating && continuedDown;
}

function calculateZoneStrength(candle: CandleData, prev: CandleData[]): 'strong' | 'medium' | 'weak' {
  const bodySize = Math.abs(candle.close - candle.open);
  const avgPrevBody = prev.reduce((sum, c) => sum + Math.abs(c.close - c.open), 0) / prev.length;
  if (bodySize > avgPrevBody * 3) return 'strong';
  if (bodySize > avgPrevBody * 2) return 'medium';
  return 'weak';
}

function countZoneTests(bottom: number, top: number, futureCandles: CandleData[]): number {
  let tests = 0;
  for (const candle of futureCandles) {
    if (candle.low <= top && candle.high >= bottom) tests++;
  }
  return Math.min(tests, 5);
}

function mergeOverlappingZones(zones: Zone[]): Zone[] {
  if (zones.length < 2) return zones;
  const sorted = [...zones].sort((a, b) => a.priceBottom - b.priceBottom);
  const merged: Zone[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.priceBottom <= last.priceTop && current.type === last.type) {
      last.priceTop = Math.max(last.priceTop, current.priceTop);
      last.strength = current.strength === 'strong' || last.strength === 'strong' ? 'strong' : 
                      current.strength === 'medium' || last.strength === 'medium' ? 'medium' : 'weak';
    } else {
      merged.push(current);
    }
  }
  return merged;
}

export function detectSupplyDemandZones(candles: CandleData[], sensitivity: number = 1): Zone[] {
  if (candles.length < 20) return [];
  const zones: Zone[] = [];
  const avgRange = calculateAverageRange(candles);
  const threshold = avgRange * (2 - sensitivity);
  
  for (let i = 3; i < candles.length - 3; i++) {
    const candle = candles[i];
    const prevCandles = candles.slice(Math.max(0, i - 3), i);
    const nextCandles = candles.slice(i + 1, Math.min(candles.length, i + 4));
    
    if (isDemandZone(candle, prevCandles, nextCandles, threshold)) {
      const zoneBottom = Math.min(candle.low, ...prevCandles.map(c => c.low));
      const zoneTop = Math.max(candle.open, candle.close);
      zones.push({
        id: `demand-${candle.time}`,
        type: 'demand',
        priceBottom: zoneBottom,
        priceTop: zoneTop,
        startTime: prevCandles[0]?.time || candle.time,
        endTime: candle.time,
        strength: calculateZoneStrength(candle, prevCandles),
        tested: countZoneTests(zoneBottom, zoneTop, candles.slice(i)),
      });
    }
    
    if (isSupplyZone(candle, prevCandles, nextCandles, threshold)) {
      const zoneTop = Math.max(candle.high, ...prevCandles.map(c => c.high));
      const zoneBottom = Math.min(candle.open, candle.close);
      zones.push({
        id: `supply-${candle.time}`,
        type: 'supply',
        priceBottom: zoneBottom,
        priceTop: zoneTop,
        startTime: prevCandles[0]?.time || candle.time,
        endTime: candle.time,
        strength: calculateZoneStrength(candle, prevCandles),
        tested: countZoneTests(zoneBottom, zoneTop, candles.slice(i)),
      });
    }
  }
  return mergeOverlappingZones(zones).slice(0, 6);
}

export function detectSupportResistance(candles: CandleData[], numLevels: number = 5): SupportResistance[] {
  if (candles.length < 10) return [];
  const pricePoints: { price: number; type: 'high' | 'low' }[] = [];
  
  for (let i = 2; i < candles.length - 2; i++) {
    const isSwingHigh = candles[i].high > candles[i-1].high && candles[i].high > candles[i+1].high;
    const isSwingLow = candles[i].low < candles[i-1].low && candles[i].low < candles[i+1].low;
    if (isSwingHigh) pricePoints.push({ price: candles[i].high, type: 'high' });
    if (isSwingLow) pricePoints.push({ price: candles[i].low, type: 'low' });
  }
  
  const tolerance = calculateAverageRange(candles) * 0.5;
  const clusters: { avgPrice: number; count: number; dominantType: 'high' | 'low' }[] = [];
  
  for (const point of pricePoints) {
    const existing = clusters.find(c => Math.abs(c.avgPrice - point.price) < tolerance);
    if (existing) {
      existing.avgPrice = (existing.avgPrice * existing.count + point.price) / (existing.count + 1);
      existing.count++;
    } else {
      clusters.push({ avgPrice: point.price, count: 1, dominantType: point.type });
    }
  }
  
  return clusters.filter(c => c.count >= 2)
    .map(cluster => ({
      price: cluster.avgPrice,
      type: cluster.dominantType === 'low' ? 'support' as const : 'resistance' as const,
      strength: Math.min(100, cluster.count * 20),
      touches: cluster.count,
    }))
    .sort((a, b) => b.strength - a.strength)
    .slice(0, numLevels);
}

export function detectPatterns(candles: CandleData[]): string[] {
  const patterns: string[] = [];
  if (candles.length < 5) return patterns;
  
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  
  // Bullish/Bearish engulfing
  if (prev && last) {
    if (prev.close < prev.open && last.close > last.open && last.close > prev.open && last.open < prev.close) {
      patterns.push('Bullish Engulfing');
    }
    if (prev.close > prev.open && last.close < last.open && last.close < prev.open && last.open > prev.close) {
      patterns.push('Bearish Engulfing');
    }
  }
  
  // Doji
  if (last && Math.abs(last.close - last.open) < (last.high - last.low) * 0.1) {
    patterns.push('Doji');
  }
  
  // Hammer
  if (last) {
    const body = Math.abs(last.close - last.open);
    const lowerWick = Math.min(last.open, last.close) - last.low;
    if (lowerWick > body * 2) patterns.push('Hammer');
  }
  
  return patterns;
}

export function analyzeChart(candles: CandleData[]): AIAnalysisResult {
  const zones = detectSupplyDemandZones(candles);
  const supportResistance = detectSupportResistance(candles);
  const patterns = detectPatterns(candles);
  
  let bullishScore = 0, bearishScore = 0;
  patterns.forEach(p => {
    if (p.includes('Bullish') || p === 'Hammer') bullishScore++;
    if (p.includes('Bearish')) bearishScore++;
  });
  
  const sentiment = bullishScore > bearishScore ? 'bullish' : bearishScore > bullishScore ? 'bearish' : 'neutral';
  const confidence = Math.min(95, 50 + (patterns.length * 10) + (zones.length * 5));
  
  return { zones, supportResistance, trendLines: [], patterns, sentiment, confidence };
}

export default analyzeChart;
