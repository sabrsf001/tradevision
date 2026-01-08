/**
 * Services Index - Export all service modules
 */

// Exchange API
export {
  type Exchange,
  type Ticker,
  type OrderBook,
  type Trade as ExchangeTrade,
  type Order,
  type Balance,
  BinanceExchange,
  createExchange,
  ExchangeManager,
} from './exchangeApi';

// Backtesting
export {
  type BacktestTrade,
  type BacktestResult,
  type BacktestConfig,
  type BacktestMetrics,
  type Strategy,
  type TradeSignal,
  BacktestEngine,
  SMACrossoverStrategy,
  RSIMeanReversionStrategy,
  MACDStrategy,
  createStrategy,
  getAvailableStrategies,
} from './backtesting';

// Custom Indicators
export {
  type CustomIndicatorConfig,
  type IndicatorInput,
  type IndicatorResult,
  CustomIndicatorExecutor,
  saveCustomIndicator,
  getCustomIndicators,
  deleteCustomIndicator,
  getCustomIndicatorById,
  exampleIndicators,
} from './customIndicators';

// ML Prediction
export {
  type PredictionResult,
  type TrainingProgress,
  PricePredictionModel,
  TrendClassifier,
} from './mlPrediction';

// Security
export {
  type AuditLogEntry,
  encryptData,
  decryptData,
  storeExchangeCredentials,
  getExchangeCredentials,
  getAuditLogs,
  clearAuditLogs,
  checkPasswordStrength,
} from './security';

// Multi-Exchange
export {
  CoinbaseExchange,
  KrakenExchange,
  OKXExchange,
  BybitExchange,
  KuCoinExchange,
  SUPPORTED_EXCHANGES,
  createExchangeById,
} from './multiExchange';

// Portfolio
export {
  type PortfolioAsset,
  type PortfolioPosition,
  type PortfolioMetrics,
  type PortfolioSnapshot,
  type TradeRecord,
  portfolioManager,
} from './portfolio';

// Trading Bots
export {
  type DCABotConfig,
  type GridBotConfig,
  type SignalBotConfig,
  type TrailingBotConfig,
  type BotOrder,
  type BotBase,
  type TradingBot,
  botManager,
} from './tradingBots';

// Social Trading
export {
  type TraderProfile,
  type TraderStats,
  type TraderBadge,
  type SharedTrade,
  type CopyTradeSettings,
  type LeaderboardEntry,
  socialTrading,
} from './socialTrading';

// Strategy Builder
export {
  type StrategyBlock,
  type BlockParameter,
  type BlockConnection,
  type Strategy as VisualStrategy,
  type ExecutionSignal,
  INDICATOR_BLOCKS,
  CONDITION_BLOCKS,
  LOGIC_BLOCKS,
  ACTION_BLOCKS,
  strategyBuilder,
} from './strategyBuilder';

// Enhanced Data Service
export {
  type DataSource,
  type MarketData,
  type HealthStatus,
  enhancedDataService,
} from './enhancedDataService';

// Webhook & API
export {
  type WebhookConfig,
  type WebhookAction,
  type WebhookPayload,
  type WebhookLog,
  type APIKey,
  webhookManager,
  apiKeyManager,
  apiRouter,
} from './webhookApi';

// Performance Monitoring
export {
  type ErrorEvent,
  type Breadcrumb,
  type AnalyticsEvent,
  type WebVitalsMetric,
  type PerformanceSnapshot,
  monitoring,
} from './monitoring';

// AI Trading Engine
export {
  type AISignal,
  type MarketStructure,
  type OrderBlock,
  type FVG,
  type LiquidityPool,
  type PatternDetection,
  type AIAnalysis,
  type Divergence,
  AITradingEngine,
} from './aiTradingEngine';

// AI Providers
export {
  type AIProvider,
  type AIProviderConfig,
  type AIMessage,
  type AIResponse,
  type AIContext,
  aiService,
} from './aiProviders';

// AI Signals
export {
  type SignalAlert,
  type SignalFilter,
  type SignalStats,
  type MultiTimeframeSignal,
  signalManager,
  mtfAnalyzer,
  signalScreener,
  alertSystem,
  formatSignalNotification,
  formatSignalForDiscord,
  formatSignalForTelegram,
} from './aiSignals';

// Sentiment Analyzer
export {
  type NewsItem,
  type SocialPost,
  type OnChainMetrics,
  type FearGreedIndex,
  type SentimentAnalysis,
  sentimentService,
} from './sentimentAnalyzer';
