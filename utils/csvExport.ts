/**
 * CSV Export Utilities for TradeVision
 * Export chart data, trades, and watchlist to CSV format
 */

import type { CandleData, WatchlistItem, DrawingObject } from '../types';

interface ExportOptions {
  filename?: string;
  includeHeaders?: boolean;
  delimiter?: string;
}

/**
 * Convert array of objects to CSV string
 */
function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[],
  options: ExportOptions = {}
): string {
  const { includeHeaders = true, delimiter = ',' } = options;
  const lines: string[] = [];

  if (includeHeaders) {
    lines.push(columns.map((c) => escapeCSV(c.header)).join(delimiter));
  }

  for (const row of data) {
    const values = columns.map((c) => {
      const value = row[c.key];
      return escapeCSV(String(value ?? ''));
    });
    lines.push(values.join(delimiter));
  }

  return lines.join('\n');
}

/**
 * Escape CSV special characters
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download string as file
 */
function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export candle data to CSV
 */
export function exportCandleData(
  data: CandleData[],
  symbol: string,
  timeframe: string,
  options: ExportOptions = {}
): void {
  const columns: { key: keyof CandleData; header: string }[] = [
    { key: 'time', header: 'Timestamp' },
    { key: 'open', header: 'Open' },
    { key: 'high', header: 'High' },
    { key: 'low', header: 'Low' },
    { key: 'close', header: 'Close' },
    { key: 'volume', header: 'Volume' },
  ];

  // Convert timestamps to readable dates
  const formattedData = data.map((candle) => ({
    ...candle,
    time: new Date(candle.time * 1000).toISOString(),
  }));

  const csv = toCSV(formattedData as unknown as Record<string, unknown>[], columns as { key: string; header: string }[]);
  const filename = options.filename || `${symbol}_${timeframe}_${new Date().toISOString().split('T')[0]}`;
  downloadCSV(csv, filename);
}

/**
 * Export watchlist to CSV
 */
export function exportWatchlist(
  watchlist: WatchlistItem[],
  options: ExportOptions = {}
): void {
  const columns: { key: keyof WatchlistItem; header: string }[] = [
    { key: 'symbol', header: 'Symbol' },
    { key: 'price', header: 'Price' },
    { key: 'change', header: 'Change %' },
  ];

  const csv = toCSV(watchlist as unknown as Record<string, unknown>[], columns as { key: string; header: string }[]);
  const filename = options.filename || `watchlist_${new Date().toISOString().split('T')[0]}`;
  downloadCSV(csv, filename);
}

/**
 * Export drawings/annotations to CSV
 */
export function exportDrawings(
  drawings: DrawingObject[],
  symbol: string,
  options: ExportOptions = {}
): void {
  const formattedData = drawings.map((d) => ({
    id: d.id,
    tool: d.tool,
    startTime: new Date(d.start.time * 1000).toISOString(),
    startPrice: d.start.price,
    endTime: new Date(d.end.time * 1000).toISOString(),
    endPrice: d.end.price,
    lineColor: d.style.lineColor,
    lineWidth: d.style.lineWidth,
    text: d.text || '',
    locked: d.locked ? 'Yes' : 'No',
  }));

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'tool', header: 'Tool' },
    { key: 'startTime', header: 'Start Time' },
    { key: 'startPrice', header: 'Start Price' },
    { key: 'endTime', header: 'End Time' },
    { key: 'endPrice', header: 'End Price' },
    { key: 'lineColor', header: 'Line Color' },
    { key: 'lineWidth', header: 'Line Width' },
    { key: 'text', header: 'Text' },
    { key: 'locked', header: 'Locked' },
  ] as { key: string; header: string }[];

  const csv = toCSV(formattedData as unknown as Record<string, unknown>[], columns);
  const filename = options.filename || `${symbol}_drawings_${new Date().toISOString().split('T')[0]}`;
  downloadCSV(csv, filename);
}

/**
 * Trade interface for export
 */
interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  total: number;
  fee?: number;
  timestamp: number;
  status: 'open' | 'closed' | 'cancelled';
  pnl?: number;
}

/**
 * Export trades history to CSV
 */
export function exportTrades(trades: Trade[], options: ExportOptions = {}): void {
  const formattedData = trades.map((t) => ({
    ...t,
    timestamp: new Date(t.timestamp).toISOString(),
    pnl: t.pnl?.toFixed(2) ?? '',
    fee: t.fee?.toFixed(4) ?? '',
  }));

  const columns = [
    { key: 'id', header: 'Trade ID' },
    { key: 'symbol', header: 'Symbol' },
    { key: 'side', header: 'Side' },
    { key: 'price', header: 'Price' },
    { key: 'quantity', header: 'Quantity' },
    { key: 'total', header: 'Total' },
    { key: 'fee', header: 'Fee' },
    { key: 'timestamp', header: 'Time' },
    { key: 'status', header: 'Status' },
    { key: 'pnl', header: 'P&L' },
  ] as { key: string; header: string }[];

  const csv = toCSV(formattedData as unknown as Record<string, unknown>[], columns);
  const filename = options.filename || `trades_${new Date().toISOString().split('T')[0]}`;
  downloadCSV(csv, filename);
}

/**
 * Backtest results interface
 */
interface BacktestResult {
  strategy: string;
  startDate: string;
  endDate: string;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  netProfit: number;
  sharpeRatio: number;
}

/**
 * Export backtest results to CSV
 */
export function exportBacktestResults(
  results: BacktestResult[],
  options: ExportOptions = {}
): void {
  const columns = [
    { key: 'strategy', header: 'Strategy' },
    { key: 'startDate', header: 'Start Date' },
    { key: 'endDate', header: 'End Date' },
    { key: 'totalTrades', header: 'Total Trades' },
    { key: 'winRate', header: 'Win Rate %' },
    { key: 'profitFactor', header: 'Profit Factor' },
    { key: 'maxDrawdown', header: 'Max Drawdown %' },
    { key: 'netProfit', header: 'Net Profit' },
    { key: 'sharpeRatio', header: 'Sharpe Ratio' },
  ] as { key: string; header: string }[];

  const csv = toCSV(results as unknown as Record<string, unknown>[], columns);
  const filename = options.filename || `backtest_${new Date().toISOString().split('T')[0]}`;
  downloadCSV(csv, filename);
}

/**
 * Import CSV file and parse to objects
 */
export async function importCSV<T>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter((line) => line.trim());
        
        if (lines.length < 2) {
          resolve([]);
          return;
        }

        const headers = parseCSVLine(lines[0]);
        const results: T[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const obj: Record<string, string> = {};
          
          headers.forEach((header, idx) => {
            obj[header] = values[idx] || '';
          });
          
          results.push(obj as T);
        }

        resolve(results);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Parse a single CSV line respecting quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
