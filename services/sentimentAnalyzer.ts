/**
 * Market Sentiment Analyzer
 * Analyzes news, social media, and on-chain data for market sentiment
 */

// ============================================================================
// TYPES
// ============================================================================

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number; // -100 to 100
  relevance: number; // 0 to 100
  symbols: string[];
  categories: string[];
}

export interface SocialPost {
  id: string;
  platform: 'twitter' | 'reddit' | 'discord' | 'telegram';
  author: string;
  content: string;
  timestamp: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  engagement: {
    likes: number;
    shares: number;
    comments: number;
  };
  symbols: string[];
}

export interface OnChainMetrics {
  symbol: string;
  timestamp: number;
  activeAddresses24h: number;
  transactions24h: number;
  averageTxValue: number;
  whaleTransactions: number;
  exchangeInflow: number;
  exchangeOutflow: number;
  netExchangeFlow: number;
  mvrv: number;
  nvt: number;
  sopr: number;
}

export interface FearGreedIndex {
  value: number; // 0-100
  classification: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
  timestamp: number;
  change24h: number;
  components: {
    volatility: number;
    marketMomentum: number;
    socialMedia: number;
    dominance: number;
    trends: number;
  };
}

export interface SentimentAnalysis {
  symbol: string;
  timestamp: number;
  overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentScore: number; // -100 to 100
  confidence: number;
  components: {
    news: { score: number; count: number };
    social: { score: number; count: number };
    onChain: { score: number; signals: string[] };
    technical: { score: number; signals: string[] };
  };
  summary: string;
  keyInsights: string[];
  riskFactors: string[];
}

// ============================================================================
// SENTIMENT KEYWORDS
// ============================================================================

const BULLISH_KEYWORDS = [
  'bullish', 'moon', 'pump', 'rally', 'surge', 'breakout', 'accumulation',
  'buy', 'long', 'hodl', 'ath', 'all time high', 'adoption', 'partnership',
  'upgrade', 'launch', 'milestone', 'growth', 'profit', 'gain', 'rise',
  'soar', 'explode', 'rocket', 'breakthrough', 'success', 'winning',
  'institutional', 'whales buying', 'support', 'strong', 'momentum',
];

const BEARISH_KEYWORDS = [
  'bearish', 'crash', 'dump', 'plunge', 'collapse', 'breakdown', 'distribution',
  'sell', 'short', 'rekt', 'atl', 'all time low', 'ban', 'hack', 'scam',
  'downgrade', 'delay', 'fail', 'decline', 'loss', 'drop', 'fall',
  'sink', 'tank', 'rug', 'exit', 'failure', 'losing', 'fear',
  'panic', 'whales selling', 'resistance', 'weak', 'reversal',
];

const NEUTRAL_KEYWORDS = [
  'consolidation', 'range', 'sideways', 'wait', 'neutral', 'stable',
  'unchanged', 'flat', 'horizontal', 'balance', 'equilibrium',
];

// ============================================================================
// TEXT ANALYSIS
// ============================================================================

export function analyzeSentiment(text: string): { sentiment: 'positive' | 'negative' | 'neutral'; score: number } {
  const lowerText = text.toLowerCase();
  
  let bullishScore = 0;
  let bearishScore = 0;
  
  for (const keyword of BULLISH_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      bullishScore += 10;
    }
  }
  
  for (const keyword of BEARISH_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      bearishScore += 10;
    }
  }
  
  // Check for negation
  const negations = ['not', 'no', "don't", "doesn't", "won't", "can't", 'never'];
  for (const negation of negations) {
    if (lowerText.includes(negation)) {
      // Swap scores if negation found near keywords
      const temp = bullishScore;
      bullishScore = bearishScore * 0.5;
      bearishScore = temp * 0.5;
      break;
    }
  }
  
  const netScore = bullishScore - bearishScore;
  const maxScore = Math.max(bullishScore + bearishScore, 1);
  const normalizedScore = (netScore / maxScore) * 100;
  
  let sentiment: 'positive' | 'negative' | 'neutral';
  if (normalizedScore > 15) sentiment = 'positive';
  else if (normalizedScore < -15) sentiment = 'negative';
  else sentiment = 'neutral';
  
  return { sentiment, score: Math.max(-100, Math.min(100, normalizedScore)) };
}

export function extractSymbols(text: string): string[] {
  const symbols: string[] = [];
  
  // Common crypto symbols
  const cryptoPatterns = [
    /\$([A-Z]{2,10})/g,  // $BTC, $ETH
    /\b(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|DOT|AVAX|MATIC|LINK|UNI|ATOM|LTC|BCH|SHIB|TRX|XLM|ALGO|VET|FTM|MANA|SAND|AXS|AAVE|MKR|COMP|SNX|CRV|YFI|SUSHI)\b/gi,
  ];
  
  for (const pattern of cryptoPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      symbols.push(match[1].toUpperCase());
    }
  }
  
  return [...new Set(symbols)];
}

// ============================================================================
// NEWS AGGREGATOR
// ============================================================================

interface NewsSource {
  name: string;
  url: string;
  parser: (data: any) => NewsItem[];
}

class NewsAggregator {
  private sources: NewsSource[] = [];
  private cache: Map<string, NewsItem[]> = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Add a news source
   */
  addSource(source: NewsSource): void {
    this.sources.push(source);
  }
  
  /**
   * Fetch news from all sources
   */
  async fetchAll(symbol?: string): Promise<NewsItem[]> {
    const cacheKey = symbol || 'all';
    const cached = this.cache.get(cacheKey);
    
    // Check cache
    if (cached) {
      return cached;
    }
    
    const allNews: NewsItem[] = [];
    
    for (const source of this.sources) {
      try {
        const response = await fetch(source.url);
        const data = await response.json();
        const news = source.parser(data);
        allNews.push(...news);
      } catch (error) {
        console.error(`Failed to fetch from ${source.name}:`, error);
      }
    }
    
    // Filter by symbol if provided
    let filteredNews = allNews;
    if (symbol) {
      filteredNews = allNews.filter(n => 
        n.symbols.includes(symbol.toUpperCase()) ||
        n.title.toUpperCase().includes(symbol.toUpperCase()) ||
        n.description.toUpperCase().includes(symbol.toUpperCase())
      );
    }
    
    // Sort by date
    filteredNews.sort((a, b) => b.publishedAt - a.publishedAt);
    
    // Cache results
    this.cache.set(cacheKey, filteredNews);
    setTimeout(() => this.cache.delete(cacheKey), this.cacheExpiry);
    
    return filteredNews;
  }
  
  /**
   * Analyze news sentiment
   */
  analyzeNews(news: NewsItem[]): { score: number; count: number; breakdown: Record<string, number> } {
    if (news.length === 0) {
      return { score: 0, count: 0, breakdown: { positive: 0, negative: 0, neutral: 0 } };
    }
    
    let totalScore = 0;
    const breakdown = { positive: 0, negative: 0, neutral: 0 };
    
    for (const item of news) {
      totalScore += item.sentimentScore;
      breakdown[item.sentiment]++;
    }
    
    return {
      score: totalScore / news.length,
      count: news.length,
      breakdown,
    };
  }
}

// ============================================================================
// SOCIAL SENTIMENT ANALYZER
// ============================================================================

class SocialSentimentAnalyzer {
  private posts: SocialPost[] = [];
  
  /**
   * Add social post
   */
  addPost(post: SocialPost): void {
    this.posts.push(post);
  }
  
  /**
   * Clear old posts
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    this.posts = this.posts.filter(p => p.timestamp > cutoff);
  }
  
  /**
   * Get sentiment for a symbol
   */
  getSentiment(symbol: string): { score: number; count: number; trending: boolean } {
    const relevantPosts = this.posts.filter(p => 
      p.symbols.includes(symbol.toUpperCase())
    );
    
    if (relevantPosts.length === 0) {
      return { score: 0, count: 0, trending: false };
    }
    
    // Weight by engagement
    let weightedScore = 0;
    let totalWeight = 0;
    
    for (const post of relevantPosts) {
      const weight = 1 + Math.log10(1 + post.engagement.likes + post.engagement.shares * 2);
      weightedScore += post.sentimentScore * weight;
      totalWeight += weight;
    }
    
    const averageScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    
    // Check if trending (high engagement in last hour)
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const recentPosts = relevantPosts.filter(p => p.timestamp > hourAgo);
    const totalEngagement = recentPosts.reduce((sum, p) => 
      sum + p.engagement.likes + p.engagement.shares + p.engagement.comments, 0
    );
    const trending = totalEngagement > 1000 || recentPosts.length > 50;
    
    return {
      score: averageScore,
      count: relevantPosts.length,
      trending,
    };
  }
  
  /**
   * Get top mentioned symbols
   */
  getTopMentions(limit: number = 10): { symbol: string; count: number; sentiment: number }[] {
    const mentions = new Map<string, { count: number; totalSentiment: number }>();
    
    for (const post of this.posts) {
      for (const symbol of post.symbols) {
        const existing = mentions.get(symbol) || { count: 0, totalSentiment: 0 };
        existing.count++;
        existing.totalSentiment += post.sentimentScore;
        mentions.set(symbol, existing);
      }
    }
    
    return Array.from(mentions.entries())
      .map(([symbol, data]) => ({
        symbol,
        count: data.count,
        sentiment: data.totalSentiment / data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

// ============================================================================
// ON-CHAIN ANALYZER
// ============================================================================

class OnChainAnalyzer {
  private metrics: Map<string, OnChainMetrics[]> = new Map();
  
  /**
   * Add metrics data
   */
  addMetrics(metrics: OnChainMetrics): void {
    const existing = this.metrics.get(metrics.symbol) || [];
    existing.push(metrics);
    
    // Keep last 30 days
    if (existing.length > 30 * 24) {
      existing.shift();
    }
    
    this.metrics.set(metrics.symbol, existing);
  }
  
  /**
   * Analyze on-chain data
   */
  analyze(symbol: string): { score: number; signals: string[] } {
    const data = this.metrics.get(symbol);
    
    if (!data || data.length === 0) {
      return { score: 0, signals: ['No on-chain data available'] };
    }
    
    const latest = data[data.length - 1];
    const signals: string[] = [];
    let score = 0;
    
    // Exchange flow analysis
    if (latest.netExchangeFlow < 0) {
      // More outflow = accumulation = bullish
      score += 20;
      signals.push('📤 Net exchange outflow (accumulation)');
    } else if (latest.netExchangeFlow > 0) {
      // More inflow = distribution = bearish
      score -= 20;
      signals.push('📥 Net exchange inflow (distribution)');
    }
    
    // Whale activity
    if (data.length > 1) {
      const prevWhales = data[data.length - 2].whaleTransactions;
      const whaleChange = (latest.whaleTransactions - prevWhales) / prevWhales * 100;
      
      if (whaleChange > 20) {
        score += 15;
        signals.push(`🐋 Whale activity up ${whaleChange.toFixed(0)}%`);
      } else if (whaleChange < -20) {
        score -= 15;
        signals.push(`🐋 Whale activity down ${whaleChange.toFixed(0)}%`);
      }
    }
    
    // Active addresses
    if (data.length > 1) {
      const prevActive = data[data.length - 2].activeAddresses24h;
      const activeChange = (latest.activeAddresses24h - prevActive) / prevActive * 100;
      
      if (activeChange > 10) {
        score += 10;
        signals.push(`👥 Active addresses up ${activeChange.toFixed(0)}%`);
      } else if (activeChange < -10) {
        score -= 10;
        signals.push(`👥 Active addresses down ${activeChange.toFixed(0)}%`);
      }
    }
    
    // MVRV Ratio
    if (latest.mvrv < 1) {
      score += 15;
      signals.push(`📊 MVRV below 1 (undervalued)`);
    } else if (latest.mvrv > 3.5) {
      score -= 15;
      signals.push(`📊 MVRV above 3.5 (overvalued)`);
    }
    
    // SOPR
    if (latest.sopr < 1) {
      score += 10;
      signals.push(`📈 SOPR < 1 (selling at loss = capitulation)`);
    } else if (latest.sopr > 1.1) {
      score -= 10;
      signals.push(`📉 SOPR > 1.1 (taking profits)`);
    }
    
    return { score: Math.max(-100, Math.min(100, score)), signals };
  }
}

// ============================================================================
// FEAR & GREED INDEX
// ============================================================================

class FearGreedCalculator {
  private history: FearGreedIndex[] = [];
  
  /**
   * Calculate Fear & Greed Index
   */
  calculate(data: {
    volatility: number;
    momentum: number;
    social: number;
    dominance: number;
    trends: number;
  }): FearGreedIndex {
    // Weight each component
    const weights = {
      volatility: 0.25,
      momentum: 0.25,
      social: 0.15,
      dominance: 0.10,
      trends: 0.25,
    };
    
    const value = Math.round(
      data.volatility * weights.volatility +
      data.momentum * weights.momentum +
      data.social * weights.social +
      data.dominance * weights.dominance +
      data.trends * weights.trends
    );
    
    let classification: FearGreedIndex['classification'];
    if (value <= 20) classification = 'Extreme Fear';
    else if (value <= 40) classification = 'Fear';
    else if (value <= 60) classification = 'Neutral';
    else if (value <= 80) classification = 'Greed';
    else classification = 'Extreme Greed';
    
    const prevValue = this.history.length > 0 ? this.history[this.history.length - 1].value : value;
    
    const index: FearGreedIndex = {
      value,
      classification,
      timestamp: Date.now(),
      change24h: value - prevValue,
      components: {
        volatility: data.volatility,
        marketMomentum: data.momentum,
        socialMedia: data.social,
        dominance: data.dominance,
        trends: data.trends,
      },
    };
    
    this.history.push(index);
    if (this.history.length > 365) {
      this.history.shift();
    }
    
    return index;
  }
  
  /**
   * Get current index
   */
  getCurrent(): FearGreedIndex | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }
  
  /**
   * Get history
   */
  getHistory(days: number = 30): FearGreedIndex[] {
    return this.history.slice(-days);
  }
}

// ============================================================================
// MAIN SENTIMENT SERVICE
// ============================================================================

export class SentimentService {
  private newsAggregator = new NewsAggregator();
  private socialAnalyzer = new SocialSentimentAnalyzer();
  private onChainAnalyzer = new OnChainAnalyzer();
  private fearGreedCalculator = new FearGreedCalculator();
  
  /**
   * Full sentiment analysis for a symbol
   */
  async analyze(symbol: string): Promise<SentimentAnalysis> {
    // Gather all components
    const newsItems = await this.newsAggregator.fetchAll(symbol);
    const newsSentiment = this.newsAggregator.analyzeNews(newsItems);
    const socialSentiment = this.socialAnalyzer.getSentiment(symbol);
    const onChainSentiment = this.onChainAnalyzer.analyze(symbol);
    
    // Calculate overall sentiment
    const weights = {
      news: 0.3,
      social: 0.25,
      onChain: 0.25,
      technical: 0.2,
    };
    
    // Assume technical is neutral for now (would be passed in)
    const technicalScore = 0;
    
    const overallScore = 
      newsSentiment.score * weights.news +
      socialSentiment.score * weights.social +
      onChainSentiment.score * weights.onChain +
      technicalScore * weights.technical;
    
    let overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    if (overallScore > 20) overallSentiment = 'BULLISH';
    else if (overallScore < -20) overallSentiment = 'BEARISH';
    else overallSentiment = 'NEUTRAL';
    
    // Calculate confidence
    const dataPointCount = newsSentiment.count + socialSentiment.count;
    const confidence = Math.min(95, 30 + dataPointCount * 0.5);
    
    // Generate insights
    const keyInsights: string[] = [];
    const riskFactors: string[] = [];
    
    if (newsSentiment.score > 30) {
      keyInsights.push(`Positive news coverage (${newsSentiment.count} articles)`);
    } else if (newsSentiment.score < -30) {
      riskFactors.push(`Negative news sentiment detected`);
    }
    
    if (socialSentiment.trending) {
      keyInsights.push(`${symbol} is trending on social media`);
    }
    
    onChainSentiment.signals.forEach(s => {
      if (s.includes('accumulation') || s.includes('up')) {
        keyInsights.push(s);
      } else if (s.includes('distribution') || s.includes('down')) {
        riskFactors.push(s);
      }
    });
    
    // Generate summary
    const summary = this.generateSummary(symbol, overallSentiment, overallScore, keyInsights, riskFactors);
    
    return {
      symbol,
      timestamp: Date.now(),
      overallSentiment,
      sentimentScore: overallScore,
      confidence,
      components: {
        news: { score: newsSentiment.score, count: newsSentiment.count },
        social: { score: socialSentiment.score, count: socialSentiment.count },
        onChain: { score: onChainSentiment.score, signals: onChainSentiment.signals },
        technical: { score: technicalScore, signals: [] },
      },
      summary,
      keyInsights,
      riskFactors,
    };
  }
  
  /**
   * Generate summary text
   */
  private generateSummary(
    symbol: string,
    sentiment: string,
    score: number,
    insights: string[],
    risks: string[]
  ): string {
    const emoji = sentiment === 'BULLISH' ? '📈' : sentiment === 'BEARISH' ? '📉' : '➡️';
    
    let summary = `${emoji} ${symbol} sentiment is ${sentiment.toLowerCase()} `;
    summary += `with a score of ${score > 0 ? '+' : ''}${score.toFixed(0)}/100. `;
    
    if (insights.length > 0) {
      summary += `Key positive: ${insights[0]}. `;
    }
    
    if (risks.length > 0) {
      summary += `Main concern: ${risks[0]}. `;
    }
    
    return summary.trim();
  }
  
  /**
   * Get Fear & Greed Index
   */
  getFearGreed(): FearGreedIndex | null {
    return this.fearGreedCalculator.getCurrent();
  }
  
  /**
   * Update Fear & Greed with market data
   */
  updateFearGreed(data: {
    volatility: number;
    momentum: number;
    social: number;
    dominance: number;
    trends: number;
  }): FearGreedIndex {
    return this.fearGreedCalculator.calculate(data);
  }
  
  /**
   * Analyze text for sentiment
   */
  analyzeText(text: string): { sentiment: 'positive' | 'negative' | 'neutral'; score: number; symbols: string[] } {
    const result = analyzeSentiment(text);
    const symbols = extractSymbols(text);
    return { ...result, symbols };
  }
  
  /**
   * Get social analyzer instance
   */
  getSocialAnalyzer(): SocialSentimentAnalyzer {
    return this.socialAnalyzer;
  }
  
  /**
   * Get on-chain analyzer instance
   */
  getOnChainAnalyzer(): OnChainAnalyzer {
    return this.onChainAnalyzer;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const sentimentService = new SentimentService();

export default sentimentService;
