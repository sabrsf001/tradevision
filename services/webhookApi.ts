/**
 * Webhook & API System - TradeVision
 * Public REST API, webhook receivers, TradingView integration
 */

import type { CandleData } from '../types';

// ============================================
// Types
// ============================================

export interface WebhookConfig {
  id: string;
  name: string;
  description?: string;
  
  // Webhook details
  secretKey: string;
  endpoint: string; // Unique endpoint path
  
  // Authentication
  authType: 'none' | 'secret' | 'signature';
  
  // Actions
  actions: WebhookAction[];
  
  // Settings
  enabled: boolean;
  rateLimit: number; // requests per minute
  
  // Stats
  totalReceived: number;
  lastReceived?: number;
  errors: number;
  
  createdAt: number;
}

export interface WebhookAction {
  id: string;
  type: 'alert' | 'trade' | 'log' | 'forward';
  
  // Conditions (optional filtering)
  conditions?: WebhookCondition[];
  
  // Action-specific config
  config: {
    // For alert
    message?: string;
    sound?: boolean;
    channels?: ('push' | 'email' | 'telegram' | 'discord')[];
    
    // For trade
    symbol?: string;
    side?: 'buy' | 'sell';
    sizeType?: 'fixed' | 'percent' | 'from_signal';
    size?: number;
    
    // For forward
    forwardUrl?: string;
    headers?: Record<string, string>;
    
    // For log
    logLevel?: 'info' | 'warn' | 'error';
  };
}

export interface WebhookCondition {
  field: string; // JSON path in payload
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'exists';
  value: any;
}

export interface WebhookPayload {
  // Common TradingView fields
  ticker?: string;
  exchange?: string;
  close?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  time?: string;
  timenow?: number;
  
  // Alert info
  strategy?: {
    position_size?: number;
    order_action?: 'buy' | 'sell';
    order_contracts?: number;
    order_price?: number;
    order_id?: string;
    market_position?: 'long' | 'short' | 'flat';
    market_position_size?: number;
    prev_market_position?: string;
    prev_market_position_size?: number;
  };
  
  // Custom fields
  [key: string]: any;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  timestamp: number;
  payload: any;
  status: 'success' | 'error' | 'filtered';
  actions: { actionId: string; result: string }[];
  ip?: string;
  error?: string;
}

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  auth: boolean;
  rateLimit: number;
  handler: (params: any, body?: any) => Promise<any>;
}

export interface APIKey {
  id: string;
  name: string;
  key: string;
  secret: string;
  permissions: ('read' | 'trade' | 'withdraw')[];
  ipWhitelist?: string[];
  createdAt: number;
  lastUsed?: number;
  enabled: boolean;
}

// ============================================
// Storage Keys
// ============================================

const WEBHOOKS_KEY = 'tv_webhooks';
const WEBHOOK_LOGS_KEY = 'tv_webhook_logs';
const API_KEYS_KEY = 'tv_api_keys';
const MAX_LOGS = 100;

// ============================================
// Webhook Manager
// ============================================

export class WebhookManager {
  private webhooks: WebhookConfig[] = [];
  private logs: WebhookLog[] = [];
  private rateLimitMap: Map<string, { count: number; resetAt: number }> = new Map();
  
  constructor() {
    this.loadData();
  }
  
  // ============================================
  // Webhook CRUD
  // ============================================
  
  /**
   * Create a new webhook
   */
  createWebhook(config: Partial<WebhookConfig>): WebhookConfig {
    const webhook: WebhookConfig = {
      id: crypto.randomUUID(),
      name: config.name || 'New Webhook',
      description: config.description,
      secretKey: this.generateSecretKey(),
      endpoint: this.generateEndpoint(),
      authType: config.authType || 'secret',
      actions: config.actions || [],
      enabled: true,
      rateLimit: config.rateLimit || 60,
      totalReceived: 0,
      errors: 0,
      createdAt: Date.now(),
    };
    
    this.webhooks.push(webhook);
    this.saveData();
    
    return webhook;
  }
  
  /**
   * Get a webhook by ID
   */
  getWebhook(id: string): WebhookConfig | undefined {
    return this.webhooks.find(w => w.id === id);
  }
  
  /**
   * Get a webhook by endpoint
   */
  getWebhookByEndpoint(endpoint: string): WebhookConfig | undefined {
    return this.webhooks.find(w => w.endpoint === endpoint);
  }
  
  /**
   * Get all webhooks
   */
  getAllWebhooks(): WebhookConfig[] {
    return [...this.webhooks];
  }
  
  /**
   * Update a webhook
   */
  updateWebhook(id: string, updates: Partial<WebhookConfig>): WebhookConfig | null {
    const webhook = this.webhooks.find(w => w.id === id);
    if (!webhook) return null;
    
    Object.assign(webhook, updates);
    this.saveData();
    
    return webhook;
  }
  
  /**
   * Delete a webhook
   */
  deleteWebhook(id: string): boolean {
    const index = this.webhooks.findIndex(w => w.id === id);
    if (index === -1) return false;
    
    this.webhooks.splice(index, 1);
    this.saveData();
    
    return true;
  }
  
  /**
   * Add an action to a webhook
   */
  addAction(webhookId: string, action: Omit<WebhookAction, 'id'>): WebhookAction | null {
    const webhook = this.webhooks.find(w => w.id === webhookId);
    if (!webhook) return null;
    
    const newAction: WebhookAction = {
      ...action,
      id: crypto.randomUUID(),
    };
    
    webhook.actions.push(newAction);
    this.saveData();
    
    return newAction;
  }
  
  /**
   * Remove an action from a webhook
   */
  removeAction(webhookId: string, actionId: string): boolean {
    const webhook = this.webhooks.find(w => w.id === webhookId);
    if (!webhook) return false;
    
    const index = webhook.actions.findIndex(a => a.id === actionId);
    if (index === -1) return false;
    
    webhook.actions.splice(index, 1);
    this.saveData();
    
    return true;
  }
  
  // ============================================
  // Webhook Processing
  // ============================================
  
  /**
   * Process an incoming webhook
   */
  async processWebhook(
    endpoint: string,
    payload: WebhookPayload,
    headers: Record<string, string>
  ): Promise<{ success: boolean; message: string; actions?: string[] }> {
    const webhook = this.getWebhookByEndpoint(endpoint);
    
    if (!webhook) {
      return { success: false, message: 'Webhook not found' };
    }
    
    if (!webhook.enabled) {
      return { success: false, message: 'Webhook is disabled' };
    }
    
    // Rate limiting
    if (!this.checkRateLimit(webhook.id, webhook.rateLimit)) {
      this.logWebhook(webhook.id, payload, 'error', [], 'Rate limit exceeded');
      return { success: false, message: 'Rate limit exceeded' };
    }
    
    // Authentication
    if (!this.validateAuth(webhook, headers)) {
      this.logWebhook(webhook.id, payload, 'error', [], 'Authentication failed');
      return { success: false, message: 'Authentication failed' };
    }
    
    // Update stats
    webhook.totalReceived++;
    webhook.lastReceived = Date.now();
    
    // Process actions
    const actionResults: { actionId: string; result: string }[] = [];
    const executedActions: string[] = [];
    
    for (const action of webhook.actions) {
      // Check conditions
      if (action.conditions && !this.evaluateConditions(action.conditions, payload)) {
        continue;
      }
      
      try {
        const result = await this.executeAction(action, payload, webhook);
        actionResults.push({ actionId: action.id, result: 'success' });
        executedActions.push(action.type);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        actionResults.push({ actionId: action.id, result: errorMessage });
        webhook.errors++;
      }
    }
    
    this.logWebhook(webhook.id, payload, 'success', actionResults);
    this.saveData();
    
    return { 
      success: true, 
      message: 'Webhook processed successfully', 
      actions: executedActions 
    };
  }
  
  private checkRateLimit(webhookId: string, limit: number): boolean {
    const now = Date.now();
    const entry = this.rateLimitMap.get(webhookId);
    
    if (!entry || now > entry.resetAt) {
      this.rateLimitMap.set(webhookId, { count: 1, resetAt: now + 60000 });
      return true;
    }
    
    if (entry.count >= limit) {
      return false;
    }
    
    entry.count++;
    return true;
  }
  
  private validateAuth(webhook: WebhookConfig, headers: Record<string, string>): boolean {
    switch (webhook.authType) {
      case 'none':
        return true;
        
      case 'secret':
        const providedSecret = headers['x-webhook-secret'] || headers['authorization']?.replace('Bearer ', '');
        return providedSecret === webhook.secretKey;
        
      case 'signature':
        // HMAC signature validation would go here
        const signature = headers['x-signature'];
        // In production, verify HMAC signature
        return !!signature;
        
      default:
        return false;
    }
  }
  
  private evaluateConditions(conditions: WebhookCondition[], payload: WebhookPayload): boolean {
    return conditions.every(condition => {
      const value = this.getValueByPath(payload, condition.field);
      
      switch (condition.operator) {
        case 'eq':
          return value === condition.value;
        case 'neq':
          return value !== condition.value;
        case 'contains':
          return typeof value === 'string' && value.includes(condition.value);
        case 'gt':
          return typeof value === 'number' && value > condition.value;
        case 'lt':
          return typeof value === 'number' && value < condition.value;
        case 'exists':
          return value !== undefined && value !== null;
        default:
          return false;
      }
    });
  }
  
  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  private async executeAction(
    action: WebhookAction,
    payload: WebhookPayload,
    webhook: WebhookConfig
  ): Promise<void> {
    switch (action.type) {
      case 'alert':
        this.executeAlert(action, payload);
        break;
        
      case 'trade':
        await this.executeTrade(action, payload);
        break;
        
      case 'log':
        this.executeLog(action, payload);
        break;
        
      case 'forward':
        await this.executeForward(action, payload);
        break;
    }
  }
  
  private executeAlert(action: WebhookAction, payload: WebhookPayload): void {
    const message = this.interpolateMessage(action.config.message || 'Webhook received', payload);
    
    // Trigger browser notification
    if (Notification.permission === 'granted') {
      new Notification('TradeVision Alert', {
        body: message,
        icon: '/icons/icon-192x192.png',
      });
    }
    
    // Sound alert
    if (action.config.sound) {
      const audio = new Audio('/sounds/alert.mp3');
      audio.play().catch(() => {});
    }
    
    console.log('Webhook Alert:', message);
  }
  
  private async executeTrade(action: WebhookAction, payload: WebhookPayload): Promise<void> {
    const symbol = action.config.symbol || payload.ticker || 'BTCUSDT';
    const side = action.config.side || payload.strategy?.order_action || 'buy';
    
    let size: number;
    if (action.config.sizeType === 'from_signal') {
      size = payload.strategy?.order_contracts || action.config.size || 0;
    } else {
      size = action.config.size || 0;
    }
    
    // In production, this would execute an actual trade
    console.log('Webhook Trade:', { symbol, side, size, payload });
    
    // Dispatch event for trading system to handle
    window.dispatchEvent(new CustomEvent('webhook-trade', {
      detail: { symbol, side, size, payload }
    }));
  }
  
  private executeLog(action: WebhookAction, payload: WebhookPayload): void {
    const level = action.config.logLevel || 'info';
    const message = JSON.stringify(payload, null, 2);
    
    switch (level) {
      case 'info':
        console.log('Webhook Log:', message);
        break;
      case 'warn':
        console.warn('Webhook Log:', message);
        break;
      case 'error':
        console.error('Webhook Log:', message);
        break;
    }
  }
  
  private async executeForward(action: WebhookAction, payload: WebhookPayload): Promise<void> {
    if (!action.config.forwardUrl) {
      throw new Error('Forward URL not configured');
    }
    
    const response = await fetch(action.config.forwardUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...action.config.headers,
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`Forward failed: ${response.status}`);
    }
  }
  
  private interpolateMessage(template: string, payload: WebhookPayload): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getValueByPath(payload, path);
      return value !== undefined ? String(value) : match;
    });
  }
  
  // ============================================
  // Logging
  // ============================================
  
  private logWebhook(
    webhookId: string,
    payload: any,
    status: WebhookLog['status'],
    actions: WebhookLog['actions'],
    error?: string
  ): void {
    const log: WebhookLog = {
      id: crypto.randomUUID(),
      webhookId,
      timestamp: Date.now(),
      payload,
      status,
      actions,
      error,
    };
    
    this.logs.unshift(log);
    
    // Keep only recent logs
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }
    
    this.saveLogs();
  }
  
  /**
   * Get logs for a webhook
   */
  getLogs(webhookId?: string, limit: number = 50): WebhookLog[] {
    let logs = [...this.logs];
    
    if (webhookId) {
      logs = logs.filter(l => l.webhookId === webhookId);
    }
    
    return logs.slice(0, limit);
  }
  
  /**
   * Clear logs
   */
  clearLogs(webhookId?: string): void {
    if (webhookId) {
      this.logs = this.logs.filter(l => l.webhookId !== webhookId);
    } else {
      this.logs = [];
    }
    this.saveLogs();
  }
  
  // ============================================
  // Utilities
  // ============================================
  
  private generateSecretKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }
  
  private generateEndpoint(): string {
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Regenerate secret key for a webhook
   */
  regenerateSecret(webhookId: string): string | null {
    const webhook = this.webhooks.find(w => w.id === webhookId);
    if (!webhook) return null;
    
    webhook.secretKey = this.generateSecretKey();
    this.saveData();
    
    return webhook.secretKey;
  }
  
  /**
   * Get webhook URL for TradingView
   */
  getWebhookUrl(webhookId: string): string | null {
    const webhook = this.webhooks.find(w => w.id === webhookId);
    if (!webhook) return null;
    
    // In production, this would be your actual server URL
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/webhook/${webhook.endpoint}`;
  }
  
  /**
   * Generate TradingView alert message template
   */
  generateTradingViewTemplate(webhookId: string): string {
    return JSON.stringify({
      ticker: '{{ticker}}',
      exchange: '{{exchange}}',
      close: '{{close}}',
      open: '{{open}}',
      high: '{{high}}',
      low: '{{low}}',
      volume: '{{volume}}',
      time: '{{time}}',
      timenow: '{{timenow}}',
      strategy: {
        position_size: '{{strategy.position_size}}',
        order_action: '{{strategy.order.action}}',
        order_contracts: '{{strategy.order.contracts}}',
        order_price: '{{strategy.order.price}}',
        order_id: '{{strategy.order.id}}',
        market_position: '{{strategy.market_position}}',
        market_position_size: '{{strategy.market_position_size}}',
        prev_market_position: '{{strategy.prev_market_position}}',
        prev_market_position_size: '{{strategy.prev_market_position_size}}'
      }
    }, null, 2);
  }
  
  // ============================================
  // Persistence
  // ============================================
  
  private loadData(): void {
    try {
      const webhooks = localStorage.getItem(WEBHOOKS_KEY);
      if (webhooks) this.webhooks = JSON.parse(webhooks);
      
      const logs = localStorage.getItem(WEBHOOK_LOGS_KEY);
      if (logs) this.logs = JSON.parse(logs);
    } catch (error) {
      console.error('Failed to load webhook data:', error);
    }
  }
  
  private saveData(): void {
    localStorage.setItem(WEBHOOKS_KEY, JSON.stringify(this.webhooks));
  }
  
  private saveLogs(): void {
    localStorage.setItem(WEBHOOK_LOGS_KEY, JSON.stringify(this.logs));
  }
}

// ============================================
// API Key Manager
// ============================================

export class APIKeyManager {
  private apiKeys: APIKey[] = [];
  
  constructor() {
    this.loadData();
  }
  
  /**
   * Create a new API key
   */
  createAPIKey(name: string, permissions: APIKey['permissions']): { key: string; secret: string } {
    const key = this.generateKey('tv_');
    const secret = this.generateKey('tvs_');
    
    const apiKey: APIKey = {
      id: crypto.randomUUID(),
      name,
      key,
      secret,
      permissions,
      createdAt: Date.now(),
      enabled: true,
    };
    
    this.apiKeys.push(apiKey);
    this.saveData();
    
    // Only return secret once - it won't be retrievable later
    return { key, secret };
  }
  
  /**
   * Get all API keys (without secrets)
   */
  getAllAPIKeys(): Omit<APIKey, 'secret'>[] {
    return this.apiKeys.map(({ secret, ...rest }) => rest);
  }
  
  /**
   * Validate an API request
   */
  validateRequest(key: string, permission: APIKey['permissions'][0]): APIKey | null {
    const apiKey = this.apiKeys.find(k => k.key === key && k.enabled);
    
    if (!apiKey) return null;
    if (!apiKey.permissions.includes(permission)) return null;
    
    // Update last used
    apiKey.lastUsed = Date.now();
    this.saveData();
    
    return apiKey;
  }
  
  /**
   * Delete an API key
   */
  deleteAPIKey(id: string): boolean {
    const index = this.apiKeys.findIndex(k => k.id === id);
    if (index === -1) return false;
    
    this.apiKeys.splice(index, 1);
    this.saveData();
    
    return true;
  }
  
  /**
   * Toggle API key status
   */
  toggleAPIKey(id: string): boolean {
    const apiKey = this.apiKeys.find(k => k.id === id);
    if (!apiKey) return false;
    
    apiKey.enabled = !apiKey.enabled;
    this.saveData();
    
    return true;
  }
  
  /**
   * Update IP whitelist
   */
  updateIPWhitelist(id: string, ips: string[]): boolean {
    const apiKey = this.apiKeys.find(k => k.id === id);
    if (!apiKey) return false;
    
    apiKey.ipWhitelist = ips;
    this.saveData();
    
    return true;
  }
  
  private generateKey(prefix: string): string {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    return prefix + Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }
  
  private loadData(): void {
    try {
      const data = localStorage.getItem(API_KEYS_KEY);
      if (data) this.apiKeys = JSON.parse(data);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  }
  
  private saveData(): void {
    localStorage.setItem(API_KEYS_KEY, JSON.stringify(this.apiKeys));
  }
}

// ============================================
// Simulated API Router (for local demo)
// ============================================

export class APIRouter {
  private endpoints: Map<string, APIEndpoint> = new Map();
  private webhookManager: WebhookManager;
  private apiKeyManager: APIKeyManager;
  
  constructor(webhookManager: WebhookManager, apiKeyManager: APIKeyManager) {
    this.webhookManager = webhookManager;
    this.apiKeyManager = apiKeyManager;
    this.registerEndpoints();
  }
  
  private registerEndpoints(): void {
    // Market data endpoints
    this.endpoints.set('GET:/api/v1/ticker', {
      method: 'GET',
      path: '/api/v1/ticker',
      description: 'Get ticker data for a symbol',
      auth: false,
      rateLimit: 100,
      handler: async (params) => {
        // In production, fetch from data service
        return { symbol: params.symbol, price: 0, change: 0 };
      },
    });
    
    this.endpoints.set('GET:/api/v1/candles', {
      method: 'GET',
      path: '/api/v1/candles',
      description: 'Get OHLCV data',
      auth: false,
      rateLimit: 60,
      handler: async (params) => {
        // In production, fetch from data service
        return [];
      },
    });
    
    // Account endpoints (require auth)
    this.endpoints.set('GET:/api/v1/account', {
      method: 'GET',
      path: '/api/v1/account',
      description: 'Get account information',
      auth: true,
      rateLimit: 30,
      handler: async () => {
        return { balance: 0, positions: [] };
      },
    });
    
    this.endpoints.set('POST:/api/v1/order', {
      method: 'POST',
      path: '/api/v1/order',
      description: 'Place an order',
      auth: true,
      rateLimit: 10,
      handler: async (params, body) => {
        return { orderId: crypto.randomUUID(), status: 'pending' };
      },
    });
    
    // Webhook endpoints
    this.endpoints.set('POST:/api/webhook/:endpoint', {
      method: 'POST',
      path: '/api/webhook/:endpoint',
      description: 'Receive webhook',
      auth: false, // Auth handled by webhook manager
      rateLimit: 120,
      handler: async (params, body) => {
        const headers = params.headers || {};
        return this.webhookManager.processWebhook(params.endpoint, body, headers);
      },
    });
  }
  
  /**
   * Handle an API request
   */
  async handleRequest(
    method: string,
    path: string,
    params: Record<string, any>,
    body?: any,
    headers?: Record<string, string>
  ): Promise<{ status: number; data: any }> {
    const key = `${method}:${path}`;
    let endpoint = this.endpoints.get(key);
    
    // Check for parameterized routes
    if (!endpoint) {
      for (const [routeKey, ep] of this.endpoints) {
        const [epMethod, epPath] = routeKey.split(':');
        if (epMethod === method && this.matchPath(epPath, path, params)) {
          endpoint = ep;
          break;
        }
      }
    }
    
    if (!endpoint) {
      return { status: 404, data: { error: 'Not found' } };
    }
    
    // Auth check
    if (endpoint.auth) {
      const apiKey = headers?.['x-api-key'];
      if (!apiKey) {
        return { status: 401, data: { error: 'API key required' } };
      }
      
      const permission = method === 'GET' ? 'read' : 'trade';
      const valid = this.apiKeyManager.validateRequest(apiKey, permission);
      if (!valid) {
        return { status: 403, data: { error: 'Invalid API key or insufficient permissions' } };
      }
    }
    
    try {
      const data = await endpoint.handler({ ...params, headers }, body);
      return { status: 200, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      return { status: 500, data: { error: message } };
    }
  }
  
  private matchPath(pattern: string, path: string, params: Record<string, any>): boolean {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    
    if (patternParts.length !== pathParts.length) return false;
    
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get API documentation
   */
  getDocumentation(): { method: string; path: string; description: string; auth: boolean }[] {
    return Array.from(this.endpoints.values()).map(ep => ({
      method: ep.method,
      path: ep.path,
      description: ep.description,
      auth: ep.auth,
    }));
  }
}

// ============================================
// Singleton Instances
// ============================================

export const webhookManager = new WebhookManager();
export const apiKeyManager = new APIKeyManager();
export const apiRouter = new APIRouter(webhookManager, apiKeyManager);

export default webhookManager;
