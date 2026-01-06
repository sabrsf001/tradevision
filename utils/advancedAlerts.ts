/**
 * Advanced Alerts System - TradeVision
 * Multi-condition, multi-channel alert system
 */

import type { CandleData, Indicator } from '../types';
import { calculateSMA, calculateEMA, calculateRSI } from './indicators';

// ============================================
// Types
// ============================================

export type AlertCondition = 
  | 'price_above'
  | 'price_below'
  | 'price_crosses_above'
  | 'price_crosses_below'
  | 'percent_change_up'
  | 'percent_change_down'
  | 'volume_spike'
  | 'rsi_overbought'
  | 'rsi_oversold'
  | 'rsi_crosses_above'
  | 'rsi_crosses_below'
  | 'sma_cross_above'
  | 'sma_cross_below'
  | 'ema_cross_above'
  | 'ema_cross_below'
  | 'macd_cross_bullish'
  | 'macd_cross_bearish'
  | 'bollinger_upper_touch'
  | 'bollinger_lower_touch'
  | 'new_high'
  | 'new_low'
  | 'pattern_detected'
  | 'order_block_touch'
  | 'fvg_fill'
  | 'custom';

export type NotificationChannel = 'push' | 'email' | 'sms' | 'telegram' | 'discord' | 'webhook';

export interface AlertConditionConfig {
  condition: AlertCondition;
  value?: number;
  value2?: number; // For ranges or second indicator
  period?: number;
  pattern?: string;
  customExpression?: string;
}

export interface AdvancedAlert {
  id: string;
  name: string;
  symbol: string;
  enabled: boolean;
  createdAt: number;
  expiresAt?: number;
  
  // Conditions (AND logic between conditions, OR logic within condition groups)
  conditions: AlertConditionConfig[];
  conditionLogic: 'all' | 'any'; // AND or OR
  
  // Notification settings
  channels: NotificationChannel[];
  webhookUrl?: string;
  telegramChatId?: string;
  discordWebhook?: string;
  
  // Behavior
  repeatEnabled: boolean;
  repeatCooldownMs: number; // Minimum time between repeated alerts
  maxTriggers?: number; // Maximum number of times to trigger
  triggerCount: number;
  lastTriggeredAt?: number;
  
  // Display
  message: string;
  sound?: 'default' | 'urgent' | 'subtle' | 'none';
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface AlertTriggerEvent {
  alertId: string;
  triggeredAt: number;
  symbol: string;
  price: number;
  conditionsMet: string[];
  message: string;
}

export interface AlertEvaluationContext {
  symbol: string;
  currentPrice: number;
  candles: CandleData[];
  previousCandles?: CandleData[];
  indicators?: Map<string, number[]>;
}

// ============================================
// Alert Condition Evaluators
// ============================================

type ConditionEvaluator = (
  config: AlertConditionConfig,
  context: AlertEvaluationContext
) => { triggered: boolean; message: string };

const evaluators: Record<AlertCondition, ConditionEvaluator> = {
  // Price conditions
  price_above: (config, ctx) => ({
    triggered: ctx.currentPrice > (config.value || 0),
    message: `Price ${ctx.currentPrice.toFixed(2)} > ${config.value}`,
  }),
  
  price_below: (config, ctx) => ({
    triggered: ctx.currentPrice < (config.value || 0),
    message: `Price ${ctx.currentPrice.toFixed(2)} < ${config.value}`,
  }),
  
  price_crosses_above: (config, ctx) => {
    if (ctx.candles.length < 2) return { triggered: false, message: '' };
    const prev = ctx.candles[ctx.candles.length - 2].close;
    const curr = ctx.currentPrice;
    const level = config.value || 0;
    return {
      triggered: prev < level && curr >= level,
      message: `Price crossed above ${level}`,
    };
  },
  
  price_crosses_below: (config, ctx) => {
    if (ctx.candles.length < 2) return { triggered: false, message: '' };
    const prev = ctx.candles[ctx.candles.length - 2].close;
    const curr = ctx.currentPrice;
    const level = config.value || 0;
    return {
      triggered: prev > level && curr <= level,
      message: `Price crossed below ${level}`,
    };
  },
  
  percent_change_up: (config, ctx) => {
    if (ctx.candles.length < 2) return { triggered: false, message: '' };
    const prev = ctx.candles[ctx.candles.length - 2].close;
    const change = ((ctx.currentPrice - prev) / prev) * 100;
    return {
      triggered: change >= (config.value || 0),
      message: `Price up ${change.toFixed(2)}%`,
    };
  },
  
  percent_change_down: (config, ctx) => {
    if (ctx.candles.length < 2) return { triggered: false, message: '' };
    const prev = ctx.candles[ctx.candles.length - 2].close;
    const change = ((prev - ctx.currentPrice) / prev) * 100;
    return {
      triggered: change >= (config.value || 0),
      message: `Price down ${change.toFixed(2)}%`,
    };
  },
  
  volume_spike: (config, ctx) => {
    const period = config.period || 20;
    if (ctx.candles.length < period) return { triggered: false, message: '' };
    
    const volumes = ctx.candles.slice(-period).map(c => c.volume || 0);
    const avgVolume = volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (period - 1);
    const currentVolume = volumes[volumes.length - 1];
    const multiplier = config.value || 2;
    
    return {
      triggered: currentVolume > avgVolume * multiplier,
      message: `Volume spike: ${(currentVolume / avgVolume).toFixed(1)}x average`,
    };
  },
  
  // RSI conditions
  rsi_overbought: (config, ctx) => {
    const period = config.period || 14;
    const level = config.value || 70;
    const rsiData = calculateRSI(ctx.candles, period);
    if (rsiData.length === 0) return { triggered: false, message: '' };
    
    const rsi = rsiData[rsiData.length - 1].value;
    return {
      triggered: rsi >= level,
      message: `RSI overbought: ${rsi.toFixed(1)}`,
    };
  },
  
  rsi_oversold: (config, ctx) => {
    const period = config.period || 14;
    const level = config.value || 30;
    const rsiData = calculateRSI(ctx.candles, period);
    if (rsiData.length === 0) return { triggered: false, message: '' };
    
    const rsi = rsiData[rsiData.length - 1].value;
    return {
      triggered: rsi <= level,
      message: `RSI oversold: ${rsi.toFixed(1)}`,
    };
  },
  
  rsi_crosses_above: (config, ctx) => {
    const period = config.period || 14;
    const level = config.value || 50;
    const rsiData = calculateRSI(ctx.candles, period);
    if (rsiData.length < 2) return { triggered: false, message: '' };
    
    const prev = rsiData[rsiData.length - 2].value;
    const curr = rsiData[rsiData.length - 1].value;
    
    return {
      triggered: prev < level && curr >= level,
      message: `RSI crossed above ${level}`,
    };
  },
  
  rsi_crosses_below: (config, ctx) => {
    const period = config.period || 14;
    const level = config.value || 50;
    const rsiData = calculateRSI(ctx.candles, period);
    if (rsiData.length < 2) return { triggered: false, message: '' };
    
    const prev = rsiData[rsiData.length - 2].value;
    const curr = rsiData[rsiData.length - 1].value;
    
    return {
      triggered: prev > level && curr <= level,
      message: `RSI crossed below ${level}`,
    };
  },
  
  // Moving Average conditions
  sma_cross_above: (config, ctx) => {
    const fastPeriod = config.value || 20;
    const slowPeriod = config.value2 || 50;
    
    const fastSMA = calculateSMA(ctx.candles, fastPeriod);
    const slowSMA = calculateSMA(ctx.candles, slowPeriod);
    
    if (fastSMA.length < 2 || slowSMA.length < 2) return { triggered: false, message: '' };
    
    const prevFast = fastSMA[fastSMA.length - 2].value;
    const prevSlow = slowSMA[slowSMA.length - 2].value;
    const currFast = fastSMA[fastSMA.length - 1].value;
    const currSlow = slowSMA[slowSMA.length - 1].value;
    
    return {
      triggered: prevFast <= prevSlow && currFast > currSlow,
      message: `SMA ${fastPeriod} crossed above SMA ${slowPeriod}`,
    };
  },
  
  sma_cross_below: (config, ctx) => {
    const fastPeriod = config.value || 20;
    const slowPeriod = config.value2 || 50;
    
    const fastSMA = calculateSMA(ctx.candles, fastPeriod);
    const slowSMA = calculateSMA(ctx.candles, slowPeriod);
    
    if (fastSMA.length < 2 || slowSMA.length < 2) return { triggered: false, message: '' };
    
    const prevFast = fastSMA[fastSMA.length - 2].value;
    const prevSlow = slowSMA[slowSMA.length - 2].value;
    const currFast = fastSMA[fastSMA.length - 1].value;
    const currSlow = slowSMA[slowSMA.length - 1].value;
    
    return {
      triggered: prevFast >= prevSlow && currFast < currSlow,
      message: `SMA ${fastPeriod} crossed below SMA ${slowPeriod}`,
    };
  },
  
  ema_cross_above: (config, ctx) => {
    const fastPeriod = config.value || 12;
    const slowPeriod = config.value2 || 26;
    
    const fastEMA = calculateEMA(ctx.candles, fastPeriod);
    const slowEMA = calculateEMA(ctx.candles, slowPeriod);
    
    if (fastEMA.length < 2 || slowEMA.length < 2) return { triggered: false, message: '' };
    
    const prevFast = fastEMA[fastEMA.length - 2].value;
    const prevSlow = slowEMA[slowEMA.length - 2].value;
    const currFast = fastEMA[fastEMA.length - 1].value;
    const currSlow = slowEMA[slowEMA.length - 1].value;
    
    return {
      triggered: prevFast <= prevSlow && currFast > currSlow,
      message: `EMA ${fastPeriod} crossed above EMA ${slowPeriod}`,
    };
  },
  
  ema_cross_below: (config, ctx) => {
    const fastPeriod = config.value || 12;
    const slowPeriod = config.value2 || 26;
    
    const fastEMA = calculateEMA(ctx.candles, fastPeriod);
    const slowEMA = calculateEMA(ctx.candles, slowPeriod);
    
    if (fastEMA.length < 2 || slowEMA.length < 2) return { triggered: false, message: '' };
    
    const prevFast = fastEMA[fastEMA.length - 2].value;
    const prevSlow = slowEMA[slowEMA.length - 2].value;
    const currFast = fastEMA[fastEMA.length - 1].value;
    const currSlow = slowEMA[slowEMA.length - 1].value;
    
    return {
      triggered: prevFast >= prevSlow && currFast < currSlow,
      message: `EMA ${fastPeriod} crossed below EMA ${slowPeriod}`,
    };
  },
  
  // MACD conditions
  macd_cross_bullish: (config, ctx) => {
    const fastPeriod = 12;
    const slowPeriod = 26;
    const signalPeriod = 9;
    
    const fastEMA = calculateEMA(ctx.candles, fastPeriod);
    const slowEMA = calculateEMA(ctx.candles, slowPeriod);
    
    if (fastEMA.length < signalPeriod + 2 || slowEMA.length < signalPeriod + 2) {
      return { triggered: false, message: '' };
    }
    
    // Calculate MACD line
    const macdLine: number[] = [];
    for (let i = 0; i < fastEMA.length; i++) {
      const slowIdx = slowEMA.findIndex(s => s.time === fastEMA[i].time);
      if (slowIdx >= 0) {
        macdLine.push(fastEMA[i].value - slowEMA[slowIdx].value);
      }
    }
    
    if (macdLine.length < signalPeriod + 1) return { triggered: false, message: '' };
    
    // Calculate signal line (EMA of MACD)
    const signalLine: number[] = [];
    let ema = macdLine.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod;
    signalLine.push(ema);
    
    const multiplier = 2 / (signalPeriod + 1);
    for (let i = signalPeriod; i < macdLine.length; i++) {
      ema = (macdLine[i] - ema) * multiplier + ema;
      signalLine.push(ema);
    }
    
    const prevMACD = macdLine[macdLine.length - 2];
    const currMACD = macdLine[macdLine.length - 1];
    const prevSignal = signalLine[signalLine.length - 2];
    const currSignal = signalLine[signalLine.length - 1];
    
    return {
      triggered: prevMACD <= prevSignal && currMACD > currSignal,
      message: 'MACD bullish crossover',
    };
  },
  
  macd_cross_bearish: (config, ctx) => {
    // Same calculation as bullish but inverted condition
    const fastPeriod = 12;
    const slowPeriod = 26;
    const signalPeriod = 9;
    
    const fastEMA = calculateEMA(ctx.candles, fastPeriod);
    const slowEMA = calculateEMA(ctx.candles, slowPeriod);
    
    if (fastEMA.length < signalPeriod + 2 || slowEMA.length < signalPeriod + 2) {
      return { triggered: false, message: '' };
    }
    
    const macdLine: number[] = [];
    for (let i = 0; i < fastEMA.length; i++) {
      const slowIdx = slowEMA.findIndex(s => s.time === fastEMA[i].time);
      if (slowIdx >= 0) {
        macdLine.push(fastEMA[i].value - slowEMA[slowIdx].value);
      }
    }
    
    if (macdLine.length < signalPeriod + 1) return { triggered: false, message: '' };
    
    const signalLine: number[] = [];
    let ema = macdLine.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod;
    signalLine.push(ema);
    
    const multiplier = 2 / (signalPeriod + 1);
    for (let i = signalPeriod; i < macdLine.length; i++) {
      ema = (macdLine[i] - ema) * multiplier + ema;
      signalLine.push(ema);
    }
    
    const prevMACD = macdLine[macdLine.length - 2];
    const currMACD = macdLine[macdLine.length - 1];
    const prevSignal = signalLine[signalLine.length - 2];
    const currSignal = signalLine[signalLine.length - 1];
    
    return {
      triggered: prevMACD >= prevSignal && currMACD < currSignal,
      message: 'MACD bearish crossover',
    };
  },
  
  // Bollinger Bands
  bollinger_upper_touch: (config, ctx) => {
    const period = config.period || 20;
    const stdDev = config.value || 2;
    
    if (ctx.candles.length < period) return { triggered: false, message: '' };
    
    const closes = ctx.candles.slice(-period).map(c => c.close);
    const sma = closes.reduce((a, b) => a + b, 0) / period;
    const variance = closes.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
    const std = Math.sqrt(variance);
    const upperBand = sma + stdDev * std;
    
    return {
      triggered: ctx.currentPrice >= upperBand,
      message: `Price touched upper BB: ${upperBand.toFixed(2)}`,
    };
  },
  
  bollinger_lower_touch: (config, ctx) => {
    const period = config.period || 20;
    const stdDev = config.value || 2;
    
    if (ctx.candles.length < period) return { triggered: false, message: '' };
    
    const closes = ctx.candles.slice(-period).map(c => c.close);
    const sma = closes.reduce((a, b) => a + b, 0) / period;
    const variance = closes.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
    const std = Math.sqrt(variance);
    const lowerBand = sma - stdDev * std;
    
    return {
      triggered: ctx.currentPrice <= lowerBand,
      message: `Price touched lower BB: ${lowerBand.toFixed(2)}`,
    };
  },
  
  // New highs/lows
  new_high: (config, ctx) => {
    const period = config.period || 52; // Default 52-week
    if (ctx.candles.length < period) return { triggered: false, message: '' };
    
    const highs = ctx.candles.slice(-period).map(c => c.high);
    const periodHigh = Math.max(...highs.slice(0, -1));
    
    return {
      triggered: ctx.currentPrice > periodHigh,
      message: `New ${period}-period high: ${ctx.currentPrice.toFixed(2)}`,
    };
  },
  
  new_low: (config, ctx) => {
    const period = config.period || 52;
    if (ctx.candles.length < period) return { triggered: false, message: '' };
    
    const lows = ctx.candles.slice(-period).map(c => c.low);
    const periodLow = Math.min(...lows.slice(0, -1));
    
    return {
      triggered: ctx.currentPrice < periodLow,
      message: `New ${period}-period low: ${ctx.currentPrice.toFixed(2)}`,
    };
  },
  
  // Pattern detection (placeholder - integrate with SMC)
  pattern_detected: (config, ctx) => {
    // This would integrate with pattern detection
    return { triggered: false, message: config.pattern || '' };
  },
  
  order_block_touch: (config, ctx) => {
    // This would integrate with SMC order blocks
    return { triggered: false, message: '' };
  },
  
  fvg_fill: (config, ctx) => {
    // This would integrate with SMC fair value gaps
    return { triggered: false, message: '' };
  },
  
  custom: (config, ctx) => {
    // Custom expression evaluation (advanced feature)
    return { triggered: false, message: config.customExpression || '' };
  },
};

// ============================================
// Alert Manager
// ============================================

const ALERTS_STORAGE_KEY = 'tv_advanced_alerts';
const ALERT_HISTORY_KEY = 'tv_alert_history';

export class AdvancedAlertManager {
  private alerts: Map<string, AdvancedAlert> = new Map();
  private history: AlertTriggerEvent[] = [];
  private onTrigger?: (event: AlertTriggerEvent) => void;
  
  constructor() {
    this.loadAlerts();
    this.loadHistory();
  }
  
  /**
   * Set callback for when an alert is triggered
   */
  setOnTrigger(callback: (event: AlertTriggerEvent) => void): void {
    this.onTrigger = callback;
  }
  
  /**
   * Create a new alert
   */
  createAlert(alert: Omit<AdvancedAlert, 'id' | 'createdAt' | 'triggerCount'>): AdvancedAlert {
    const newAlert: AdvancedAlert = {
      ...alert,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      triggerCount: 0,
    };
    
    this.alerts.set(newAlert.id, newAlert);
    this.saveAlerts();
    
    return newAlert;
  }
  
  /**
   * Update an existing alert
   */
  updateAlert(id: string, updates: Partial<AdvancedAlert>): AdvancedAlert | null {
    const alert = this.alerts.get(id);
    if (!alert) return null;
    
    const updated = { ...alert, ...updates };
    this.alerts.set(id, updated);
    this.saveAlerts();
    
    return updated;
  }
  
  /**
   * Delete an alert
   */
  deleteAlert(id: string): boolean {
    const deleted = this.alerts.delete(id);
    if (deleted) this.saveAlerts();
    return deleted;
  }
  
  /**
   * Get all alerts
   */
  getAllAlerts(): AdvancedAlert[] {
    return Array.from(this.alerts.values());
  }
  
  /**
   * Get alerts for a specific symbol
   */
  getAlertsForSymbol(symbol: string): AdvancedAlert[] {
    return this.getAllAlerts().filter(a => a.symbol === symbol);
  }
  
  /**
   * Evaluate all alerts for a symbol
   */
  evaluateAlerts(context: AlertEvaluationContext): AlertTriggerEvent[] {
    const triggered: AlertTriggerEvent[] = [];
    const now = Date.now();
    
    for (const alert of this.getAlertsForSymbol(context.symbol)) {
      if (!alert.enabled) continue;
      
      // Check expiration
      if (alert.expiresAt && now > alert.expiresAt) {
        this.updateAlert(alert.id, { enabled: false });
        continue;
      }
      
      // Check max triggers
      if (alert.maxTriggers && alert.triggerCount >= alert.maxTriggers) {
        continue;
      }
      
      // Check cooldown
      if (alert.lastTriggeredAt && alert.repeatEnabled) {
        if (now - alert.lastTriggeredAt < alert.repeatCooldownMs) {
          continue;
        }
      } else if (alert.lastTriggeredAt && !alert.repeatEnabled) {
        continue;
      }
      
      // Evaluate conditions
      const results = alert.conditions.map(c => evaluators[c.condition](c, context));
      const conditionsMet = results.filter(r => r.triggered);
      
      let shouldTrigger = false;
      if (alert.conditionLogic === 'all') {
        shouldTrigger = conditionsMet.length === alert.conditions.length;
      } else {
        shouldTrigger = conditionsMet.length > 0;
      }
      
      if (shouldTrigger) {
        const event: AlertTriggerEvent = {
          alertId: alert.id,
          triggeredAt: now,
          symbol: context.symbol,
          price: context.currentPrice,
          conditionsMet: conditionsMet.map(r => r.message),
          message: this.formatAlertMessage(alert, context, conditionsMet),
        };
        
        triggered.push(event);
        
        // Update alert state
        this.updateAlert(alert.id, {
          triggerCount: alert.triggerCount + 1,
          lastTriggeredAt: now,
        });
        
        // Add to history
        this.addToHistory(event);
        
        // Execute notifications
        this.sendNotifications(alert, event);
        
        // Callback
        if (this.onTrigger) {
          this.onTrigger(event);
        }
      }
    }
    
    return triggered;
  }
  
  /**
   * Get alert history
   */
  getHistory(limit = 100): AlertTriggerEvent[] {
    return this.history.slice(0, limit);
  }
  
  /**
   * Clear alert history
   */
  clearHistory(): void {
    this.history = [];
    localStorage.removeItem(ALERT_HISTORY_KEY);
  }
  
  // ============================================
  // Private Methods
  // ============================================
  
  private formatAlertMessage(
    alert: AdvancedAlert,
    context: AlertEvaluationContext,
    conditionsMet: { triggered: boolean; message: string }[]
  ): string {
    let message = alert.message;
    
    // Replace placeholders
    message = message.replace('{{symbol}}', context.symbol);
    message = message.replace('{{price}}', context.currentPrice.toFixed(2));
    message = message.replace('{{conditions}}', conditionsMet.map(c => c.message).join(', '));
    
    return message;
  }
  
  private async sendNotifications(alert: AdvancedAlert, event: AlertTriggerEvent): Promise<void> {
    for (const channel of alert.channels) {
      try {
        switch (channel) {
          case 'push':
            await this.sendPushNotification(alert, event);
            break;
          case 'webhook':
            if (alert.webhookUrl) {
              await this.sendWebhook(alert.webhookUrl, event);
            }
            break;
          case 'telegram':
            if (alert.telegramChatId) {
              await this.sendTelegram(alert.telegramChatId, event);
            }
            break;
          case 'discord':
            if (alert.discordWebhook) {
              await this.sendDiscord(alert.discordWebhook, event);
            }
            break;
          // Email and SMS would require backend integration
        }
      } catch (error) {
        console.error(`Failed to send ${channel} notification:`, error);
      }
    }
  }
  
  private async sendPushNotification(alert: AdvancedAlert, event: AlertTriggerEvent): Promise<void> {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification(`TradeVision Alert: ${alert.name}`, {
        body: event.message,
        icon: '/icons/icon-192.png',
        tag: event.alertId,
        requireInteraction: alert.priority === 'critical',
      });
    }
  }
  
  private async sendWebhook(url: string, event: AlertTriggerEvent): Promise<void> {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'tradevision_alert',
        ...event,
      }),
    });
  }
  
  private async sendTelegram(chatId: string, event: AlertTriggerEvent): Promise<void> {
    // Would require bot token - stored securely
    console.log('Telegram notification:', chatId, event);
  }
  
  private async sendDiscord(webhookUrl: string, event: AlertTriggerEvent): Promise<void> {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `🔔 TradeVision Alert`,
          description: event.message,
          color: 0x00ff00,
          fields: [
            { name: 'Symbol', value: event.symbol, inline: true },
            { name: 'Price', value: event.price.toFixed(2), inline: true },
          ],
          timestamp: new Date(event.triggeredAt).toISOString(),
        }],
      }),
    });
  }
  
  private addToHistory(event: AlertTriggerEvent): void {
    this.history.unshift(event);
    if (this.history.length > 500) {
      this.history = this.history.slice(0, 500);
    }
    this.saveHistory();
  }
  
  private loadAlerts(): void {
    try {
      const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (stored) {
        const alerts: AdvancedAlert[] = JSON.parse(stored);
        alerts.forEach(a => this.alerts.set(a.id, a));
      }
    } catch {
      console.error('Failed to load alerts');
    }
  }
  
  private saveAlerts(): void {
    const alerts = Array.from(this.alerts.values());
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  }
  
  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(ALERT_HISTORY_KEY);
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch {
      console.error('Failed to load alert history');
    }
  }
  
  private saveHistory(): void {
    localStorage.setItem(ALERT_HISTORY_KEY, JSON.stringify(this.history));
  }
}

// ============================================
// Preset Alert Templates
// ============================================

export const ALERT_TEMPLATES = {
  priceAbove: (symbol: string, price: number): Omit<AdvancedAlert, 'id' | 'createdAt' | 'triggerCount'> => ({
    name: `${symbol} above ${price}`,
    symbol,
    enabled: true,
    conditions: [{ condition: 'price_above', value: price }],
    conditionLogic: 'all',
    channels: ['push'],
    repeatEnabled: false,
    repeatCooldownMs: 0,
    message: `{{symbol}} price is above ${price}: {{price}}`,
    priority: 'normal',
  }),
  
  priceBelow: (symbol: string, price: number): Omit<AdvancedAlert, 'id' | 'createdAt' | 'triggerCount'> => ({
    name: `${symbol} below ${price}`,
    symbol,
    enabled: true,
    conditions: [{ condition: 'price_below', value: price }],
    conditionLogic: 'all',
    channels: ['push'],
    repeatEnabled: false,
    repeatCooldownMs: 0,
    message: `{{symbol}} price is below ${price}: {{price}}`,
    priority: 'normal',
  }),
  
  rsiOverbought: (symbol: string): Omit<AdvancedAlert, 'id' | 'createdAt' | 'triggerCount'> => ({
    name: `${symbol} RSI Overbought`,
    symbol,
    enabled: true,
    conditions: [{ condition: 'rsi_overbought', value: 70, period: 14 }],
    conditionLogic: 'all',
    channels: ['push'],
    repeatEnabled: true,
    repeatCooldownMs: 3600000, // 1 hour
    message: `{{symbol}} RSI is overbought - consider taking profits`,
    priority: 'high',
  }),
  
  rsiOversold: (symbol: string): Omit<AdvancedAlert, 'id' | 'createdAt' | 'triggerCount'> => ({
    name: `${symbol} RSI Oversold`,
    symbol,
    enabled: true,
    conditions: [{ condition: 'rsi_oversold', value: 30, period: 14 }],
    conditionLogic: 'all',
    channels: ['push'],
    repeatEnabled: true,
    repeatCooldownMs: 3600000,
    message: `{{symbol}} RSI is oversold - potential buying opportunity`,
    priority: 'high',
  }),
  
  goldenCross: (symbol: string): Omit<AdvancedAlert, 'id' | 'createdAt' | 'triggerCount'> => ({
    name: `${symbol} Golden Cross`,
    symbol,
    enabled: true,
    conditions: [{ condition: 'sma_cross_above', value: 50, value2: 200 }],
    conditionLogic: 'all',
    channels: ['push'],
    repeatEnabled: false,
    repeatCooldownMs: 0,
    message: `{{symbol}} Golden Cross detected! SMA 50 crossed above SMA 200`,
    priority: 'critical',
  }),
  
  deathCross: (symbol: string): Omit<AdvancedAlert, 'id' | 'createdAt' | 'triggerCount'> => ({
    name: `${symbol} Death Cross`,
    symbol,
    enabled: true,
    conditions: [{ condition: 'sma_cross_below', value: 50, value2: 200 }],
    conditionLogic: 'all',
    channels: ['push'],
    repeatEnabled: false,
    repeatCooldownMs: 0,
    message: `{{symbol}} Death Cross detected! SMA 50 crossed below SMA 200`,
    priority: 'critical',
  }),
  
  volumeSpike: (symbol: string): Omit<AdvancedAlert, 'id' | 'createdAt' | 'triggerCount'> => ({
    name: `${symbol} Volume Spike`,
    symbol,
    enabled: true,
    conditions: [{ condition: 'volume_spike', value: 3, period: 20 }],
    conditionLogic: 'all',
    channels: ['push'],
    repeatEnabled: true,
    repeatCooldownMs: 1800000, // 30 min
    message: `{{symbol}} unusual volume detected! {{conditions}}`,
    priority: 'high',
  }),
};

// Singleton instance
export const alertManager = new AdvancedAlertManager();

export default alertManager;
