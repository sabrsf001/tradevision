/**
 * Paper Trading Panel
 * Virtual trading with simulated balance and order execution
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, TrendingUp, TrendingDown, Plus, Trash2, DollarSign } from './Icons';

export interface PaperPosition {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  quantity: number;
  entryTime: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface PaperOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  price: number;
  quantity: number;
  status: 'pending' | 'filled' | 'cancelled';
  createdAt: number;
}

export interface PaperTradingState {
  balance: number;
  initialBalance: number;
  positions: PaperPosition[];
  orders: PaperOrder[];
  tradeHistory: {
    id: string;
    symbol: string;
    side: 'long' | 'short';
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    pnl: number;
    closedAt: number;
  }[];
}

interface PaperTradingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  currentPrice: number;
  onToast: (message: string, type: 'success' | 'alert' | 'info') => void;
}

const PAPER_TRADING_KEY = 'tv_paper_trading';
const DEFAULT_BALANCE = 10000;

// Generate unique ID
const generateId = () => `paper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Load state from localStorage
const loadState = (): PaperTradingState => {
  try {
    const saved = localStorage.getItem(PAPER_TRADING_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    balance: DEFAULT_BALANCE,
    initialBalance: DEFAULT_BALANCE,
    positions: [],
    orders: [],
    tradeHistory: [],
  };
};

// Save state to localStorage
const saveState = (state: PaperTradingState) => {
  localStorage.setItem(PAPER_TRADING_KEY, JSON.stringify(state));
};

export const PaperTradingPanel: React.FC<PaperTradingPanelProps> = ({
  isOpen,
  onClose,
  currentSymbol,
  currentPrice,
  onToast,
}) => {
  const [state, setState] = useState<PaperTradingState>(loadState);
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('0.01');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [activeTab, setActiveTab] = useState<'trade' | 'positions' | 'history'>('trade');

  // Save state on change
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Calculate unrealized P&L
  const unrealizedPnL = useMemo(() => {
    return state.positions.reduce((total, pos) => {
      if (pos.symbol !== currentSymbol) return total;
      const multiplier = pos.side === 'long' ? 1 : -1;
      const priceDiff = (currentPrice - pos.entryPrice) * multiplier;
      return total + priceDiff * pos.quantity;
    }, 0);
  }, [state.positions, currentPrice, currentSymbol]);

  // Calculate total P&L
  const totalPnL = useMemo(() => {
    const realizedPnL = state.tradeHistory.reduce((sum, t) => sum + t.pnl, 0);
    return realizedPnL + unrealizedPnL;
  }, [state.tradeHistory, unrealizedPnL]);

  // Current position for symbol
  const currentPosition = useMemo(() => {
    return state.positions.find((p) => p.symbol === currentSymbol);
  }, [state.positions, currentSymbol]);

  // Handle market order
  const handlePlaceOrder = useCallback(() => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      onToast('Invalid quantity', 'alert');
      return;
    }

    const price = orderType === 'limit' ? parseFloat(limitPrice) : currentPrice;
    if (orderType === 'limit' && (isNaN(price) || price <= 0)) {
      onToast('Invalid limit price', 'alert');
      return;
    }

    const orderCost = price * qty;
    if (orderSide === 'buy' && orderCost > state.balance) {
      onToast('Insufficient balance', 'alert');
      return;
    }

    if (orderType === 'market') {
      // Execute immediately
      const newPosition: PaperPosition = {
        id: generateId(),
        symbol: currentSymbol,
        side: orderSide === 'buy' ? 'long' : 'short',
        entryPrice: currentPrice,
        quantity: qty,
        entryTime: Date.now(),
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      };

      setState((prev) => ({
        ...prev,
        balance: orderSide === 'buy' ? prev.balance - orderCost : prev.balance,
        positions: [...prev.positions, newPosition],
      }));

      onToast(`${orderSide === 'buy' ? 'Long' : 'Short'} position opened at $${currentPrice.toFixed(2)}`, 'success');
    } else {
      // Add limit order
      const newOrder: PaperOrder = {
        id: generateId(),
        symbol: currentSymbol,
        side: orderSide,
        type: 'limit',
        price: price,
        quantity: qty,
        status: 'pending',
        createdAt: Date.now(),
      };

      setState((prev) => ({
        ...prev,
        orders: [...prev.orders, newOrder],
      }));

      onToast(`Limit order placed at $${price.toFixed(2)}`, 'success');
    }

    // Reset form
    setQuantity('0.01');
    setLimitPrice('');
    setStopLoss('');
    setTakeProfit('');
  }, [orderType, orderSide, quantity, limitPrice, currentPrice, currentSymbol, state.balance, stopLoss, takeProfit, onToast]);

  // Close position
  const handleClosePosition = useCallback((positionId: string) => {
    const position = state.positions.find((p) => p.id === positionId);
    if (!position) return;

    const multiplier = position.side === 'long' ? 1 : -1;
    const priceDiff = (currentPrice - position.entryPrice) * multiplier;
    const pnl = priceDiff * position.quantity;
    const returnAmount = position.entryPrice * position.quantity + pnl;

    const historyEntry = {
      id: generateId(),
      symbol: position.symbol,
      side: position.side,
      entryPrice: position.entryPrice,
      exitPrice: currentPrice,
      quantity: position.quantity,
      pnl,
      closedAt: Date.now(),
    };

    setState((prev) => ({
      ...prev,
      balance: prev.balance + returnAmount,
      positions: prev.positions.filter((p) => p.id !== positionId),
      tradeHistory: [...prev.tradeHistory, historyEntry],
    }));

    onToast(`Position closed with ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} P&L`, pnl >= 0 ? 'success' : 'alert');
  }, [state.positions, currentPrice, onToast]);

  // Cancel order
  const handleCancelOrder = useCallback((orderId: string) => {
    setState((prev) => ({
      ...prev,
      orders: prev.orders.filter((o) => o.id !== orderId),
    }));
    onToast('Order cancelled', 'info');
  }, [onToast]);

  // Reset account
  const handleResetAccount = useCallback(() => {
    setState({
      balance: DEFAULT_BALANCE,
      initialBalance: DEFAULT_BALANCE,
      positions: [],
      orders: [],
      tradeHistory: [],
    });
    onToast('Paper trading account reset', 'info');
  }, [onToast]);

  if (!isOpen) return null;

  const accountValue = state.balance + unrealizedPnL;
  const percentChange = ((accountValue - state.initialBalance) / state.initialBalance) * 100;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Paper Trading
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Simulated trading • No real money</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-primary)] rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Summary */}
        <div className="px-4 py-3 bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Account Value</p>
              <p className="text-xl font-bold text-white font-mono">
                ${accountValue.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Total P&L</p>
              <p className={`text-lg font-bold font-mono ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                <span className="text-xs ml-1">({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%)</span>
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs">
            <span className="text-gray-500">Available: <span className="text-white font-mono">${state.balance.toFixed(2)}</span></span>
            <span className="text-gray-500">Positions: <span className="text-white">{state.positions.length}</span></span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-color)]">
          {(['trade', 'positions', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'trade' && (
            <div className="space-y-4">
              {/* Symbol & Price */}
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-white">{currentSymbol}</span>
                <span className="text-lg font-mono text-white">${currentPrice.toFixed(2)}</span>
              </div>

              {/* Order Type */}
              <div className="flex gap-2">
                <button
                  onClick={() => setOrderType('market')}
                  className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                    orderType === 'market'
                      ? 'bg-[var(--accent-blue)] text-white'
                      : 'bg-[var(--bg-primary)] text-gray-400 hover:text-white'
                  }`}
                >
                  Market
                </button>
                <button
                  onClick={() => setOrderType('limit')}
                  className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                    orderType === 'limit'
                      ? 'bg-[var(--accent-blue)] text-white'
                      : 'bg-[var(--bg-primary)] text-gray-400 hover:text-white'
                  }`}
                >
                  Limit
                </button>
              </div>

              {/* Limit Price */}
              {orderType === 'limit' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Limit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder={currentPrice.toFixed(2)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-[var(--accent-blue)]"
                  />
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                <input
                  type="number"
                  step="0.001"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-[var(--accent-blue)]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cost: ${((parseFloat(quantity) || 0) * (orderType === 'limit' ? parseFloat(limitPrice) || currentPrice : currentPrice)).toFixed(2)}
                </p>
              </div>

              {/* Stop Loss / Take Profit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Stop Loss</label>
                  <input
                    type="number"
                    step="0.01"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-[var(--accent-blue)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Take Profit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-[var(--accent-blue)]"
                  />
                </div>
              </div>

              {/* Buy/Sell Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setOrderSide('buy'); handlePlaceOrder(); }}
                  className="py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  Buy / Long
                </button>
                <button
                  onClick={() => { setOrderSide('sell'); handlePlaceOrder(); }}
                  className="py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <TrendingDown className="w-4 h-4" />
                  Sell / Short
                </button>
              </div>

              {/* Current Position */}
              {currentPosition && (
                <div className="mt-4 p-3 bg-[var(--bg-primary)] rounded-lg border border-yellow-600/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Current Position</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${currentPosition.side === 'long' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                      {currentPosition.side.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <p className="text-white font-mono">{currentPosition.quantity} @ ${currentPosition.entryPrice.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => handleClosePosition(currentPosition.id)}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'positions' && (
            <div className="space-y-3">
              {state.positions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No open positions</p>
                </div>
              ) : (
                state.positions.map((pos) => {
                  const multiplier = pos.side === 'long' ? 1 : -1;
                  const priceDiff = (currentPrice - pos.entryPrice) * multiplier;
                  const pnl = priceDiff * pos.quantity;
                  const pnlPercent = (priceDiff / pos.entryPrice) * 100;

                  return (
                    <div key={pos.id} className="bg-[var(--bg-primary)] rounded-lg p-3 border border-[var(--border-color)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${pos.side === 'long' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                            {pos.side.toUpperCase()}
                          </span>
                          <span className="font-bold text-white">{pos.symbol}</span>
                        </div>
                        <span className={`font-bold font-mono ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-gray-500">
                          {pos.quantity} @ ${pos.entryPrice.toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleClosePosition(pos.id)}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Pending Orders */}
              {state.orders.filter((o) => o.status === 'pending').length > 0 && (
                <>
                  <h3 className="text-sm font-medium text-gray-400 mt-4">Pending Orders</h3>
                  {state.orders
                    .filter((o) => o.status === 'pending')
                    .map((order) => (
                      <div key={order.id} className="bg-[var(--bg-primary)] rounded-lg p-3 border border-[var(--border-color)]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${order.side === 'buy' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                              {order.side.toUpperCase()}
                            </span>
                            <span className="font-bold text-white">{order.symbol}</span>
                          </div>
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="p-1 text-gray-500 hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Limit @ ${order.price.toFixed(2)} • Qty: {order.quantity}
                        </p>
                      </div>
                    ))}
                </>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {state.tradeHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No trade history</p>
                </div>
              ) : (
                state.tradeHistory
                  .sort((a, b) => b.closedAt - a.closedAt)
                  .map((trade) => (
                    <div key={trade.id} className="bg-[var(--bg-primary)] rounded-lg p-3 border border-[var(--border-color)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${trade.side === 'long' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                            {trade.side.toUpperCase()}
                          </span>
                          <span className="font-bold text-white">{trade.symbol}</span>
                        </div>
                        <span className={`font-bold font-mono ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        ${trade.entryPrice.toFixed(2)} → ${trade.exitPrice.toFixed(2)} • Qty: {trade.quantity}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {new Date(trade.closedAt).toLocaleString()}
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-color)]">
          <button
            onClick={handleResetAccount}
            className="w-full py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] text-gray-400 hover:text-white rounded text-sm transition-colors"
          >
            Reset Account (${DEFAULT_BALANCE.toLocaleString()})
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaperTradingPanel;
