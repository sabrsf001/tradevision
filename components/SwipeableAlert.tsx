/**
 * Swipeable Alert Item
 * Swipe to delete functionality for mobile alerts
 */

import React, { useState, useRef, useCallback } from 'react';
import { Bell, Trash2, ChevronRight } from './Icons';

interface SwipeableAlertProps {
  id: string;
  symbol: string;
  price: number;
  condition: 'above' | 'below';
  currentPrice?: number;
  isActive: boolean;
  onDelete: (id: string) => void;
  onToggle?: (id: string) => void;
  onClick?: (id: string) => void;
}

export const SwipeableAlert: React.FC<SwipeableAlertProps> = ({
  id,
  symbol,
  price,
  condition,
  currentPrice,
  isActive,
  onDelete,
  onToggle,
  onClick,
}) => {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const deleteThreshold = 100;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Only allow left swipe (negative)
    if (diff < 0) {
      setOffset(Math.max(diff, -150));
    } else {
      setOffset(0);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    
    if (Math.abs(offset) >= deleteThreshold) {
      // Trigger delete with animation
      setOffset(-containerRef.current?.offsetWidth || -300);
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      setTimeout(() => {
        onDelete(id);
      }, 200);
    } else {
      // Spring back
      setOffset(0);
    }
  }, [offset, deleteThreshold, onDelete, id]);

  const isTriggered = currentPrice !== undefined && (
    (condition === 'above' && currentPrice >= price) ||
    (condition === 'below' && currentPrice <= price)
  );

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl mb-2"
    >
      {/* Delete background */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-end px-4 bg-[var(--accent-red)]">
        <Trash2 className="w-6 h-6 text-white" />
      </div>

      {/* Main content */}
      <div
        className={`relative bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 transition-transform ${
          isDragging ? '' : 'duration-200'
        }`}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => onClick?.(id)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isTriggered 
              ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]'
              : isActive 
                ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' 
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
          }`}>
            <Bell className={`w-5 h-5 ${isTriggered ? 'animate-pulse' : ''}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">{symbol}</span>
              {!isActive && (
                <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                  Paused
                </span>
              )}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">
              {condition === 'above' ? '↑' : '↓'} ${price.toLocaleString()}
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
        </div>

        {/* Swipe hint */}
        {Math.abs(offset) > 20 && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-secondary)]">
            {Math.abs(offset) >= deleteThreshold ? 'Release to delete' : 'Swipe to delete'}
          </div>
        )}
      </div>
    </div>
  );
};

export default SwipeableAlert;
