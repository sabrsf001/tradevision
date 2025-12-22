/**
 * Price Scale Trade Buttons
 * Buy/Sell buttons positioned near the price scale on the right
 */

import React from 'react';

interface PriceScaleTradeButtonsProps {
  currentPrice: number;
  bid: number;
  ask: number;
  onBuy: () => void;
  onSell: () => void;
  isPaperMode: boolean;
  hasPosition: boolean;
  positionSide?: 'long' | 'short';
  positionPnL?: number;
}

export const PriceScaleTradeButtons: React.FC<PriceScaleTradeButtonsProps> = ({
  currentPrice,
  bid,
  ask,
  onBuy,
  onSell,
  isPaperMode,
  hasPosition,
  positionSide,
  positionPnL,
}) => {
  return (
    <div className="absolute right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-end gap-1 pr-1">
      {/* Mode Badge */}
      <div className={`px-2 py-0.5 text-[9px] font-bold rounded mb-1 ${
        isPaperMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
      }`}>
        {isPaperMode ? 'PAPER' : 'LIVE'}
      </div>

      {/* Buy Button */}
      <button
        onClick={onBuy}
        className="group flex items-center gap-1 px-2 py-1.5 bg-green-600/90 hover:bg-green-500 text-white rounded-l-lg transition-all shadow-lg backdrop-blur-sm border-r-2 border-green-400"
      >
        <div className="text-right">
          <div className="text-[9px] opacity-70 leading-none">BUY</div>
          <div className="text-xs font-bold font-mono leading-tight">
            {ask.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <svg className="w-3 h-3 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Current Price */}
      <div className="px-2 py-1 bg-[var(--bg-secondary)]/90 backdrop-blur-sm rounded-l-lg border-r-2 border-[var(--accent-blue)]">
        <div className="text-xs font-bold text-white font-mono">
          ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Sell Button */}
      <button
        onClick={onSell}
        className="group flex items-center gap-1 px-2 py-1.5 bg-red-600/90 hover:bg-red-500 text-white rounded-l-lg transition-all shadow-lg backdrop-blur-sm border-r-2 border-red-400"
      >
        <div className="text-right">
          <div className="text-[9px] opacity-70 leading-none">SELL</div>
          <div className="text-xs font-bold font-mono leading-tight">
            {bid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <svg className="w-3 h-3 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Position PnL Display */}
      {hasPosition && positionPnL !== undefined && (
        <div className={`mt-1 px-2 py-1 rounded-l-lg text-xs font-mono font-bold ${
          positionPnL >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {positionSide === 'long' ? '▲' : '▼'} {positionPnL >= 0 ? '+' : ''}{positionPnL.toFixed(2)}
        </div>
      )}
    </div>
  );
};

export default PriceScaleTradeButtons;
