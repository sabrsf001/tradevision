/**
 * Order Book Panel
 * Displays market depth (bids/asks) from Binance
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, RefreshCw } from './Icons';

interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  lastUpdateId: number;
}

interface OrderBookPanelProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
}

// Convert symbol to Binance format
const toBinanceSymbol = (symbol: string): string => {
  return symbol.replace('USD', 'USDT');
};

// Fetch order book from Binance
const fetchOrderBook = async (symbol: string, limit = 20): Promise<OrderBookData | null> => {
  try {
    const binanceSymbol = toBinanceSymbol(symbol);
    const response = await fetch(
      `https://api.binance.com/api/v3/depth?symbol=${binanceSymbol}&limit=${limit}`
    );
    
    if (!response.ok) throw new Error('Failed to fetch order book');
    
    const data = await response.json();
    
    // Parse bids and asks
    let bidTotal = 0;
    const bids: OrderBookEntry[] = data.bids.map((b: [string, string]) => {
      const price = parseFloat(b[0]);
      const quantity = parseFloat(b[1]);
      bidTotal += quantity;
      return { price, quantity, total: bidTotal };
    });
    
    let askTotal = 0;
    const asks: OrderBookEntry[] = data.asks.map((a: [string, string]) => {
      const price = parseFloat(a[0]);
      const quantity = parseFloat(a[1]);
      askTotal += quantity;
      return { price, quantity, total: askTotal };
    });
    
    return {
      bids,
      asks,
      lastUpdateId: data.lastUpdateId,
    };
  } catch (error) {
    console.error('Error fetching order book:', error);
    return null;
  }
};

export const OrderBookPanel: React.FC<OrderBookPanelProps> = ({
  isOpen,
  onClose,
  symbol,
  currentPrice,
}) => {
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depth, setDepth] = useState<20 | 50 | 100>(20);

  // Fetch order book data
  const loadOrderBook = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const data = await fetchOrderBook(symbol, depth);
    if (data) {
      setOrderBook(data);
    } else {
      setError('Failed to load order book');
    }
    
    setIsLoading(false);
  }, [symbol, depth]);

  // Load on open and periodically refresh
  useEffect(() => {
    if (!isOpen) return;
    
    loadOrderBook();
    const interval = setInterval(loadOrderBook, 2000); // Refresh every 2 seconds
    
    return () => clearInterval(interval);
  }, [isOpen, loadOrderBook]);

  // Calculate max quantity for visualization
  const maxQuantity = useMemo(() => {
    if (!orderBook) return 1;
    const maxBid = Math.max(...orderBook.bids.map((b) => b.quantity), 0);
    const maxAsk = Math.max(...orderBook.asks.map((a) => a.quantity), 0);
    return Math.max(maxBid, maxAsk);
  }, [orderBook]);

  // Calculate spread
  const spread = useMemo(() => {
    if (!orderBook || orderBook.bids.length === 0 || orderBook.asks.length === 0) return null;
    const bestBid = orderBook.bids[0].price;
    const bestAsk = orderBook.asks[0].price;
    const spreadValue = bestAsk - bestBid;
    const spreadPercent = (spreadValue / bestAsk) * 100;
    return { value: spreadValue, percent: spreadPercent };
  }, [orderBook]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Order Book
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{symbol}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadOrderBook}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-white hover:bg-[var(--bg-primary)] rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-primary)] rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Depth Selector */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)]">
          <span className="text-xs text-gray-500">Depth:</span>
          <div className="flex gap-1">
            {([20, 50, 100] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  depth === d
                    ? 'bg-[var(--accent-blue)] text-white'
                    : 'bg-[var(--bg-primary)] text-gray-400 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Spread */}
        {spread && (
          <div className="flex items-center justify-center px-4 py-2 bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
            <span className="text-xs text-gray-500">Spread:</span>
            <span className="text-xs text-white font-mono ml-2">
              ${spread.value.toFixed(2)} ({spread.percent.toFixed(3)}%)
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {error ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : !orderBook ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="w-6 h-6 text-gray-500 animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-500">Loading order book...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header Row */}
              <div className="grid grid-cols-3 text-xs text-gray-500 px-4 py-2 bg-[var(--bg-primary)]">
                <span>Price</span>
                <span className="text-right">Size</span>
                <span className="text-right">Total</span>
              </div>

              {/* Asks (reversed, lowest at bottom) */}
              <div className="flex-1 overflow-y-auto flex flex-col-reverse">
                {orderBook.asks.slice().reverse().map((ask, i) => (
                  <OrderRow
                    key={`ask-${i}`}
                    entry={ask}
                    type="ask"
                    maxQuantity={maxQuantity}
                    isHighlighted={i === orderBook.asks.length - 1}
                  />
                ))}
              </div>

              {/* Current Price */}
              <div className="px-4 py-2 bg-[var(--bg-primary)] border-y border-[var(--border-color)] text-center">
                <span className="text-lg font-bold text-white font-mono">
                  ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Bids */}
              <div className="flex-1 overflow-y-auto">
                {orderBook.bids.map((bid, i) => (
                  <OrderRow
                    key={`bid-${i}`}
                    entry={bid}
                    type="bid"
                    maxQuantity={maxQuantity}
                    isHighlighted={i === 0}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Order Row Component
interface OrderRowProps {
  entry: OrderBookEntry;
  type: 'bid' | 'ask';
  maxQuantity: number;
  isHighlighted?: boolean;
}

const OrderRow: React.FC<OrderRowProps> = ({ entry, type, maxQuantity, isHighlighted }) => {
  const widthPercent = (entry.quantity / maxQuantity) * 100;
  
  return (
    <div className={`relative grid grid-cols-3 text-xs px-4 py-1 hover:bg-[var(--bg-primary)] transition-colors ${
      isHighlighted ? 'font-semibold' : ''
    }`}>
      {/* Background bar */}
      <div
        className={`absolute inset-0 ${type === 'bid' ? 'bg-green-500/10' : 'bg-red-500/10'}`}
        style={{ width: `${widthPercent}%`, right: 0, left: 'auto' }}
      />
      
      {/* Content */}
      <span className={`relative z-10 font-mono ${type === 'bid' ? 'text-green-400' : 'text-red-400'}`}>
        {entry.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </span>
      <span className="relative z-10 text-right text-white font-mono">
        {entry.quantity.toFixed(4)}
      </span>
      <span className="relative z-10 text-right text-gray-400 font-mono">
        {entry.total.toFixed(4)}
      </span>
    </div>
  );
};

export default OrderBookPanel;
