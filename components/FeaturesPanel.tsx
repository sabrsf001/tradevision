/**
 * Features Panel - Comprehensive UI for TradeVision Pro Features
 * Includes: Portfolio Dashboard, Trading Bots, Social Trading, Strategy Builder
 */

import React, { useState, useEffect } from 'react';
import { 
  X, TrendingUp, Bot, Users, Zap, Settings2, Play, Pause, 
  ChevronRight, AlertTriangle, CheckCircle, Clock, DollarSign,
  BarChart2, Target, Shield, Layers, Activity, Star
} from './Icons';
import { 
  portfolioManager, 
  PortfolioAsset, 
  PortfolioMetrics 
} from '../services/portfolio';
import { 
  botManager, 
  BotType,
  BotBase
} from '../services/tradingBots';
import { 
  socialTrading, 
  LeaderboardEntry 
} from '../services/socialTrading';
import {
  strategyBuilder,
  Strategy
} from '../services/strategyBuilder';

interface FeaturesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrice?: number;
  symbol?: string;
  paperBalance?: number;
}

type TabType = 'portfolio' | 'bots' | 'social' | 'strategy';

const FeaturesPanel: React.FC<FeaturesPanelProps> = ({
  isOpen,
  onClose,
  currentPrice = 0,
  symbol = 'BTCUSD',
  paperBalance = 10000
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('portfolio');
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAsset[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [bots, setBots] = useState<BotBase[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isCreatingBot, setIsCreatingBot] = useState(false);
  const [newBotType, setNewBotType] = useState<BotType>('dca');

  // Load data when tab changes
  useEffect(() => {
    if (!isOpen) return;
    
    const loadData = async () => {
      switch (activeTab) {
        case 'portfolio':
          const assets = portfolioManager.getAssets();
          setPortfolioAssets(assets);
          const perf = portfolioManager.calculateMetrics();
          setMetrics(perf);
          break;
        case 'bots':
          const botList = botManager.getAllBots();
          setBots(botList);
          break;
        case 'social':
          const leaders = await socialTrading.getLeaderboard();
          setLeaderboard(leaders);
          break;
        case 'strategy':
          const strats = strategyBuilder.getAllStrategies();
          setStrategies(strats);
          break;
      }
    };
    
    loadData();
  }, [activeTab, isOpen]);

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'portfolio', label: 'Portfolio', icon: <BarChart2 className="h-4 w-4" /> },
    { id: 'bots', label: 'Trading Bots', icon: <Bot className="h-4 w-4" /> },
    { id: 'social', label: 'Social', icon: <Users className="h-4 w-4" /> },
    { id: 'strategy', label: 'Strategies', icon: <Zap className="h-4 w-4" /> },
  ];

  const handleCreateBot = async () => {
    try {
      if (newBotType === 'dca') {
        const bot = botManager.createDCABot(`DCA ${symbol}`, symbol, {
          investmentAmount: 100,
          frequency: 'daily',
        });
        setBots(prev => [...prev, bot]);
      } else if (newBotType === 'grid') {
        const bot = botManager.createGridBot(`Grid ${symbol}`, symbol, {
          upperPrice: currentPrice * 1.1,
          lowerPrice: currentPrice * 0.9,
          gridCount: 10,
          totalInvestment: 1000,
          mode: 'arithmetic',
        });
        setBots(prev => [...prev, bot]);
      }
      setIsCreatingBot(false);
    } catch (error) {
      console.error('Failed to create bot:', error);
    }
  };

  const handleToggleBot = (botId: string) => {
    const bot = bots.find(b => b.id === botId);
    if (bot) {
      if (bot.status === 'running') {
        botManager.pauseBot(botId);
      } else {
        botManager.startBot(botId);
      }
      setBots(botManager.getAllBots());
    }
  };

  const handleCopyTrader = async (traderId: string) => {
    try {
      socialTrading.startCopying(traderId, {
        maxPositionSize: 1000,
        copyMode: 'proportional',
        proportionalPercent: 10,
      });
      alert('Now copying this trader!');
    } catch (error) {
      console.error('Failed to copy trader:', error);
    }
  };

  const handleActivateStrategy = async (strategyId: string) => {
    try {
      const strategy = strategyBuilder.getStrategy(strategyId);
      if (strategy) {
        strategyBuilder.updateStrategy(strategyId, { isEnabled: !strategy.isEnabled });
        setStrategies(strategyBuilder.getAllStrategies());
      }
    } catch (error) {
      console.error('Failed to toggle strategy:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative ml-auto w-full max-w-2xl bg-[var(--bg-secondary)] border-l border-[var(--border-color)] shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">TradeVision Pro</h2>
              <p className="text-xs text-gray-400">Advanced Trading Features</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-panel)] transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-color)]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-white border-b-2 border-[var(--accent-blue)] bg-[var(--bg-panel)]'
                  : 'text-gray-400 hover:text-white hover:bg-[var(--bg-panel)]'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Portfolio Tab */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--bg-panel)] rounded-xl p-4 border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Total Value</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    ${(metrics?.totalValue ?? paperBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-[var(--bg-panel)] rounded-xl p-4 border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Total P&L</span>
                  </div>
                  <p className={`text-2xl font-bold ${(metrics?.totalPnl ?? 0) >= 0 ? 'text-[var(--accent-bullish)]' : 'text-[var(--accent-bearish)]'}`}>
                    {(metrics?.totalPnl ?? 0) >= 0 ? '+' : ''}{(metrics?.totalPnl ?? 0).toFixed(2)}%
                  </p>
                </div>
                <div className="bg-[var(--bg-panel)] rounded-xl p-4 border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <Activity className="h-4 w-4" />
                    <span>Sharpe Ratio</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{(metrics?.sharpeRatio ?? 0).toFixed(2)}</p>
                </div>
                <div className="bg-[var(--bg-panel)] rounded-xl p-4 border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <Shield className="h-4 w-4" />
                    <span>Max Drawdown</span>
                  </div>
                  <p className="text-2xl font-bold text-[var(--accent-bearish)]">
                    -{(metrics?.maxDrawdown ?? 0).toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Assets List */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Holdings</h3>
                {portfolioAssets.length > 0 ? (
                  <div className="space-y-2">
                    {portfolioAssets.map(asset => (
                      <div key={asset.symbol} className="flex items-center justify-between bg-[var(--bg-panel)] rounded-lg p-3 border border-[var(--border-color)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--accent-blue)]/20 flex items-center justify-center">
                            <span className="text-xs font-bold text-[var(--accent-blue)]">{asset.symbol.slice(0, 3)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{asset.symbol}</p>
                            <p className="text-xs text-gray-400">{asset.quantity} units @ ${asset.avgCost}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">${(asset.quantity * asset.currentPrice).toFixed(2)}</p>
                          <p className={`text-xs ${asset.pnlPercent >= 0 ? 'text-[var(--accent-bullish)]' : 'text-[var(--accent-bearish)]'}`}>
                            {asset.pnlPercent >= 0 ? '+' : ''}{asset.pnlPercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No holdings yet</p>
                    <p className="text-sm">Start trading to build your portfolio</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Trading Bots Tab */}
          {activeTab === 'bots' && (
            <div className="space-y-6">
              {/* Create Bot */}
              {isCreatingBot ? (
                <div className="bg-[var(--bg-panel)] rounded-xl p-4 border border-[var(--border-color)]">
                  <h3 className="text-sm font-medium text-white mb-4">Create New Bot</h3>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {(['dca', 'grid', 'signal', 'trailing'] as BotType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => setNewBotType(type)}
                        className={`p-3 rounded-lg border transition-colors ${
                          newBotType === type
                            ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 text-white'
                            : 'border-[var(--border-color)] text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className="text-sm font-medium uppercase">{type}</span>
                        <p className="text-xs text-gray-500 mt-1">
                          {type === 'dca' && 'Dollar Cost Averaging'}
                          {type === 'grid' && 'Grid Trading'}
                          {type === 'signal' && 'Signal Based'}
                          {type === 'trailing' && 'Trailing Orders'}
                        </p>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateBot}
                      className="flex-1 py-2 rounded-lg bg-[var(--accent-blue)] text-white font-medium hover:bg-[var(--accent-blue)]/80 transition-colors"
                    >
                      Create Bot
                    </button>
                    <button
                      onClick={() => setIsCreatingBot(false)}
                      className="px-4 py-2 rounded-lg border border-[var(--border-color)] text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingBot(true)}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-[var(--border-color)] text-gray-400 hover:text-white hover:border-[var(--accent-blue)] transition-colors flex items-center justify-center gap-2"
                >
                  <Bot className="h-5 w-5" />
                  <span>Create New Trading Bot</span>
                </button>
              )}

              {/* Bots List */}
              {bots.length > 0 ? (
                <div className="space-y-3">
                  {bots.map(bot => (
                    <div key={bot.id} className="bg-[var(--bg-panel)] rounded-xl p-4 border border-[var(--border-color)]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            bot.status === 'running' ? 'bg-[var(--accent-bullish)]/20' : 'bg-gray-600/20'
                          }`}>
                            <Bot className={`h-5 w-5 ${bot.status === 'running' ? 'text-[var(--accent-bullish)]' : 'text-gray-400'}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{bot.name}</p>
                            <p className="text-xs text-gray-400">{bot.type.toUpperCase()} • {bot.symbol}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleBot(bot.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                            bot.status === 'running'
                              ? 'bg-[var(--accent-bearish)]/20 text-[var(--accent-bearish)] hover:bg-[var(--accent-bearish)]/30'
                              : 'bg-[var(--accent-bullish)]/20 text-[var(--accent-bullish)] hover:bg-[var(--accent-bullish)]/30'
                          }`}
                        >
                          {bot.status === 'running' ? (
                            <>
                              <Pause className="h-3 w-3" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3" />
                              Start
                            </>
                          )}
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-[var(--bg-primary)] rounded-lg p-2">
                          <p className="text-xs text-gray-400">Trades</p>
                          <p className="text-sm font-medium text-white">{bot.stats?.totalTrades ?? 0}</p>
                        </div>
                        <div className="bg-[var(--bg-primary)] rounded-lg p-2">
                          <p className="text-xs text-gray-400">Win Rate</p>
                          <p className="text-sm font-medium text-[var(--accent-bullish)]">{((bot.stats?.winRate ?? 0) * 100).toFixed(1)}%</p>
                        </div>
                        <div className="bg-[var(--bg-primary)] rounded-lg p-2">
                          <p className="text-xs text-gray-400">P&L</p>
                          <p className={`text-sm font-medium ${(bot.stats?.realizedPnl ?? 0) >= 0 ? 'text-[var(--accent-bullish)]' : 'text-[var(--accent-bearish)]'}`}>
                            ${(bot.stats?.realizedPnl ?? 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !isCreatingBot && (
                <div className="text-center py-8 text-gray-400">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No trading bots configured</p>
                  <p className="text-sm">Create a bot to automate your trading</p>
                </div>
              )}
            </div>
          )}

          {/* Social Trading Tab */}
          {activeTab === 'social' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-400">Top Traders Leaderboard</h3>
                <select className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-sm text-white">
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              {leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {leaderboard.map((entry, index) => (
                    <div key={entry.trader.id} className="bg-[var(--bg-panel)] rounded-xl p-4 border border-[var(--border-color)]">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                          index === 1 ? 'bg-gray-300/20 text-gray-300' :
                          index === 2 ? 'bg-orange-500/20 text-orange-500' :
                          'bg-gray-600/20 text-gray-400'
                        }`}>
                          #{entry.rank}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white">{entry.trader.displayName || entry.trader.username}</p>
                            {entry.trader.isVerified && <CheckCircle className="h-4 w-4 text-[var(--accent-blue)]" />}
                          </div>
                          <p className="text-xs text-gray-400">{entry.trader.followers} followers • {entry.trader.stats.totalTrades} trades</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${entry.trader.stats.totalPnlPercent >= 0 ? 'text-[var(--accent-bullish)]' : 'text-[var(--accent-bearish)]'}`}>
                            {entry.trader.stats.totalPnlPercent >= 0 ? '+' : ''}{entry.trader.stats.totalPnlPercent.toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-400">{(entry.trader.stats.winRate * 100).toFixed(0)}% win rate</p>
                        </div>
                        <button
                          onClick={() => handleCopyTrader(entry.trader.id)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] text-sm font-medium hover:bg-[var(--accent-blue)]/30 transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No leaderboard data available</p>
                  <p className="text-sm">Check back soon for top traders</p>
                </div>
              )}
            </div>
          )}

          {/* Strategy Builder Tab */}
          {activeTab === 'strategy' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-4 border border-purple-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="h-5 w-5 text-purple-400" />
                  <h3 className="text-sm font-medium text-white">Strategy Builder</h3>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Create custom trading strategies using our visual builder or choose from templates
                </p>
                <button className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-sm font-medium hover:bg-purple-500/30 transition-colors border border-purple-500/30">
                  Open Visual Builder
                </button>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Your Strategies</h3>
                <div className="space-y-3">
                  {strategies.length > 0 ? strategies.map(strategy => (
                    <div key={strategy.id} className="bg-[var(--bg-panel)] rounded-xl p-4 border border-[var(--border-color)]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-white">{strategy.name}</h4>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            strategy.isEnabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {strategy.isEnabled ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleActivateStrategy(strategy.id)}
                          className="px-3 py-1 rounded-lg bg-[var(--accent-bullish)]/20 text-[var(--accent-bullish)] text-xs font-medium hover:bg-[var(--accent-bullish)]/30 transition-colors"
                        >
                          {strategy.isEnabled ? 'Disable' : 'Activate'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">{strategy.description}</p>
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 rounded bg-[var(--bg-primary)] text-xs text-gray-400">
                          {strategy.symbol}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[var(--bg-primary)] text-xs text-gray-400">
                          {strategy.timeframe}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[var(--bg-primary)] text-xs text-gray-400">
                          {strategy.blocks.length} blocks
                        </span>
                      </div>
                    </div>
                  )) : (
                    <>
                      {/* Default templates when none loaded */}
                      {[
                        { name: 'Golden Cross', risk: 'medium', desc: 'MA 50/200 crossover strategy', indicators: ['SMA 50', 'SMA 200'] },
                        { name: 'RSI Reversal', risk: 'high', desc: 'Overbought/oversold reversals', indicators: ['RSI 14', 'Volume'] },
                        { name: 'MACD Momentum', risk: 'medium', desc: 'Trend following with MACD', indicators: ['MACD', 'EMA 20'] },
                        { name: 'Bollinger Breakout', risk: 'high', desc: 'Volatility breakout strategy', indicators: ['BB 20', 'Volume'] },
                      ].map((strategy, i) => (
                        <div key={i} className="bg-[var(--bg-panel)] rounded-xl p-4 border border-[var(--border-color)]">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-white">{strategy.name}</h4>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                strategy.risk === 'low' ? 'bg-green-500/20 text-green-400' :
                                strategy.risk === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {strategy.risk.toUpperCase()}
                              </span>
                            </div>
                            <button className="px-3 py-1 rounded-lg bg-[var(--accent-bullish)]/20 text-[var(--accent-bullish)] text-xs font-medium hover:bg-[var(--accent-bullish)]/30 transition-colors">
                              Activate
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mb-2">{strategy.desc}</p>
                          <div className="flex gap-2">
                            {strategy.indicators.map(ind => (
                              <span key={ind} className="px-2 py-0.5 rounded bg-[var(--bg-primary)] text-xs text-gray-400">
                                {ind}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-panel)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Shield className="h-4 w-4" />
              <span>Paper Trading Mode Active</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock className="h-4 w-4" />
              <span>Last updated: just now</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturesPanel;
