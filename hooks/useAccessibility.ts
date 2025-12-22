/**
 * Accessibility Hook for TradeVision
 * ARIA labels, focus management, screen reader support
 */

import { useEffect, useRef, useCallback } from 'react';

// ============================================
// Focus Management
// ============================================
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);
  
  return containerRef;
}

// ============================================
// Skip Links
// ============================================
export function useSkipLinks() {
  const skipToContent = useCallback(() => {
    const main = document.getElementById('main-content');
    if (main) {
      main.tabIndex = -1;
      main.focus();
      main.scrollIntoView();
    }
  }, []);
  
  const skipToChart = useCallback(() => {
    const chart = document.getElementById('chart-container');
    if (chart) {
      chart.tabIndex = -1;
      chart.focus();
    }
  }, []);
  
  const skipToWatchlist = useCallback(() => {
    const watchlist = document.getElementById('watchlist');
    if (watchlist) {
      watchlist.tabIndex = -1;
      watchlist.focus();
    }
  }, []);
  
  return { skipToContent, skipToChart, skipToWatchlist };
}

// ============================================
// Announce for Screen Readers
// ============================================
let announcer: HTMLDivElement | null = null;

function getAnnouncer(): HTMLDivElement {
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(announcer);
  }
  return announcer;
}

export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const el = getAnnouncer();
  el.setAttribute('aria-live', priority);
  el.textContent = '';
  
  // Small delay to ensure screen reader picks up the change
  requestAnimationFrame(() => {
    el.textContent = message;
  });
}

export function useAnnounce() {
  return useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announce(message, priority);
  }, []);
}

// ============================================
// Keyboard Navigation
// ============================================
export function useKeyboardNav<T extends HTMLElement>(
  items: T[],
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    loop?: boolean;
    onSelect?: (item: T) => void;
  } = {}
) {
  const { orientation = 'vertical', loop = true, onSelect } = options;
  
  const handleKeyDown = useCallback(
    (e: KeyboardEvent, currentIndex: number) => {
      const isVertical = orientation === 'vertical' || orientation === 'both';
      const isHorizontal = orientation === 'horizontal' || orientation === 'both';
      
      let nextIndex = currentIndex;
      
      if ((e.key === 'ArrowDown' && isVertical) || (e.key === 'ArrowRight' && isHorizontal)) {
        e.preventDefault();
        nextIndex = currentIndex + 1;
        if (nextIndex >= items.length) {
          nextIndex = loop ? 0 : items.length - 1;
        }
      } else if ((e.key === 'ArrowUp' && isVertical) || (e.key === 'ArrowLeft' && isHorizontal)) {
        e.preventDefault();
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
          nextIndex = loop ? items.length - 1 : 0;
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIndex = items.length - 1;
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect?.(items[currentIndex]);
        return;
      }
      
      items[nextIndex]?.focus();
    },
    [items, orientation, loop, onSelect]
  );
  
  return handleKeyDown;
}

// ============================================
// Reduced Motion
// ============================================
export function usePrefersReducedMotion(): boolean {
  const mediaQuery = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  
  const ref = useRef(mediaQuery?.matches ?? false);
  
  useEffect(() => {
    if (!mediaQuery) return;
    
    const handler = (e: MediaQueryListEvent) => {
      ref.current = e.matches;
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [mediaQuery]);
  
  return ref.current;
}

// ============================================
// High Contrast
// ============================================
export function usePrefersHighContrast(): boolean {
  const mediaQuery = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-contrast: more)')
    : null;
  
  const ref = useRef(mediaQuery?.matches ?? false);
  
  useEffect(() => {
    if (!mediaQuery) return;
    
    const handler = (e: MediaQueryListEvent) => {
      ref.current = e.matches;
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [mediaQuery]);
  
  return ref.current;
}

// ============================================
// ARIA Live Region for Price Updates
// ============================================
export function usePriceAnnouncer() {
  const lastPrice = useRef<number | null>(null);
  
  return useCallback((symbol: string, price: number, change: number) => {
    // Only announce significant changes (> 0.1%)
    if (lastPrice.current !== null) {
      const changePercent = Math.abs((price - lastPrice.current) / lastPrice.current) * 100;
      if (changePercent < 0.1) return;
    }
    
    lastPrice.current = price;
    
    const direction = change >= 0 ? 'up' : 'down';
    const changeStr = Math.abs(change).toFixed(2);
    
    announce(
      `${symbol} price ${direction} ${changeStr} percent, now at ${price.toLocaleString()} dollars`,
      'polite'
    );
  }, []);
}

// ============================================
// Chart Accessibility Description
// ============================================
export function generateChartDescription(params: {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  high: number;
  low: number;
  change: number;
  candleCount: number;
}): string {
  const { symbol, timeframe, currentPrice, high, low, change, candleCount } = params;
  const trend = change >= 0 ? 'uptrend' : 'downtrend';
  const changeStr = Math.abs(change).toFixed(2);
  
  return `${symbol} ${timeframe} chart showing ${candleCount} candles. ` +
    `Current price ${currentPrice.toLocaleString()}, ` +
    `high ${high.toLocaleString()}, low ${low.toLocaleString()}. ` +
    `${change >= 0 ? 'Up' : 'Down'} ${changeStr} percent, overall ${trend}.`;
}
