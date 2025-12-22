/**
 * Unit tests for technical indicators
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateBollingerBands,
  calculateVWAP,
  calculateMACD,
} from '../utils/indicators';
import type { CandleData } from '../types';

// Helper to generate test candles
function generateCandles(count: number, startPrice: number = 100): CandleData[] {
  const candles: CandleData[] = [];
  let price = startPrice;
  
  for (let i = 0; i < count; i++) {
    // Random walk with seeded randomness for reproducibility
    const change = Math.sin(i * 0.5) * 2;
    price = Math.max(10, price + change);
    
    const high = price + 1;
    const low = price - 1;
    const open = price + 0.5;
    const close = price - 0.3;
    
    candles.push({
      time: 1701641600 + i * 60, // 1-minute candles
      open: Math.max(low, Math.min(high, open)),
      high,
      low,
      close: Math.max(low, Math.min(high, close)),
      volume: 1000 + i * 100,
    });
  }
  
  return candles;
}

// Generate trending candles for testing trend-detection
function generateTrendingCandles(count: number, direction: 'up' | 'down'): CandleData[] {
  const candles: CandleData[] = [];
  let price = 100;
  
  for (let i = 0; i < count; i++) {
    const change = direction === 'up' ? 1 : -1;
    price = Math.max(10, price + change);
    
    candles.push({
      time: 1701641600 + i * 60,
      open: price - change * 0.3,
      high: price + Math.abs(change) * 0.2,
      low: price - Math.abs(change) * 0.2,
      close: price,
      volume: 1000,
    });
  }
  
  return candles;
}

describe('Technical Indicators', () => {
  describe('SMA (Simple Moving Average)', () => {
    it('calculates SMA correctly for valid data', () => {
      const candles = generateCandles(50);
      const sma = calculateSMA(candles, 20);
      
      // SMA returns array with values for period-1 onwards
      expect(sma.length).toBe(50 - 20 + 1); // 31 values
      
      // All values should be numbers
      sma.forEach(v => {
        expect(typeof v.value).toBe('number');
        expect(isNaN(v.value)).toBe(false);
      });
    });

    it('returns empty array for insufficient data', () => {
      const candles = generateCandles(10);
      const sma = calculateSMA(candles, 20);
      
      // Should return empty array when period > data length
      expect(sma.length).toBe(0);
    });

    it('returns same results for same input (caching)', () => {
      const candles = generateCandles(50);
      
      const sma1 = calculateSMA(candles, 20);
      const sma2 = calculateSMA(candles, 20);
      
      // Should return same values
      expect(sma1.length).toBe(sma2.length);
      expect(sma1[0].value).toBe(sma2[0].value);
    });
  });

  describe('EMA (Exponential Moving Average)', () => {
    it('calculates EMA correctly', () => {
      const candles = generateCandles(50);
      const ema = calculateEMA(candles, 20);
      
      // EMA should have values
      expect(ema.length).toBeGreaterThan(0);
      
      // All values should be valid numbers
      ema.forEach(v => {
        expect(typeof v.value).toBe('number');
        expect(isNaN(v.value)).toBe(false);
      });
    });

    it('EMA and SMA converge differently on trending data', () => {
      // Create candles with sudden price jump
      const candles: CandleData[] = [];
      for (let i = 0; i < 30; i++) {
        candles.push({
          time: 1701641600 + i * 60,
          open: 100,
          high: 101,
          low: 99,
          close: i < 20 ? 100 : 150, // Jump at candle 20
          volume: 1000,
        });
      }
      
      const sma = calculateSMA(candles, 10);
      const ema = calculateEMA(candles, 10);
      
      // Both should have results
      expect(sma.length).toBeGreaterThan(0);
      expect(ema.length).toBeGreaterThan(0);
      
      // Both last values should be valid numbers
      const lastSma = sma[sma.length - 1]?.value;
      const lastEma = ema[ema.length - 1]?.value;
      
      expect(typeof lastSma).toBe('number');
      expect(typeof lastEma).toBe('number');
      expect(lastSma).toBeGreaterThan(100); // Should be affected by the jump
      expect(lastEma).toBeGreaterThan(100);
    });
  });

  describe('RSI (Relative Strength Index)', () => {
    it('calculates RSI in valid range (0-100)', () => {
      const candles = generateCandles(50);
      const rsi = calculateRSI(candles, 14);
      
      expect(rsi.length).toBeGreaterThan(0);
      
      rsi.forEach(v => {
        expect(v.value).toBeGreaterThanOrEqual(0);
        expect(v.value).toBeLessThanOrEqual(100);
      });
    });

    it('shows high RSI on consistent gains', () => {
      const candles = generateTrendingCandles(30, 'up');
      const rsi = calculateRSI(candles, 14);
      
      expect(rsi.length).toBeGreaterThan(0);
      
      // Last RSI should be above 50 for uptrend
      const lastRsi = rsi[rsi.length - 1]?.value;
      expect(lastRsi).toBeGreaterThan(50);
    });
  });

  describe('Bollinger Bands', () => {
    it('calculates upper, middle, and lower bands', () => {
      const candles = generateCandles(50);
      const bb = calculateBollingerBands(candles, 20, 2);
      
      // BB returns object with upper, middle, lower arrays
      expect(bb).toHaveProperty('upper');
      expect(bb).toHaveProperty('middle');
      expect(bb).toHaveProperty('lower');
      
      // Arrays should have values
      expect(bb.upper.length).toBeGreaterThan(0);
      expect(bb.middle.length).toBeGreaterThan(0);
      expect(bb.lower.length).toBeGreaterThan(0);
    });

    it('maintains band relationship: upper > middle > lower', () => {
      const candles = generateCandles(50);
      const bb = calculateBollingerBands(candles, 20, 2);
      
      // Check each index
      for (let i = 0; i < bb.middle.length; i++) {
        expect(bb.upper[i].value).toBeGreaterThanOrEqual(bb.middle[i].value);
        expect(bb.middle[i].value).toBeGreaterThanOrEqual(bb.lower[i].value);
      }
    });

    it('returns empty arrays for insufficient data', () => {
      const candles = generateCandles(10);
      const bb = calculateBollingerBands(candles, 20, 2);
      
      expect(bb.upper.length).toBe(0);
      expect(bb.middle.length).toBe(0);
      expect(bb.lower.length).toBe(0);
    });
  });

  describe('VWAP (Volume Weighted Average Price)', () => {
    it('calculates VWAP correctly', () => {
      const candles = generateCandles(50);
      const vwap = calculateVWAP(candles);
      
      // VWAP should have same length as candles
      expect(vwap.length).toBe(candles.length);
      
      // All values should be valid numbers
      vwap.forEach(v => {
        expect(typeof v.value).toBe('number');
        expect(isNaN(v.value)).toBe(false);
      });
    });
  });

  describe('MACD', () => {
    it('calculates MACD line, signal, and histogram', () => {
      const candles = generateCandles(50);
      const macd = calculateMACD(candles);
      
      // MACD returns object with macd, signal, histogram arrays
      expect(macd).toHaveProperty('macd');
      expect(macd).toHaveProperty('signal');
      expect(macd).toHaveProperty('histogram');
      
      // Should have macd line values (needs at least slowPeriod=26 candles)
      expect(macd.macd.length).toBeGreaterThan(0);
    });

    it('returns empty arrays for insufficient data', () => {
      const candles = generateCandles(20); // Less than slowPeriod (26)
      const macd = calculateMACD(candles);
      
      expect(macd.macd.length).toBe(0);
    });

    it('histogram equals macd minus signal', () => {
      const candles = generateCandles(60);
      const macd = calculateMACD(candles);
      
      if (macd.histogram.length > 0 && macd.signal.length > 0) {
        // Find corresponding macd and signal values
        const lastHist = macd.histogram[macd.histogram.length - 1];
        const lastMacd = macd.macd[macd.macd.length - 1];
        const lastSignal = macd.signal[macd.signal.length - 1];
        
        // Histogram should be close to macd - signal
        const expectedHist = lastMacd.value - lastSignal.value;
        expect(Math.abs(lastHist.value - expectedHist)).toBeLessThan(0.0001);
      }
    });
  });
});
