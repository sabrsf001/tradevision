/**
 * Utils Index - Export all utility functions
 */

// IndexedDB Storage
export {
  getDB,
  saveWatchlistItem,
  getWatchlist,
  removeWatchlistItem,
  clearWatchlist,
  saveDrawing,
  saveDrawings,
  getDrawings,
  removeDrawing,
  clearDrawings,
  cacheCandles,
  getCachedCandles,
  clearCandleCache,
  setPreference,
  getPreference,
  removePreference,
  exportData,
  importData,
  clearAllData,
  closeDB,
} from './db';

// Web Vitals
export {
  reportWebVitals,
  initWebVitals,
  measureCustomMetric,
  markPerformance,
  measurePerformance,
  collectVitals,
  getCollectedVitals,
  observePerformance,
  type VitalsReport,
} from './webVitals';

// CSV Export
export {
  exportCandleData,
  exportWatchlist,
  exportDrawings,
  exportTrades,
  exportBacktestResults,
  importCSV,
} from './csvExport';

// Social Sharing
export {
  shareToTwitter,
  shareToTelegram,
  shareToReddit,
  shareToLinkedIn,
  shareToDiscord,
  nativeShare,
  copyToClipboard,
  generateShareableUrl,
} from './socialShare';
