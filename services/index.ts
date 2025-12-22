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
