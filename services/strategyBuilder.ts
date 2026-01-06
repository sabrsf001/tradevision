/**
 * Visual Strategy Builder - TradeVision
 * No-code drag-and-drop strategy creation with block-based indicators
 */

import type { CandleData } from '../types';

// ============================================
// Block Types
// ============================================

export type BlockCategory = 'indicator' | 'condition' | 'action' | 'logic' | 'variable';

export interface StrategyBlock {
  id: string;
  type: string;
  category: BlockCategory;
  name: string;
  description: string;
  icon: string;
  
  // Position in canvas
  x: number;
  y: number;
  
  // Configuration
  parameters: BlockParameter[];
  
  // Connections
  inputs: BlockConnection[];
  outputs: BlockConnection[];
  
  // State
  enabled: boolean;
  collapsed?: boolean;
}

export interface BlockParameter {
  name: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'select' | 'symbol' | 'timeframe';
  value: any;
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  required?: boolean;
}

export interface BlockConnection {
  id: string;
  label: string;
  type: 'number' | 'boolean' | 'candle' | 'signal' | 'any';
  connectedTo?: string; // Block ID
  connectedPort?: string; // Port ID
}

// ============================================
// Block Definitions
// ============================================

export const INDICATOR_BLOCKS: Omit<StrategyBlock, 'id' | 'x' | 'y' | 'inputs' | 'enabled'>[] = [
  {
    type: 'sma',
    category: 'indicator',
    name: 'SMA',
    description: 'Simple Moving Average',
    icon: '📊',
    parameters: [
      { name: 'period', label: 'Period', type: 'number', value: 20, defaultValue: 20, min: 1, max: 500 },
      { name: 'source', label: 'Source', type: 'select', value: 'close', defaultValue: 'close', options: [
        { value: 'close', label: 'Close' },
        { value: 'open', label: 'Open' },
        { value: 'high', label: 'High' },
        { value: 'low', label: 'Low' },
        { value: 'hl2', label: 'HL/2' },
        { value: 'hlc3', label: 'HLC/3' },
        { value: 'ohlc4', label: 'OHLC/4' },
      ]},
    ],
    outputs: [
      { id: 'value', label: 'Value', type: 'number' },
    ],
  },
  {
    type: 'ema',
    category: 'indicator',
    name: 'EMA',
    description: 'Exponential Moving Average',
    icon: '📈',
    parameters: [
      { name: 'period', label: 'Period', type: 'number', value: 12, defaultValue: 12, min: 1, max: 500 },
      { name: 'source', label: 'Source', type: 'select', value: 'close', defaultValue: 'close', options: [
        { value: 'close', label: 'Close' },
        { value: 'open', label: 'Open' },
        { value: 'high', label: 'High' },
        { value: 'low', label: 'Low' },
      ]},
    ],
    outputs: [
      { id: 'value', label: 'Value', type: 'number' },
    ],
  },
  {
    type: 'rsi',
    category: 'indicator',
    name: 'RSI',
    description: 'Relative Strength Index',
    icon: '💪',
    parameters: [
      { name: 'period', label: 'Period', type: 'number', value: 14, defaultValue: 14, min: 1, max: 100 },
    ],
    outputs: [
      { id: 'value', label: 'Value', type: 'number' },
      { id: 'overbought', label: 'Overbought', type: 'boolean' },
      { id: 'oversold', label: 'Oversold', type: 'boolean' },
    ],
  },
  {
    type: 'macd',
    category: 'indicator',
    name: 'MACD',
    description: 'Moving Average Convergence Divergence',
    icon: '📉',
    parameters: [
      { name: 'fastPeriod', label: 'Fast Period', type: 'number', value: 12, defaultValue: 12, min: 1, max: 100 },
      { name: 'slowPeriod', label: 'Slow Period', type: 'number', value: 26, defaultValue: 26, min: 1, max: 200 },
      { name: 'signalPeriod', label: 'Signal Period', type: 'number', value: 9, defaultValue: 9, min: 1, max: 50 },
    ],
    outputs: [
      { id: 'macd', label: 'MACD Line', type: 'number' },
      { id: 'signal', label: 'Signal Line', type: 'number' },
      { id: 'histogram', label: 'Histogram', type: 'number' },
    ],
  },
  {
    type: 'bollinger',
    category: 'indicator',
    name: 'Bollinger Bands',
    description: 'Bollinger Bands indicator',
    icon: '🎯',
    parameters: [
      { name: 'period', label: 'Period', type: 'number', value: 20, defaultValue: 20, min: 1, max: 200 },
      { name: 'stdDev', label: 'Std Deviation', type: 'number', value: 2, defaultValue: 2, min: 0.5, max: 5, step: 0.5 },
    ],
    outputs: [
      { id: 'upper', label: 'Upper Band', type: 'number' },
      { id: 'middle', label: 'Middle Band', type: 'number' },
      { id: 'lower', label: 'Lower Band', type: 'number' },
    ],
  },
  {
    type: 'atr',
    category: 'indicator',
    name: 'ATR',
    description: 'Average True Range',
    icon: '📏',
    parameters: [
      { name: 'period', label: 'Period', type: 'number', value: 14, defaultValue: 14, min: 1, max: 100 },
    ],
    outputs: [
      { id: 'value', label: 'Value', type: 'number' },
    ],
  },
  {
    type: 'volume',
    category: 'indicator',
    name: 'Volume',
    description: 'Trading Volume',
    icon: '📊',
    parameters: [
      { name: 'maPeriod', label: 'MA Period', type: 'number', value: 20, defaultValue: 20, min: 1, max: 200 },
    ],
    outputs: [
      { id: 'value', label: 'Volume', type: 'number' },
      { id: 'ma', label: 'Volume MA', type: 'number' },
      { id: 'aboveAvg', label: 'Above Average', type: 'boolean' },
    ],
  },
  {
    type: 'stochastic',
    category: 'indicator',
    name: 'Stochastic',
    description: 'Stochastic Oscillator',
    icon: '🔄',
    parameters: [
      { name: 'kPeriod', label: 'K Period', type: 'number', value: 14, defaultValue: 14, min: 1, max: 100 },
      { name: 'dPeriod', label: 'D Period', type: 'number', value: 3, defaultValue: 3, min: 1, max: 20 },
      { name: 'smooth', label: 'Smooth', type: 'number', value: 3, defaultValue: 3, min: 1, max: 20 },
    ],
    outputs: [
      { id: 'k', label: '%K', type: 'number' },
      { id: 'd', label: '%D', type: 'number' },
    ],
  },
  {
    type: 'price',
    category: 'indicator',
    name: 'Price',
    description: 'Current Price Data',
    icon: '💰',
    parameters: [],
    outputs: [
      { id: 'open', label: 'Open', type: 'number' },
      { id: 'high', label: 'High', type: 'number' },
      { id: 'low', label: 'Low', type: 'number' },
      { id: 'close', label: 'Close', type: 'number' },
    ],
  },
];

export const CONDITION_BLOCKS: Omit<StrategyBlock, 'id' | 'x' | 'y' | 'enabled'>[] = [
  {
    type: 'compare',
    category: 'condition',
    name: 'Compare',
    description: 'Compare two values',
    icon: '⚖️',
    parameters: [
      { name: 'operator', label: 'Operator', type: 'select', value: 'gt', defaultValue: 'gt', options: [
        { value: 'gt', label: '>' },
        { value: 'gte', label: '>=' },
        { value: 'lt', label: '<' },
        { value: 'lte', label: '<=' },
        { value: 'eq', label: '==' },
        { value: 'neq', label: '!=' },
      ]},
    ],
    inputs: [
      { id: 'a', label: 'Value A', type: 'number' },
      { id: 'b', label: 'Value B', type: 'number' },
    ],
    outputs: [
      { id: 'result', label: 'Result', type: 'boolean' },
    ],
  },
  {
    type: 'crossover',
    category: 'condition',
    name: 'Crossover',
    description: 'Detect when A crosses above B',
    icon: '❌',
    parameters: [],
    inputs: [
      { id: 'a', label: 'Value A', type: 'number' },
      { id: 'b', label: 'Value B', type: 'number' },
    ],
    outputs: [
      { id: 'crossUp', label: 'Cross Up', type: 'boolean' },
      { id: 'crossDown', label: 'Cross Down', type: 'boolean' },
    ],
  },
  {
    type: 'threshold',
    category: 'condition',
    name: 'Threshold',
    description: 'Check if value is above/below threshold',
    icon: '📍',
    parameters: [
      { name: 'threshold', label: 'Threshold', type: 'number', value: 0, defaultValue: 0 },
      { name: 'direction', label: 'Direction', type: 'select', value: 'above', defaultValue: 'above', options: [
        { value: 'above', label: 'Above' },
        { value: 'below', label: 'Below' },
        { value: 'equals', label: 'Equals' },
      ]},
    ],
    inputs: [
      { id: 'value', label: 'Value', type: 'number' },
    ],
    outputs: [
      { id: 'result', label: 'Result', type: 'boolean' },
    ],
  },
  {
    type: 'range',
    category: 'condition',
    name: 'In Range',
    description: 'Check if value is within range',
    icon: '📐',
    parameters: [
      { name: 'min', label: 'Min', type: 'number', value: 0, defaultValue: 0 },
      { name: 'max', label: 'Max', type: 'number', value: 100, defaultValue: 100 },
    ],
    inputs: [
      { id: 'value', label: 'Value', type: 'number' },
    ],
    outputs: [
      { id: 'inRange', label: 'In Range', type: 'boolean' },
    ],
  },
];

export const LOGIC_BLOCKS: Omit<StrategyBlock, 'id' | 'x' | 'y' | 'enabled'>[] = [
  {
    type: 'and',
    category: 'logic',
    name: 'AND',
    description: 'All inputs must be true',
    icon: '➕',
    parameters: [],
    inputs: [
      { id: 'a', label: 'Input A', type: 'boolean' },
      { id: 'b', label: 'Input B', type: 'boolean' },
    ],
    outputs: [
      { id: 'result', label: 'Result', type: 'boolean' },
    ],
  },
  {
    type: 'or',
    category: 'logic',
    name: 'OR',
    description: 'Any input must be true',
    icon: '➗',
    parameters: [],
    inputs: [
      { id: 'a', label: 'Input A', type: 'boolean' },
      { id: 'b', label: 'Input B', type: 'boolean' },
    ],
    outputs: [
      { id: 'result', label: 'Result', type: 'boolean' },
    ],
  },
  {
    type: 'not',
    category: 'logic',
    name: 'NOT',
    description: 'Invert the input',
    icon: '❗',
    parameters: [],
    inputs: [
      { id: 'input', label: 'Input', type: 'boolean' },
    ],
    outputs: [
      { id: 'result', label: 'Result', type: 'boolean' },
    ],
  },
  {
    type: 'delay',
    category: 'logic',
    name: 'Delay',
    description: 'Delay signal by N bars',
    icon: '⏱️',
    parameters: [
      { name: 'bars', label: 'Bars', type: 'number', value: 1, defaultValue: 1, min: 1, max: 100 },
    ],
    inputs: [
      { id: 'input', label: 'Input', type: 'boolean' },
    ],
    outputs: [
      { id: 'result', label: 'Result', type: 'boolean' },
    ],
  },
  {
    type: 'counter',
    category: 'logic',
    name: 'Counter',
    description: 'Count consecutive true signals',
    icon: '🔢',
    parameters: [
      { name: 'minCount', label: 'Min Count', type: 'number', value: 3, defaultValue: 3, min: 1, max: 50 },
    ],
    inputs: [
      { id: 'input', label: 'Input', type: 'boolean' },
    ],
    outputs: [
      { id: 'count', label: 'Count', type: 'number' },
      { id: 'triggered', label: 'Triggered', type: 'boolean' },
    ],
  },
];

export const ACTION_BLOCKS: Omit<StrategyBlock, 'id' | 'x' | 'y' | 'enabled'>[] = [
  {
    type: 'buy',
    category: 'action',
    name: 'Buy',
    description: 'Open a long position',
    icon: '🟢',
    parameters: [
      { name: 'sizeType', label: 'Size Type', type: 'select', value: 'percent', defaultValue: 'percent', options: [
        { value: 'percent', label: 'Percent of Balance' },
        { value: 'fixed', label: 'Fixed Amount' },
        { value: 'units', label: 'Units' },
      ]},
      { name: 'size', label: 'Size', type: 'number', value: 10, defaultValue: 10, min: 0.1 },
      { name: 'orderType', label: 'Order Type', type: 'select', value: 'market', defaultValue: 'market', options: [
        { value: 'market', label: 'Market' },
        { value: 'limit', label: 'Limit' },
      ]},
    ],
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'boolean' },
    ],
    outputs: [
      { id: 'executed', label: 'Executed', type: 'signal' },
    ],
  },
  {
    type: 'sell',
    category: 'action',
    name: 'Sell',
    description: 'Open a short position or close long',
    icon: '🔴',
    parameters: [
      { name: 'sizeType', label: 'Size Type', type: 'select', value: 'percent', defaultValue: 'percent', options: [
        { value: 'percent', label: 'Percent of Balance' },
        { value: 'fixed', label: 'Fixed Amount' },
        { value: 'units', label: 'Units' },
        { value: 'all', label: 'Close All' },
      ]},
      { name: 'size', label: 'Size', type: 'number', value: 100, defaultValue: 100, min: 0.1 },
      { name: 'orderType', label: 'Order Type', type: 'select', value: 'market', defaultValue: 'market', options: [
        { value: 'market', label: 'Market' },
        { value: 'limit', label: 'Limit' },
      ]},
    ],
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'boolean' },
    ],
    outputs: [
      { id: 'executed', label: 'Executed', type: 'signal' },
    ],
  },
  {
    type: 'stoploss',
    category: 'action',
    name: 'Stop Loss',
    description: 'Set a stop loss',
    icon: '🛑',
    parameters: [
      { name: 'type', label: 'Type', type: 'select', value: 'percent', defaultValue: 'percent', options: [
        { value: 'percent', label: 'Percent' },
        { value: 'fixed', label: 'Fixed Price' },
        { value: 'atr', label: 'ATR Multiple' },
      ]},
      { name: 'value', label: 'Value', type: 'number', value: 2, defaultValue: 2, min: 0.1 },
      { name: 'trailing', label: 'Trailing', type: 'boolean', value: false, defaultValue: false },
    ],
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'boolean' },
    ],
    outputs: [
      { id: 'hit', label: 'SL Hit', type: 'signal' },
    ],
  },
  {
    type: 'takeprofit',
    category: 'action',
    name: 'Take Profit',
    description: 'Set a take profit',
    icon: '💎',
    parameters: [
      { name: 'type', label: 'Type', type: 'select', value: 'percent', defaultValue: 'percent', options: [
        { value: 'percent', label: 'Percent' },
        { value: 'fixed', label: 'Fixed Price' },
        { value: 'rr', label: 'Risk:Reward Ratio' },
      ]},
      { name: 'value', label: 'Value', type: 'number', value: 5, defaultValue: 5, min: 0.1 },
    ],
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'boolean' },
    ],
    outputs: [
      { id: 'hit', label: 'TP Hit', type: 'signal' },
    ],
  },
  {
    type: 'alert',
    category: 'action',
    name: 'Alert',
    description: 'Send an alert notification',
    icon: '🔔',
    parameters: [
      { name: 'message', label: 'Message', type: 'string', value: 'Alert triggered!', defaultValue: 'Alert triggered!' },
      { name: 'sound', label: 'Play Sound', type: 'boolean', value: true, defaultValue: true },
    ],
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'boolean' },
    ],
    outputs: [],
  },
];

export const VARIABLE_BLOCKS: Omit<StrategyBlock, 'id' | 'x' | 'y' | 'enabled'>[] = [
  {
    type: 'constant',
    category: 'variable',
    name: 'Constant',
    description: 'A fixed numeric value',
    icon: '🔢',
    parameters: [
      { name: 'value', label: 'Value', type: 'number', value: 0, defaultValue: 0 },
    ],
    inputs: [],
    outputs: [
      { id: 'value', label: 'Value', type: 'number' },
    ],
  },
  {
    type: 'math',
    category: 'variable',
    name: 'Math',
    description: 'Perform math operations',
    icon: '🧮',
    parameters: [
      { name: 'operation', label: 'Operation', type: 'select', value: 'add', defaultValue: 'add', options: [
        { value: 'add', label: 'Add (+)' },
        { value: 'subtract', label: 'Subtract (-)' },
        { value: 'multiply', label: 'Multiply (×)' },
        { value: 'divide', label: 'Divide (÷)' },
        { value: 'power', label: 'Power (^)' },
        { value: 'abs', label: 'Absolute' },
        { value: 'sqrt', label: 'Square Root' },
      ]},
    ],
    inputs: [
      { id: 'a', label: 'Value A', type: 'number' },
      { id: 'b', label: 'Value B', type: 'number' },
    ],
    outputs: [
      { id: 'result', label: 'Result', type: 'number' },
    ],
  },
  {
    type: 'minmax',
    category: 'variable',
    name: 'Min/Max',
    description: 'Find min or max of lookback period',
    icon: '📊',
    parameters: [
      { name: 'type', label: 'Type', type: 'select', value: 'max', defaultValue: 'max', options: [
        { value: 'max', label: 'Maximum' },
        { value: 'min', label: 'Minimum' },
      ]},
      { name: 'period', label: 'Period', type: 'number', value: 20, defaultValue: 20, min: 1, max: 500 },
    ],
    inputs: [
      { id: 'value', label: 'Value', type: 'number' },
    ],
    outputs: [
      { id: 'result', label: 'Result', type: 'number' },
    ],
  },
];

// All blocks combined
export const ALL_BLOCKS = [
  ...INDICATOR_BLOCKS,
  ...CONDITION_BLOCKS,
  ...LOGIC_BLOCKS,
  ...ACTION_BLOCKS,
  ...VARIABLE_BLOCKS,
];

// ============================================
// Strategy Definition
// ============================================

export interface Strategy {
  id: string;
  name: string;
  description: string;
  version: number;
  
  // Settings
  symbol: string;
  timeframe: string;
  
  // Blocks
  blocks: StrategyBlock[];
  
  // Connections
  connections: BlockConnectionLine[];
  
  // Meta
  createdAt: number;
  updatedAt: number;
  author?: string;
  tags?: string[];
  
  // State
  isEnabled: boolean;
  isPinned?: boolean;
}

export interface BlockConnectionLine {
  id: string;
  fromBlockId: string;
  fromPortId: string;
  toBlockId: string;
  toPortId: string;
}

// ============================================
// Strategy Execution
// ============================================

export interface ExecutionContext {
  candles: CandleData[];
  currentIndex: number;
  symbol: string;
  timeframe: string;
  
  // State
  blockOutputs: Map<string, Map<string, any>>;
  previousOutputs: Map<string, Map<string, any>>;
  
  // Position tracking
  position: {
    side: 'none' | 'long' | 'short';
    entryPrice: number;
    size: number;
    stopLoss?: number;
    takeProfit?: number;
  };
  
  // Signals
  signals: ExecutionSignal[];
}

export interface ExecutionSignal {
  type: 'buy' | 'sell' | 'stoploss' | 'takeprofit' | 'alert';
  price: number;
  size?: number;
  message?: string;
  timestamp: number;
  blockId: string;
}

// ============================================
// Strategy Builder Manager
// ============================================

const STRATEGIES_KEY = 'tv_strategies';

export class StrategyBuilderManager {
  private strategies: Strategy[] = [];
  
  constructor() {
    this.loadStrategies();
  }
  
  // ============================================
  // Strategy CRUD
  // ============================================
  
  /**
   * Create a new strategy
   */
  createStrategy(name: string, symbol: string = 'BTCUSDT', timeframe: string = '1h'): Strategy {
    const strategy: Strategy = {
      id: crypto.randomUUID(),
      name,
      description: '',
      version: 1,
      symbol,
      timeframe,
      blocks: [],
      connections: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isEnabled: false,
    };
    
    this.strategies.push(strategy);
    this.saveStrategies();
    
    return strategy;
  }
  
  /**
   * Get a strategy by ID
   */
  getStrategy(id: string): Strategy | undefined {
    return this.strategies.find(s => s.id === id);
  }
  
  /**
   * Get all strategies
   */
  getAllStrategies(): Strategy[] {
    return [...this.strategies];
  }
  
  /**
   * Update a strategy
   */
  updateStrategy(id: string, updates: Partial<Strategy>): Strategy | null {
    const strategy = this.strategies.find(s => s.id === id);
    if (!strategy) return null;
    
    Object.assign(strategy, updates, { updatedAt: Date.now() });
    this.saveStrategies();
    
    return strategy;
  }
  
  /**
   * Delete a strategy
   */
  deleteStrategy(id: string): boolean {
    const index = this.strategies.findIndex(s => s.id === id);
    if (index === -1) return false;
    
    this.strategies.splice(index, 1);
    this.saveStrategies();
    
    return true;
  }
  
  /**
   * Duplicate a strategy
   */
  duplicateStrategy(id: string): Strategy | null {
    const original = this.strategies.find(s => s.id === id);
    if (!original) return null;
    
    const duplicate: Strategy = {
      ...JSON.parse(JSON.stringify(original)),
      id: crypto.randomUUID(),
      name: `${original.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isEnabled: false,
    };
    
    this.strategies.push(duplicate);
    this.saveStrategies();
    
    return duplicate;
  }
  
  // ============================================
  // Block Management
  // ============================================
  
  /**
   * Add a block to a strategy
   */
  addBlock(strategyId: string, blockType: string, x: number, y: number): StrategyBlock | null {
    const strategy = this.strategies.find(s => s.id === strategyId);
    if (!strategy) return null;
    
    const template = ALL_BLOCKS.find(b => b.type === blockType);
    if (!template) return null;
    
    const templateWithInputs = template as typeof template & { inputs?: BlockConnection[] };
    
    const block: StrategyBlock = {
      ...JSON.parse(JSON.stringify(template)),
      id: crypto.randomUUID(),
      x,
      y,
      enabled: true,
      inputs: templateWithInputs.inputs?.map(i => ({ ...i })) || [],
      outputs: template.outputs?.map(o => ({ ...o })) || [],
    };
    
    strategy.blocks.push(block);
    strategy.updatedAt = Date.now();
    this.saveStrategies();
    
    return block;
  }
  
  /**
   * Update a block
   */
  updateBlock(strategyId: string, blockId: string, updates: Partial<StrategyBlock>): StrategyBlock | null {
    const strategy = this.strategies.find(s => s.id === strategyId);
    if (!strategy) return null;
    
    const block = strategy.blocks.find(b => b.id === blockId);
    if (!block) return null;
    
    Object.assign(block, updates);
    strategy.updatedAt = Date.now();
    this.saveStrategies();
    
    return block;
  }
  
  /**
   * Remove a block
   */
  removeBlock(strategyId: string, blockId: string): boolean {
    const strategy = this.strategies.find(s => s.id === strategyId);
    if (!strategy) return false;
    
    const blockIndex = strategy.blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return false;
    
    // Remove block
    strategy.blocks.splice(blockIndex, 1);
    
    // Remove connections to/from this block
    strategy.connections = strategy.connections.filter(
      c => c.fromBlockId !== blockId && c.toBlockId !== blockId
    );
    
    strategy.updatedAt = Date.now();
    this.saveStrategies();
    
    return true;
  }
  
  /**
   * Update block parameter
   */
  updateBlockParameter(strategyId: string, blockId: string, paramName: string, value: any): boolean {
    const strategy = this.strategies.find(s => s.id === strategyId);
    if (!strategy) return false;
    
    const block = strategy.blocks.find(b => b.id === blockId);
    if (!block) return false;
    
    const param = block.parameters.find(p => p.name === paramName);
    if (!param) return false;
    
    param.value = value;
    strategy.updatedAt = Date.now();
    this.saveStrategies();
    
    return true;
  }
  
  // ============================================
  // Connection Management
  // ============================================
  
  /**
   * Create a connection between blocks
   */
  createConnection(
    strategyId: string,
    fromBlockId: string,
    fromPortId: string,
    toBlockId: string,
    toPortId: string
  ): BlockConnectionLine | null {
    const strategy = this.strategies.find(s => s.id === strategyId);
    if (!strategy) return null;
    
    // Validate blocks exist
    const fromBlock = strategy.blocks.find(b => b.id === fromBlockId);
    const toBlock = strategy.blocks.find(b => b.id === toBlockId);
    if (!fromBlock || !toBlock) return null;
    
    // Validate ports exist
    const fromPort = fromBlock.outputs?.find(o => o.id === fromPortId);
    const toPort = toBlock.inputs?.find(i => i.id === toPortId);
    if (!fromPort || !toPort) return null;
    
    // Check type compatibility
    if (fromPort.type !== toPort.type && fromPort.type !== 'any' && toPort.type !== 'any') {
      return null;
    }
    
    // Check for existing connection to this input
    const existingIndex = strategy.connections.findIndex(
      c => c.toBlockId === toBlockId && c.toPortId === toPortId
    );
    if (existingIndex !== -1) {
      strategy.connections.splice(existingIndex, 1);
    }
    
    const connection: BlockConnectionLine = {
      id: crypto.randomUUID(),
      fromBlockId,
      fromPortId,
      toBlockId,
      toPortId,
    };
    
    // Update port connection info
    toPort.connectedTo = fromBlockId;
    toPort.connectedPort = fromPortId;
    
    strategy.connections.push(connection);
    strategy.updatedAt = Date.now();
    this.saveStrategies();
    
    return connection;
  }
  
  /**
   * Remove a connection
   */
  removeConnection(strategyId: string, connectionId: string): boolean {
    const strategy = this.strategies.find(s => s.id === strategyId);
    if (!strategy) return false;
    
    const connIndex = strategy.connections.findIndex(c => c.id === connectionId);
    if (connIndex === -1) return false;
    
    const conn = strategy.connections[connIndex];
    
    // Clear port connection info
    const toBlock = strategy.blocks.find(b => b.id === conn.toBlockId);
    if (toBlock) {
      const toPort = toBlock.inputs?.find(i => i.id === conn.toPortId);
      if (toPort) {
        toPort.connectedTo = undefined;
        toPort.connectedPort = undefined;
      }
    }
    
    strategy.connections.splice(connIndex, 1);
    strategy.updatedAt = Date.now();
    this.saveStrategies();
    
    return true;
  }
  
  // ============================================
  // Strategy Execution
  // ============================================
  
  /**
   * Execute a strategy on candle data
   */
  executeStrategy(strategy: Strategy, candles: CandleData[]): ExecutionSignal[] {
    const signals: ExecutionSignal[] = [];
    
    // Initialize context
    const context: ExecutionContext = {
      candles,
      currentIndex: 0,
      symbol: strategy.symbol,
      timeframe: strategy.timeframe,
      blockOutputs: new Map(),
      previousOutputs: new Map(),
      position: {
        side: 'none',
        entryPrice: 0,
        size: 0,
      },
      signals: [],
    };
    
    // Build execution order (topological sort)
    const executionOrder = this.buildExecutionOrder(strategy);
    
    // Process each candle
    for (let i = 50; i < candles.length; i++) { // Start at 50 for indicator warmup
      context.currentIndex = i;
      context.previousOutputs = new Map(context.blockOutputs);
      context.blockOutputs = new Map();
      
      // Execute blocks in order
      for (const blockId of executionOrder) {
        const block = strategy.blocks.find(b => b.id === blockId);
        if (!block || !block.enabled) continue;
        
        const outputs = this.executeBlock(block, strategy, context);
        context.blockOutputs.set(blockId, outputs);
      }
      
      // Collect signals from action blocks
      for (const block of strategy.blocks) {
        if (block.category !== 'action') continue;
        
        const outputs = context.blockOutputs.get(block.id);
        const triggered = this.getInputValue(block, 'trigger', strategy, context);
        
        if (triggered) {
          const candle = candles[i];
          const signal = this.createSignalFromBlock(block, candle, context);
          if (signal) {
            signals.push(signal);
            context.signals.push(signal);
          }
        }
      }
    }
    
    return signals;
  }
  
  /**
   * Build topological execution order
   */
  private buildExecutionOrder(strategy: Strategy): string[] {
    const visited = new Set<string>();
    const order: string[] = [];
    
    const visit = (blockId: string) => {
      if (visited.has(blockId)) return;
      visited.add(blockId);
      
      const block = strategy.blocks.find(b => b.id === blockId);
      if (!block) return;
      
      // Visit dependencies first
      for (const input of block.inputs || []) {
        if (input.connectedTo) {
          visit(input.connectedTo);
        }
      }
      
      order.push(blockId);
    };
    
    // Start from action blocks and work backwards
    for (const block of strategy.blocks) {
      if (block.category === 'action') {
        visit(block.id);
      }
    }
    
    // Add any remaining blocks
    for (const block of strategy.blocks) {
      visit(block.id);
    }
    
    return order;
  }
  
  /**
   * Execute a single block
   */
  private executeBlock(
    block: StrategyBlock,
    strategy: Strategy,
    context: ExecutionContext
  ): Map<string, any> {
    const outputs = new Map<string, any>();
    const candles = context.candles;
    const i = context.currentIndex;
    const candle = candles[i];
    
    switch (block.type) {
      // Indicators
      case 'price':
        outputs.set('open', candle.open);
        outputs.set('high', candle.high);
        outputs.set('low', candle.low);
        outputs.set('close', candle.close);
        break;
        
      case 'sma': {
        const period = this.getParamValue(block, 'period');
        const source = this.getParamValue(block, 'source') || 'close';
        const values = candles.slice(i - period + 1, i + 1).map(c => this.getCandleValue(c, source));
        const sma = values.reduce((a, b) => a + b, 0) / period;
        outputs.set('value', sma);
        break;
      }
        
      case 'ema': {
        const period = this.getParamValue(block, 'period');
        const source = this.getParamValue(block, 'source') || 'close';
        const multiplier = 2 / (period + 1);
        
        // Get previous EMA or calculate from SMA
        let prevEma = context.previousOutputs.get(block.id)?.get('value');
        if (prevEma === undefined) {
          const values = candles.slice(i - period + 1, i + 1).map(c => this.getCandleValue(c, source));
          prevEma = values.reduce((a, b) => a + b, 0) / period;
        }
        
        const currentValue = this.getCandleValue(candle, source);
        const ema = (currentValue - prevEma) * multiplier + prevEma;
        outputs.set('value', ema);
        break;
      }
        
      case 'rsi': {
        const period = this.getParamValue(block, 'period');
        const values = candles.slice(i - period, i + 1).map(c => c.close);
        
        let gains = 0;
        let losses = 0;
        
        for (let j = 1; j < values.length; j++) {
          const change = values[j] - values[j - 1];
          if (change > 0) gains += change;
          else losses -= change;
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        
        outputs.set('value', rsi);
        outputs.set('overbought', rsi > 70);
        outputs.set('oversold', rsi < 30);
        break;
      }
        
      case 'macd': {
        const fastPeriod = this.getParamValue(block, 'fastPeriod');
        const slowPeriod = this.getParamValue(block, 'slowPeriod');
        const signalPeriod = this.getParamValue(block, 'signalPeriod');
        
        // Calculate EMAs (simplified)
        const fastEma = this.calculateEMA(candles.slice(0, i + 1).map(c => c.close), fastPeriod);
        const slowEma = this.calculateEMA(candles.slice(0, i + 1).map(c => c.close), slowPeriod);
        const macdLine = fastEma - slowEma;
        
        // Signal line (EMA of MACD)
        const macdHistory = [];
        for (let j = slowPeriod; j <= i; j++) {
          const fast = this.calculateEMA(candles.slice(0, j + 1).map(c => c.close), fastPeriod);
          const slow = this.calculateEMA(candles.slice(0, j + 1).map(c => c.close), slowPeriod);
          macdHistory.push(fast - slow);
        }
        const signalLine = this.calculateEMA(macdHistory, signalPeriod);
        
        outputs.set('macd', macdLine);
        outputs.set('signal', signalLine);
        outputs.set('histogram', macdLine - signalLine);
        break;
      }
        
      case 'bollinger': {
        const period = this.getParamValue(block, 'period');
        const stdDev = this.getParamValue(block, 'stdDev');
        const values = candles.slice(i - period + 1, i + 1).map(c => c.close);
        
        const sma = values.reduce((a, b) => a + b, 0) / period;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - sma, 2), 0) / period;
        const std = Math.sqrt(variance);
        
        outputs.set('upper', sma + std * stdDev);
        outputs.set('middle', sma);
        outputs.set('lower', sma - std * stdDev);
        break;
      }
        
      case 'atr': {
        const period = this.getParamValue(block, 'period');
        const trs: number[] = [];
        
        for (let j = i - period + 1; j <= i; j++) {
          const curr = candles[j];
          const prev = candles[j - 1];
          const tr = Math.max(
            curr.high - curr.low,
            Math.abs(curr.high - prev.close),
            Math.abs(curr.low - prev.close)
          );
          trs.push(tr);
        }
        
        outputs.set('value', trs.reduce((a, b) => a + b, 0) / period);
        break;
      }
        
      case 'volume': {
        const maPeriod = this.getParamValue(block, 'maPeriod');
        const volumes = candles.slice(i - maPeriod + 1, i + 1).map(c => c.volume || 0);
        const volumeMA = volumes.reduce((a, b) => a + b, 0) / maPeriod;
        
        outputs.set('value', candle.volume || 0);
        outputs.set('ma', volumeMA);
        outputs.set('aboveAvg', (candle.volume || 0) > volumeMA);
        break;
      }
        
      // Conditions
      case 'compare': {
        const a = this.getInputValue(block, 'a', strategy, context);
        const b = this.getInputValue(block, 'b', strategy, context);
        const op = this.getParamValue(block, 'operator');
        
        let result = false;
        switch (op) {
          case 'gt': result = a > b; break;
          case 'gte': result = a >= b; break;
          case 'lt': result = a < b; break;
          case 'lte': result = a <= b; break;
          case 'eq': result = a === b; break;
          case 'neq': result = a !== b; break;
        }
        
        outputs.set('result', result);
        break;
      }
        
      case 'crossover': {
        const a = this.getInputValue(block, 'a', strategy, context);
        const b = this.getInputValue(block, 'b', strategy, context);
        const prevA = this.getPreviousInputValue(block, 'a', strategy, context);
        const prevB = this.getPreviousInputValue(block, 'b', strategy, context);
        
        outputs.set('crossUp', prevA !== undefined && prevB !== undefined && prevA <= prevB && a > b);
        outputs.set('crossDown', prevA !== undefined && prevB !== undefined && prevA >= prevB && a < b);
        break;
      }
        
      case 'threshold': {
        const value = this.getInputValue(block, 'value', strategy, context);
        const threshold = this.getParamValue(block, 'threshold');
        const direction = this.getParamValue(block, 'direction');
        
        let result = false;
        switch (direction) {
          case 'above': result = value > threshold; break;
          case 'below': result = value < threshold; break;
          case 'equals': result = Math.abs(value - threshold) < 0.0001; break;
        }
        
        outputs.set('result', result);
        break;
      }
        
      case 'range': {
        const value = this.getInputValue(block, 'value', strategy, context);
        const min = this.getParamValue(block, 'min');
        const max = this.getParamValue(block, 'max');
        outputs.set('inRange', value >= min && value <= max);
        break;
      }
        
      // Logic
      case 'and': {
        const a = this.getInputValue(block, 'a', strategy, context);
        const b = this.getInputValue(block, 'b', strategy, context);
        outputs.set('result', a && b);
        break;
      }
        
      case 'or': {
        const a = this.getInputValue(block, 'a', strategy, context);
        const b = this.getInputValue(block, 'b', strategy, context);
        outputs.set('result', a || b);
        break;
      }
        
      case 'not': {
        const input = this.getInputValue(block, 'input', strategy, context);
        outputs.set('result', !input);
        break;
      }
        
      case 'counter': {
        const input = this.getInputValue(block, 'input', strategy, context);
        const minCount = this.getParamValue(block, 'minCount');
        const prevCount = context.previousOutputs.get(block.id)?.get('count') || 0;
        const count = input ? prevCount + 1 : 0;
        outputs.set('count', count);
        outputs.set('triggered', count >= minCount);
        break;
      }
        
      // Variables
      case 'constant':
        outputs.set('value', this.getParamValue(block, 'value'));
        break;
        
      case 'math': {
        const a = this.getInputValue(block, 'a', strategy, context) || 0;
        const b = this.getInputValue(block, 'b', strategy, context) || 0;
        const op = this.getParamValue(block, 'operation');
        
        let result = 0;
        switch (op) {
          case 'add': result = a + b; break;
          case 'subtract': result = a - b; break;
          case 'multiply': result = a * b; break;
          case 'divide': result = b !== 0 ? a / b : 0; break;
          case 'power': result = Math.pow(a, b); break;
          case 'abs': result = Math.abs(a); break;
          case 'sqrt': result = Math.sqrt(a); break;
        }
        
        outputs.set('result', result);
        break;
      }
    }
    
    return outputs;
  }
  
  // Helper methods
  private getParamValue(block: StrategyBlock, paramName: string): any {
    const param = block.parameters.find(p => p.name === paramName);
    return param?.value ?? param?.defaultValue;
  }
  
  private getInputValue(
    block: StrategyBlock,
    inputId: string,
    strategy: Strategy,
    context: ExecutionContext
  ): any {
    const input = block.inputs?.find(i => i.id === inputId);
    if (!input || !input.connectedTo || !input.connectedPort) return undefined;
    
    const sourceOutputs = context.blockOutputs.get(input.connectedTo);
    return sourceOutputs?.get(input.connectedPort);
  }
  
  private getPreviousInputValue(
    block: StrategyBlock,
    inputId: string,
    strategy: Strategy,
    context: ExecutionContext
  ): any {
    const input = block.inputs?.find(i => i.id === inputId);
    if (!input || !input.connectedTo || !input.connectedPort) return undefined;
    
    const sourceOutputs = context.previousOutputs.get(input.connectedTo);
    return sourceOutputs?.get(input.connectedPort);
  }
  
  private getCandleValue(candle: CandleData, source: string): number {
    switch (source) {
      case 'open': return candle.open;
      case 'high': return candle.high;
      case 'low': return candle.low;
      case 'close': return candle.close;
      case 'hl2': return (candle.high + candle.low) / 2;
      case 'hlc3': return (candle.high + candle.low + candle.close) / 3;
      case 'ohlc4': return (candle.open + candle.high + candle.low + candle.close) / 4;
      default: return candle.close;
    }
  }
  
  private calculateEMA(values: number[], period: number): number {
    if (values.length < period) return values[values.length - 1] || 0;
    
    const multiplier = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = period; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }
  
  private createSignalFromBlock(
    block: StrategyBlock,
    candle: CandleData,
    context: ExecutionContext
  ): ExecutionSignal | null {
    switch (block.type) {
      case 'buy':
        return {
          type: 'buy',
          price: candle.close,
          size: this.getParamValue(block, 'size'),
          timestamp: candle.time,
          blockId: block.id,
        };
        
      case 'sell':
        return {
          type: 'sell',
          price: candle.close,
          size: this.getParamValue(block, 'size'),
          timestamp: candle.time,
          blockId: block.id,
        };
        
      case 'alert':
        return {
          type: 'alert',
          price: candle.close,
          message: this.getParamValue(block, 'message'),
          timestamp: candle.time,
          blockId: block.id,
        };
        
      default:
        return null;
    }
  }
  
  // ============================================
  // Import/Export
  // ============================================
  
  /**
   * Export a strategy to JSON
   */
  exportStrategy(id: string): string | null {
    const strategy = this.strategies.find(s => s.id === id);
    if (!strategy) return null;
    
    return JSON.stringify(strategy, null, 2);
  }
  
  /**
   * Import a strategy from JSON
   */
  importStrategy(json: string): Strategy | null {
    try {
      const data = JSON.parse(json);
      
      const strategy: Strategy = {
        ...data,
        id: crypto.randomUUID(),
        name: `${data.name} (Imported)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isEnabled: false,
      };
      
      this.strategies.push(strategy);
      this.saveStrategies();
      
      return strategy;
    } catch (error) {
      console.error('Failed to import strategy:', error);
      return null;
    }
  }
  
  // ============================================
  // Templates
  // ============================================
  
  /**
   * Get available strategy templates
   */
  getTemplates(): { id: string; name: string; description: string }[] {
    return [
      { id: 'golden_cross', name: 'Golden Cross', description: 'SMA 50/200 crossover strategy' },
      { id: 'rsi_reversal', name: 'RSI Reversal', description: 'Buy oversold, sell overbought' },
      { id: 'bollinger_bounce', name: 'Bollinger Bounce', description: 'Mean reversion at bands' },
      { id: 'macd_momentum', name: 'MACD Momentum', description: 'MACD histogram momentum' },
    ];
  }
  
  /**
   * Create strategy from template
   */
  createFromTemplate(templateId: string, name: string): Strategy | null {
    const strategy = this.createStrategy(name);
    
    switch (templateId) {
      case 'golden_cross':
        // Add SMA 50
        const sma50 = this.addBlock(strategy.id, 'sma', 100, 100);
        if (sma50) this.updateBlockParameter(strategy.id, sma50.id, 'period', 50);
        
        // Add SMA 200
        const sma200 = this.addBlock(strategy.id, 'sma', 100, 200);
        if (sma200) this.updateBlockParameter(strategy.id, sma200.id, 'period', 200);
        
        // Add crossover
        const cross = this.addBlock(strategy.id, 'crossover', 300, 150);
        
        // Add buy/sell
        const buy = this.addBlock(strategy.id, 'buy', 500, 100);
        const sell = this.addBlock(strategy.id, 'sell', 500, 200);
        
        // Connect
        if (sma50 && sma200 && cross) {
          this.createConnection(strategy.id, sma50.id, 'value', cross.id, 'a');
          this.createConnection(strategy.id, sma200.id, 'value', cross.id, 'b');
        }
        if (cross && buy) this.createConnection(strategy.id, cross.id, 'crossUp', buy.id, 'trigger');
        if (cross && sell) this.createConnection(strategy.id, cross.id, 'crossDown', sell.id, 'trigger');
        break;
        
      case 'rsi_reversal':
        const rsi = this.addBlock(strategy.id, 'rsi', 100, 150);
        const buyRsi = this.addBlock(strategy.id, 'buy', 300, 100);
        const sellRsi = this.addBlock(strategy.id, 'sell', 300, 200);
        
        if (rsi && buyRsi) this.createConnection(strategy.id, rsi.id, 'oversold', buyRsi.id, 'trigger');
        if (rsi && sellRsi) this.createConnection(strategy.id, rsi.id, 'overbought', sellRsi.id, 'trigger');
        break;
    }
    
    return this.getStrategy(strategy.id) || null;
  }
  
  // ============================================
  // Persistence
  // ============================================
  
  private loadStrategies(): void {
    try {
      const data = localStorage.getItem(STRATEGIES_KEY);
      if (data) {
        this.strategies = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load strategies:', error);
    }
  }
  
  private saveStrategies(): void {
    localStorage.setItem(STRATEGIES_KEY, JSON.stringify(this.strategies));
  }
}

// ============================================
// Singleton Instance
// ============================================

export const strategyBuilder = new StrategyBuilderManager();

export default strategyBuilder;
