/**
 * Chart Position Overlay
 * Displays positions on chart with draggable SL/TP lines
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, GripHorizontal, Target, AlertTriangle } from './Icons';

export interface ChartPosition {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  entryTime: number;
}

interface ChartPositionOverlayProps {
  positions: ChartPosition[];
  currentPrice: number;
  priceRange: { min: number; max: number };
  chartHeight: number;
  onUpdatePosition: (id: string, updates: Partial<ChartPosition>) => void;
  onClosePosition: (id: string) => void;
  onAddStopLoss: (id: string) => void;
  onAddTakeProfit: (id: string) => void;
}

// Convert price to Y coordinate
const priceToY = (price: number, min: number, max: number, height: number): number => {
  const range = max - min;
  if (range === 0) return height / 2;
  return height - ((price - min) / range) * height;
};

// Convert Y coordinate to price
const yToPrice = (y: number, min: number, max: number, height: number): number => {
  const range = max - min;
  return min + ((height - y) / height) * range;
};

export const ChartPositionOverlay: React.FC<ChartPositionOverlayProps> = ({
  positions,
  currentPrice,
  priceRange,
  chartHeight,
  onUpdatePosition,
  onClosePosition,
  onAddStopLoss,
  onAddTakeProfit,
}) => {
  const [dragging, setDragging] = useState<{ positionId: string; type: 'sl' | 'tp' } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !overlayRef.current) return;
    
    const rect = overlayRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const newPrice = yToPrice(y, priceRange.min, priceRange.max, chartHeight);
    
    if (dragging.type === 'sl') {
      onUpdatePosition(dragging.positionId, { stopLoss: newPrice });
    } else {
      onUpdatePosition(dragging.positionId, { takeProfit: newPrice });
    }
  }, [dragging, priceRange, chartHeight, onUpdatePosition]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  if (positions.length === 0) return null;

  return (
    <div 
      ref={overlayRef}
      className="absolute inset-0 pointer-events-none z-30"
      style={{ height: chartHeight }}
    >
      {positions.map(position => {
        const entryY = priceToY(position.entryPrice, priceRange.min, priceRange.max, chartHeight);
        const slY = position.stopLoss ? priceToY(position.stopLoss, priceRange.min, priceRange.max, chartHeight) : null;
        const tpY = position.takeProfit ? priceToY(position.takeProfit, priceRange.min, priceRange.max, chartHeight) : null;
        
        const pnl = position.side === 'long'
          ? (currentPrice - position.entryPrice) * position.quantity
          : (position.entryPrice - currentPrice) * position.quantity;
        
        const isProfit = pnl >= 0;
        const isLong = position.side === 'long';

        return (
          <React.Fragment key={position.id}>
            {/* Entry Line */}
            <div
              className="absolute left-0 right-12 pointer-events-auto"
              style={{ top: entryY - 1 }}
            >
              <div className={`h-0.5 ${isLong ? 'bg-green-500' : 'bg-red-500'} opacity-80`} style={{ 
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, currentColor 4px, currentColor 8px)'
              }} />
              
              {/* Entry Label */}
              <div 
                className={`absolute left-2 -top-3 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                  isLong ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'
                }`}
              >
                <span>{isLong ? '▲ LONG' : '▼ SHORT'}</span>
                <span className="opacity-70">@ ${position.entryPrice.toFixed(2)}</span>
                <span className="ml-1">x{position.quantity}</span>
                <button 
                  onClick={() => onClosePosition(position.id)}
                  className="ml-1 p-0.5 hover:bg-white/20 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* PnL Display on the right */}
              <div 
                className={`absolute right-0 -top-3 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  isProfit ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {isProfit ? '+' : ''}{pnl.toFixed(2)} USD
              </div>
            </div>

            {/* Stop Loss Line */}
            {slY !== null ? (
              <div
                className="absolute left-0 right-12 pointer-events-auto cursor-ns-resize group"
                style={{ top: slY - 1 }}
                onMouseDown={() => setDragging({ positionId: position.id, type: 'sl' })}
              >
                <div className="h-0.5 bg-red-500/70 group-hover:bg-red-400" />
                <div className="absolute left-2 -top-3 px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>SL ${position.stopLoss?.toFixed(2)}</span>
                  <GripHorizontal className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                </div>
              </div>
            ) : (
              /* Add SL Button */
              <button
                onClick={() => onAddStopLoss(position.id)}
                className="absolute left-2 pointer-events-auto px-2 py-0.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] rounded border border-red-500/30 flex items-center gap-1"
                style={{ top: entryY + 20 }}
              >
                <AlertTriangle className="w-3 h-3" />
                + Add SL
              </button>
            )}

            {/* Take Profit Line */}
            {tpY !== null ? (
              <div
                className="absolute left-0 right-12 pointer-events-auto cursor-ns-resize group"
                style={{ top: tpY - 1 }}
                onMouseDown={() => setDragging({ positionId: position.id, type: 'tp' })}
              >
                <div className="h-0.5 bg-green-500/70 group-hover:bg-green-400" />
                <div className="absolute left-2 -top-3 px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-400 flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  <span>TP ${position.takeProfit?.toFixed(2)}</span>
                  <GripHorizontal className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                </div>
              </div>
            ) : (
              /* Add TP Button */
              <button
                onClick={() => onAddTakeProfit(position.id)}
                className="absolute left-2 pointer-events-auto px-2 py-0.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-[10px] rounded border border-green-500/30 flex items-center gap-1"
                style={{ top: entryY + (slY === null ? 40 : 20) }}
              >
                <Target className="w-3 h-3" />
                + Add TP
              </button>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ChartPositionOverlay;
