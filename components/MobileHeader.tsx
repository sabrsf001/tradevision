/**
 * Mobile Header
 * Simplified header for mobile devices with symbol info and quick actions
 */

import React from 'react';
import { ChevronDown, Star, Bell, Maximize2 } from './Icons';

interface MobileHeaderProps {
  symbol: string;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  onSymbolClick: () => void;
  onWatchlistClick?: () => void;
  onFullscreenClick?: () => void;
  isInWatchlist?: boolean;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  symbol,
  currentPrice,
  priceChange,
  priceChangePercent,
  onSymbolClick,
  onWatchlistClick,
  onFullscreenClick,
  isInWatchlist,
}) => {
  const isPositive = (priceChange ?? 0) >= 0;

  return (
    <header className="sm:hidden flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] safe-area-top">
      {/* Symbol & Price */}
      <button
        onClick={onSymbolClick}
        className="flex items-center gap-2 touch-active"
      >
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold text-white">{symbol}</span>
          <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
        </div>
      </button>

      {/* Price Info */}
      <div className="flex flex-col items-end">
        {currentPrice !== undefined && (
          <>
            <span className="text-base font-semibold text-white">
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {priceChangePercent !== undefined && (
              <span className={`text-xs font-medium ${isPositive ? 'text-[var(--accent-bullish)]' : 'text-[var(--accent-bearish)]'}`}>
                {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
              </span>
            )}
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-1">
        {onWatchlistClick && (
          <button
            onClick={onWatchlistClick}
            className={`p-2 rounded-lg transition-colors touch-active ${
              isInWatchlist ? 'text-neutral-400' : 'text-[var(--text-secondary)]'
            }`}
          >
            <Star className={`w-5 h-5 ${isInWatchlist ? 'fill-current' : ''}`} />
          </button>
        )}
        {onFullscreenClick && (
          <button
            onClick={onFullscreenClick}
            className="p-2 rounded-lg text-[var(--text-secondary)] transition-colors touch-active"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
};

export default MobileHeader;
