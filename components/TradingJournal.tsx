/**
 * Trading Journal Panel
 * Log trades with notes, screenshots, and P&L tracking
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Edit2, TrendingUp, TrendingDown, Calendar, DollarSign } from './Icons';

export interface TradeEntry {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  entryTime: number;
  exitTime?: number;
  status: 'open' | 'closed';
  notes: string;
  tags: string[];
  pnl?: number;
  pnlPercent?: number;
  screenshot?: string; // Base64 image
}

interface TradingJournalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  currentPrice: number;
  onToast: (message: string, type: 'success' | 'alert' | 'info') => void;
}

const JOURNAL_STORAGE_KEY = 'tv_trading_journal';

// Generate unique ID
const generateId = () => `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Load trades from localStorage
const loadTrades = (): TradeEntry[] => {
  try {
    const saved = localStorage.getItem(JOURNAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Save trades to localStorage
const saveTrades = (trades: TradeEntry[]) => {
  localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(trades));
};

// Calculate P&L
const calculatePnL = (trade: TradeEntry): { pnl: number; pnlPercent: number } | null => {
  if (!trade.exitPrice) return null;
  
  const multiplier = trade.side === 'long' ? 1 : -1;
  const priceDiff = (trade.exitPrice - trade.entryPrice) * multiplier;
  const pnl = priceDiff * trade.quantity;
  const pnlPercent = (priceDiff / trade.entryPrice) * 100;
  
  return { pnl, pnlPercent };
};

export const TradingJournalPanel: React.FC<TradingJournalProps> = ({
  isOpen,
  onClose,
  currentSymbol,
  currentPrice,
  onToast,
}) => {
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'pnl'>('date');
  
  // New trade form state
  const [newTrade, setNewTrade] = useState({
    symbol: currentSymbol,
    side: 'long' as 'long' | 'short',
    entryPrice: currentPrice,
    quantity: 1,
    notes: '',
    tags: '',
  });

  // Load trades on mount
  useEffect(() => {
    setTrades(loadTrades());
  }, []);

  // Update symbol/price when they change
  useEffect(() => {
    setNewTrade((prev) => ({
      ...prev,
      symbol: currentSymbol,
      entryPrice: currentPrice,
    }));
  }, [currentSymbol, currentPrice]);

  // Filter and sort trades - moved before early return
  const displayTrades = useMemo(() => {
    let filtered = trades;
    if (filter !== 'all') {
      filtered = trades.filter((t) => t.status === filter);
    }

    return filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return b.entryTime - a.entryTime;
      }
      return (b.pnl || 0) - (a.pnl || 0);
    });
  }, [trades, filter, sortBy]);

  // Statistics - moved before early return
  const stats = useMemo(() => {
    const closedTrades = trades.filter((t) => t.status === 'closed');
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winningTrades = closedTrades.filter((t) => (t.pnl || 0) > 0);
    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
    
    return {
      totalTrades: trades.length,
      openTrades: trades.filter((t) => t.status === 'open').length,
      closedTrades: closedTrades.length,
      totalPnL,
      winRate,
    };
  }, [trades]);

  if (!isOpen) return null;

  const handleCreateTrade = () => {
    const trade: TradeEntry = {
      id: generateId(),
      symbol: newTrade.symbol,
      side: newTrade.side,
      entryPrice: newTrade.entryPrice,
      quantity: newTrade.quantity,
      entryTime: Date.now(),
      status: 'open',
      notes: newTrade.notes,
      tags: newTrade.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };

    const updatedTrades = [...trades, trade];
    setTrades(updatedTrades);
    saveTrades(updatedTrades);
    setIsCreating(false);
    setNewTrade({
      symbol: currentSymbol,
      side: 'long',
      entryPrice: currentPrice,
      quantity: 1,
      notes: '',
      tags: '',
    });
    onToast('Trade logged successfully', 'success');
  };

  const handleCloseTrade = (tradeId: string, exitPrice: number) => {
    const updatedTrades = trades.map((t) => {
      if (t.id === tradeId) {
        const pnlData = calculatePnL({ ...t, exitPrice });
        return {
          ...t,
          exitPrice,
          exitTime: Date.now(),
          status: 'closed' as const,
          pnl: pnlData?.pnl,
          pnlPercent: pnlData?.pnlPercent,
        };
      }
      return t;
    });
    setTrades(updatedTrades);
    saveTrades(updatedTrades);
    setEditingId(null);
    onToast('Trade closed', 'success');
  };

  const handleDeleteTrade = (tradeId: string) => {
    const updatedTrades = trades.filter((t) => t.id !== tradeId);
    setTrades(updatedTrades);
    saveTrades(updatedTrades);
    onToast('Trade deleted', 'info');
  };

  const handleUpdateNotes = (tradeId: string, notes: string) => {
    const updatedTrades = trades.map((t) =>
      t.id === tradeId ? { ...t, notes } : t
    );
    setTrades(updatedTrades);
    saveTrades(updatedTrades);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Trading Journal
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-primary)] rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="px-4 py-3 bg-[var(--bg-primary)] border-b border-[var(--border-color)] flex items-center gap-6 text-sm overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Total Trades:</span>
            <span className="text-white font-medium">{stats.totalTrades}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Open:</span>
            <span className="text-yellow-400 font-medium">{stats.openTrades}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">P&L:</span>
            <span className={`font-medium ${stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${stats.totalPnL.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Win Rate:</span>
            <span className={`font-medium ${stats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.winRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)]">
          <div className="flex gap-2">
            {(['all', 'open', 'closed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-[var(--accent-blue)] text-white'
                    : 'bg-[var(--bg-primary)] text-gray-400 hover:text-white'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--accent-blue)] text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Trade
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* New Trade Form */}
          {isCreating && (
            <div className="bg-[var(--bg-primary)] border border-[var(--accent-blue)] rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-white">Log New Trade</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Symbol</label>
                  <input
                    type="text"
                    value={newTrade.symbol}
                    onChange={(e) => setNewTrade({ ...newTrade, symbol: e.target.value.toUpperCase() })}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--accent-blue)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Side</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewTrade({ ...newTrade, side: 'long' })}
                      className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                        newTrade.side === 'long'
                          ? 'bg-green-600 text-white'
                          : 'bg-[var(--bg-secondary)] text-gray-400 hover:text-white'
                      }`}
                    >
                      Long
                    </button>
                    <button
                      onClick={() => setNewTrade({ ...newTrade, side: 'short' })}
                      className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                        newTrade.side === 'short'
                          ? 'bg-red-600 text-white'
                          : 'bg-[var(--bg-secondary)] text-gray-400 hover:text-white'
                      }`}
                    >
                      Short
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Entry Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTrade.entryPrice}
                    onChange={(e) => setNewTrade({ ...newTrade, entryPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-[var(--accent-blue)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newTrade.quantity}
                    onChange={(e) => setNewTrade({ ...newTrade, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-[var(--accent-blue)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <textarea
                  value={newTrade.notes}
                  onChange={(e) => setNewTrade({ ...newTrade, notes: e.target.value })}
                  placeholder="Trade reasoning, setup, etc..."
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--accent-blue)] resize-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newTrade.tags}
                  onChange={(e) => setNewTrade({ ...newTrade, tags: e.target.value })}
                  placeholder="breakout, scalp, swing..."
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--accent-blue)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-gray-400 rounded text-sm hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTrade}
                  className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  Log Trade
                </button>
              </div>
            </div>
          )}

          {/* Trade List */}
          {displayTrades.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No trades logged yet</p>
              <p className="text-xs mt-1">Click "New Trade" to start tracking</p>
            </div>
          ) : (
            displayTrades.map((trade) => (
              <TradeCard
                key={trade.id}
                trade={trade}
                currentPrice={trade.symbol === currentSymbol ? currentPrice : undefined}
                isEditing={editingId === trade.id}
                onEdit={() => setEditingId(trade.id)}
                onClose={(exitPrice) => handleCloseTrade(trade.id, exitPrice)}
                onDelete={() => handleDeleteTrade(trade.id)}
                onUpdateNotes={(notes) => handleUpdateNotes(trade.id, notes)}
                onCancelEdit={() => setEditingId(null)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Trade Card Component
interface TradeCardProps {
  trade: TradeEntry;
  currentPrice?: number;
  isEditing: boolean;
  onEdit: () => void;
  onClose: (exitPrice: number) => void;
  onDelete: () => void;
  onUpdateNotes: (notes: string) => void;
  onCancelEdit: () => void;
}

const TradeCard: React.FC<TradeCardProps> = ({
  trade,
  currentPrice,
  isEditing,
  onEdit,
  onClose,
  onDelete,
  onUpdateNotes,
  onCancelEdit,
}) => {
  const [exitPrice, setExitPrice] = useState(currentPrice?.toString() || '');
  const [notes, setNotes] = useState(trade.notes);

  // Calculate unrealized P&L for open trades
  const unrealizedPnL = useMemo(() => {
    if (trade.status === 'closed' || !currentPrice) return null;
    return calculatePnL({ ...trade, exitPrice: currentPrice });
  }, [trade, currentPrice]);

  return (
    <div className={`bg-[var(--bg-primary)] border rounded-lg p-3 ${
      trade.status === 'open' ? 'border-yellow-600/30' : 'border-[var(--border-color)]'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${trade.side === 'long' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
            {trade.side === 'long' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{trade.symbol}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                trade.status === 'open' 
                  ? 'bg-yellow-900/50 text-yellow-400' 
                  : 'bg-gray-700 text-gray-400'
              }`}>
                {trade.status}
              </span>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" />
              {new Date(trade.entryTime).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="text-right">
          {trade.status === 'closed' && trade.pnl !== undefined ? (
            <div className={`font-bold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
              <div className="text-xs opacity-75">
                ({trade.pnlPercent?.toFixed(2)}%)
              </div>
            </div>
          ) : unrealizedPnL ? (
            <div className={`font-bold ${unrealizedPnL.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {unrealizedPnL.pnl >= 0 ? '+' : ''}${unrealizedPnL.pnl.toFixed(2)}
              <div className="text-xs opacity-75">
                (unrealized)
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Entry:</span>
          <span className="text-white font-mono">${trade.entryPrice.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Qty:</span>
          <span className="text-white font-mono">{trade.quantity}</span>
        </div>
        {trade.exitPrice && (
          <div className="flex justify-between">
            <span className="text-gray-500">Exit:</span>
            <span className="text-white font-mono">${trade.exitPrice.toLocaleString()}</span>
          </div>
        )}
      </div>

      {trade.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {trade.tags.map((tag, i) => (
            <span key={i} className="text-xs px-1.5 py-0.5 bg-[var(--bg-secondary)] text-gray-400 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {trade.notes && !isEditing && (
        <div className="mt-2 text-xs text-gray-400 italic">
          "{trade.notes}"
        </div>
      )}

      {/* Actions */}
      {isEditing ? (
        <div className="mt-3 space-y-2">
          {trade.status === 'open' && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                placeholder="Exit price"
                className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-2 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-[var(--accent-blue)]"
              />
              <button
                onClick={() => exitPrice && onClose(parseFloat(exitPrice))}
                disabled={!exitPrice}
                className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Close Trade
              </button>
            </div>
          )}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[var(--accent-blue)] resize-none"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancelEdit}
              className="px-3 py-1 text-gray-400 hover:text-white text-xs"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onUpdateNotes(notes);
                onCancelEdit();
              }}
              className="px-3 py-1 bg-[var(--accent-blue)] text-white rounded text-xs font-medium hover:bg-blue-600"
            >
              Save Notes
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex justify-end gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-[var(--bg-secondary)] rounded transition-colors"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-[var(--bg-secondary)] rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default TradingJournalPanel;
