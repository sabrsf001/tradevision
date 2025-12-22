/**
 * IndexedDB Storage for TradeVision
 * Provides offline-first data persistence for watchlist, drawings, and preferences
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { DrawingObject, WatchlistItem, CandleData } from '../types';

// ============================================
// Database Schema
// ============================================
interface TradeVisionDB extends DBSchema {
  watchlist: {
    key: string;
    value: WatchlistItem & { updatedAt: number };
    indexes: { 'by-symbol': string };
  };
  drawings: {
    key: string;
    value: DrawingObject & { symbolTimeframe: string; updatedAt: number };
    indexes: { 'by-symbol-timeframe': string };
  };
  candles: {
    key: string;
    value: { 
      id: string; 
      symbol: string; 
      timeframe: string; 
      data: CandleData[]; 
      updatedAt: number 
    };
    indexes: { 'by-symbol-timeframe': string };
  };
  preferences: {
    key: string;
    value: { key: string; value: unknown; updatedAt: number };
  };
}

const DB_NAME = 'tradevision-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<TradeVisionDB> | null = null;

// ============================================
// Database Initialization
// ============================================
export async function getDB(): Promise<IDBPDatabase<TradeVisionDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<TradeVisionDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Watchlist store
      if (!db.objectStoreNames.contains('watchlist')) {
        const watchlistStore = db.createObjectStore('watchlist', { keyPath: 'symbol' });
        watchlistStore.createIndex('by-symbol', 'symbol');
      }

      // Drawings store
      if (!db.objectStoreNames.contains('drawings')) {
        const drawingsStore = db.createObjectStore('drawings', { keyPath: 'id' });
        drawingsStore.createIndex('by-symbol-timeframe', 'symbolTimeframe');
      }

      // Candles cache store
      if (!db.objectStoreNames.contains('candles')) {
        const candlesStore = db.createObjectStore('candles', { keyPath: 'id' });
        candlesStore.createIndex('by-symbol-timeframe', ['symbol', 'timeframe']);
      }

      // Preferences store
      if (!db.objectStoreNames.contains('preferences')) {
        db.createObjectStore('preferences', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// ============================================
// Watchlist Operations
// ============================================
export async function saveWatchlistItem(item: WatchlistItem): Promise<void> {
  const db = await getDB();
  await db.put('watchlist', { ...item, updatedAt: Date.now() });
}

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const db = await getDB();
  const items = await db.getAll('watchlist');
  return items.map(({ updatedAt, ...item }) => item);
}

export async function removeWatchlistItem(symbol: string): Promise<void> {
  const db = await getDB();
  await db.delete('watchlist', symbol);
}

export async function clearWatchlist(): Promise<void> {
  const db = await getDB();
  await db.clear('watchlist');
}

// ============================================
// Drawings Operations
// ============================================
export async function saveDrawing(
  drawing: DrawingObject,
  symbol: string,
  timeframe: string
): Promise<void> {
  const db = await getDB();
  await db.put('drawings', {
    ...drawing,
    symbolTimeframe: `${symbol}-${timeframe}`,
    updatedAt: Date.now(),
  });
}

export async function saveDrawings(
  drawings: DrawingObject[],
  symbol: string,
  timeframe: string
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('drawings', 'readwrite');
  
  for (const drawing of drawings) {
    await tx.store.put({
      ...drawing,
      symbolTimeframe: `${symbol}-${timeframe}`,
      updatedAt: Date.now(),
    });
  }
  
  await tx.done;
}

export async function getDrawings(
  symbol: string,
  timeframe: string
): Promise<DrawingObject[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex(
    'drawings',
    'by-symbol-timeframe',
    `${symbol}-${timeframe}`
  );
  return all.map(({ symbolTimeframe, updatedAt, ...drawing }) => drawing);
}

export async function removeDrawing(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('drawings', id);
}

export async function clearDrawings(symbol: string, timeframe: string): Promise<void> {
  const db = await getDB();
  const all = await db.getAllFromIndex(
    'drawings',
    'by-symbol-timeframe',
    `${symbol}-${timeframe}`
  );
  const tx = db.transaction('drawings', 'readwrite');
  for (const drawing of all) {
    await tx.store.delete(drawing.id);
  }
  await tx.done;
}

// ============================================
// Candle Data Cache Operations
// ============================================
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export async function cacheCandles(
  symbol: string,
  timeframe: string,
  data: CandleData[]
): Promise<void> {
  const db = await getDB();
  const id = `${symbol}-${timeframe}`;
  await db.put('candles', { id, symbol, timeframe, data, updatedAt: Date.now() });
}

export async function getCachedCandles(
  symbol: string,
  timeframe: string
): Promise<CandleData[] | null> {
  const db = await getDB();
  const id = `${symbol}-${timeframe}`;
  const cached = await db.get('candles', id);
  
  if (!cached) return null;
  
  // Check if cache is expired
  if (Date.now() - cached.updatedAt > CACHE_EXPIRY_MS) {
    await db.delete('candles', id);
    return null;
  }
  
  return cached.data;
}

export async function clearCandleCache(): Promise<void> {
  const db = await getDB();
  await db.clear('candles');
}

// ============================================
// Preferences Operations
// ============================================
export async function setPreference<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put('preferences', { key, value, updatedAt: Date.now() });
}

export async function getPreference<T>(key: string): Promise<T | null> {
  const db = await getDB();
  const pref = await db.get('preferences', key);
  return pref ? (pref.value as T) : null;
}

export async function removePreference(key: string): Promise<void> {
  const db = await getDB();
  await db.delete('preferences', key);
}

// ============================================
// Database Utilities
// ============================================
export async function exportData(): Promise<{
  watchlist: WatchlistItem[];
  drawings: DrawingObject[];
  preferences: Record<string, unknown>;
}> {
  const db = await getDB();
  
  const watchlist = await getWatchlist();
  const allDrawings = await db.getAll('drawings');
  const allPrefs = await db.getAll('preferences');
  
  const drawings = allDrawings.map(({ symbolTimeframe, updatedAt, ...d }) => d);
  const preferences = allPrefs.reduce((acc, { key, value }) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, unknown>);
  
  return { watchlist, drawings, preferences };
}

export async function importData(data: {
  watchlist?: WatchlistItem[];
  drawings?: (DrawingObject & { symbolTimeframe?: string })[];
  preferences?: Record<string, unknown>;
}): Promise<void> {
  const db = await getDB();
  
  if (data.watchlist) {
    const tx = db.transaction('watchlist', 'readwrite');
    for (const item of data.watchlist) {
      await tx.store.put({ ...item, updatedAt: Date.now() });
    }
    await tx.done;
  }
  
  if (data.preferences) {
    const tx = db.transaction('preferences', 'readwrite');
    for (const [key, value] of Object.entries(data.preferences)) {
      await tx.store.put({ key, value, updatedAt: Date.now() });
    }
    await tx.done;
  }
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await db.clear('watchlist');
  await db.clear('drawings');
  await db.clear('candles');
  await db.clear('preferences');
}

export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
