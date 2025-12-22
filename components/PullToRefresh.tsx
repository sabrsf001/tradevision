/**
 * Pull to Refresh Component
 * Mobile-friendly pull-down to refresh functionality
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw } from './Icons';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  pullThreshold?: number;
  maxPull?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  disabled = false,
  pullThreshold = 80,
  maxPull = 120,
}) => {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || refreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;

    startY.current = e.touches[0].clientY;
    setPulling(true);
  }, [disabled, refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling || disabled || refreshing) return;

    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      setPullDistance(0);
      return;
    }

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    if (diff > 0) {
      // Apply resistance
      const resistance = 0.5;
      const distance = Math.min(diff * resistance, maxPull);
      setPullDistance(distance);
    }
  }, [pulling, disabled, refreshing, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    setPulling(false);

    if (pullDistance >= pullThreshold && !refreshing) {
      setRefreshing(true);
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pulling, pullDistance, pullThreshold, refreshing, onRefresh]);

  const progress = Math.min(pullDistance / pullThreshold, 1);
  const rotation = progress * 180;
  const showIndicator = pullDistance > 10 || refreshing;

  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-auto overscroll-contain"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={`absolute left-0 right-0 flex justify-center transition-all duration-200 z-30 pointer-events-none ${
          showIndicator ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          top: refreshing ? 16 : Math.max(0, pullDistance - 40),
          transform: `translateY(${refreshing ? 0 : -20}px)`,
        }}
      >
        <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-[var(--bg-panel)] border border-[var(--border-color)] shadow-lg ${
          refreshing ? 'animate-pulse' : ''
        }`}>
          <RefreshCw
            className={`w-5 h-5 text-[var(--accent-primary)] transition-transform ${
              refreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: refreshing ? undefined : `rotate(${rotation}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content with pull offset */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: refreshing ? 'translateY(60px)' : `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
