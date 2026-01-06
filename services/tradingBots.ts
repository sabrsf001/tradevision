/**
 * Trading Bots Service - TradeVision
 * Automated trading strategies: DCA, Grid, Signal-based
 */

import type { CandleData } from '../types';
import { addAuditLog } from './security';

// ============================================
// Types
// ============================================

export type BotType = 'dca' | 'grid' | 'signal' | 'trailing' | 'arbitrage';
export type BotStatus = 'running' | 'paused' | 'stopped' | 'error';

export interface BotOrder {
  id: string;
  botId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  price?: number;
  quantity: number;
  status: 'pending' | 'filled' | 'cancelled' | 'failed';
  filledPrice?: number;
  filledQuantity?: number;
  createdAt: number;
  executedAt?: number;
  error?: string;
}

export interface BotStats {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalVolume: number;
  realizedPnl: number;
  unrealizedPnl: number;
  winRate: number;
  avgTradeSize: number;
  runningTime: number; // milliseconds
}

export interface BotBase {
  id: string;
  name: string;
  type: BotType;
  symbol: string;
  exchange?: string;
  status: BotStatus;
  createdAt: number;
  startedAt?: number;
  stoppedAt?: number;
  lastRunAt?: number;
  stats: BotStats;
  orders: BotOrder[];
  error?: string;
}

// ============================================
// DCA Bot
// ============================================

export interface DCABotConfig {
  investmentAmount: number; // Amount per purchase
  frequency: 'hourly' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
  customIntervalHours?: number;
  maxTotalInvestment?: number;
  priceThreshold?: {
    type: 'below' | 'above';
    price: number;
  };
  boostOnDip?: {
    enabled: boolean;
    dipPercent: number; // Buy extra if price drops this much
    boostMultiplier: number; // Multiply investment by this
  };
}

export interface DCABot extends BotBase {
  type: 'dca';
  config: DCABotConfig;
  totalInvested: number;
  avgBuyPrice: number;
  totalQuantity: number;
  nextBuyTime?: number;
}

// ============================================
// Grid Bot
// ============================================

export interface GridBotConfig {
  upperPrice: number;
  lowerPrice: number;
  gridCount: number; // Number of grid lines
  totalInvestment: number;
  mode: 'arithmetic' | 'geometric'; // Grid spacing
  takeProfit?: number; // Stop when profit reaches this
  stopLoss?: number; // Stop when loss reaches this
}

export interface GridLevel {
  price: number;
  side: 'buy' | 'sell';
  quantity: number;
  orderId?: string;
  filled: boolean;
}

export interface GridBot extends BotBase {
  type: 'grid';
  config: GridBotConfig;
  gridLevels: GridLevel[];
  baseAssetHeld: number;
  quoteAssetHeld: number;
  gridProfit: number;
}

// ============================================
// Signal Bot
// ============================================

export interface SignalCondition {
  indicator: 'rsi' | 'macd' | 'sma' | 'ema' | 'price' | 'volume';
  operator: '>' | '<' | '>=' | '<=' | 'crosses_above' | 'crosses_below';
  value: number;
  period?: number;
}

export interface SignalBotConfig {
  entryConditions: SignalCondition[];
  exitConditions: SignalCondition[];
  conditionLogic: 'all' | 'any';
  positionSize: number; // Percentage of available balance
  maxPositions: number;
  stopLoss?: number; // Percentage
  takeProfit?: number; // Percentage
  trailingStop?: number; // Percentage
  cooldownMinutes: number; // Min time between trades
}

export interface SignalBot extends BotBase {
  type: 'signal';
  config: SignalBotConfig;
  activePositions: {
    entryPrice: number;
    quantity: number;
    entryTime: number;
    stopLoss?: number;
    takeProfit?: number;
  }[];
  lastSignalTime?: number;
}

// ============================================
// Trailing Stop Bot
// ============================================

export interface TrailingBotConfig {
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  quantity: number;
  trailingPercent: number;
  activationPercent?: number; // Only activate trailing after this profit
}

export interface TrailingBot extends BotBase {
  type: 'trailing';
  config: TrailingBotConfig;
  highestPrice: number;
  lowestPrice: number;
  currentStopPrice: number;
  isActivated: boolean;
}

// ============================================
// Union Type
// ============================================

export type TradingBot = DCABot | GridBot | SignalBot | TrailingBot;

// ============================================
// Bot Manager
// ============================================

const BOTS_STORAGE_KEY = 'tv_trading_bots';

export class TradingBotManager {
  private bots: Map<string, TradingBot> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private onOrderCallback?: (order: BotOrder) => void;
  
  constructor() {
    this.loadBots();
  }
  
  /**
   * Set callback for when bot places an order
   */
  setOnOrder(callback: (order: BotOrder) => void): void {
    this.onOrderCallback = callback;
  }
  
  // ============================================
  // DCA Bot Operations
  // ============================================
  
  /**
   * Create a new DCA bot
   */
  createDCABot(name: string, symbol: string, config: DCABotConfig): DCABot {
    const bot: DCABot = {
      id: crypto.randomUUID(),
      name,
      type: 'dca',
      symbol,
      status: 'stopped',
      createdAt: Date.now(),
      config,
      totalInvested: 0,
      avgBuyPrice: 0,
      totalQuantity: 0,
      stats: this.createEmptyStats(),
      orders: [],
    };
    
    this.bots.set(bot.id, bot);
    this.saveBots();
    
    addAuditLog('trade', { action: 'create_bot', botType: 'dca', botId: bot.id });
    
    return bot;
  }
  
  /**
   * Execute DCA purchase
   */
  private async executeDCABuy(bot: DCABot, currentPrice: number): Promise<void> {
    // Check max investment
    if (bot.config.maxTotalInvestment && bot.totalInvested >= bot.config.maxTotalInvestment) {
      this.stopBot(bot.id);
      return;
    }
    
    // Check price threshold
    if (bot.config.priceThreshold) {
      const { type, price } = bot.config.priceThreshold;
      if (type === 'below' && currentPrice > price) return;
      if (type === 'above' && currentPrice < price) return;
    }
    
    // Calculate investment amount
    let amount = bot.config.investmentAmount;
    
    // Boost on dip
    if (bot.config.boostOnDip?.enabled && bot.avgBuyPrice > 0) {
      const dropPercent = ((bot.avgBuyPrice - currentPrice) / bot.avgBuyPrice) * 100;
      if (dropPercent >= bot.config.boostOnDip.dipPercent) {
        amount *= bot.config.boostOnDip.boostMultiplier;
      }
    }
    
    // Create order
    const quantity = amount / currentPrice;
    const order = this.createOrder(bot.id, bot.symbol, 'buy', 'market', quantity);
    
    // Simulate fill (in production, this would call exchange API)
    order.status = 'filled';
    order.filledPrice = currentPrice;
    order.filledQuantity = quantity;
    order.executedAt = Date.now();
    
    bot.orders.push(order);
    
    // Update bot stats
    const totalValue = bot.totalInvested + amount;
    const totalQty = bot.totalQuantity + quantity;
    bot.avgBuyPrice = totalValue / totalQty;
    bot.totalInvested = totalValue;
    bot.totalQuantity = totalQty;
    bot.stats.totalTrades++;
    bot.stats.successfulTrades++;
    bot.stats.totalVolume += amount;
    
    // Calculate next buy time
    bot.nextBuyTime = this.calculateNextDCATime(bot.config);
    bot.lastRunAt = Date.now();
    
    this.saveBots();
    
    if (this.onOrderCallback) {
      this.onOrderCallback(order);
    }
    
    addAuditLog('trade', {
      action: 'dca_buy',
      botId: bot.id,
      amount,
      price: currentPrice,
      quantity,
    });
  }
  
  private calculateNextDCATime(config: DCABotConfig): number {
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;
    
    switch (config.frequency) {
      case 'hourly':
        return now + hourMs;
      case 'daily':
        return now + 24 * hourMs;
      case 'weekly':
        return now + 7 * 24 * hourMs;
      case 'biweekly':
        return now + 14 * 24 * hourMs;
      case 'monthly':
        return now + 30 * 24 * hourMs;
      default:
        return now + (config.customIntervalHours || 24) * hourMs;
    }
  }
  
  // ============================================
  // Grid Bot Operations
  // ============================================
  
  /**
   * Create a new Grid bot
   */
  createGridBot(name: string, symbol: string, config: GridBotConfig): GridBot {
    const gridLevels = this.calculateGridLevels(config);
    
    const bot: GridBot = {
      id: crypto.randomUUID(),
      name,
      type: 'grid',
      symbol,
      status: 'stopped',
      createdAt: Date.now(),
      config,
      gridLevels,
      baseAssetHeld: 0,
      quoteAssetHeld: config.totalInvestment,
      gridProfit: 0,
      stats: this.createEmptyStats(),
      orders: [],
    };
    
    this.bots.set(bot.id, bot);
    this.saveBots();
    
    addAuditLog('trade', { action: 'create_bot', botType: 'grid', botId: bot.id });
    
    return bot;
  }
  
  private calculateGridLevels(config: GridBotConfig): GridLevel[] {
    const levels: GridLevel[] = [];
    const { upperPrice, lowerPrice, gridCount, totalInvestment, mode } = config;
    
    const pricePerGrid = totalInvestment / gridCount;
    
    for (let i = 0; i <= gridCount; i++) {
      let price: number;
      
      if (mode === 'arithmetic') {
        // Equal price gaps
        price = lowerPrice + ((upperPrice - lowerPrice) / gridCount) * i;
      } else {
        // Equal percentage gaps
        const ratio = Math.pow(upperPrice / lowerPrice, 1 / gridCount);
        price = lowerPrice * Math.pow(ratio, i);
      }
      
      levels.push({
        price,
        side: 'buy', // Initially all are buy orders
        quantity: pricePerGrid / price,
        filled: false,
      });
    }
    
    return levels;
  }
  
  /**
   * Process grid bot on price update
   */
  private processGridBot(bot: GridBot, currentPrice: number): void {
    let updated = false;
    
    for (const level of bot.gridLevels) {
      // Check buy levels (price drops to this level)
      if (level.side === 'buy' && !level.filled && currentPrice <= level.price) {
        const order = this.createOrder(bot.id, bot.symbol, 'buy', 'limit', level.quantity, level.price);
        order.status = 'filled';
        order.filledPrice = level.price;
        order.filledQuantity = level.quantity;
        order.executedAt = Date.now();
        
        bot.orders.push(order);
        level.filled = true;
        level.orderId = order.id;
        level.side = 'sell'; // Now waiting to sell at higher price
        
        bot.baseAssetHeld += level.quantity;
        bot.quoteAssetHeld -= level.price * level.quantity;
        bot.stats.totalTrades++;
        bot.stats.successfulTrades++;
        
        updated = true;
        
        if (this.onOrderCallback) {
          this.onOrderCallback(order);
        }
      }
      
      // Check sell levels (price rises to this level)
      if (level.side === 'sell' && level.filled && currentPrice >= level.price * 1.01) { // 1% profit
        const sellPrice = level.price * 1.01;
        const order = this.createOrder(bot.id, bot.symbol, 'sell', 'limit', level.quantity, sellPrice);
        order.status = 'filled';
        order.filledPrice = sellPrice;
        order.filledQuantity = level.quantity;
        order.executedAt = Date.now();
        
        bot.orders.push(order);
        level.filled = false;
        level.side = 'buy';
        
        const profit = (sellPrice - level.price) * level.quantity;
        bot.gridProfit += profit;
        bot.baseAssetHeld -= level.quantity;
        bot.quoteAssetHeld += sellPrice * level.quantity;
        bot.stats.totalTrades++;
        bot.stats.successfulTrades++;
        bot.stats.realizedPnl += profit;
        
        updated = true;
        
        if (this.onOrderCallback) {
          this.onOrderCallback(order);
        }
      }
    }
    
    // Check stop conditions
    if (bot.config.takeProfit && bot.gridProfit >= bot.config.takeProfit) {
      this.stopBot(bot.id);
    }
    
    if (updated) {
      bot.lastRunAt = Date.now();
      this.saveBots();
    }
  }
  
  // ============================================
  // Signal Bot Operations
  // ============================================
  
  /**
   * Create a new Signal bot
   */
  createSignalBot(name: string, symbol: string, config: SignalBotConfig): SignalBot {
    const bot: SignalBot = {
      id: crypto.randomUUID(),
      name,
      type: 'signal',
      symbol,
      status: 'stopped',
      createdAt: Date.now(),
      config,
      activePositions: [],
      stats: this.createEmptyStats(),
      orders: [],
    };
    
    this.bots.set(bot.id, bot);
    this.saveBots();
    
    addAuditLog('trade', { action: 'create_bot', botType: 'signal', botId: bot.id });
    
    return bot;
  }
  
  /**
   * Evaluate signal bot conditions
   */
  evaluateSignalBot(bot: SignalBot, candles: CandleData[], currentPrice: number): void {
    // Check cooldown
    if (bot.lastSignalTime) {
      const cooldownMs = bot.config.cooldownMinutes * 60 * 1000;
      if (Date.now() - bot.lastSignalTime < cooldownMs) return;
    }
    
    // Check max positions
    if (bot.activePositions.length >= bot.config.maxPositions) {
      // Check exit conditions for existing positions
      this.checkSignalExits(bot, candles, currentPrice);
      return;
    }
    
    // Evaluate entry conditions
    const entryMet = this.evaluateConditions(bot.config.entryConditions, candles, currentPrice, bot.config.conditionLogic);
    
    if (entryMet) {
      // Open position
      const quantity = bot.config.positionSize;
      const order = this.createOrder(bot.id, bot.symbol, 'buy', 'market', quantity);
      order.status = 'filled';
      order.filledPrice = currentPrice;
      order.filledQuantity = quantity;
      order.executedAt = Date.now();
      
      bot.orders.push(order);
      bot.activePositions.push({
        entryPrice: currentPrice,
        quantity,
        entryTime: Date.now(),
        stopLoss: bot.config.stopLoss ? currentPrice * (1 - bot.config.stopLoss / 100) : undefined,
        takeProfit: bot.config.takeProfit ? currentPrice * (1 + bot.config.takeProfit / 100) : undefined,
      });
      
      bot.lastSignalTime = Date.now();
      bot.stats.totalTrades++;
      bot.stats.successfulTrades++;
      
      this.saveBots();
      
      if (this.onOrderCallback) {
        this.onOrderCallback(order);
      }
    }
    
    this.checkSignalExits(bot, candles, currentPrice);
  }
  
  private checkSignalExits(bot: SignalBot, candles: CandleData[], currentPrice: number): void {
    const positionsToClose: number[] = [];
    
    for (let i = 0; i < bot.activePositions.length; i++) {
      const pos = bot.activePositions[i];
      
      // Check stop loss
      if (pos.stopLoss && currentPrice <= pos.stopLoss) {
        positionsToClose.push(i);
        continue;
      }
      
      // Check take profit
      if (pos.takeProfit && currentPrice >= pos.takeProfit) {
        positionsToClose.push(i);
        continue;
      }
      
      // Update trailing stop
      if (bot.config.trailingStop) {
        const newStop = currentPrice * (1 - bot.config.trailingStop / 100);
        if (!pos.stopLoss || newStop > pos.stopLoss) {
          pos.stopLoss = newStop;
        }
      }
      
      // Check exit conditions
      const exitMet = this.evaluateConditions(bot.config.exitConditions, candles, currentPrice, bot.config.conditionLogic);
      if (exitMet) {
        positionsToClose.push(i);
      }
    }
    
    // Close positions (reverse order to maintain indices)
    for (const i of positionsToClose.reverse()) {
      const pos = bot.activePositions[i];
      const pnl = (currentPrice - pos.entryPrice) * pos.quantity;
      
      const order = this.createOrder(bot.id, bot.symbol, 'sell', 'market', pos.quantity);
      order.status = 'filled';
      order.filledPrice = currentPrice;
      order.filledQuantity = pos.quantity;
      order.executedAt = Date.now();
      
      bot.orders.push(order);
      bot.activePositions.splice(i, 1);
      bot.stats.totalTrades++;
      bot.stats.realizedPnl += pnl;
      
      if (pnl > 0) {
        bot.stats.successfulTrades++;
      }
      
      if (this.onOrderCallback) {
        this.onOrderCallback(order);
      }
    }
    
    if (positionsToClose.length > 0) {
      this.saveBots();
    }
  }
  
  private evaluateConditions(
    conditions: SignalCondition[],
    candles: CandleData[],
    currentPrice: number,
    logic: 'all' | 'any'
  ): boolean {
    const results = conditions.map(c => this.evaluateSingleCondition(c, candles, currentPrice));
    
    return logic === 'all'
      ? results.every(r => r)
      : results.some(r => r);
  }
  
  private evaluateSingleCondition(
    condition: SignalCondition,
    candles: CandleData[],
    currentPrice: number
  ): boolean {
    let currentValue: number;
    let previousValue: number | undefined;
    
    switch (condition.indicator) {
      case 'price':
        currentValue = currentPrice;
        previousValue = candles.length > 1 ? candles[candles.length - 2].close : undefined;
        break;
        
      case 'volume':
        currentValue = candles[candles.length - 1].volume || 0;
        break;
        
      case 'rsi':
        const period = condition.period || 14;
        if (candles.length < period + 1) return false;
        currentValue = this.calculateRSI(candles, period);
        break;
        
      case 'sma':
      case 'ema':
        const maPeriod = condition.period || 20;
        if (candles.length < maPeriod) return false;
        currentValue = condition.indicator === 'sma'
          ? this.calculateSMA(candles, maPeriod)
          : this.calculateEMA(candles, maPeriod);
        previousValue = condition.indicator === 'sma'
          ? this.calculateSMA(candles.slice(0, -1), maPeriod)
          : this.calculateEMA(candles.slice(0, -1), maPeriod);
        break;
        
      default:
        return false;
    }
    
    switch (condition.operator) {
      case '>':
        return currentValue > condition.value;
      case '<':
        return currentValue < condition.value;
      case '>=':
        return currentValue >= condition.value;
      case '<=':
        return currentValue <= condition.value;
      case 'crosses_above':
        return previousValue !== undefined && previousValue <= condition.value && currentValue > condition.value;
      case 'crosses_below':
        return previousValue !== undefined && previousValue >= condition.value && currentValue < condition.value;
      default:
        return false;
    }
  }
  
  // ============================================
  // Trailing Stop Bot Operations
  // ============================================
  
  /**
   * Create a new Trailing Stop bot
   */
  createTrailingBot(name: string, symbol: string, config: TrailingBotConfig): TrailingBot {
    const bot: TrailingBot = {
      id: crypto.randomUUID(),
      name,
      type: 'trailing',
      symbol,
      status: 'stopped',
      createdAt: Date.now(),
      config,
      highestPrice: config.entryPrice,
      lowestPrice: config.entryPrice,
      currentStopPrice: config.side === 'long'
        ? config.entryPrice * (1 - config.trailingPercent / 100)
        : config.entryPrice * (1 + config.trailingPercent / 100),
      isActivated: !config.activationPercent,
      stats: this.createEmptyStats(),
      orders: [],
    };
    
    this.bots.set(bot.id, bot);
    this.saveBots();
    
    return bot;
  }
  
  /**
   * Update trailing stop on price change
   */
  updateTrailingBot(bot: TrailingBot, currentPrice: number): void {
    // Check activation
    if (!bot.isActivated && bot.config.activationPercent) {
      const profitPercent = bot.config.side === 'long'
        ? ((currentPrice - bot.config.entryPrice) / bot.config.entryPrice) * 100
        : ((bot.config.entryPrice - currentPrice) / bot.config.entryPrice) * 100;
      
      if (profitPercent >= bot.config.activationPercent) {
        bot.isActivated = true;
      }
    }
    
    if (!bot.isActivated) return;
    
    if (bot.config.side === 'long') {
      // Long position: trail below price as it goes up
      if (currentPrice > bot.highestPrice) {
        bot.highestPrice = currentPrice;
        bot.currentStopPrice = currentPrice * (1 - bot.config.trailingPercent / 100);
      }
      
      // Check if stopped out
      if (currentPrice <= bot.currentStopPrice) {
        this.executeTrailingStop(bot, currentPrice);
      }
    } else {
      // Short position: trail above price as it goes down
      if (currentPrice < bot.lowestPrice) {
        bot.lowestPrice = currentPrice;
        bot.currentStopPrice = currentPrice * (1 + bot.config.trailingPercent / 100);
      }
      
      // Check if stopped out
      if (currentPrice >= bot.currentStopPrice) {
        this.executeTrailingStop(bot, currentPrice);
      }
    }
    
    this.saveBots();
  }
  
  private executeTrailingStop(bot: TrailingBot, currentPrice: number): void {
    const side = bot.config.side === 'long' ? 'sell' : 'buy';
    const order = this.createOrder(bot.id, bot.symbol, side, 'market', bot.config.quantity);
    
    order.status = 'filled';
    order.filledPrice = currentPrice;
    order.filledQuantity = bot.config.quantity;
    order.executedAt = Date.now();
    
    const pnl = bot.config.side === 'long'
      ? (currentPrice - bot.config.entryPrice) * bot.config.quantity
      : (bot.config.entryPrice - currentPrice) * bot.config.quantity;
    
    bot.orders.push(order);
    bot.stats.totalTrades++;
    bot.stats.realizedPnl = pnl;
    if (pnl > 0) bot.stats.successfulTrades++;
    
    this.stopBot(bot.id);
    
    if (this.onOrderCallback) {
      this.onOrderCallback(order);
    }
    
    addAuditLog('trade', {
      action: 'trailing_stop_executed',
      botId: bot.id,
      price: currentPrice,
      pnl,
    });
  }
  
  // ============================================
  // Bot Lifecycle
  // ============================================
  
  /**
   * Start a bot
   */
  startBot(id: string): boolean {
    const bot = this.bots.get(id);
    if (!bot) return false;
    
    bot.status = 'running';
    bot.startedAt = Date.now();
    bot.stoppedAt = undefined;
    
    this.saveBots();
    
    addAuditLog('trade', { action: 'start_bot', botId: id, botType: bot.type });
    
    return true;
  }
  
  /**
   * Pause a bot
   */
  pauseBot(id: string): boolean {
    const bot = this.bots.get(id);
    if (!bot) return false;
    
    bot.status = 'paused';
    
    this.saveBots();
    
    return true;
  }
  
  /**
   * Stop a bot
   */
  stopBot(id: string): boolean {
    const bot = this.bots.get(id);
    if (!bot) return false;
    
    bot.status = 'stopped';
    bot.stoppedAt = Date.now();
    
    // Clear interval if exists
    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
    }
    
    this.saveBots();
    
    addAuditLog('trade', { action: 'stop_bot', botId: id, botType: bot.type });
    
    return true;
  }
  
  /**
   * Delete a bot
   */
  deleteBot(id: string): boolean {
    this.stopBot(id);
    const deleted = this.bots.delete(id);
    if (deleted) this.saveBots();
    return deleted;
  }
  
  /**
   * Get all bots
   */
  getAllBots(): TradingBot[] {
    return Array.from(this.bots.values());
  }
  
  /**
   * Get bot by ID
   */
  getBot(id: string): TradingBot | undefined {
    return this.bots.get(id);
  }
  
  /**
   * Process price update for all active bots
   */
  onPriceUpdate(symbol: string, price: number, candles?: CandleData[]): void {
    for (const bot of this.bots.values()) {
      if (bot.symbol !== symbol || bot.status !== 'running') continue;
      
      switch (bot.type) {
        case 'dca':
          const dcaBot = bot as DCABot;
          if (!dcaBot.nextBuyTime || Date.now() >= dcaBot.nextBuyTime) {
            this.executeDCABuy(dcaBot, price);
          }
          break;
          
        case 'grid':
          this.processGridBot(bot as GridBot, price);
          break;
          
        case 'signal':
          if (candles) {
            this.evaluateSignalBot(bot as SignalBot, candles, price);
          }
          break;
          
        case 'trailing':
          this.updateTrailingBot(bot as TrailingBot, price);
          break;
      }
    }
  }
  
  // ============================================
  // Helpers
  // ============================================
  
  private createOrder(
    botId: string,
    symbol: string,
    side: 'buy' | 'sell',
    type: 'market' | 'limit',
    quantity: number,
    price?: number
  ): BotOrder {
    return {
      id: crypto.randomUUID(),
      botId,
      symbol,
      side,
      type,
      price,
      quantity,
      status: 'pending',
      createdAt: Date.now(),
    };
  }
  
  private createEmptyStats(): BotStats {
    return {
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalVolume: 0,
      realizedPnl: 0,
      unrealizedPnl: 0,
      winRate: 0,
      avgTradeSize: 0,
      runningTime: 0,
    };
  }
  
  private calculateSMA(candles: CandleData[], period: number): number {
    const closes = candles.slice(-period).map(c => c.close);
    return closes.reduce((a, b) => a + b, 0) / period;
  }
  
  private calculateEMA(candles: CandleData[], period: number): number {
    const closes = candles.map(c => c.close);
    const multiplier = 2 / (period + 1);
    let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = period; i < closes.length; i++) {
      ema = (closes[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }
  
  private calculateRSI(candles: CandleData[], period: number): number {
    const changes = [];
    for (let i = 1; i < candles.length; i++) {
      changes.push(candles[i].close - candles[i - 1].close);
    }
    
    const gains = changes.slice(-period).filter(c => c > 0);
    const losses = changes.slice(-period).filter(c => c < 0).map(c => Math.abs(c));
    
    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  // ============================================
  // Persistence
  // ============================================
  
  private loadBots(): void {
    try {
      const stored = localStorage.getItem(BOTS_STORAGE_KEY);
      if (stored) {
        const bots: TradingBot[] = JSON.parse(stored);
        bots.forEach(b => {
          // Reset running bots to stopped on load
          if (b.status === 'running') {
            b.status = 'stopped';
          }
          this.bots.set(b.id, b);
        });
      }
    } catch (error) {
      console.error('Failed to load bots:', error);
    }
  }
  
  private saveBots(): void {
    const bots = Array.from(this.bots.values());
    localStorage.setItem(BOTS_STORAGE_KEY, JSON.stringify(bots));
  }
}

// ============================================
// Singleton Instance
// ============================================

export const botManager = new TradingBotManager();

export default botManager;
