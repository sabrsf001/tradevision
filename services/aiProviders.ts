/**
 * Multi-Model AI Provider System
 * Supports: OpenAI GPT-4, Anthropic Claude, Google Gemini, Local Models (Ollama)
 * Production-ready with fallback, caching, and rate limiting
 */

import { CandleData } from '../types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'local';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  enabled: boolean;
  priority: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  text: string;
  provider: AIProvider;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latency: number;
  cached: boolean;
}

export interface AIContext {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  priceChange24h?: number;
  volume24h?: number;
  marketCap?: number;
  candles?: CandleData[];
  indicators?: Record<string, number>;
  patterns?: string[];
  signals?: any[];
}

// ============================================================================
// PROVIDER CONFIGURATIONS
// ============================================================================

const defaultConfigs: Record<AIProvider, Partial<AIProviderConfig>> = {
  openai: {
    model: 'gpt-4-turbo-preview',
    maxTokens: 2048,
    temperature: 0.7,
    baseUrl: 'https://api.openai.com/v1',
  },
  anthropic: {
    model: 'claude-3-opus-20240229',
    maxTokens: 2048,
    temperature: 0.7,
    baseUrl: 'https://api.anthropic.com/v1',
  },
  gemini: {
    model: 'gemini-pro',
    maxTokens: 2048,
    temperature: 0.7,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  },
  ollama: {
    model: 'llama2',
    maxTokens: 2048,
    temperature: 0.7,
    baseUrl: 'http://localhost:11434',
  },
  local: {
    model: 'local-analyzer',
    maxTokens: 1024,
    temperature: 0,
  },
};

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

interface CacheEntry {
  response: AIResponse;
  timestamp: number;
  expiresAt: number;
}

const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(messages: AIMessage[], context?: AIContext): string {
  const content = messages.map(m => m.content).join('|');
  const contextKey = context ? `${context.symbol}-${context.timeframe}-${context.currentPrice}` : '';
  return btoa(content + contextKey).slice(0, 64);
}

function getCachedResponse(key: string): AIResponse | null {
  const entry = responseCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return { ...entry.response, cached: true };
  }
  responseCache.delete(key);
  return null;
}

function setCachedResponse(key: string, response: AIResponse): void {
  responseCache.set(key, {
    response,
    timestamp: Date.now(),
    expiresAt: Date.now() + CACHE_TTL,
  });
  
  // Cleanup old entries
  if (responseCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of responseCache.entries()) {
      if (v.expiresAt < now) {
        responseCache.delete(k);
      }
    }
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitState {
  requests: number;
  resetAt: number;
}

const rateLimits = new Map<AIProvider, RateLimitState>();
const RATE_LIMITS: Record<AIProvider, { requests: number; window: number }> = {
  openai: { requests: 60, window: 60000 },
  anthropic: { requests: 50, window: 60000 },
  gemini: { requests: 60, window: 60000 },
  ollama: { requests: 100, window: 60000 },
  local: { requests: 1000, window: 60000 },
};

function checkRateLimit(provider: AIProvider): boolean {
  const limit = RATE_LIMITS[provider];
  const state = rateLimits.get(provider);
  
  if (!state || state.resetAt < Date.now()) {
    rateLimits.set(provider, {
      requests: 1,
      resetAt: Date.now() + limit.window,
    });
    return true;
  }
  
  if (state.requests >= limit.requests) {
    return false;
  }
  
  state.requests++;
  return true;
}

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

export function getTradingSystemPrompt(context: AIContext): string {
  return `You are TradeVision AI, an elite quantitative trading analyst and market expert.

CURRENT MARKET CONTEXT:
- Symbol: ${context.symbol}
- Timeframe: ${context.timeframe}
- Current Price: $${context.currentPrice.toLocaleString()}
${context.priceChange24h !== undefined ? `- 24h Change: ${context.priceChange24h > 0 ? '+' : ''}${context.priceChange24h.toFixed(2)}%` : ''}
${context.volume24h !== undefined ? `- 24h Volume: $${(context.volume24h / 1000000).toFixed(2)}M` : ''}
${context.patterns?.length ? `- Detected Patterns: ${context.patterns.join(', ')}` : ''}
${context.signals?.length ? `- Active Signals: ${context.signals.map(s => `${s.type} (${s.confidence}%)`).join(', ')}` : ''}

YOUR CAPABILITIES:
1. Technical Analysis - Identify trends, patterns, and key levels
2. Smart Money Concepts - Order blocks, FVGs, liquidity pools, BOS/CHoCH
3. Risk Assessment - Evaluate trade setups with proper risk/reward
4. Market Sentiment - Analyze price action for market psychology
5. Trade Recommendations - Provide actionable entry/exit points

RESPONSE GUIDELINES:
- Be concise but thorough
- Use specific price levels when discussing entries/exits
- Always include stop loss and take profit levels for trade ideas
- Rate confidence on a scale of 0-100%
- Highlight key risks and invalidation levels
- Use chart drawing commands when applicable:
  [DRAW:HORIZONTAL:PRICE] - Draw horizontal line at price
  [DRAW:ZONE:TOP:BOTTOM:TYPE] - Draw supply (red) or demand (green) zone

IMPORTANT: Focus on actionable insights. Avoid generic statements.`;
}

export function getMarketAnalysisPrompt(): string {
  return `Analyze the current market structure and provide:
1. Trend Direction & Strength (Bullish/Bearish/Ranging with percentage)
2. Key Support & Resistance Levels
3. Active Patterns (with confidence scores)
4. Smart Money Activity (Order Blocks, FVGs, Liquidity)
5. Trade Setup (if any high-probability opportunity exists)

Format your response clearly with sections.`;
}

export function getSignalPrompt(bias: 'LONG' | 'SHORT' | 'NEUTRAL'): string {
  return `Generate a trading signal analysis with ${bias} bias consideration:

Provide:
1. Signal Type: BUY/SELL/HOLD
2. Entry Price Zone
3. Stop Loss Level (with reasoning)
4. Take Profit Targets (TP1, TP2, TP3)
5. Risk/Reward Ratio
6. Confidence Score (0-100%)
7. Invalidation Scenario
8. Time Horizon

Be specific with prices and percentages.`;
}

// ============================================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================================

async function callOpenAI(
  messages: AIMessage[],
  config: AIProviderConfig
): Promise<AIResponse> {
  const startTime = Date.now();
  
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return {
    text: data.choices[0]?.message?.content || '',
    provider: 'openai',
    model: config.model || 'gpt-4',
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
    latency: Date.now() - startTime,
    cached: false,
  };
}

async function callAnthropic(
  messages: AIMessage[],
  config: AIProviderConfig
): Promise<AIResponse> {
  const startTime = Date.now();
  
  const systemMessage = messages.find(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');
  
  const response = await fetch(`${config.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      system: systemMessage?.content,
      messages: conversationMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return {
    text: data.content[0]?.text || '',
    provider: 'anthropic',
    model: config.model || 'claude-3',
    usage: {
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
    latency: Date.now() - startTime,
    cached: false,
  };
}

async function callGemini(
  messages: AIMessage[],
  config: AIProviderConfig
): Promise<AIResponse> {
  const startTime = Date.now();
  
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessage = messages.filter(m => m.role === 'user').map(m => m.content).join('\n');
  
  const response = await fetch(
    `${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: userMessage }],
        }],
        systemInstruction: systemMessage ? {
          parts: [{ text: systemMessage.content }],
        } : undefined,
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: config.maxTokens,
        },
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    provider: 'gemini',
    model: config.model || 'gemini-pro',
    usage: {
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
    },
    latency: Date.now() - startTime,
    cached: false,
  };
}

async function callOllama(
  messages: AIMessage[],
  config: AIProviderConfig
): Promise<AIResponse> {
  const startTime = Date.now();
  
  const response = await fetch(`${config.baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
      options: {
        temperature: config.temperature,
        num_predict: config.maxTokens,
      },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return {
    text: data.message?.content || '',
    provider: 'ollama',
    model: config.model || 'llama2',
    usage: {
      promptTokens: data.prompt_eval_count || 0,
      completionTokens: data.eval_count || 0,
      totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
    },
    latency: Date.now() - startTime,
    cached: false,
  };
}

function generateLocalResponse(
  messages: AIMessage[],
  context?: AIContext
): AIResponse {
  const startTime = Date.now();
  const userMessage = messages.filter(m => m.role === 'user').pop()?.content.toLowerCase() || '';
  
  let response = '';
  
  // Pattern-based responses
  if (userMessage.includes('trend') || userMessage.includes('direction')) {
    if (context) {
      const change = context.priceChange24h || 0;
      const trend = change > 2 ? 'bullish' : change < -2 ? 'bearish' : 'ranging';
      response = `${context.symbol} is currently ${trend}. `;
      response += `24h change: ${change > 0 ? '+' : ''}${change.toFixed(2)}%. `;
      response += trend === 'bullish' 
        ? 'Look for pullbacks to key support levels for long entries.'
        : trend === 'bearish'
        ? 'Look for rallies to resistance for short entries.'
        : 'Wait for a breakout from the current range.';
    } else {
      response = 'I need price data to analyze the trend. Try loading a chart first.';
    }
  } else if (userMessage.includes('support') || userMessage.includes('resistance') || userMessage.includes('level')) {
    if (context?.currentPrice) {
      const price = context.currentPrice;
      const support1 = price * 0.95;
      const support2 = price * 0.90;
      const resistance1 = price * 1.05;
      const resistance2 = price * 1.10;
      response = `Key levels for ${context.symbol}:\n`;
      response += `• R2: $${resistance2.toLocaleString()}\n`;
      response += `• R1: $${resistance1.toLocaleString()}\n`;
      response += `• Current: $${price.toLocaleString()}\n`;
      response += `• S1: $${support1.toLocaleString()}\n`;
      response += `• S2: $${support2.toLocaleString()}`;
    } else {
      response = 'Load a chart to see support and resistance levels.';
    }
  } else if (userMessage.includes('signal') || userMessage.includes('trade') || userMessage.includes('entry')) {
    if (context?.signals?.length) {
      const signal = context.signals[0];
      response = `📊 Active Signal: ${signal.type}\n`;
      response += `• Entry: $${signal.targets?.entry?.toLocaleString() || context.currentPrice}\n`;
      response += `• Stop Loss: $${signal.targets?.stopLoss?.toLocaleString() || 'N/A'}\n`;
      response += `• TP1: $${signal.targets?.takeProfit1?.toLocaleString() || 'N/A'}\n`;
      response += `• Confidence: ${signal.confidence}%\n`;
      response += `• Strength: ${signal.strength}`;
    } else if (context) {
      response = `No high-probability signals for ${context.symbol} at the moment. `;
      response += 'Use "analyze" for a full market structure breakdown.';
    } else {
      response = 'Load a chart to generate trading signals.';
    }
  } else if (userMessage.includes('risk') || userMessage.includes('volatility')) {
    if (context?.currentPrice) {
      const volatility = Math.abs(context.priceChange24h || 2);
      const risk = volatility > 5 ? 'HIGH' : volatility > 2 ? 'MEDIUM' : 'LOW';
      response = `Risk Assessment for ${context.symbol}:\n`;
      response += `• Volatility: ${volatility.toFixed(2)}%\n`;
      response += `• Risk Level: ${risk}\n`;
      response += `• Recommended Position Size: ${risk === 'HIGH' ? '0.5-1%' : risk === 'MEDIUM' ? '1-2%' : '2-3%'} of portfolio`;
    } else {
      response = 'Load a chart to assess risk.';
    }
  } else if (userMessage.includes('help') || userMessage.includes('commands')) {
    response = `🤖 TradeVision AI Commands:\n\n`;
    response += `📈 Analysis:\n`;
    response += `• "analyze" - Full market analysis\n`;
    response += `• "trend" - Current trend direction\n`;
    response += `• "levels" - Support & resistance\n\n`;
    response += `📊 Trading:\n`;
    response += `• "signal" - Get trading signal\n`;
    response += `• "zones" - Supply & demand zones\n`;
    response += `• "risk" - Risk assessment\n\n`;
    response += `🎯 Smart Money:\n`;
    response += `• "order blocks" - Detect OBs\n`;
    response += `• "fvg" - Fair value gaps\n`;
    response += `• "liquidity" - Liquidity pools`;
  } else {
    response = `I'm here to help with trading analysis. Try:\n`;
    response += `• "What's the trend?"\n`;
    response += `• "Give me a signal"\n`;
    response += `• "Show key levels"\n`;
    response += `• "Analyze the market"\n`;
    response += `• "help" for all commands`;
  }
  
  return {
    text: response,
    provider: 'local',
    model: 'local-analyzer',
    latency: Date.now() - startTime,
    cached: false,
  };
}

// ============================================================================
// MAIN AI SERVICE CLASS
// ============================================================================

export class AIService {
  private configs: Map<AIProvider, AIProviderConfig> = new Map();
  private activeProvider: AIProvider = 'local';
  
  constructor() {
    // Initialize with local provider always available
    this.configs.set('local', {
      provider: 'local',
      enabled: true,
      priority: 100,
      ...defaultConfigs.local,
    });
  }
  
  /**
   * Configure an AI provider
   */
  configure(provider: AIProvider, config: Partial<AIProviderConfig>): void {
    const existing = this.configs.get(provider) || { provider, enabled: false, priority: 50 };
    this.configs.set(provider, {
      ...existing,
      ...defaultConfigs[provider],
      ...config,
    });
  }
  
  /**
   * Set API key for a provider
   */
  setApiKey(provider: AIProvider, apiKey: string): void {
    this.configure(provider, { apiKey, enabled: true });
  }
  
  /**
   * Get available providers
   */
  getAvailableProviders(): AIProvider[] {
    return Array.from(this.configs.entries())
      .filter(([_, config]) => config.enabled)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([provider]) => provider);
  }
  
  /**
   * Set the active provider
   */
  setActiveProvider(provider: AIProvider): boolean {
    const config = this.configs.get(provider);
    if (config?.enabled) {
      this.activeProvider = provider;
      return true;
    }
    return false;
  }
  
  /**
   * Get current active provider
   */
  getActiveProvider(): AIProvider {
    return this.activeProvider;
  }
  
  /**
   * Send a chat message
   */
  async chat(
    messages: AIMessage[],
    context?: AIContext,
    useCache: boolean = true
  ): Promise<AIResponse> {
    // Check cache
    if (useCache) {
      const cacheKey = getCacheKey(messages, context);
      const cached = getCachedResponse(cacheKey);
      if (cached) return cached;
    }
    
    // Get provider config
    const config = this.configs.get(this.activeProvider);
    if (!config?.enabled) {
      return generateLocalResponse(messages, context);
    }
    
    // Check rate limit
    if (!checkRateLimit(this.activeProvider)) {
      console.warn(`Rate limit exceeded for ${this.activeProvider}, falling back to local`);
      return generateLocalResponse(messages, context);
    }
    
    try {
      let response: AIResponse;
      
      switch (this.activeProvider) {
        case 'openai':
          response = await callOpenAI(messages, config);
          break;
        case 'anthropic':
          response = await callAnthropic(messages, config);
          break;
        case 'gemini':
          response = await callGemini(messages, config);
          break;
        case 'ollama':
          response = await callOllama(messages, config);
          break;
        default:
          response = generateLocalResponse(messages, context);
      }
      
      // Cache response
      if (useCache) {
        const cacheKey = getCacheKey(messages, context);
        setCachedResponse(cacheKey, response);
      }
      
      return response;
    } catch (error) {
      console.error(`${this.activeProvider} error:`, error);
      
      // Try fallback providers
      const providers = this.getAvailableProviders();
      for (const fallback of providers) {
        if (fallback === this.activeProvider) continue;
        
        const fallbackConfig = this.configs.get(fallback);
        if (!fallbackConfig?.enabled || fallback === 'local') continue;
        
        try {
          console.log(`Trying fallback: ${fallback}`);
          let response: AIResponse;
          
          switch (fallback) {
            case 'openai':
              response = await callOpenAI(messages, fallbackConfig);
              break;
            case 'anthropic':
              response = await callAnthropic(messages, fallbackConfig);
              break;
            case 'gemini':
              response = await callGemini(messages, fallbackConfig);
              break;
            case 'ollama':
              response = await callOllama(messages, fallbackConfig);
              break;
            default:
              continue;
          }
          
          return response;
        } catch {
          continue;
        }
      }
      
      // Final fallback to local
      return generateLocalResponse(messages, context);
    }
  }
  
  /**
   * Analyze market with AI
   */
  async analyzeMarket(context: AIContext): Promise<AIResponse> {
    const messages: AIMessage[] = [
      { role: 'system', content: getTradingSystemPrompt(context) },
      { role: 'user', content: getMarketAnalysisPrompt() },
    ];
    
    return this.chat(messages, context);
  }
  
  /**
   * Get trading signal from AI
   */
  async getSignal(context: AIContext, bias: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL'): Promise<AIResponse> {
    const messages: AIMessage[] = [
      { role: 'system', content: getTradingSystemPrompt(context) },
      { role: 'user', content: getSignalPrompt(bias) },
    ];
    
    return this.chat(messages, context);
  }
  
  /**
   * Ask a custom question
   */
  async ask(question: string, context?: AIContext): Promise<AIResponse> {
    const messages: AIMessage[] = [];
    
    if (context) {
      messages.push({ role: 'system', content: getTradingSystemPrompt(context) });
    }
    
    messages.push({ role: 'user', content: question });
    
    return this.chat(messages, context);
  }
  
  /**
   * Stream response (for providers that support it)
   */
  async *stream(
    messages: AIMessage[],
    context?: AIContext
  ): AsyncGenerator<string, void, unknown> {
    // For now, just yield the full response
    // Streaming implementation can be added per-provider
    const response = await this.chat(messages, context, false);
    yield response.text;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const aiService = new AIService();

// Auto-configure from environment
if (typeof import.meta !== 'undefined') {
  const env = (import.meta as any).env || {};
  
  if (env.VITE_OPENAI_API_KEY) {
    aiService.setApiKey('openai', env.VITE_OPENAI_API_KEY);
  }
  
  if (env.VITE_ANTHROPIC_API_KEY) {
    aiService.setApiKey('anthropic', env.VITE_ANTHROPIC_API_KEY);
  }
  
  if (env.VITE_GEMINI_API_KEY) {
    aiService.setApiKey('gemini', env.VITE_GEMINI_API_KEY);
  }
}

export default aiService;
