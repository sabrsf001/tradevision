/**
 * AI Insights Dashboard Component
 * Real-time AI-powered market insights and signal monitoring
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Activity, Zap, AlertTriangle, Eye, 
  ChevronRight, RefreshCw, Clock, Target, Shield, BarChart2,
  Sparkles, X, ChevronDown
} from './Icons';
import { CandleData } from '../types';
import { AITradingEngine, AIAnalysis, AISignal } from '../services/aiTradingEngine';
import { signalManager, SignalStats, SignalAlert } from '../services/aiSignals';
import { sentimentService, SentimentAnalysis, FearGreedIndex } from '../services/sentimentAnalyzer';

// ============================================================================
// TYPES
// ============================================================================

interface AIInsightsDashboardProps {
  isVisible: boolean;
  onClose?: () => void;
  currentSymbol: string;
  currentTimeframe: string;
  currentPrice: number;
  chartData: CandleData[];
  onNavigateToSignal?: (signal: AISignal) => void;
}

interface InsightCard {
  id: string;
  type: 'signal' | 'pattern' | 'alert' | 'sentiment' | 'prediction';
  title: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
  timestamp: number;
  action?: string;
  data?: any;
}

// ============================================================================
// FEAR & GREED GAUGE COMPONENT
// ============================================================================

interface FearGreedGaugeProps {
  value: number;
  classification: string;
}

const FearGreedGauge: React.FC<FearGreedGaugeProps> = ({ value, classification }) => {
  const rotation = (value / 100) * 180 - 90; // -90 to 90 degrees
  
  const getColor = () => {
    if (value <= 25) return '#EF5350';
    if (value <= 45) return '#FFA726';
    if (value <= 55) return '#FFEE58';
    if (value <= 75) return '#9CCC65';
    return '#66BB6A';
  };
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-16 overflow-hidden">
        {/* Background arc */}
        <div className="absolute inset-0 rounded-t-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-20" />
        
        {/* Gauge segments */}
        <svg className="absolute inset-0" viewBox="0 0 100 50">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EF5350" />
              <stop offset="25%" stopColor="#FFA726" />
              <stop offset="50%" stopColor="#FFEE58" />
              <stop offset="75%" stopColor="#9CCC65" />
              <stop offset="100%" stopColor="#66BB6A" />
            </linearGradient>
          </defs>
          <path
            d="M 5 50 A 45 45 0 0 1 95 50"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </svg>
        
        {/* Needle */}
        <div 
          className="absolute bottom-0 left-1/2 origin-bottom transition-transform duration-500"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        >
          <div className="w-0.5 h-12 bg-white rounded-full shadow-lg" />
          <div className="absolute -bottom-1 -left-1.5 w-4 h-4 rounded-full bg-white shadow-lg" />
        </div>
      </div>
      
      {/* Value */}
      <div className="mt-2 text-center">
        <div className="text-2xl font-bold" style={{ color: getColor() }}>
          {value}
        </div>
        <div className="text-xs text-[var(--text-secondary)]">
          {classification}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SIGNAL CARD MINI
// ============================================================================

interface SignalCardMiniProps {
  alert: SignalAlert;
  onClick?: () => void;
}

const SignalCardMini: React.FC<SignalCardMiniProps> = ({ alert, onClick }) => {
  const { signal } = alert;
  const isBuy = signal.type === 'BUY';
  
  return (
    <button
      onClick={onClick}
      className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-all text-left group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isBuy ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}>
            {isBuy ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
                {signal.type}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                {signal.symbol}
              </span>
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">
              {signal.timeframe} • {signal.confidence}% confidence
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] transition-colors" />
      </div>
    </button>
  );
};

// ============================================================================
// STATS CARD
// ============================================================================

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, change, icon, color = 'var(--accent-primary)' }) => (
  <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-[var(--text-secondary)]">{title}</span>
      <div style={{ color }}>{icon}</div>
    </div>
    <div className="flex items-end gap-2">
      <span className="text-xl font-bold text-[var(--text-primary)]">{value}</span>
      {change !== undefined && (
        <span className={`text-xs ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
        </span>
      )}
    </div>
  </div>
);

// ============================================================================
// INSIGHT ITEM
// ============================================================================

interface InsightItemProps {
  insight: InsightCard;
  onClick?: () => void;
}

const InsightItem: React.FC<InsightItemProps> = ({ insight, onClick }) => {
  const getIcon = () => {
    switch (insight.type) {
      case 'signal': return <Zap className="w-4 h-4" />;
      case 'pattern': return <Activity className="w-4 h-4" />;
      case 'alert': return <AlertTriangle className="w-4 h-4" />;
      case 'sentiment': return <BarChart2 className="w-4 h-4" />;
      case 'prediction': return <Eye className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };
  
  const getColor = () => {
    switch (insight.importance) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };
  
  const timeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };
  
  return (
    <button
      onClick={onClick}
      className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-all text-left"
    >
      <div className="flex gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${getColor()}`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
              {insight.title}
            </span>
            <span className="text-xs text-[var(--text-tertiary)] flex-shrink-0">
              {timeAgo(insight.timestamp)}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">
            {insight.description}
          </p>
        </div>
      </div>
    </button>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AIInsightsDashboard: React.FC<AIInsightsDashboardProps> = ({
  isVisible,
  onClose,
  currentSymbol,
  currentTimeframe,
  currentPrice,
  chartData,
  onNavigateToSignal,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'signals' | 'insights'>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [sentiment, setSentiment] = useState<SentimentAnalysis | null>(null);
  const [fearGreed, setFearGreed] = useState<FearGreedIndex | null>(null);
  const [signals, setSignals] = useState<SignalAlert[]>([]);
  const [stats, setStats] = useState<SignalStats | null>(null);
  const [insights, setInsights] = useState<InsightCard[]>([]);
  
  // Refresh data
  const refresh = useCallback(async () => {
    if (chartData.length < 50) return;
    
    setIsRefreshing(true);
    
    try {
      // Analyze chart
      const newAnalysis = AITradingEngine.analyze(chartData, currentSymbol, currentTimeframe);
      setAnalysis(newAnalysis);
      
      // Update signals
      signalManager.analyze(chartData, currentSymbol, currentTimeframe);
      setSignals(signalManager.getActiveSignals());
      setStats(signalManager.getStats());
      
      // Get sentiment
      const newSentiment = await sentimentService.analyze(currentSymbol);
      setSentiment(newSentiment);
      
      // Calculate Fear & Greed
      const change24h = chartData.length > 1 
        ? ((currentPrice - chartData[0].close) / chartData[0].close) * 100 
        : 0;
      
      const newFearGreed = sentimentService.updateFearGreed({
        volatility: Math.min(100, 50 + newAnalysis.volatility * 10),
        momentum: 50 + change24h * 2,
        social: newSentiment?.components.social.score || 50,
        dominance: 50,
        trends: newAnalysis.marketStructure.trend === 'BULLISH' ? 70 : 
                newAnalysis.marketStructure.trend === 'BEARISH' ? 30 : 50,
      });
      setFearGreed(newFearGreed);
      
      // Generate insights
      const newInsights: InsightCard[] = [];
      
      // Add pattern insights
      newAnalysis.patterns.forEach(p => {
        newInsights.push({
          id: `pattern-${p.name}`,
          type: 'pattern',
          title: `${p.name} Detected`,
          description: `${p.direction === 'bullish' ? '📈' : '📉'} ${p.type} pattern with ${p.confidence}% confidence. Target: $${p.target.toLocaleString()}`,
          importance: p.confidence > 75 ? 'high' : 'medium',
          timestamp: Date.now(),
          data: p,
        });
      });
      
      // Add signal insights
      if (newAnalysis.primarySignal) {
        const sig = newAnalysis.primarySignal;
        newInsights.push({
          id: `signal-${sig.id}`,
          type: 'signal',
          title: `${sig.type} Signal Active`,
          description: `${sig.strength} signal with ${sig.confidence}% confidence. Entry: $${sig.targets.entry.toLocaleString()}`,
          importance: sig.strength === 'STRONG' ? 'high' : 'medium',
          timestamp: Date.now(),
          data: sig,
        });
      }
      
      // Add divergence insights
      newAnalysis.divergences.forEach(d => {
        newInsights.push({
          id: `div-${d.indicator}-${d.startTime}`,
          type: 'alert',
          title: `${d.type} ${d.direction} Divergence`,
          description: `${d.indicator} showing ${d.type} ${d.direction} divergence. Strength: ${d.strength}%`,
          importance: d.strength > 60 ? 'high' : 'medium',
          timestamp: Date.now(),
          data: d,
        });
      });
      
      // Add sentiment insights
      if (newSentiment) {
        newInsights.push({
          id: 'sentiment',
          type: 'sentiment',
          title: `Market Sentiment: ${newSentiment.overallSentiment}`,
          description: newSentiment.summary,
          importance: Math.abs(newSentiment.sentimentScore) > 50 ? 'high' : 'low',
          timestamp: Date.now(),
          data: newSentiment,
        });
      }
      
      // Add prediction insights
      newInsights.push({
        id: 'prediction-st',
        type: 'prediction',
        title: `Short-term Prediction: ${newAnalysis.predictions.shortTerm.direction}`,
        description: `${newAnalysis.predictions.shortTerm.probability.toFixed(0)}% probability. Target: $${newAnalysis.predictions.shortTerm.price.toLocaleString()}`,
        importance: newAnalysis.predictions.shortTerm.probability > 70 ? 'high' : 'low',
        timestamp: Date.now(),
        data: newAnalysis.predictions.shortTerm,
      });
      
      setInsights(newInsights.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.importance] - order[b.importance];
      }));
      
    } catch (error) {
      console.error('Dashboard refresh error:', error);
    }
    
    setIsRefreshing(false);
  }, [chartData, currentSymbol, currentTimeframe, currentPrice]);
  
  // Auto-refresh on mount and data change
  useEffect(() => {
    if (isVisible && chartData.length >= 50) {
      refresh();
    }
  }, [isVisible, currentSymbol, currentTimeframe, chartData.length]);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">AI Insights Dashboard</h2>
              <p className="text-sm text-[var(--text-secondary)]">{currentSymbol} • {currentTimeframe}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-6 py-2 border-b border-[var(--border-color)] flex gap-4">
          {(['overview', 'signals', 'insights'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Top Row - Stats & Fear/Greed */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Fear & Greed */}
                <div className="md:col-span-1 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 text-center">
                    Fear & Greed Index
                  </h3>
                  {fearGreed ? (
                    <FearGreedGauge 
                      value={fearGreed.value} 
                      classification={fearGreed.classification} 
                    />
                  ) : (
                    <div className="flex items-center justify-center h-24 text-[var(--text-tertiary)]">
                      Loading...
                    </div>
                  )}
                </div>
                
                {/* Stats Grid */}
                <div className="md:col-span-2 grid grid-cols-2 gap-3">
                  <StatsCard
                    title="Market Trend"
                    value={analysis?.marketStructure.trend || 'N/A'}
                    icon={<TrendingUp className="w-4 h-4" />}
                    color={analysis?.marketStructure.trend === 'BULLISH' ? '#66BB6A' : 
                           analysis?.marketStructure.trend === 'BEARISH' ? '#EF5350' : '#FFA726'}
                  />
                  <StatsCard
                    title="Trend Strength"
                    value={`${analysis?.marketStructure.trendStrength.toFixed(0) || 0}%`}
                    icon={<Activity className="w-4 h-4" />}
                  />
                  <StatsCard
                    title="Volatility"
                    value={`${analysis?.volatility.toFixed(2) || 0}%`}
                    icon={<BarChart2 className="w-4 h-4" />}
                  />
                  <StatsCard
                    title="Risk Level"
                    value={analysis?.riskLevel || 'N/A'}
                    icon={<Shield className="w-4 h-4" />}
                    color={analysis?.riskLevel === 'LOW' ? '#66BB6A' : 
                           analysis?.riskLevel === 'MEDIUM' ? '#FFA726' : '#EF5350'}
                  />
                </div>
              </div>
              
              {/* Primary Signal */}
              {analysis?.primarySignal && (
                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[var(--accent-primary)]" />
                    Active Signal
                  </h3>
                  <div className={`p-4 rounded-xl ${
                    analysis.primarySignal.type === 'BUY' ? 'bg-green-500/10 border-green-500/30' : 
                    analysis.primarySignal.type === 'SELL' ? 'bg-red-500/10 border-red-500/30' : 
                    'bg-gray-500/10 border-gray-500/30'
                  } border`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-bold ${
                          analysis.primarySignal.type === 'BUY' ? 'text-green-400' : 
                          analysis.primarySignal.type === 'SELL' ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {analysis.primarySignal.type}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white">
                          {analysis.primarySignal.strength}
                        </span>
                      </div>
                      <span className="text-xl font-bold text-[var(--text-primary)]">
                        {analysis.primarySignal.confidence}%
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-3 text-sm">
                      <div>
                        <span className="text-[var(--text-tertiary)]">Entry</span>
                        <div className="font-medium text-[var(--text-primary)]">
                          ${analysis.primarySignal.targets.entry.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)]">Stop Loss</span>
                        <div className="font-medium text-red-400">
                          ${analysis.primarySignal.targets.stopLoss.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)]">TP1</span>
                        <div className="font-medium text-green-400">
                          ${analysis.primarySignal.targets.takeProfit1.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)]">TP2</span>
                        <div className="font-medium text-green-400">
                          ${analysis.primarySignal.targets.takeProfit2.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)]">R:R</span>
                        <div className="font-medium text-[var(--accent-primary)]">
                          {analysis.primarySignal.riskReward.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Patterns & Predictions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Detected Patterns */}
                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[var(--accent-primary)]" />
                    Detected Patterns
                  </h3>
                  {analysis?.patterns && analysis.patterns.length > 0 ? (
                    <div className="space-y-2">
                      {analysis.patterns.slice(0, 4).map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-tertiary)]">
                          <div className="flex items-center gap-2">
                            <span className={p.direction === 'bullish' ? 'text-green-400' : 'text-red-400'}>
                              {p.direction === 'bullish' ? '📈' : '📉'}
                            </span>
                            <span className="text-sm text-[var(--text-primary)]">{p.name}</span>
                          </div>
                          <span className="text-xs text-[var(--text-secondary)]">{p.confidence}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
                      No patterns detected
                    </p>
                  )}
                </div>
                
                {/* Predictions */}
                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[var(--accent-primary)]" />
                    AI Predictions
                  </h3>
                  {analysis?.predictions && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-tertiary)]">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[var(--text-tertiary)]" />
                          <span className="text-sm text-[var(--text-primary)]">Short-term</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-medium ${
                            analysis.predictions.shortTerm.direction === 'UP' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {analysis.predictions.shortTerm.direction}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)] ml-2">
                            {analysis.predictions.shortTerm.probability.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-tertiary)]">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[var(--text-tertiary)]" />
                          <span className="text-sm text-[var(--text-primary)]">Medium-term</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-medium ${
                            analysis.predictions.mediumTerm.direction === 'UP' ? 'text-green-400' : 
                            analysis.predictions.mediumTerm.direction === 'DOWN' ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            {analysis.predictions.mediumTerm.direction}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)] ml-2">
                            {analysis.predictions.mediumTerm.probability.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-tertiary)]">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[var(--text-tertiary)]" />
                          <span className="text-sm text-[var(--text-primary)]">Long-term</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-medium ${
                            analysis.predictions.longTerm.direction === 'UP' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {analysis.predictions.longTerm.direction}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)] ml-2">
                            {analysis.predictions.longTerm.probability.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'signals' && (
            <div className="space-y-4">
              {/* Signal Stats */}
              {stats && (
                <div className="grid grid-cols-4 gap-3">
                  <StatsCard title="Total Signals" value={stats.total} icon={<Zap className="w-4 h-4" />} />
                  <StatsCard title="Win Rate" value={`${stats.winRate.toFixed(1)}%`} icon={<Target className="w-4 h-4" />} color="#66BB6A" />
                  <StatsCard title="Profit Factor" value={stats.profitFactor.toFixed(2)} icon={<TrendingUp className="w-4 h-4" />} />
                  <StatsCard title="Active" value={signals.length} icon={<Activity className="w-4 h-4" />} />
                </div>
              )}
              
              {/* Active Signals */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-[var(--text-secondary)]">Active Signals</h3>
                {signals.length > 0 ? (
                  signals.map(alert => (
                    <SignalCardMini
                      key={alert.id}
                      alert={alert}
                      onClick={() => onNavigateToSignal?.(alert.signal)}
                    />
                  ))
                ) : (
                  <p className="text-center py-8 text-[var(--text-tertiary)]">
                    No active signals. Run analysis to generate signals.
                  </p>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'insights' && (
            <div className="space-y-3">
              {insights.length > 0 ? (
                insights.map(insight => (
                  <InsightItem key={insight.id} insight={insight} />
                ))
              ) : (
                <p className="text-center py-8 text-[var(--text-tertiary)]">
                  No insights available. Run analysis to generate insights.
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between">
          <span className="text-xs text-[var(--text-tertiary)]">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            AI Engine Active
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsDashboard;
