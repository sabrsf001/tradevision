/**
 * Custom Indicator Builder for TradeVision
 * Create and manage custom technical indicators
 */

import type { CandleData } from '../types';

// ============================================
// Types
// ============================================
export interface CustomIndicatorConfig {
  id: string;
  name: string;
  description: string;
  code: string;
  color: string;
  lineWidth: number;
  overlay: boolean; // true = on price chart, false = separate panel
  inputs: IndicatorInput[];
  createdAt: number;
  updatedAt: number;
}

export interface IndicatorInput {
  name: string;
  type: 'number' | 'boolean' | 'select';
  default: number | boolean | string;
  min?: number;
  max?: number;
  options?: string[];
}

export interface IndicatorResult {
  values: (number | null)[];
  extras?: Record<string, (number | null)[]>;
}

// ============================================
// Built-in Functions for Custom Indicators
// ============================================
const indicatorFunctions = {
  // Data accessors
  open: (data: CandleData[]) => data.map((c) => c.open),
  high: (data: CandleData[]) => data.map((c) => c.high),
  low: (data: CandleData[]) => data.map((c) => c.low),
  close: (data: CandleData[]) => data.map((c) => c.close),
  volume: (data: CandleData[]) => data.map((c) => c.volume || 0),
  hl2: (data: CandleData[]) => data.map((c) => (c.high + c.low) / 2),
  hlc3: (data: CandleData[]) => data.map((c) => (c.high + c.low + c.close) / 3),
  ohlc4: (data: CandleData[]) => data.map((c) => (c.open + c.high + c.low + c.close) / 4),
  
  // Moving Averages
  sma: (values: number[], period: number): (number | null)[] => {
    const result: (number | null)[] = [];
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += values[i - j];
        }
        result.push(sum / period);
      }
    }
    return result;
  },
  
  ema: (values: number[], period: number): number[] => {
    const k = 2 / (period + 1);
    const result: number[] = [values[0]];
    for (let i = 1; i < values.length; i++) {
      result.push(values[i] * k + result[i - 1] * (1 - k));
    }
    return result;
  },
  
  wma: (values: number[], period: number): (number | null)[] => {
    const result: (number | null)[] = [];
    const weightSum = (period * (period + 1)) / 2;
    
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += values[i - j] * (period - j);
        }
        result.push(sum / weightSum);
      }
    }
    return result;
  },
  
  // Statistical
  stdev: (values: number[], period: number): (number | null)[] => {
    const smaValues = indicatorFunctions.sma(values, period);
    const result: (number | null)[] = [];
    
    for (let i = 0; i < values.length; i++) {
      if (smaValues[i] === null) {
        result.push(null);
      } else {
        let sumSq = 0;
        for (let j = 0; j < period; j++) {
          sumSq += Math.pow(values[i - j] - smaValues[i]!, 2);
        }
        result.push(Math.sqrt(sumSq / period));
      }
    }
    return result;
  },
  
  // Math operations
  abs: (values: number[]) => values.map(Math.abs),
  max: (a: number[], b: number[]) => a.map((v, i) => Math.max(v, b[i])),
  min: (a: number[], b: number[]) => a.map((v, i) => Math.min(v, b[i])),
  add: (a: number[], b: number[]) => a.map((v, i) => v + b[i]),
  sub: (a: number[], b: number[]) => a.map((v, i) => v - b[i]),
  mul: (a: number[], b: number[]) => a.map((v, i) => v * b[i]),
  div: (a: number[], b: number[]) => a.map((v, i) => b[i] !== 0 ? v / b[i] : 0),
  
  // Utilities
  shift: (values: number[], n: number): (number | null)[] => {
    const result: (number | null)[] = [];
    for (let i = 0; i < values.length; i++) {
      if (i < n) {
        result.push(null);
      } else {
        result.push(values[i - n]);
      }
    }
    return result;
  },
  
  highest: (values: number[], period: number): (number | null)[] => {
    const result: (number | null)[] = [];
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        let max = values[i];
        for (let j = 1; j < period; j++) {
          max = Math.max(max, values[i - j]);
        }
        result.push(max);
      }
    }
    return result;
  },
  
  lowest: (values: number[], period: number): (number | null)[] => {
    const result: (number | null)[] = [];
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        let min = values[i];
        for (let j = 1; j < period; j++) {
          min = Math.min(min, values[i - j]);
        }
        result.push(min);
      }
    }
    return result;
  },
  
  crossover: (a: (number | null)[], b: (number | null)[]): boolean[] => {
    const result: boolean[] = [false];
    for (let i = 1; i < a.length; i++) {
      const aPrev = a[i - 1];
      const aCurr = a[i];
      const bPrev = b[i - 1];
      const bCurr = b[i];
      
      if (aPrev === null || aCurr === null || bPrev === null || bCurr === null) {
        result.push(false);
      } else {
        result.push(aPrev <= bPrev && aCurr > bCurr);
      }
    }
    return result;
  },
  
  crossunder: (a: (number | null)[], b: (number | null)[]): boolean[] => {
    const result: boolean[] = [false];
    for (let i = 1; i < a.length; i++) {
      const aPrev = a[i - 1];
      const aCurr = a[i];
      const bPrev = b[i - 1];
      const bCurr = b[i];
      
      if (aPrev === null || aCurr === null || bPrev === null || bCurr === null) {
        result.push(false);
      } else {
        result.push(aPrev >= bPrev && aCurr < bCurr);
      }
    }
    return result;
  },
};

// ============================================
// Custom Indicator Executor
// ============================================
export class CustomIndicatorExecutor {
  private config: CustomIndicatorConfig;
  
  constructor(config: CustomIndicatorConfig) {
    this.config = config;
  }
  
  execute(data: CandleData[], inputValues: Record<string, number | boolean | string> = {}): IndicatorResult {
    // Create a sandboxed context with indicator functions
    const context = {
      ...indicatorFunctions,
      data,
      inputs: { ...this.getDefaultInputs(), ...inputValues },
    };
    
    try {
      // Create function from code
      const fn = new Function(
        ...Object.keys(context),
        `
        ${this.config.code}
        return { values: result, extras: typeof extras !== 'undefined' ? extras : undefined };
        `
      );
      
      return fn(...Object.values(context)) as IndicatorResult;
    } catch (error) {
      console.error('Custom indicator execution error:', error);
      return { values: data.map(() => null) };
    }
  }
  
  private getDefaultInputs(): Record<string, number | boolean | string> {
    return this.config.inputs.reduce((acc, input) => {
      acc[input.name] = input.default;
      return acc;
    }, {} as Record<string, number | boolean | string>);
  }
  
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check required fields
    if (!this.config.name) errors.push('Indicator name is required');
    if (!this.config.code) errors.push('Indicator code is required');
    
    // Try to parse the code
    try {
      new Function('data', 'inputs', this.config.code);
    } catch (e) {
      errors.push(`Syntax error: ${(e as Error).message}`);
    }
    
    return { valid: errors.length === 0, errors };
  }
}

// ============================================
// Indicator Storage
// ============================================
const STORAGE_KEY = 'tradevision-custom-indicators';

export function saveCustomIndicator(config: CustomIndicatorConfig): void {
  const indicators = getCustomIndicators();
  const index = indicators.findIndex((i) => i.id === config.id);
  
  if (index >= 0) {
    indicators[index] = { ...config, updatedAt: Date.now() };
  } else {
    indicators.push({ ...config, createdAt: Date.now(), updatedAt: Date.now() });
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(indicators));
}

export function getCustomIndicators(): CustomIndicatorConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function deleteCustomIndicator(id: string): void {
  const indicators = getCustomIndicators().filter((i) => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(indicators));
}

export function getCustomIndicatorById(id: string): CustomIndicatorConfig | null {
  return getCustomIndicators().find((i) => i.id === id) || null;
}

// ============================================
// Example Indicators
// ============================================
export const exampleIndicators: Omit<CustomIndicatorConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Super Trend',
    description: 'Trend-following indicator based on ATR',
    color: '#22c55e',
    lineWidth: 2,
    overlay: true,
    inputs: [
      { name: 'period', type: 'number', default: 10, min: 1, max: 100 },
      { name: 'multiplier', type: 'number', default: 3, min: 0.5, max: 10 },
    ],
    code: `
const period = inputs.period;
const multiplier = inputs.multiplier;
const closeArr = close(data);
const highArr = high(data);
const lowArr = low(data);

// Calculate ATR
const tr = [];
for (let i = 0; i < data.length; i++) {
  if (i === 0) {
    tr.push(highArr[i] - lowArr[i]);
  } else {
    tr.push(Math.max(
      highArr[i] - lowArr[i],
      Math.abs(highArr[i] - closeArr[i - 1]),
      Math.abs(lowArr[i] - closeArr[i - 1])
    ));
  }
}
const atr = sma(tr, period);

// Calculate bands
const hl2Arr = hl2(data);
const result = [];

for (let i = 0; i < data.length; i++) {
  if (atr[i] === null) {
    result.push(null);
  } else {
    const upperBand = hl2Arr[i] + multiplier * atr[i];
    const lowerBand = hl2Arr[i] - multiplier * atr[i];
    result.push(closeArr[i] > (result[i-1] || hl2Arr[i]) ? lowerBand : upperBand);
  }
}
`,
  },
  {
    name: 'Custom RSI',
    description: 'Relative Strength Index with smoothing',
    color: '#8b5cf6',
    lineWidth: 1,
    overlay: false,
    inputs: [
      { name: 'period', type: 'number', default: 14, min: 2, max: 50 },
    ],
    code: `
const period = inputs.period;
const closeArr = close(data);
const changes = [];
for (let i = 1; i < closeArr.length; i++) {
  changes.push(closeArr[i] - closeArr[i - 1]);
}
changes.unshift(0);

const gains = changes.map(c => c > 0 ? c : 0);
const losses = changes.map(c => c < 0 ? -c : 0);

const avgGain = ema(gains, period);
const avgLoss = ema(losses, period);

const result = avgGain.map((g, i) => {
  const l = avgLoss[i];
  if (l === 0) return 100;
  const rs = g / l;
  return 100 - (100 / (1 + rs));
});
`,
  },
];
