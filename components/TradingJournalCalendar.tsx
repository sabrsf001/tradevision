/**
 * Trading Journal Calendar
 * Calendar-based view of trading history with P&L per day
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Plus, TrendingUp, TrendingDown, Calendar, Edit2, Trash2 } from './Icons';

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
}

interface TradingJournalCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  currentPrice: number;
  onToast: (message: string, type: 'success' | 'alert' | 'info') => void;
  tradeHistory?: TradeEntry[]; // From actual trades
}

const JOURNAL_STORAGE_KEY = 'tv_trading_journal';

// Days of week
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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

// Get days in month
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

// Get first day of month (0 = Sunday, 1 = Monday, etc.)
const getFirstDayOfMonth = (year: number, month: number) => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Convert to Monday-first
};

// Format date key for grouping
const getDateKey = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
};

export const TradingJournalCalendar: React.FC<TradingJournalCalendarProps> = ({
  isOpen,
  onClose,
  currentSymbol,
  currentPrice,
  onToast,
  tradeHistory = [],
}) => {
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isAddingTrade, setIsAddingTrade] = useState(false);
  const [editingTrade, setEditingTrade] = useState<TradeEntry | null>(null);
  
  // New trade form
  const [newTrade, setNewTrade] = useState({
    symbol: currentSymbol,
    side: 'long' as 'long' | 'short',
    entryPrice: currentPrice,
    exitPrice: currentPrice,
    quantity: 1,
    notes: '',
    pnl: 0,
  });

  // Load trades on mount
  useEffect(() => {
    const localTrades = loadTrades();
    // Merge with trade history from actual trading
    const allTrades = [...localTrades, ...tradeHistory];
    // Remove duplicates based on id
    const uniqueTrades = allTrades.filter((trade, index, self) =>
      index === self.findIndex(t => t.id === trade.id)
    );
    setTrades(uniqueTrades);
  }, [tradeHistory]);

  // Update form when symbol/price changes
  useEffect(() => {
    setNewTrade(prev => ({
      ...prev,
      symbol: currentSymbol,
      entryPrice: currentPrice,
      exitPrice: currentPrice,
    }));
  }, [currentSymbol, currentPrice]);

  // Group trades by date
  const tradesByDate = useMemo(() => {
    const grouped: Record<string, { trades: TradeEntry[]; pnl: number }> = {};
    trades.forEach(trade => {
      const dateKey = getDateKey(trade.exitTime || trade.entryTime);
      if (!grouped[dateKey]) {
        grouped[dateKey] = { trades: [], pnl: 0 };
      }
      grouped[dateKey].trades.push(trade);
      grouped[dateKey].pnl += trade.pnl || 0;
    });
    return grouped;
  }, [trades]);

  // Monthly stats
  const monthStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    let totalPnl = 0;
    let winDays = 0;
    let lossDays = 0;
    let tradingDays = 0;
    
    Object.entries(tradesByDate).forEach(([dateKey, data]) => {
      const [y, m] = dateKey.split('-').map(Number);
      if (y === year && m - 1 === month) {
        totalPnl += data.pnl;
        tradingDays++;
        if (data.pnl > 0) winDays++;
        if (data.pnl < 0) lossDays++;
      }
    });
    
    return { totalPnl, winDays, lossDays, tradingDays };
  }, [tradesByDate, currentDate]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days: { day: number | null; dateKey: string; isToday: boolean }[] = [];
    
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, dateKey: '', isToday: false });
    }
    
    // Days of the month
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
      days.push({ day, dateKey, isToday });
    }
    
    return days;
  }, [currentDate]);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

  const handleAddTrade = () => {
    if (!selectedDay) return;
    
    const [year, month, day] = selectedDay.split('-').map(Number);
    const tradeTime = new Date(year, month - 1, day, 12, 0, 0).getTime();
    
    const trade: TradeEntry = {
      id: generateId(),
      symbol: newTrade.symbol,
      side: newTrade.side,
      entryPrice: newTrade.entryPrice,
      exitPrice: newTrade.exitPrice,
      quantity: newTrade.quantity,
      entryTime: tradeTime,
      exitTime: tradeTime,
      status: 'closed',
      notes: newTrade.notes,
      tags: [],
      pnl: newTrade.pnl,
      pnlPercent: ((newTrade.exitPrice - newTrade.entryPrice) / newTrade.entryPrice) * 100 * (newTrade.side === 'long' ? 1 : -1),
    };
    
    const updatedTrades = [...trades, trade];
    setTrades(updatedTrades);
    saveTrades(updatedTrades.filter(t => !tradeHistory.find(h => h.id === t.id))); // Only save manual trades
    setIsAddingTrade(false);
    setNewTrade({
      symbol: currentSymbol,
      side: 'long',
      entryPrice: currentPrice,
      exitPrice: currentPrice,
      quantity: 1,
      notes: '',
      pnl: 0,
    });
    onToast('Trade added to journal', 'success');
  };

  const handleDeleteTrade = (tradeId: string) => {
    const updatedTrades = trades.filter(t => t.id !== tradeId);
    setTrades(updatedTrades);
    saveTrades(updatedTrades.filter(t => !tradeHistory.find(h => h.id === t.id)));
    onToast('Trade removed', 'info');
  };

  const selectedDayData = selectedDay ? tradesByDate[selectedDay] : null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#0d0d0d] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-[#111]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--accent-blue)]/10 rounded-lg">
              <Calendar className="w-5 h-5 text-[var(--accent-blue)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Trading Journal</h2>
              <p className="text-xs text-gray-500">Track your trading history</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Month Navigation + Stats */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
            <h3 className="text-lg font-medium text-white min-w-[180px] text-center">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={handleToday}
              className="ml-2 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-gray-300"
            >
              Today
            </button>
          </div>
          
          {/* Monthly Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Month P&L:</span>
              <span className={`font-semibold ${monthStats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {monthStats.totalPnl >= 0 ? '+' : ''}{monthStats.totalPnl.toFixed(2)} $
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Win/Loss Days:</span>
              <span className="text-green-400 font-medium">{monthStats.winDays}</span>
              <span className="text-gray-600">/</span>
              <span className="text-red-400 font-medium">{monthStats.lossDays}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Calendar Grid */}
          <div className="flex-1 p-4 overflow-auto">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((cell, idx) => {
                if (cell.day === null) {
                  return <div key={idx} className="aspect-square" />;
                }
                
                const dayData = tradesByDate[cell.dateKey];
                const hasTrades = !!dayData;
                const pnl = dayData?.pnl || 0;
                
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(cell.dateKey)}
                    className={`aspect-square p-1 rounded-lg border transition-all ${
                      selectedDay === cell.dateKey
                        ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/10'
                        : cell.isToday
                        ? 'border-[var(--accent-blue)]/50 bg-[var(--accent-blue)]/5'
                        : 'border-transparent hover:bg-white/5'
                    }`}
                  >
                    <div className="h-full flex flex-col">
                      <span className={`text-xs ${cell.isToday ? 'text-[var(--accent-blue)] font-bold' : 'text-gray-400'}`}>
                        {cell.day}
                      </span>
                      {hasTrades && (
                        <div className="flex-1 flex flex-col justify-center items-center">
                          <div className={`text-xs font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(0)}$
                          </div>
                          <div className="text-[9px] text-gray-500">
                            {dayData.trades.length} trade{dayData.trades.length > 1 ? 's' : ''}
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day Details Panel */}
          <div className="w-80 border-l border-[var(--border-color)] flex flex-col bg-[#0a0a0a]">
            {selectedDay ? (
              <>
                <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">
                      {new Date(selectedDay).toLocaleDateString('en-US', { 
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </h4>
                    {selectedDayData && (
                      <p className={`text-sm font-semibold ${selectedDayData.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedDayData.pnl >= 0 ? '+' : ''}{selectedDayData.pnl.toFixed(2)} $
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setIsAddingTrade(true)}
                    className="p-2 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/80 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {selectedDayData?.trades.length ? (
                    selectedDayData.trades.map(trade => (
                      <div
                        key={trade.id}
                        className="p-3 bg-[#111] border border-[var(--border-color)] rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              trade.side === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {trade.side.toUpperCase()}
                            </span>
                            <span className="text-sm font-medium text-white">{trade.symbol}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteTrade(trade.id)}
                            className="p-1 hover:bg-red-500/20 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3 text-gray-500 hover:text-red-400" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                          <div>
                            <span className="text-gray-500">Entry:</span>
                            <span className="ml-1 text-white">${trade.entryPrice.toFixed(2)}</span>
                          </div>
                          {trade.exitPrice && (
                            <div>
                              <span className="text-gray-500">Exit:</span>
                              <span className="ml-1 text-white">${trade.exitPrice.toFixed(2)}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500">Qty:</span>
                            <span className="ml-1 text-white">{trade.quantity}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">P&L:</span>
                            <span className={`ml-1 font-medium ${(trade.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {(trade.pnl || 0) >= 0 ? '+' : ''}{(trade.pnl || 0).toFixed(2)}$
                            </span>
                          </div>
                        </div>
                        
                        {trade.notes && (
                          <p className="text-xs text-gray-400 bg-black/30 p-2 rounded">
                            {trade.notes}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 text-sm py-8">
                      <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No trades on this day</p>
                      <button
                        onClick={() => setIsAddingTrade(true)}
                        className="mt-2 text-[var(--accent-blue)] hover:underline"
                      >
                        Add a trade
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                <div className="text-center">
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Select a day to view trades</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Trade Modal */}
        {isAddingTrade && selectedDay && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#111] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">Add Trade</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Symbol</label>
                    <input
                      type="text"
                      value={newTrade.symbol}
                      onChange={e => setNewTrade({ ...newTrade, symbol: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-[var(--border-color)] rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Side</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setNewTrade({ ...newTrade, side: 'long' })}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          newTrade.side === 'long'
                            ? 'bg-green-500 text-white'
                            : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        }`}
                      >
                        Long
                      </button>
                      <button
                        onClick={() => setNewTrade({ ...newTrade, side: 'short' })}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          newTrade.side === 'short'
                            ? 'bg-red-500 text-white'
                            : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        }`}
                      >
                        Short
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Entry Price</label>
                    <input
                      type="number"
                      value={newTrade.entryPrice}
                      onChange={e => setNewTrade({ ...newTrade, entryPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-black border border-[var(--border-color)] rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Exit Price</label>
                    <input
                      type="number"
                      value={newTrade.exitPrice}
                      onChange={e => setNewTrade({ ...newTrade, exitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-black border border-[var(--border-color)] rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={newTrade.quantity}
                      onChange={e => setNewTrade({ ...newTrade, quantity: parseFloat(e.target.value) || 1 })}
                      className="w-full px-3 py-2 bg-black border border-[var(--border-color)] rounded-lg text-white text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-500 mb-1">P&L ($)</label>
                  <input
                    type="number"
                    value={newTrade.pnl}
                    onChange={e => setNewTrade({ ...newTrade, pnl: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-black border border-[var(--border-color)] rounded-lg text-white text-sm"
                    placeholder="Enter P&L directly or leave for auto-calc"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Notes</label>
                  <textarea
                    value={newTrade.notes}
                    onChange={e => setNewTrade({ ...newTrade, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-black border border-[var(--border-color)] rounded-lg text-white text-sm resize-none"
                    placeholder="Trade notes, strategy, emotions..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsAddingTrade(false)}
                  className="flex-1 py-2 border border-[var(--border-color)] rounded-lg text-gray-400 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTrade}
                  className="flex-1 py-2 bg-[var(--accent-blue)] rounded-lg text-white font-medium hover:bg-[var(--accent-blue)]/80 transition-colors"
                >
                  Add Trade
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradingJournalCalendar;
