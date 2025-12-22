/**
 * Web Vitals Monitoring
 * Core Web Vitals: LCP, INP, CLS, FCP, TTFB
 */

import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';

export interface VitalsReport {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

type VitalsCallback = (metric: VitalsReport) => void;

const vitalsThresholds = {
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  LCP: { good: 2500, poor: 4000 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = vitalsThresholds[name as keyof typeof vitalsThresholds];
  if (!thresholds) return 'good';
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

function createReport(metric: Metric): VitalsReport {
  return {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    delta: metric.delta,
    id: metric.id,
  };
}

/**
 * Initialize Web Vitals monitoring
 * @param onReport - Callback function for each metric
 * @param options - Configuration options
 */
export function initWebVitals(
  onReport?: VitalsCallback,
  options: { reportToConsole?: boolean; reportToAnalytics?: boolean } = {}
): void {
  const { reportToConsole = false, reportToAnalytics = false } = options;

  const handleMetric = (metric: Metric) => {
    const report = createReport(metric);

    if (reportToConsole) {
      const color = {
        good: '#22c55e',
        'needs-improvement': '#f59e0b',
        poor: '#ef4444',
      }[report.rating];
      
      console.log(
        `%c[Web Vitals] ${report.name}: ${report.value.toFixed(2)} (${report.rating})`,
        `color: ${color}; font-weight: bold;`
      );
    }

    if (reportToAnalytics && typeof window !== 'undefined') {
      // Send to analytics endpoint
      sendToAnalytics(report);
    }

    onReport?.(report);
  };

  onCLS(handleMetric);
  onINP(handleMetric);
  onLCP(handleMetric);
  onFCP(handleMetric);
  onTTFB(handleMetric);
}

/**
 * Send vitals to analytics endpoint
 */
async function sendToAnalytics(report: VitalsReport): Promise<void> {
  // Check if we have an analytics endpoint configured
  const analyticsEndpoint = (import.meta as unknown as { env: Record<string, string> }).env.VITE_ANALYTICS_ENDPOINT;
  if (!analyticsEndpoint) return;

  try {
    // Use sendBeacon for non-blocking request
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(report)], { type: 'application/json' });
      navigator.sendBeacon(analyticsEndpoint, blob);
    } else {
      await fetch(analyticsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
        keepalive: true,
      });
    }
  } catch (error) {
    console.warn('Failed to send vitals to analytics:', error);
  }
}

/**
 * Get all collected vitals (requires custom storage)
 */
const collectedVitals: VitalsReport[] = [];

export function collectVitals(): void {
  initWebVitals((report) => {
    collectedVitals.push(report);
  });
}

export function getCollectedVitals(): VitalsReport[] {
  return [...collectedVitals];
}

/**
 * Performance Observer for custom metrics
 */
export function observePerformance(
  entryTypes: PerformanceEntryList['0']['entryType'][],
  callback: (entries: PerformanceEntryList) => void
): PerformanceObserver | null {
  if (typeof PerformanceObserver === 'undefined') return null;

  try {
    const observer = new PerformanceObserver((list) => {
      callback(list.getEntries());
    });
    
    observer.observe({ entryTypes });
    return observer;
  } catch (error) {
    console.warn('PerformanceObserver not supported:', error);
    return null;
  }
}

/**
 * Measure custom performance marks
 */
export function measurePerformance(
  name: string,
  startMark: string,
  endMark: string
): number | null {
  try {
    performance.measure(name, startMark, endMark);
    const measures = performance.getEntriesByName(name, 'measure');
    return measures.length > 0 ? measures[measures.length - 1].duration : null;
  } catch {
    return null;
  }
}

export function markPerformance(name: string): void {
  performance.mark(name);
}

// Aliases for backward compatibility
export const reportWebVitals = initWebVitals;
export const measureCustomMetric = measurePerformance;
