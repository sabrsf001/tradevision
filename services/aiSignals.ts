/**
 * AI Signals Service - Automated Signal Generation & Management
 * Real-time trading signals with multi-timeframe confluence
 */

import { CandleData } from '../types';
import { AITradingEngine, AISignal, AIAnalysis } from './aiTradingEngine';

// ============================================================================
// TYPES
// ============================================================================

export interface SignalAlert {
  id: string;
  signal: AISignal;
  notified: boolean;
  createdAt: number;
  acknowledgedAt?: number;
  outcome?: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'PENDING';
  pnl?: number;
}

export interface SignalFilter {
  types?: ('BUY' | 'SELL' | 'HOLD')[];
  minConfidence?: number;
  minStrength?: ('STRONG' | 'MODERATE' | 'WEAK')[];
  symbols?: string[];
  timeframes?: string[];
  minRiskReward?: number;
}

export interface SignalStats {
  total: number;
  wins: number;
  losses: number;
  breakeven: number;
  pending: number;
  winRate: number;
  avgPnl: number;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
}

export interface MultiTimeframeSignal {
  symbol: string;
  primaryTimeframe: string;
  signals: Map<string, AISignal>;
  confluence: number;
  recommendedAction: 'BUY' | 'SELL' | 'HOLD';
  reasoning: string[];
}

export type SignalCallback = (signal: AISignal, analysis: AIAnalysis) => void;

// ============================================================================
// SIGNAL MANAGER
// ============================================================================

class SignalManager {
  private signals: Map<string, SignalAlert> = new Map();
  private callbacks: Set<SignalCallback> = new Set();
  private autoRefreshInterval: number | null = null;
  private lastAnalysis: Map<string, AIAnalysis> = new Map();
  
  /**
   * Subscribe to signal updates
   */
  subscribe(callback: SignalCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }
  
  /**
   * Generate signals for a symbol/timeframe
   */
  analyze(candles: CandleData[], symbol: string, timeframe: string): AIAnalysis {
    const analysis = AITradingEngine.analyze(candles, symbol, timeframe);
    
    // Store analysis
    const key = `${symbol}-${timeframe}`;
    this.lastAnalysis.set(key, analysis);
    
    // Process signals
    analysis.signals.forEach(signal => {
      this.processSignal(signal, analysis);
    });
    
    return analysis;
  }
  
  /**
   * Process and store a new signal
   */
  private processSignal(signal: AISignal, analysis: AIAnalysis): void {
    const existing = this.signals.get(signal.id);
    
    if (!existing) {
      const alert: SignalAlert = {
        id: signal.id,
        signal,
        notified: false,
        createdAt: Date.now(),
        outcome: 'PENDING',
      };
      
      this.signals.set(signal.id, alert);
      
      // Notify subscribers
      this.callbacks.forEach(cb => cb(signal, analysis));
    }
  }
  
  /**
   * Get all signals with optional filtering
   */
  getSignals(filter?: SignalFilter): SignalAlert[] {
    let signals = Array.from(this.signals.values());
    
    if (filter) {
      if (filter.types?.length) {
        signals = signals.filter(s => filter.types!.includes(s.signal.type));
      }
      if (filter.minConfidence) {
        signals = signals.filter(s => s.signal.confidence >= filter.minConfidence!);
      }
      if (filter.minStrength?.length) {
        signals = signals.filter(s => filter.minStrength!.includes(s.signal.strength));
      }
      if (filter.symbols?.length) {
        signals = signals.filter(s => filter.symbols!.includes(s.signal.symbol));
      }
      if (filter.timeframes?.length) {
        signals = signals.filter(s => filter.timeframes!.includes(s.signal.timeframe));
      }
      if (filter.minRiskReward) {
        signals = signals.filter(s => s.signal.riskReward >= filter.minRiskReward!);
      }
    }
    
    return signals.sort((a, b) => b.createdAt - a.createdAt);
  }
  
  /**
   * Get active signals (not expired, not acknowledged)
   */
  getActiveSignals(): SignalAlert[] {
    const now = Date.now();
    return this.getSignals().filter(s => 
      s.signal.expiresAt > now && 
      !s.acknowledgedAt && 
      s.outcome === 'PENDING'
    );
  }
  
  /**
   * Get last analysis for symbol/timeframe
   */
  getAnalysis(symbol: string, timeframe: string): AIAnalysis | undefined {
    return this.lastAnalysis.get(`${symbol}-${timeframe}`);
  }
  
  /**
   * Acknowledge a signal
   */
  acknowledgeSignal(signalId: string): void {
    const alert = this.signals.get(signalId);
    if (alert) {
      alert.acknowledgedAt = Date.now();
      alert.notified = true;
    }
  }
  
  /**
   * Update signal outcome
   */
  updateOutcome(
    signalId: string, 
    outcome: 'WIN' | 'LOSS' | 'BREAKEVEN',
    pnl?: number
  ): void {
    const alert = this.signals.get(signalId);
    if (alert) {
      alert.outcome = outcome;
      alert.pnl = pnl;
    }
  }
  
  /**
   * Get signal statistics
   */
  getStats(): SignalStats {
    const signals = Array.from(this.signals.values());
    const completed = signals.filter(s => s.outcome !== 'PENDING');
    
    const wins = completed.filter(s => s.outcome === 'WIN').length;
    const losses = completed.filter(s => s.outcome === 'LOSS').length;
    const breakeven = completed.filter(s => s.outcome === 'BREAKEVEN').length;
    const pending = signals.filter(s => s.outcome === 'PENDING').length;
    
    const pnls = completed.filter(s => s.pnl !== undefined).map(s => s.pnl!);
    const avgPnl = pnls.length > 0 ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0;
    const bestTrade = pnls.length > 0 ? Math.max(...pnls) : 0;
    const worstTrade = pnls.length > 0 ? Math.min(...pnls) : 0;
    
    const grossProfit = pnls.filter(p => p > 0).reduce((a, b) => a + b, 0);
    const grossLoss = Math.abs(pnls.filter(p => p < 0).reduce((a, b) => a + b, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    
    return {
      total: signals.length,
      wins,
      losses,
      breakeven,
      pending,
      winRate: completed.length > 0 ? (wins / completed.length) * 100 : 0,
      avgPnl,
      bestTrade,
      worstTrade,
      profitFactor,
    };
  }
  
  /**
   * Clear old signals
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    
    for (const [id, alert] of this.signals.entries()) {
      if (alert.createdAt < cutoff && alert.outcome !== 'PENDING') {
        this.signals.delete(id);
      }
    }
  }
  
  /**
   * Export signals to JSON
   */
  export(): string {
    return JSON.stringify({
      signals: Array.from(this.signals.values()),
      stats: this.getStats(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }
  
  /**
   * Import signals from JSON
   */
  import(json: string): void {
    try {
      const data = JSON.parse(json);
      if (data.signals && Array.isArray(data.signals)) {
        data.signals.forEach((alert: SignalAlert) => {
          this.signals.set(alert.id, alert);
        });
      }
    } catch (error) {
      console.error('Failed to import signals:', error);
    }
  }
}

// ============================================================================
// MULTI-TIMEFRAME ANALYZER
// ============================================================================

export class MultiTimeframeAnalyzer {
  private candleData: Map<string, Map<string, CandleData[]>> = new Map();
  
  /**
   * Add candle data for a symbol/timeframe
   */
  setCandles(symbol: string, timeframe: string, candles: CandleData[]): void {
    if (!this.candleData.has(symbol)) {
      this.candleData.set(symbol, new Map());
    }
    this.candleData.get(symbol)!.set(timeframe, candles);
  }
  
  /**
   * Analyze multiple timeframes for confluence
   */
  analyze(symbol: string, timeframes: string[]): MultiTimeframeSignal {
    const signals = new Map<string, AISignal>();
    const reasoning: string[] = [];
    
    let bullishCount = 0;
    let bearishCount = 0;
    let totalWeight = 0;
    
    const tfWeights: Record<string, number> = {
      '1m': 0.5,
      '5m': 0.75,
      '15m': 1,
      '30m': 1.25,
      '1h': 1.5,
      '4h': 2,
      '1d': 2.5,
      '1w': 3,
    };
    
    for (const tf of timeframes) {
      const candles = this.candleData.get(symbol)?.get(tf);
      if (!candles || candles.length < 50) continue;
      
      const analysis = AITradingEngine.analyze(candles, symbol, tf);
      const weight = tfWeights[tf] || 1;
      
      if (analysis.primarySignal) {
        signals.set(tf, analysis.primarySignal);
        
        if (analysis.primarySignal.type === 'BUY') {
          bullishCount += weight;
          reasoning.push(`${tf}: BUY signal (${analysis.primarySignal.confidence}%)`);
        } else if (analysis.primarySignal.type === 'SELL') {
          bearishCount += weight;
          reasoning.push(`${tf}: SELL signal (${analysis.primarySignal.confidence}%)`);
        } else {
          reasoning.push(`${tf}: HOLD (${analysis.primarySignal.confidence}%)`);
        }
        
        totalWeight += weight;
      }
    }
    
    // Calculate confluence
    const netScore = bullishCount - bearishCount;
    const confluence = totalWeight > 0 ? Math.abs(netScore / totalWeight) * 100 : 0;
    
    let recommendedAction: 'BUY' | 'SELL' | 'HOLD';
    if (confluence > 30) {
      recommendedAction = netScore > 0 ? 'BUY' : 'SELL';
    } else {
      recommendedAction = 'HOLD';
    }
    
    if (recommendedAction === 'BUY') {
      reasoning.push(`\n📈 MTF Confluence: ${confluence.toFixed(0)}% BULLISH`);
    } else if (recommendedAction === 'SELL') {
      reasoning.push(`\n📉 MTF Confluence: ${confluence.toFixed(0)}% BEARISH`);
    } else {
      reasoning.push(`\n⚖️ MTF Confluence: Mixed signals, no clear direction`);
    }
    
    return {
      symbol,
      primaryTimeframe: timeframes[Math.floor(timeframes.length / 2)] || timeframes[0],
      signals,
      confluence,
      recommendedAction,
      reasoning,
    };
  }
}

// ============================================================================
// SIGNAL SCREENER
// ============================================================================

export class SignalScreener {
  private symbols: string[] = [];
  private timeframe: string = '1h';
  private candleDataFetcher?: (symbol: string, timeframe: string) => Promise<CandleData[]>;
  
  /**
   * Configure the screener
   */
  configure(options: {
    symbols: string[];
    timeframe: string;
    fetcher: (symbol: string, timeframe: string) => Promise<CandleData[]>;
  }): void {
    this.symbols = options.symbols;
    this.timeframe = options.timeframe;
    this.candleDataFetcher = options.fetcher;
  }
  
  /**
   * Scan all symbols for signals
   */
  async scan(): Promise<AISignal[]> {
    if (!this.candleDataFetcher) {
      throw new Error('Candle data fetcher not configured');
    }
    
    const allSignals: AISignal[] = [];
    
    for (const symbol of this.symbols) {
      try {
        const candles = await this.candleDataFetcher(symbol, this.timeframe);
        if (candles.length >= 50) {
          const signals = AITradingEngine.generateSignals(candles, symbol, this.timeframe);
          allSignals.push(...signals);
        }
      } catch (error) {
        console.error(`Failed to scan ${symbol}:`, error);
      }
    }
    
    // Sort by confidence
    return allSignals
      .filter(s => s.type !== 'HOLD')
      .sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Get strongest signals
   */
  async getTopSignals(count: number = 10): Promise<AISignal[]> {
    const signals = await this.scan();
    return signals.slice(0, count);
  }
}

// ============================================================================
// ALERT SYSTEM
// ============================================================================

export interface AlertCondition {
  id: string;
  type: 'PRICE_CROSS' | 'INDICATOR' | 'PATTERN' | 'SIGNAL';
  symbol: string;
  condition: {
    indicator?: string;
    operator: '>' | '<' | '=' | 'CROSS_UP' | 'CROSS_DOWN';
    value: number;
    pattern?: string;
    signalType?: 'BUY' | 'SELL';
    minConfidence?: number;
  };
  enabled: boolean;
  triggered: boolean;
  lastTriggered?: number;
  notification: {
    sound?: boolean;
    push?: boolean;
    email?: boolean;
  };
}

class AlertSystem {
  private alerts: Map<string, AlertCondition> = new Map();
  private onTrigger?: (alert: AlertCondition, data: any) => void;
  
  /**
   * Set trigger callback
   */
  setTriggerCallback(callback: (alert: AlertCondition, data: any) => void): void {
    this.onTrigger = callback;
  }
  
  /**
   * Add an alert
   */
  addAlert(alert: Omit<AlertCondition, 'id' | 'triggered'>): string {
    const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.alerts.set(id, {
      ...alert,
      id,
      triggered: false,
    });
    return id;
  }
  
  /**
   * Remove an alert
   */
  removeAlert(id: string): void {
    this.alerts.delete(id);
  }
  
  /**
   * Get all alerts
   */
  getAlerts(): AlertCondition[] {
    return Array.from(this.alerts.values());
  }
  
  /**
   * Check alerts against current data
   */
  checkAlerts(symbol: string, data: {
    price?: number;
    indicators?: Record<string, number>;
    patterns?: string[];
    signals?: AISignal[];
  }): AlertCondition[] {
    const triggered: AlertCondition[] = [];
    
    for (const alert of this.alerts.values()) {
      if (!alert.enabled || alert.symbol !== symbol) continue;
      
      let shouldTrigger = false;
      
      switch (alert.type) {
        case 'PRICE_CROSS':
          if (data.price !== undefined) {
            shouldTrigger = this.checkCondition(data.price, alert.condition);
          }
          break;
          
        case 'INDICATOR':
          if (data.indicators && alert.condition.indicator) {
            const value = data.indicators[alert.condition.indicator];
            if (value !== undefined) {
              shouldTrigger = this.checkCondition(value, alert.condition);
            }
          }
          break;
          
        case 'PATTERN':
          if (data.patterns && alert.condition.pattern) {
            shouldTrigger = data.patterns.includes(alert.condition.pattern);
          }
          break;
          
        case 'SIGNAL':
          if (data.signals) {
            const signal = data.signals.find(s => 
              s.type === alert.condition.signalType &&
              s.confidence >= (alert.condition.minConfidence || 0)
            );
            shouldTrigger = !!signal;
          }
          break;
      }
      
      if (shouldTrigger && !alert.triggered) {
        alert.triggered = true;
        alert.lastTriggered = Date.now();
        triggered.push(alert);
        
        if (this.onTrigger) {
          this.onTrigger(alert, data);
        }
      }
    }
    
    return triggered;
  }
  
  /**
   * Check a single condition
   */
  private checkCondition(value: number, condition: AlertCondition['condition']): boolean {
    switch (condition.operator) {
      case '>': return value > condition.value;
      case '<': return value < condition.value;
      case '=': return Math.abs(value - condition.value) < 0.0001;
      default: return false;
    }
  }
  
  /**
   * Reset an alert
   */
  resetAlert(id: string): void {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.triggered = false;
    }
  }
  
  /**
   * Export alerts
   */
  export(): string {
    return JSON.stringify(Array.from(this.alerts.values()), null, 2);
  }
  
  /**
   * Import alerts
   */
  import(json: string): void {
    try {
      const alerts = JSON.parse(json);
      if (Array.isArray(alerts)) {
        alerts.forEach((alert: AlertCondition) => {
          this.alerts.set(alert.id, alert);
        });
      }
    } catch (error) {
      console.error('Failed to import alerts:', error);
    }
  }
}

// ============================================================================
// SIGNAL NOTIFICATIONS
// ============================================================================

export function formatSignalNotification(signal: AISignal): string {
  const emoji = signal.type === 'BUY' ? '🟢' : signal.type === 'SELL' ? '🔴' : '⚪';
  const strength = signal.strength === 'STRONG' ? '💪' : signal.strength === 'MODERATE' ? '👍' : '👌';
  
  let text = `${emoji} ${signal.type} Signal for ${signal.symbol}\n\n`;
  text += `Timeframe: ${signal.timeframe}\n`;
  text += `Confidence: ${signal.confidence}% ${strength}\n`;
  text += `Price: $${signal.price.toLocaleString()}\n\n`;
  
  text += `📊 Entry: $${signal.targets.entry.toLocaleString()}\n`;
  text += `🛑 Stop Loss: $${signal.targets.stopLoss.toLocaleString()}\n`;
  text += `🎯 TP1: $${signal.targets.takeProfit1.toLocaleString()}\n`;
  text += `🎯 TP2: $${signal.targets.takeProfit2.toLocaleString()}\n`;
  text += `🎯 TP3: $${signal.targets.takeProfit3.toLocaleString()}\n\n`;
  
  text += `R:R Ratio: ${signal.riskReward.toFixed(2)}\n\n`;
  
  if (signal.reasoning.length > 0) {
    text += `📝 Reasoning:\n`;
    signal.reasoning.slice(0, 5).forEach(r => {
      text += `• ${r}\n`;
    });
  }
  
  return text;
}

export function formatSignalForDiscord(signal: AISignal): object {
  const color = signal.type === 'BUY' ? 0x26A69A : signal.type === 'SELL' ? 0xEF5350 : 0x9E9E9E;
  
  return {
    embeds: [{
      title: `${signal.type} Signal: ${signal.symbol}`,
      color,
      fields: [
        { name: 'Timeframe', value: signal.timeframe, inline: true },
        { name: 'Confidence', value: `${signal.confidence}%`, inline: true },
        { name: 'Strength', value: signal.strength, inline: true },
        { name: 'Entry', value: `$${signal.targets.entry.toLocaleString()}`, inline: true },
        { name: 'Stop Loss', value: `$${signal.targets.stopLoss.toLocaleString()}`, inline: true },
        { name: 'R:R', value: signal.riskReward.toFixed(2), inline: true },
        { name: 'TP1', value: `$${signal.targets.takeProfit1.toLocaleString()}`, inline: true },
        { name: 'TP2', value: `$${signal.targets.takeProfit2.toLocaleString()}`, inline: true },
        { name: 'TP3', value: `$${signal.targets.takeProfit3.toLocaleString()}`, inline: true },
        { name: 'Reasoning', value: signal.reasoning.slice(0, 3).join('\n') || 'N/A' },
      ],
      timestamp: new Date(signal.timestamp).toISOString(),
    }],
  };
}

export function formatSignalForTelegram(signal: AISignal): string {
  const emoji = signal.type === 'BUY' ? '🟢' : signal.type === 'SELL' ? '🔴' : '⚪';
  
  return `
${emoji} *${signal.type} SIGNAL*

*Symbol:* ${signal.symbol}
*Timeframe:* ${signal.timeframe}
*Confidence:* ${signal.confidence}%
*Strength:* ${signal.strength}

📊 *Levels:*
Entry: $${signal.targets.entry.toLocaleString()}
SL: $${signal.targets.stopLoss.toLocaleString()}
TP1: $${signal.targets.takeProfit1.toLocaleString()}
TP2: $${signal.targets.takeProfit2.toLocaleString()}
TP3: $${signal.targets.takeProfit3.toLocaleString()}

*R:R:* ${signal.riskReward.toFixed(2)}

_${signal.reasoning[0] || 'Analysis complete'}_
`.trim();
}

// ============================================================================
// SINGLETON EXPORTS
// ============================================================================

export const signalManager = new SignalManager();
export const mtfAnalyzer = new MultiTimeframeAnalyzer();
export const signalScreener = new SignalScreener();
export const alertSystem = new AlertSystem();

export default {
  signalManager,
  mtfAnalyzer,
  signalScreener,
  alertSystem,
  formatSignalNotification,
  formatSignalForDiscord,
  formatSignalForTelegram,
};
