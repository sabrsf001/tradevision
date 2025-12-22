/**
 * Floating Trade Panel
 * Buy/Sell buttons with real-time prices on the chart
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, X, Settings2, Link2 } from './Icons';

export interface TradePosition {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  entryTime: number;
  pnl?: number;
}

interface FloatingTradePanelProps {
  symbol: string;
  currentPrice: number;
  bid: number;
  ask: number;
  isAuthenticated: boolean;
  onOpenAdvanced: (side: 'buy' | 'sell') => void;
  onConnectExchange: () => void;
  onQuickTrade: (side: 'buy' | 'sell', quantity: number) => void;
  positions: TradePosition[];
  isPaperMode: boolean;
}

export const FloatingTradePanel: React.FC<FloatingTradePanelProps> = ({
  symbol,
  currentPrice,
  bid,
  ask,
  isAuthenticated,
  onOpenAdvanced,
  onConnectExchange,
  onQuickTrade,
  positions,
  isPaperMode,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [quickQty, setQuickQty] = useState('0.01');
  
  // Calculate spread
  const spread = ((ask - bid) / ask * 100).toFixed(3);
  
  // Current position for this symbol
  const currentPosition = positions.find(p => p.symbol === symbol);
  const positionPnL = currentPosition 
    ? (currentPosition.side === 'long' 
        ? (currentPrice - currentPosition.entryPrice) * currentPosition.quantity
        : (currentPosition.entryPrice - currentPrice) * currentPosition.quantity)
    : 0;

  const handleQuickBuy = () => {
    const qty = parseFloat(quickQty);
    if (qty > 0) {
      onQuickTrade('buy', qty);
    }
  };

  const handleQuickSell = () => {
    const qty = parseFloat(quickQty);
    if (qty > 0) {
      onQuickTrade('sell', qty);
    }
  };

  return (
    <div className="absolute bottom-4 right-4 z-50">
      {/* Main Panel */}
      <div className="bg-[var(--bg-secondary)]/95 backdrop-blur-md border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden min-w-[200px]">
        {/* Header with mode indicator */}
        <div className="px-3 py-2 border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${isPaperMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
              {isPaperMode ? 'PAPER' : 'LIVE'}
            </span>
            <span className="text-xs text-gray-400">{symbol}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onConnectExchange}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[var(--bg-primary)] rounded transition-colors"
              title={isAuthenticated ? "Connect Exchange" : "Login to connect"}
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[var(--bg-primary)] rounded transition-colors"
              title="Settings"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Price Display */}
        <div className="px-3 py-2 border-b border-[var(--border-color)]">
          <div className="text-center">
            <div className="text-lg font-bold text-white font-mono">
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-gray-500">Spread: {spread}%</div>
          </div>
        </div>

        {/* Expanded Settings */}
        {isExpanded && (
          <div className="px-3 py-2 border-b border-[var(--border-color)] space-y-2">
            <div>
              <label className="text-[10px] text-gray-500 uppercase">Quantity</label>
              <input
                type="number"
                value={quickQty}
                onChange={(e) => setQuickQty(e.target.value)}
                step="0.001"
                min="0.001"
                className="w-full mt-1 px-2 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-white text-sm font-mono focus:border-[var(--accent-blue)] focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              {['0.01', '0.1', '0.5', '1'].map(qty => (
                <button
                  key={qty}
                  onClick={() => setQuickQty(qty)}
                  className={`flex-1 py-1 text-[10px] rounded transition-colors ${quickQty === qty ? 'bg-[var(--accent-blue)] text-white' : 'bg-[var(--bg-primary)] text-gray-400 hover:text-white'}`}
                >
                  {qty}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Buy/Sell Buttons */}
        <div className="p-2 flex gap-2">
          <button
            onClick={handleQuickSell}
            onContextMenu={(e) => { e.preventDefault(); onOpenAdvanced('sell'); }}
            className="flex-1 py-3 bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white rounded-lg font-semibold transition-all active:scale-95 shadow-lg"
          >
            <div className="text-[10px] opacity-80">SELL</div>
            <div className="text-sm font-mono">${bid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </button>
          <button
            onClick={handleQuickBuy}
            onContextMenu={(e) => { e.preventDefault(); onOpenAdvanced('buy'); }}
            className="flex-1 py-3 bg-gradient-to-b from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white rounded-lg font-semibold transition-all active:scale-95 shadow-lg"
          >
            <div className="text-[10px] opacity-80">BUY</div>
            <div className="text-sm font-mono">${ask.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </button>
        </div>

        {/* Current Position */}
        {currentPosition && (
          <div className="px-3 py-2 border-t border-[var(--border-color)] bg-[var(--bg-primary)]/50">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${currentPosition.side === 'long' ? 'text-green-400' : 'text-red-400'}`}>
                {currentPosition.side.toUpperCase()} {currentPosition.quantity}
              </span>
              <span className={`font-mono font-bold ${positionPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {positionPnL >= 0 ? '+' : ''}{positionPnL.toFixed(2)} USD
              </span>
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
              Entry: ${currentPosition.entryPrice.toLocaleString()}
              {currentPosition.stopLoss && ` • SL: $${currentPosition.stopLoss.toLocaleString()}`}
              {currentPosition.takeProfit && ` • TP: $${currentPosition.takeProfit.toLocaleString()}`}
            </div>
          </div>
        )}

        {/* Hint */}
        <div className="px-3 py-1.5 text-center text-[9px] text-gray-600 border-t border-[var(--border-color)]">
          Right-click for advanced order
        </div>
      </div>
    </div>
  );
};

export default FloatingTradePanel;
