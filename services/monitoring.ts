/**
 * Performance Monitoring Service - TradeVision
 * Error tracking, analytics, and web vitals monitoring
 */

// ============================================
// Types
// ============================================

export interface ErrorEvent {
  id: string;
  timestamp: number;
  
  // Error details
  type: 'error' | 'unhandledRejection' | 'networkError' | 'apiError';
  message: string;
  stack?: string;
  componentStack?: string;
  
  // Context
  url: string;
  userAgent: string;
  userId?: string;
  
  // Tags
  tags: Record<string, string>;
  
  // Extra data
  extra?: Record<string, any>;
  
  // Breadcrumbs (recent actions before error)
  breadcrumbs: Breadcrumb[];
  
  // Status
  resolved: boolean;
  count: number; // Occurrences of same error
}

export interface Breadcrumb {
  timestamp: number;
  type: 'navigation' | 'click' | 'api' | 'console' | 'custom';
  category: string;
  message: string;
  data?: Record<string, any>;
  level: 'info' | 'warning' | 'error';
}

export interface AnalyticsEvent {
  id: string;
  timestamp: number;
  name: string;
  properties: Record<string, any>;
  userId?: string;
  sessionId: string;
}

export interface WebVitalsMetric {
  name: 'FCP' | 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface PerformanceSnapshot {
  timestamp: number;
  
  // Memory
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  
  // Timing
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  
  // Resources
  resourceCount: number;
  resourceSize: number;
  
  // Network
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export interface UserSession {
  id: string;
  startTime: number;
  endTime?: number;
  
  // User info
  userId?: string;
  userAgent: string;
  language: string;
  timezone: string;
  
  // Device info
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  isMobile: boolean;
  
  // Pages viewed
  pageViews: { url: string; timestamp: number; duration?: number }[];
  
  // Events count
  eventsCount: number;
  errorsCount: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  
  // Error tracking
  captureErrors: boolean;
  captureUnhandledRejections: boolean;
  maxBreadcrumbs: number;
  
  // Analytics
  trackPageViews: boolean;
  trackClicks: boolean;
  trackFormSubmits: boolean;
  
  // Performance
  trackWebVitals: boolean;
  trackMemory: boolean;
  trackNetwork: boolean;
  
  // Privacy
  maskInputs: boolean;
  blockUrls: string[];
  
  // Sampling
  sampleRate: number; // 0-1
}

// ============================================
// Constants
// ============================================

const ERRORS_KEY = 'tv_errors';
const EVENTS_KEY = 'tv_analytics_events';
const VITALS_KEY = 'tv_web_vitals';
const SESSION_KEY = 'tv_current_session';
const MAX_ERRORS = 100;
const MAX_EVENTS = 500;
const MAX_BREADCRUMBS = 50;

// Web Vitals thresholds
const VITALS_THRESHOLDS = {
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
};

// ============================================
// Error Tracker
// ============================================

export class ErrorTracker {
  private errors: ErrorEvent[] = [];
  private breadcrumbs: Breadcrumb[] = [];
  private config: MonitoringConfig;
  private initialized = false;
  
  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      enabled: true,
      captureErrors: true,
      captureUnhandledRejections: true,
      maxBreadcrumbs: MAX_BREADCRUMBS,
      trackPageViews: true,
      trackClicks: true,
      trackFormSubmits: true,
      trackWebVitals: true,
      trackMemory: false,
      trackNetwork: true,
      maskInputs: true,
      blockUrls: [],
      sampleRate: 1,
      ...config,
    };
    
    this.loadErrors();
  }
  
  /**
   * Initialize error tracking
   */
  init(): void {
    if (this.initialized || !this.config.enabled) return;
    
    // Global error handler
    if (this.config.captureErrors) {
      window.addEventListener('error', this.handleError.bind(this));
    }
    
    // Unhandled promise rejections
    if (this.config.captureUnhandledRejections) {
      window.addEventListener('unhandledrejection', this.handleRejection.bind(this));
    }
    
    // Intercept console.error
    this.interceptConsole();
    
    // Track navigation
    if (this.config.trackPageViews) {
      this.trackNavigation();
    }
    
    // Track clicks
    if (this.config.trackClicks) {
      document.addEventListener('click', this.handleClick.bind(this), true);
    }
    
    this.initialized = true;
    console.log('Error tracking initialized');
  }
  
  private handleError(event: ErrorEvent): void {
    const error = this.createErrorEvent({
      type: 'error',
      message: event.message || 'Unknown error',
      stack: (event as any).error?.stack,
    });
    
    this.addError(error);
  }
  
  private handleRejection(event: PromiseRejectionEvent): void {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    
    const error = this.createErrorEvent({
      type: 'unhandledRejection',
      message,
      stack,
    });
    
    this.addError(error);
  }
  
  private createErrorEvent(data: Partial<ErrorEvent>): ErrorEvent {
    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: data.type || 'error',
      message: data.message || 'Unknown error',
      stack: data.stack,
      componentStack: data.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      tags: data.tags || {},
      extra: data.extra,
      breadcrumbs: [...this.breadcrumbs],
      resolved: false,
      count: 1,
    };
  }
  
  /**
   * Manually capture an error
   */
  captureError(error: Error | string, extra?: Record<string, any>): void {
    const isError = error instanceof Error;
    
    const event = this.createErrorEvent({
      type: 'error',
      message: isError ? error.message : error,
      stack: isError ? error.stack : undefined,
      extra,
    });
    
    this.addError(event);
  }
  
  /**
   * Capture an API error
   */
  captureApiError(url: string, status: number, message: string): void {
    const error = this.createErrorEvent({
      type: 'apiError',
      message: `API Error: ${status} - ${message}`,
      extra: { url, status },
    });
    
    this.addError(error);
  }
  
  private addError(error: ErrorEvent): void {
    // Check for duplicate
    const existing = this.errors.find(e => 
      e.message === error.message && 
      e.stack === error.stack &&
      Date.now() - e.timestamp < 60000 // Within 1 minute
    );
    
    if (existing) {
      existing.count++;
      existing.timestamp = Date.now();
    } else {
      this.errors.unshift(error);
      
      // Limit stored errors
      if (this.errors.length > MAX_ERRORS) {
        this.errors = this.errors.slice(0, MAX_ERRORS);
      }
    }
    
    this.saveErrors();
    
    // In production, send to error tracking service
    // this.sendToService(error);
  }
  
  /**
   * Add a breadcrumb
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: Date.now(),
    });
    
    // Limit breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }
  
  private interceptConsole(): void {
    const originalError = console.error;
    
    console.error = (...args: any[]) => {
      this.addBreadcrumb({
        type: 'console',
        category: 'console.error',
        message: args.map(a => String(a)).join(' '),
        level: 'error',
      });
      
      originalError.apply(console, args);
    };
  }
  
  private trackNavigation(): void {
    // Track initial page view
    this.addBreadcrumb({
      type: 'navigation',
      category: 'navigation',
      message: window.location.pathname,
      level: 'info',
    });
    
    // Track history changes
    const originalPushState = history.pushState;
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.addBreadcrumb({
        type: 'navigation',
        category: 'navigation',
        message: window.location.pathname,
        level: 'info',
      });
    };
    
    window.addEventListener('popstate', () => {
      this.addBreadcrumb({
        type: 'navigation',
        category: 'navigation',
        message: window.location.pathname,
        level: 'info',
      });
    });
  }
  
  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const id = target.id ? `#${target.id}` : '';
    const className = target.className ? `.${target.className.split(' ').join('.')}` : '';
    const text = target.textContent?.slice(0, 50) || '';
    
    this.addBreadcrumb({
      type: 'click',
      category: 'ui.click',
      message: `${tagName}${id}${className} - "${text}"`,
      level: 'info',
    });
  }
  
  /**
   * Get all errors
   */
  getErrors(): ErrorEvent[] {
    return [...this.errors];
  }
  
  /**
   * Mark error as resolved
   */
  resolveError(id: string): void {
    const error = this.errors.find(e => e.id === id);
    if (error) {
      error.resolved = true;
      this.saveErrors();
    }
  }
  
  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors = [];
    this.saveErrors();
  }
  
  private loadErrors(): void {
    try {
      const data = localStorage.getItem(ERRORS_KEY);
      if (data) this.errors = JSON.parse(data);
    } catch (error) {
      console.warn('Failed to load errors:', error);
    }
  }
  
  private saveErrors(): void {
    localStorage.setItem(ERRORS_KEY, JSON.stringify(this.errors));
  }
}

// ============================================
// Analytics Tracker
// ============================================

export class AnalyticsTracker {
  private events: AnalyticsEvent[] = [];
  private session: UserSession | null = null;
  private sessionId: string;
  private config: MonitoringConfig;
  
  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      enabled: true,
      captureErrors: true,
      captureUnhandledRejections: true,
      maxBreadcrumbs: MAX_BREADCRUMBS,
      trackPageViews: true,
      trackClicks: false,
      trackFormSubmits: true,
      trackWebVitals: true,
      trackMemory: false,
      trackNetwork: true,
      maskInputs: true,
      blockUrls: [],
      sampleRate: 1,
      ...config,
    };
    
    this.sessionId = this.getOrCreateSessionId();
    this.loadData();
    this.startSession();
  }
  
  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('tv_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('tv_session_id', sessionId);
    }
    return sessionId;
  }
  
  private startSession(): void {
    this.session = {
      id: this.sessionId,
      startTime: Date.now(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio,
      isMobile: /Mobile|Android|iPhone/i.test(navigator.userAgent),
      pageViews: [],
      eventsCount: 0,
      errorsCount: 0,
    };
    
    // Track initial page view
    this.trackPageView();
    
    // Save session on unload
    window.addEventListener('beforeunload', () => {
      if (this.session) {
        this.session.endTime = Date.now();
        localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
      }
    });
  }
  
  /**
   * Track an event
   */
  track(name: string, properties: Record<string, any> = {}): void {
    if (!this.config.enabled) return;
    
    // Sample rate
    if (Math.random() > this.config.sampleRate) return;
    
    const event: AnalyticsEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      name,
      properties,
      sessionId: this.sessionId,
    };
    
    this.events.push(event);
    
    if (this.session) {
      this.session.eventsCount++;
    }
    
    // Limit events
    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-MAX_EVENTS);
    }
    
    this.saveEvents();
    
    // In production, send to analytics service
    // this.sendToService(event);
  }
  
  /**
   * Track page view
   */
  trackPageView(url?: string): void {
    const pageUrl = url || window.location.pathname;
    
    if (this.session) {
      // Update duration of previous page
      const lastPage = this.session.pageViews[this.session.pageViews.length - 1];
      if (lastPage && !lastPage.duration) {
        lastPage.duration = Date.now() - lastPage.timestamp;
      }
      
      this.session.pageViews.push({
        url: pageUrl,
        timestamp: Date.now(),
      });
    }
    
    this.track('Page View', { url: pageUrl });
  }
  
  /**
   * Identify user
   */
  identify(userId: string, traits?: Record<string, any>): void {
    if (this.session) {
      this.session.userId = userId;
    }
    
    this.track('Identify', { userId, ...traits });
  }
  
  /**
   * Track trade event
   */
  trackTrade(type: 'buy' | 'sell', symbol: string, amount: number, price: number): void {
    this.track('Trade', { type, symbol, amount, price, total: amount * price });
  }
  
  /**
   * Track feature usage
   */
  trackFeature(feature: string, action: string, metadata?: Record<string, any>): void {
    this.track('Feature Used', { feature, action, ...metadata });
  }
  
  /**
   * Get event counts by name
   */
  getEventCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    
    for (const event of this.events) {
      counts.set(event.name, (counts.get(event.name) || 0) + 1);
    }
    
    return counts;
  }
  
  /**
   * Get session info
   */
  getSession(): UserSession | null {
    return this.session;
  }
  
  private loadData(): void {
    try {
      const events = localStorage.getItem(EVENTS_KEY);
      if (events) this.events = JSON.parse(events);
    } catch (error) {
      console.warn('Failed to load analytics:', error);
    }
  }
  
  private saveEvents(): void {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(this.events));
  }
}

// ============================================
// Web Vitals Monitor
// ============================================

export class WebVitalsMonitor {
  private metrics: WebVitalsMetric[] = [];
  
  constructor() {
    this.loadMetrics();
  }
  
  /**
   * Initialize web vitals monitoring
   */
  init(): void {
    // First Contentful Paint
    this.observePaint('first-contentful-paint', 'FCP');
    
    // Largest Contentful Paint
    this.observeLCP();
    
    // First Input Delay
    this.observeFID();
    
    // Cumulative Layout Shift
    this.observeCLS();
    
    // Time to First Byte
    this.observeTTFB();
  }
  
  private observePaint(name: string, metric: WebVitalsMetric['name']): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === name) {
          this.recordMetric(metric, entry.startTime);
        }
      }
    });
    
    try {
      observer.observe({ type: 'paint', buffered: true });
    } catch (e) {
      console.warn('Paint observer not supported');
    }
  }
  
  private observeLCP(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        this.recordMetric('LCP', lastEntry.startTime);
      }
    });
    
    try {
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      console.warn('LCP observer not supported');
    }
  }
  
  private observeFID(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceEventTiming[]) {
        this.recordMetric('FID', entry.processingStart - entry.startTime);
      }
    });
    
    try {
      observer.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      console.warn('FID observer not supported');
    }
  }
  
  private observeCLS(): void {
    let clsValue = 0;
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.recordMetric('CLS', clsValue);
    });
    
    try {
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.warn('CLS observer not supported');
    }
  }
  
  private observeTTFB(): void {
    const [navigationEntry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    
    if (navigationEntry) {
      const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
      this.recordMetric('TTFB', ttfb);
    }
  }
  
  private recordMetric(name: WebVitalsMetric['name'], value: number): void {
    const thresholds = VITALS_THRESHOLDS[name];
    let rating: WebVitalsMetric['rating'] = 'good';
    
    if (value > thresholds.poor) {
      rating = 'poor';
    } else if (value > thresholds.good) {
      rating = 'needs-improvement';
    }
    
    const metric: WebVitalsMetric = {
      name,
      value,
      rating,
      timestamp: Date.now(),
    };
    
    // Update or add metric
    const existingIndex = this.metrics.findIndex(m => m.name === name);
    if (existingIndex !== -1) {
      this.metrics[existingIndex] = metric;
    } else {
      this.metrics.push(metric);
    }
    
    this.saveMetrics();
  }
  
  /**
   * Get all metrics
   */
  getMetrics(): WebVitalsMetric[] {
    return [...this.metrics];
  }
  
  /**
   * Get overall performance score (0-100)
   */
  getPerformanceScore(): number {
    if (this.metrics.length === 0) return 100;
    
    let score = 0;
    let count = 0;
    
    for (const metric of this.metrics) {
      const weights: Record<string, number> = {
        LCP: 25,
        FID: 25,
        CLS: 25,
        FCP: 15,
        TTFB: 10,
      };
      
      const weight = weights[metric.name] || 10;
      
      if (metric.rating === 'good') {
        score += weight;
      } else if (metric.rating === 'needs-improvement') {
        score += weight * 0.5;
      }
      // Poor = 0
      
      count++;
    }
    
    return Math.round(score);
  }
  
  /**
   * Get performance snapshot
   */
  getSnapshot(): PerformanceSnapshot {
    const [navEntry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    const memory = (performance as any).memory;
    const connection = (navigator as any).connection;
    
    return {
      timestamp: Date.now(),
      usedJSHeapSize: memory?.usedJSHeapSize,
      totalJSHeapSize: memory?.totalJSHeapSize,
      navigationStart: navEntry?.startTime || 0,
      domContentLoaded: navEntry?.domContentLoadedEventEnd || 0,
      loadComplete: navEntry?.loadEventEnd || 0,
      resourceCount: resources.length,
      resourceSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
    };
  }
  
  private loadMetrics(): void {
    try {
      const data = localStorage.getItem(VITALS_KEY);
      if (data) this.metrics = JSON.parse(data);
    } catch (error) {
      console.warn('Failed to load web vitals:', error);
    }
  }
  
  private saveMetrics(): void {
    localStorage.setItem(VITALS_KEY, JSON.stringify(this.metrics));
  }
}

// ============================================
// Unified Monitoring Service
// ============================================

export class MonitoringService {
  public errors: ErrorTracker;
  public analytics: AnalyticsTracker;
  public vitals: WebVitalsMonitor;
  
  constructor(config: Partial<MonitoringConfig> = {}) {
    this.errors = new ErrorTracker(config);
    this.analytics = new AnalyticsTracker(config);
    this.vitals = new WebVitalsMonitor();
  }
  
  /**
   * Initialize all monitoring
   */
  init(): void {
    this.errors.init();
    this.vitals.init();
    
    console.log('Monitoring service initialized');
  }
  
  /**
   * Get overall health report
   */
  getHealthReport(): {
    errors: { total: number; unresolved: number };
    performance: { score: number; metrics: WebVitalsMetric[] };
    session: { events: number; duration: number };
  } {
    const errors = this.errors.getErrors();
    const session = this.analytics.getSession();
    
    return {
      errors: {
        total: errors.length,
        unresolved: errors.filter(e => !e.resolved).length,
      },
      performance: {
        score: this.vitals.getPerformanceScore(),
        metrics: this.vitals.getMetrics(),
      },
      session: {
        events: session?.eventsCount || 0,
        duration: session ? Date.now() - session.startTime : 0,
      },
    };
  }
  
  /**
   * Export all monitoring data
   */
  exportData(): string {
    return JSON.stringify({
      errors: this.errors.getErrors(),
      metrics: this.vitals.getMetrics(),
      session: this.analytics.getSession(),
      snapshot: this.vitals.getSnapshot(),
      exportedAt: Date.now(),
    }, null, 2);
  }
}

// ============================================
// Singleton Instance
// ============================================

export const monitoring = new MonitoringService();

export default monitoring;
