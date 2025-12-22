/**
 * Backtesting Panel Component
 * UI for running and viewing backtest results
 */

import React, { useState } from 'react';
import { 
  BacktestEngine, 
  createStrategy, 
  getAvailableStrategies,
  type BacktestConfig,
  type BacktestResult
} from '../services/backtesting';
import type { CandleData } from '../types';
import { Play, BarChart2, TrendingUp, ArrowDownRight, Activity, AlertCircle, X, Target } from './Icons';

interface BacktestFormProps {
  onRun: (config: BacktestConfig, strategyId: string) => void;
  isRunning: boolean;
}

const BacktestForm: React.FC<BacktestFormProps> = ({ onRun, isRunning }) => {
  const strategies = getAvailableStrategies();
  const [strategyId, setStrategyId] = useState(strategies[0]?.id || 'sma_crossover');
  const [initialCapital, setInitialCapital] = useState(10000);
  const [positionSize, setPositionSize] = useState(100);
  const [slippage, setSlippage] = useState(0.1);
  const [commission, setCommission] = useState(0.1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const config: BacktestConfig = {
      symbol: 'BTCUSDT',
      timeframe: '1D',
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      endDate: new Date(),
      initialCapital,
      positionSize,
      slippage,
      commission,
    };
    onRun(config, strategyId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-[var(--text-secondary)] mb-2">
          Strategy
        </label>
        <select
          value={strategyId}
          onChange={(e) => setStrategyId(e.target.value)}
          className="w-full px-4 py-3 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
        >
          {strategies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {strategies.find(s => s.id === strategyId)?.description}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-2">
            Initial Capital ($)
          </label>
          <input
            type="number"
            value={initialCapital}
            onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-2">
            Position Size (%)
          </label>
          <input
            type="number"
            value={positionSize}
            onChange={(e) => setPositionSize(parseFloat(e.target.value) || 0)}
            min={1}
            max={100}
            className="w-full px-4 py-3 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-2">
            Slippage (%)
          </label>
          <input
            type="number"
            value={slippage}
            onChange={(e) => setSlippage(parseFloat(e.target.value) || 0)}
            step={0.01}
            min={0}
            className="w-full px-4 py-3 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-2">
            Commission (%)
          </label>
          <input
            type="number"
            value={commission}
            onChange={(e) => setCommission(parseFloat(e.target.value) || 0)}
            step={0.01}
            min={0}
            className="w-full px-4 py-3 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isRunning}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-[var(--accent-blue)]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isRunning ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Run Backtest
          </>
        )}
      </button>
    </form>
  );
};

interface ResultsDisplayProps {
  result: BacktestResult;
  onClose: () => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, onClose }) => {
  const { metrics, trades } = result;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{result.strategyName}</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {result.config.symbol} · {metrics.totalTrades} trades
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-[var(--bg-panel)] transition-colors"
        >
          <X className="w-5 h-5 text-[var(--text-secondary)]" />
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-xs text-[var(--text-secondary)]">Net Profit</span>
          </div>
          <p className={`text-lg font-bold ${metrics.netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
            {formatCurrency(metrics.netProfit)}
          </p>
          <p className={`text-xs ${metrics.netProfitPercent >= 0 ? 'text-white' : 'text-red-400'}`}>
            {formatPercent(metrics.netProfitPercent)}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-xs text-[var(--text-secondary)]">Win Rate</span>
          </div>
          <p className={`text-lg font-bold ${metrics.winRate >= 50 ? 'text-white' : 'text-red-400'}`}>
            {metrics.winRate.toFixed(1)}%
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            {metrics.winningTrades}W / {metrics.losingTrades}L
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-xs text-[var(--text-secondary)]">Max Drawdown</span>
          </div>
          <p className="text-lg font-bold text-red-400">
            {metrics.maxDrawdown.toFixed(2)}%
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-xs text-[var(--text-secondary)]">Sharpe Ratio</span>
          </div>
          <p className={`text-lg font-bold ${metrics.sharpeRatio >= 1 ? 'text-white' : metrics.sharpeRatio >= 0 ? 'text-neutral-400' : 'text-red-400'}`}>
            {metrics.sharpeRatio.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="p-3 rounded bg-[var(--bg-panel)]">
          <p className="text-xs text-[var(--text-secondary)]">Profit Factor</p>
          <p className="text-white font-medium">
            {metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
          </p>
        </div>
        <div className="p-3 rounded bg-[var(--bg-panel)]">
          <p className="text-xs text-[var(--text-secondary)]">Avg Win</p>
          <p className="text-white font-medium">{formatCurrency(metrics.avgWin)}</p>
        </div>
        <div className="p-3 rounded bg-[var(--bg-panel)]">
          <p className="text-xs text-[var(--text-secondary)]">Avg Loss</p>
          <p className="text-red-400 font-medium">{formatCurrency(metrics.avgLoss)}</p>
        </div>
      </div>

      {/* Recent Trades */}
      <div>
        <h4 className="text-sm font-medium text-white mb-2">Recent Trades</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {trades.slice(-5).reverse().map((trade, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-color)]"
            >
              <div className="flex items-center gap-2">
                {trade.side === 'long' ? (
                  <TrendingUp className="w-4 h-4 text-white" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                )}
                <span className="text-sm text-white capitalize">{trade.side}</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  @ {trade.entryPrice.toFixed(2)}
                </span>
              </div>
              <span className={`text-sm font-medium ${trade.pnl >= 0 ? 'text-white' : 'text-red-400'}`}>
                {formatCurrency(trade.pnl)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface BacktestingPanelProps {
  candles?: CandleData[];
}

export const BacktestingPanel: React.FC<BacktestingPanelProps> = ({ candles = [] }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async (config: BacktestConfig, strategyId: string) => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 100));

      if (candles.length < 50) {
        throw new Error('Not enough candle data. Need at least 50 candles.');
      }

      const strategy = createStrategy(strategyId);
      const engine = new BacktestEngine(config, strategy);
      engine.setData(candles);
      const backtestResult = engine.run();
      setResult(backtestResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-[var(--border-color)]">
        <BarChart2 className="w-5 h-5 text-[var(--accent-blue)]" />
        <h2 className="font-semibold text-white">Backtesting</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {result ? (
          <ResultsDisplay result={result} onClose={() => setResult(null)} />
        ) : (
          <BacktestForm onRun={handleRun} isRunning={isRunning} />
        )}
      </div>
    </div>
  );
};

export default BacktestingPanel;
