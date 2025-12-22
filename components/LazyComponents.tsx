/**
 * Lazy Loading Components
 * Code-splitting and dynamic imports for performance
 */

import React, { Suspense, lazy, ComponentType, useEffect, useState, useRef } from 'react';
import { ChartSkeleton, AIPanelSkeleton, WatchlistSkeleton } from './LoadingSkeleton';

// Generic lazy component creator with retry logic
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: React.ReactNode = <div className="animate-pulse bg-[var(--bg-panel)] rounded h-full" />
) {
  const LazyComponent = lazy(importFn);

  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Pre-defined lazy components with appropriate skeletons
export const LazyChart = createLazyComponent(
  () => import('./Chart'),
  <ChartSkeleton />
);

export const LazyAIPanel = createLazyComponent(
  () => import('./AIPanel'),
  <AIPanelSkeleton />
);

export const LazyWatchlist = createLazyComponent(
  () => import('./Watchlist'),
  <WatchlistSkeleton />
);

export const LazyBlackSwanPanel = createLazyComponent(
  () => import('./BlackSwanPanel'),
  <div className="animate-pulse bg-[var(--bg-panel)] rounded h-full" />
);

export const LazyBacktestingPanel = createLazyComponent(
  () => import('./BacktestingPanel'),
  <div className="animate-pulse bg-[var(--bg-panel)] rounded h-full p-4">
    <div className="h-8 bg-[var(--bg-secondary)] rounded mb-4" />
    <div className="h-32 bg-[var(--bg-secondary)] rounded" />
  </div>
);

export const LazyAlertsPanel = createLazyComponent(
  () => import('./AlertsPanel'),
  <div className="animate-pulse bg-[var(--bg-panel)] rounded h-full p-4">
    <div className="h-8 bg-[var(--bg-secondary)] rounded mb-4" />
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-16 bg-[var(--bg-secondary)] rounded" />
      ))}
    </div>
  </div>
);

// Preload component on idle
export function preloadOnIdle(importFn: () => Promise<any>) {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => {
      importFn().catch(() => {
        // Silently fail preloading
      });
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      importFn().catch(() => {});
    }, 200);
  }
}

// Preload critical components on app start
export function preloadCriticalComponents() {
  preloadOnIdle(() => import('./Chart'));
  preloadOnIdle(() => import('./Watchlist'));
}

// Lazy load component on scroll into view
interface LazyLoadOnViewProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
}

export const LazyLoadOnView: React.FC<LazyLoadOnViewProps> = ({
  children,
  fallback = <div className="h-32 animate-pulse bg-[var(--bg-panel)] rounded" />,
  rootMargin = '100px',
  threshold = 0.1,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return (
    <div ref={ref}>
      {isVisible ? children : fallback}
    </div>
  );
};

// Error boundary for lazy components
interface LoadingBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

interface LoadingBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class LoadingBoundary extends React.Component<LoadingBoundaryProps, LoadingBoundaryState> {
  constructor(props: LoadingBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<LoadingBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <p className="text-red-400 mb-2">Failed to load component</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-[var(--accent-blue)]/80"
            >
              Retry
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default {
  createLazyComponent,
  LazyChart,
  LazyAIPanel,
  LazyWatchlist,
  LazyBlackSwanPanel,
  LazyBacktestingPanel,
  LazyAlertsPanel,
  preloadOnIdle,
  preloadCriticalComponents,
  LazyLoadOnView,
  LoadingBoundary,
};
