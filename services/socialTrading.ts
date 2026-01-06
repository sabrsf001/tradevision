/**
 * Social Trading Service - TradeVision
 * Leaderboard, trade sharing, and copy trading infrastructure
 */

import type { CandleData } from '../types';
import { TradeRecord } from './portfolio';

// ============================================
// Types
// ============================================

export interface TraderProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  joinedAt: number;
  
  // Verification
  isVerified: boolean;
  exchangeVerified: boolean;
  verificationLevel: 'none' | 'basic' | 'advanced' | 'pro';
  
  // Stats
  stats: TraderStats;
  
  // Social
  followers: number;
  following: number;
  
  // Settings
  isPublic: boolean;
  allowCopy: boolean;
  minCopyAmount?: number;
  maxCopiers?: number;
  copyFeePercent?: number; // Revenue share
  
  // Badges
  badges: TraderBadge[];
}

export interface TraderStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  
  totalPnl: number;
  totalPnlPercent: number;
  
  // Time-based returns
  return7d: number;
  return30d: number;
  return90d: number;
  returnAll: number;
  
  // Risk metrics
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  volatility: number;
  
  // Trading style
  avgHoldTime: number; // hours
  avgTradeSize: number;
  favoriteAssets: string[];
  tradingFrequency: 'scalper' | 'day-trader' | 'swing' | 'position' | 'investor';
  
  // Performance
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  
  lastUpdated: number;
}

export interface TraderBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface SharedTrade {
  id: string;
  traderId: string;
  traderName: string;
  traderAvatar?: string;
  
  // Trade details
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  status: 'open' | 'closed' | 'cancelled';
  
  // Results
  pnl?: number;
  pnlPercent?: number;
  
  // Chart snapshot
  chartSnapshot?: string; // Base64 image
  timeframe?: string;
  
  // Analysis
  analysis?: string;
  tags?: string[];
  
  // Social
  likes: number;
  comments: number;
  copies: number;
  
  createdAt: number;
  closedAt?: number;
}

export interface TradeComment {
  id: string;
  tradeId: string;
  userId: string;
  username: string;
  avatar?: string;
  content: string;
  likes: number;
  createdAt: number;
}

export interface CopyTradeSettings {
  id: string;
  traderId: string;
  followerId: string;
  
  // Copy settings
  enabled: boolean;
  copyMode: 'fixed' | 'proportional' | 'mirror';
  fixedAmount?: number;
  proportionalPercent?: number;
  
  // Risk management
  maxDailyLoss?: number;
  maxPositionSize?: number;
  maxOpenPositions?: number;
  useOwnStopLoss?: boolean;
  customStopLossPercent?: number;
  
  // Filters
  minTradeSize?: number;
  maxTradeSize?: number;
  allowedSymbols?: string[];
  excludedSymbols?: string[];
  
  // Stats
  totalCopied: number;
  totalPnl: number;
  copiedTrades: string[];
  
  createdAt: number;
  lastCopyAt?: number;
}

export interface LeaderboardEntry {
  rank: number;
  previousRank?: number;
  trader: TraderProfile;
  score: number;
  highlighted?: boolean;
}

export type LeaderboardPeriod = '7d' | '30d' | '90d' | 'all';
export type LeaderboardMetric = 'pnl' | 'pnlPercent' | 'winRate' | 'sharpe' | 'followers';

// ============================================
// Storage Keys
// ============================================

const PROFILE_KEY = 'tv_trader_profile';
const SHARED_TRADES_KEY = 'tv_shared_trades';
const COPY_SETTINGS_KEY = 'tv_copy_settings';
const FOLLOWING_KEY = 'tv_following';

// ============================================
// Social Trading Manager
// ============================================

export class SocialTradingManager {
  private profile: TraderProfile | null = null;
  private sharedTrades: SharedTrade[] = [];
  private copySettings: CopyTradeSettings[] = [];
  private following: string[] = [];
  
  constructor() {
    this.loadData();
  }
  
  // ============================================
  // Profile Management
  // ============================================
  
  /**
   * Create or update trader profile
   */
  saveProfile(profile: Partial<TraderProfile>): TraderProfile {
    if (this.profile) {
      this.profile = { ...this.profile, ...profile };
    } else {
      this.profile = {
        id: crypto.randomUUID(),
        username: profile.username || 'trader',
        displayName: profile.displayName || 'Trader',
        joinedAt: Date.now(),
        isVerified: false,
        exchangeVerified: false,
        verificationLevel: 'none',
        stats: this.createEmptyStats(),
        followers: 0,
        following: 0,
        isPublic: true,
        allowCopy: false,
        badges: [],
        ...profile,
      };
    }
    
    localStorage.setItem(PROFILE_KEY, JSON.stringify(this.profile));
    return this.profile;
  }
  
  /**
   * Get current profile
   */
  getProfile(): TraderProfile | null {
    return this.profile;
  }
  
  /**
   * Update trading stats
   */
  updateStats(trades: TradeRecord[]): TraderStats {
    const stats = this.calculateStats(trades);
    
    if (this.profile) {
      this.profile.stats = stats;
      localStorage.setItem(PROFILE_KEY, JSON.stringify(this.profile));
    }
    
    return stats;
  }
  
  /**
   * Calculate stats from trades
   */
  private calculateStats(trades: TradeRecord[]): TraderStats {
    const closedTrades = trades.filter(t => t.side === 'sell' || t.side === 'buy');
    
    // Calculate PnL pairs (simplified)
    let totalPnl = 0;
    let wins = 0;
    let losses = 0;
    const pnls: number[] = [];
    
    // Simplified PnL calculation - in production would pair buys/sells
    for (let i = 1; i < trades.length; i += 2) {
      const buy = trades[i - 1];
      const sell = trades[i];
      if (buy && sell && buy.side === 'buy' && sell.side === 'sell') {
        const pnl = (sell.price - buy.price) * buy.quantity;
        pnls.push(pnl);
        totalPnl += pnl;
        if (pnl > 0) wins++;
        else losses++;
      }
    }
    
    const winRate = pnls.length > 0 ? (wins / pnls.length) * 100 : 0;
    const avgWin = pnls.filter(p => p > 0).reduce((a, b) => a + b, 0) / wins || 0;
    const avgLoss = Math.abs(pnls.filter(p => p < 0).reduce((a, b) => a + b, 0) / losses) || 0;
    
    // Determine trading frequency
    let frequency: TraderStats['tradingFrequency'] = 'swing';
    const avgHoldTime = this.calculateAvgHoldTime(trades);
    if (avgHoldTime < 1) frequency = 'scalper';
    else if (avgHoldTime < 24) frequency = 'day-trader';
    else if (avgHoldTime < 168) frequency = 'swing';
    else if (avgHoldTime < 720) frequency = 'position';
    else frequency = 'investor';
    
    // Get favorite assets
    const assetCounts = new Map<string, number>();
    trades.forEach(t => {
      assetCounts.set(t.symbol, (assetCounts.get(t.symbol) || 0) + 1);
    });
    const favoriteAssets = Array.from(assetCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([symbol]) => symbol);
    
    return {
      totalTrades: trades.length,
      winningTrades: wins,
      losingTrades: losses,
      winRate,
      totalPnl,
      totalPnlPercent: 0, // Would need initial capital
      return7d: 0,
      return30d: 0,
      return90d: 0,
      returnAll: 0,
      maxDrawdown: this.calculateMaxDrawdown(pnls),
      sharpeRatio: 0,
      sortinoRatio: 0,
      volatility: this.calculateVolatility(pnls),
      avgHoldTime,
      avgTradeSize: trades.reduce((sum, t) => sum + t.total, 0) / trades.length || 0,
      favoriteAssets,
      tradingFrequency: frequency,
      profitFactor: avgLoss > 0 ? avgWin / avgLoss : 0,
      avgWin,
      avgLoss,
      largestWin: Math.max(...pnls.filter(p => p > 0), 0),
      largestLoss: Math.abs(Math.min(...pnls.filter(p => p < 0), 0)),
      lastUpdated: Date.now(),
    };
  }
  
  private calculateAvgHoldTime(trades: TradeRecord[]): number {
    // Simplified - pair consecutive trades
    let totalTime = 0;
    let pairs = 0;
    
    for (let i = 1; i < trades.length; i += 2) {
      const buy = trades[i - 1];
      const sell = trades[i];
      if (buy && sell) {
        totalTime += (sell.timestamp - buy.timestamp) / (1000 * 60 * 60); // hours
        pairs++;
      }
    }
    
    return pairs > 0 ? totalTime / pairs : 0;
  }
  
  private calculateMaxDrawdown(pnls: number[]): number {
    let peak = 0;
    let maxDD = 0;
    let cumulative = 0;
    
    for (const pnl of pnls) {
      cumulative += pnl;
      if (cumulative > peak) peak = cumulative;
      const dd = peak - cumulative;
      if (dd > maxDD) maxDD = dd;
    }
    
    return peak > 0 ? (maxDD / peak) * 100 : 0;
  }
  
  private calculateVolatility(pnls: number[]): number {
    if (pnls.length < 2) return 0;
    
    const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const variance = pnls.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / pnls.length;
    
    return Math.sqrt(variance);
  }
  
  private createEmptyStats(): TraderStats {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnl: 0,
      totalPnlPercent: 0,
      return7d: 0,
      return30d: 0,
      return90d: 0,
      returnAll: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      volatility: 0,
      avgHoldTime: 0,
      avgTradeSize: 0,
      favoriteAssets: [],
      tradingFrequency: 'swing',
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      lastUpdated: Date.now(),
    };
  }
  
  // ============================================
  // Trade Sharing
  // ============================================
  
  /**
   * Share a trade
   */
  shareTrade(trade: Omit<SharedTrade, 'id' | 'traderId' | 'traderName' | 'likes' | 'comments' | 'copies' | 'createdAt'>): SharedTrade | null {
    if (!this.profile) return null;
    
    const sharedTrade: SharedTrade = {
      ...trade,
      id: crypto.randomUUID(),
      traderId: this.profile.id,
      traderName: this.profile.displayName,
      traderAvatar: this.profile.avatar,
      likes: 0,
      comments: 0,
      copies: 0,
      createdAt: Date.now(),
    };
    
    this.sharedTrades.unshift(sharedTrade);
    this.saveSharedTrades();
    
    return sharedTrade;
  }
  
  /**
   * Get shared trades (feed)
   */
  getSharedTrades(options?: {
    traderId?: string;
    symbol?: string;
    status?: 'open' | 'closed';
    limit?: number;
  }): SharedTrade[] {
    let trades = [...this.sharedTrades];
    
    if (options?.traderId) {
      trades = trades.filter(t => t.traderId === options.traderId);
    }
    if (options?.symbol) {
      trades = trades.filter(t => t.symbol === options.symbol);
    }
    if (options?.status) {
      trades = trades.filter(t => t.status === options.status);
    }
    
    trades.sort((a, b) => b.createdAt - a.createdAt);
    
    if (options?.limit) {
      trades = trades.slice(0, options.limit);
    }
    
    return trades;
  }
  
  /**
   * Update a shared trade (close it, update PnL)
   */
  updateSharedTrade(id: string, updates: Partial<SharedTrade>): SharedTrade | null {
    const trade = this.sharedTrades.find(t => t.id === id);
    if (!trade) return null;
    
    Object.assign(trade, updates);
    this.saveSharedTrades();
    
    return trade;
  }
  
  /**
   * Like a trade
   */
  likeTrade(id: string): boolean {
    const trade = this.sharedTrades.find(t => t.id === id);
    if (!trade) return false;
    
    trade.likes++;
    this.saveSharedTrades();
    
    return true;
  }
  
  /**
   * Delete a shared trade
   */
  deleteSharedTrade(id: string): boolean {
    const index = this.sharedTrades.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    this.sharedTrades.splice(index, 1);
    this.saveSharedTrades();
    
    return true;
  }
  
  // ============================================
  // Copy Trading
  // ============================================
  
  /**
   * Start copying a trader
   */
  startCopying(traderId: string, settings: Partial<CopyTradeSettings>): CopyTradeSettings | null {
    if (!this.profile) return null;
    
    // Check if already copying
    const existing = this.copySettings.find(c => c.traderId === traderId);
    if (existing) {
      return this.updateCopySettings(traderId, settings);
    }
    
    const copyConfig: CopyTradeSettings = {
      id: crypto.randomUUID(),
      traderId,
      followerId: this.profile.id,
      enabled: true,
      copyMode: 'proportional',
      proportionalPercent: 10,
      maxOpenPositions: 5,
      totalCopied: 0,
      totalPnl: 0,
      copiedTrades: [],
      createdAt: Date.now(),
      ...settings,
    };
    
    this.copySettings.push(copyConfig);
    this.saveCopySettings();
    
    return copyConfig;
  }
  
  /**
   * Update copy settings
   */
  updateCopySettings(traderId: string, updates: Partial<CopyTradeSettings>): CopyTradeSettings | null {
    const settings = this.copySettings.find(c => c.traderId === traderId);
    if (!settings) return null;
    
    Object.assign(settings, updates);
    this.saveCopySettings();
    
    return settings;
  }
  
  /**
   * Stop copying a trader
   */
  stopCopying(traderId: string): boolean {
    const index = this.copySettings.findIndex(c => c.traderId === traderId);
    if (index === -1) return false;
    
    this.copySettings.splice(index, 1);
    this.saveCopySettings();
    
    return true;
  }
  
  /**
   * Get copy settings for a trader
   */
  getCopySettings(traderId: string): CopyTradeSettings | undefined {
    return this.copySettings.find(c => c.traderId === traderId);
  }
  
  /**
   * Get all traders being copied
   */
  getAllCopySettings(): CopyTradeSettings[] {
    return [...this.copySettings];
  }
  
  /**
   * Process a new trade from a followed trader
   */
  processCopyTrade(trade: SharedTrade): {
    shouldCopy: boolean;
    amount?: number;
    reason?: string;
  } {
    const settings = this.copySettings.find(c => c.traderId === trade.traderId && c.enabled);
    
    if (!settings) {
      return { shouldCopy: false, reason: 'Not following this trader' };
    }
    
    // Check filters
    if (settings.allowedSymbols && !settings.allowedSymbols.includes(trade.symbol)) {
      return { shouldCopy: false, reason: 'Symbol not in allowed list' };
    }
    
    if (settings.excludedSymbols && settings.excludedSymbols.includes(trade.symbol)) {
      return { shouldCopy: false, reason: 'Symbol is excluded' };
    }
    
    // Check position limits
    const openCopies = settings.copiedTrades.length; // Simplified
    if (settings.maxOpenPositions && openCopies >= settings.maxOpenPositions) {
      return { shouldCopy: false, reason: 'Max positions reached' };
    }
    
    // Calculate copy amount
    let amount: number;
    
    switch (settings.copyMode) {
      case 'fixed':
        amount = settings.fixedAmount || 100;
        break;
        
      case 'proportional':
        // This would need the trader's position size and copier's capital
        amount = (settings.proportionalPercent || 10) * 10; // Placeholder
        break;
        
      case 'mirror':
        amount = trade.entryPrice * 1; // Mirror exact size - placeholder
        break;
        
      default:
        amount = 100;
    }
    
    // Apply limits
    if (settings.minTradeSize && amount < settings.minTradeSize) {
      return { shouldCopy: false, reason: 'Trade size below minimum' };
    }
    
    if (settings.maxTradeSize && amount > settings.maxTradeSize) {
      amount = settings.maxTradeSize;
    }
    
    if (settings.maxPositionSize && amount > settings.maxPositionSize) {
      amount = settings.maxPositionSize;
    }
    
    return { shouldCopy: true, amount };
  }
  
  /**
   * Record a copied trade
   */
  recordCopiedTrade(traderId: string, tradeId: string, pnl: number): void {
    const settings = this.copySettings.find(c => c.traderId === traderId);
    if (!settings) return;
    
    settings.copiedTrades.push(tradeId);
    settings.totalCopied++;
    settings.totalPnl += pnl;
    settings.lastCopyAt = Date.now();
    
    this.saveCopySettings();
  }
  
  // ============================================
  // Following
  // ============================================
  
  /**
   * Follow a trader
   */
  followTrader(traderId: string): boolean {
    if (this.following.includes(traderId)) return false;
    
    this.following.push(traderId);
    this.saveFollowing();
    
    return true;
  }
  
  /**
   * Unfollow a trader
   */
  unfollowTrader(traderId: string): boolean {
    const index = this.following.indexOf(traderId);
    if (index === -1) return false;
    
    this.following.splice(index, 1);
    this.stopCopying(traderId); // Also stop copying
    this.saveFollowing();
    
    return true;
  }
  
  /**
   * Check if following a trader
   */
  isFollowing(traderId: string): boolean {
    return this.following.includes(traderId);
  }
  
  /**
   * Get all followed traders
   */
  getFollowing(): string[] {
    return [...this.following];
  }
  
  // ============================================
  // Leaderboard
  // ============================================
  
  /**
   * Generate leaderboard (mock data for demo)
   */
  getLeaderboard(
    period: LeaderboardPeriod = '30d',
    metric: LeaderboardMetric = 'pnlPercent',
    limit: number = 50
  ): LeaderboardEntry[] {
    // In production, this would fetch from a backend
    // For now, generate mock data
    const mockTraders = this.generateMockLeaderboard(limit);
    
    // Sort by selected metric
    mockTraders.sort((a, b) => {
      switch (metric) {
        case 'pnl':
          return b.trader.stats.totalPnl - a.trader.stats.totalPnl;
        case 'pnlPercent':
          return b.trader.stats.totalPnlPercent - a.trader.stats.totalPnlPercent;
        case 'winRate':
          return b.trader.stats.winRate - a.trader.stats.winRate;
        case 'sharpe':
          return b.trader.stats.sharpeRatio - a.trader.stats.sharpeRatio;
        case 'followers':
          return b.trader.followers - a.trader.followers;
        default:
          return 0;
      }
    });
    
    // Assign ranks
    return mockTraders.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }
  
  private generateMockLeaderboard(count: number): LeaderboardEntry[] {
    const names = ['CryptoWhale', 'TrendMaster', 'SwingKing', 'BTCHodler', 'AlphaTrader', 'ProfitHunter'];
    
    return Array.from({ length: count }, (_, i) => ({
      rank: i + 1,
      previousRank: i + Math.floor(Math.random() * 5) - 2,
      trader: {
        id: `trader_${i}`,
        username: `${names[i % names.length]}${i + 1}`,
        displayName: `${names[i % names.length]} ${i + 1}`,
        joinedAt: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
        isVerified: Math.random() > 0.7,
        exchangeVerified: Math.random() > 0.5,
        verificationLevel: Math.random() > 0.8 ? 'pro' : Math.random() > 0.5 ? 'advanced' : 'basic',
        stats: {
          ...this.createEmptyStats(),
          totalTrades: Math.floor(100 + Math.random() * 900),
          winRate: 50 + Math.random() * 40,
          totalPnl: (Math.random() - 0.3) * 50000,
          totalPnlPercent: (Math.random() - 0.3) * 200,
          sharpeRatio: 0.5 + Math.random() * 2,
          maxDrawdown: 5 + Math.random() * 30,
        },
        followers: Math.floor(Math.random() * 10000),
        following: Math.floor(Math.random() * 100),
        isPublic: true,
        allowCopy: Math.random() > 0.3,
        badges: [],
      },
      score: 100 - i * 1.5 + Math.random() * 5,
      highlighted: i < 3,
    }));
  }
  
  // ============================================
  // Badges
  // ============================================
  
  /**
   * Award a badge to the current user
   */
  awardBadge(badge: Omit<TraderBadge, 'earnedAt'>): TraderBadge | null {
    if (!this.profile) return null;
    
    // Check if already has this badge
    if (this.profile.badges.some(b => b.id === badge.id)) {
      return null;
    }
    
    const newBadge: TraderBadge = {
      ...badge,
      earnedAt: Date.now(),
    };
    
    this.profile.badges.push(newBadge);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(this.profile));
    
    return newBadge;
  }
  
  /**
   * Check and award automatic badges
   */
  checkBadges(trades: TradeRecord[]): TraderBadge[] {
    const awarded: TraderBadge[] = [];
    
    // First trade badge
    if (trades.length >= 1) {
      const badge = this.awardBadge({
        id: 'first_trade',
        name: 'First Steps',
        description: 'Completed your first trade',
        icon: '🎯',
        rarity: 'common',
      });
      if (badge) awarded.push(badge);
    }
    
    // 100 trades badge
    if (trades.length >= 100) {
      const badge = this.awardBadge({
        id: 'trades_100',
        name: 'Century Club',
        description: 'Completed 100 trades',
        icon: '💯',
        rarity: 'rare',
      });
      if (badge) awarded.push(badge);
    }
    
    // Win streak badge
    let winStreak = 0;
    let maxWinStreak = 0;
    for (const trade of trades) {
      // Simplified win detection
      if (trade.side === 'sell') {
        winStreak++;
        maxWinStreak = Math.max(maxWinStreak, winStreak);
      } else {
        winStreak = 0;
      }
    }
    
    if (maxWinStreak >= 10) {
      const badge = this.awardBadge({
        id: 'win_streak_10',
        name: 'Hot Streak',
        description: '10 winning trades in a row',
        icon: '🔥',
        rarity: 'epic',
      });
      if (badge) awarded.push(badge);
    }
    
    return awarded;
  }
  
  // ============================================
  // Persistence
  // ============================================
  
  private loadData(): void {
    try {
      const profile = localStorage.getItem(PROFILE_KEY);
      if (profile) this.profile = JSON.parse(profile);
      
      const trades = localStorage.getItem(SHARED_TRADES_KEY);
      if (trades) this.sharedTrades = JSON.parse(trades);
      
      const copy = localStorage.getItem(COPY_SETTINGS_KEY);
      if (copy) this.copySettings = JSON.parse(copy);
      
      const following = localStorage.getItem(FOLLOWING_KEY);
      if (following) this.following = JSON.parse(following);
    } catch (error) {
      console.error('Failed to load social trading data:', error);
    }
  }
  
  private saveSharedTrades(): void {
    localStorage.setItem(SHARED_TRADES_KEY, JSON.stringify(this.sharedTrades));
  }
  
  private saveCopySettings(): void {
    localStorage.setItem(COPY_SETTINGS_KEY, JSON.stringify(this.copySettings));
  }
  
  private saveFollowing(): void {
    localStorage.setItem(FOLLOWING_KEY, JSON.stringify(this.following));
  }
}

// ============================================
// Singleton Instance
// ============================================

export const socialTrading = new SocialTradingManager();

export default socialTrading;
