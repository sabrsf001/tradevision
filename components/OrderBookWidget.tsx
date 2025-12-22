/**
 * Inline Order Book Widget
 * Compact order book display for the sidebar area
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, ChevronUp, ChevronDown } from './Icons';

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

interface OrderBookWidgetProps {
  symbol: string;
  currentPrice: number;
  isVisible: boolean;
}

// Convert symbol to Binance format
const toBinanceSymbol = (symbol: string): string => {
  return symbol.replace('USD', 'USDT');
};

// Fetch order book from Binance
const fetchOrderBook = async (symbol: string, limit = 10): Promise<OrderBookData | null> => {
  try {
    const binanceSymbol = toBinanceSymbol(symbol);
    const response = await fetch(
      `https://api.binance.com/api/v3/depth?symbol=${binanceSymbol}&limit=${limit}`
    );
    
    if (!response.ok) throw new Error('Failed to fetch order book');
    
    const data = await response.json();
    
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
    
    return { bids, asks, lastUpdateId: data.lastUpdateId };
  } catch (error) {
    console.error('Error fetching order book:', error);
    return null;
  }
};

export const OrderBookWidget: React.FC<OrderBookWidgetProps> = ({
  symbol,
  currentPrice,
  isVisible,
}) => {
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const loadOrderBook = useCallback(async () => {
    setIsLoading(true);
    const data = await fetchOrderBook(symbol, 8);
    if (data) setOrderBook(data);
    setIsLoading(false);
  }, [symbol]);

  useEffect(() => {
    if (!isVisible) return;
    
    loadOrderBook();
    const interval = setInterval(loadOrderBook, 3000);
    
    return () => clearInterval(interval);
  }, [isVisible, loadOrderBook]);

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
    return ((bestAsk - bestBid) / bestAsk * 100).toFixed(3);
  }, [orderBook]);

  if (!isVisible) return null;

  return (
    <div className="bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--bg-primary)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span className="text-xs font-medium text-white">Order Book</span>
          {spread && (
            <span className="text-xs text-gray-500">Spread: {spread}%</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isLoading && <RefreshCw className="w-3 h-3 text-gray-500 animate-spin" />}
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>

      {!isCollapsed && orderBook && (
        <div className="px-2 pb-2">
          {/* Column Headers */}
          <div className="grid grid-cols-2 text-[10px] text-gray-500 px-1 mb-1">
            <span>Price</span>
            <span className="text-right">Size</span>
          </div>

          {/* Asks (reversed) */}
          <div className="space-y-0.5">
            {orderBook.asks.slice(0, 5).reverse().map((ask, i) => (
              <OrderRow key={`ask-${i}`} entry={ask} type="ask" maxQuantity={maxQuantity} />
            ))}
          </div>

          {/* Current Price */}
          <div className="my-1.5 py-1 px-2 bg-[var(--bg-primary)] rounded text-center">
            <span className="text-sm font-bold text-white font-mono">
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Bids */}
          <div className="space-y-0.5">
            {orderBook.bids.slice(0, 5).map((bid, i) => (
              <OrderRow key={`bid-${i}`} entry={bid} type="bid" maxQuantity={maxQuantity} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Compact Order Row
interface OrderRowProps {
  entry: OrderBookEntry;
  type: 'bid' | 'ask';
  maxQuantity: number;
}

const OrderRow: React.FC<OrderRowProps> = ({ entry, type, maxQuantity }) => {
  const widthPercent = (entry.quantity / maxQuantity) * 100;
  
  return (
    <div className="relative grid grid-cols-2 text-[11px] px-1 py-0.5 rounded">
      {/* Background bar */}
      <div
        className={`absolute inset-0 rounded ${type === 'bid' ? 'bg-green-500/15' : 'bg-red-500/15'}`}
        style={{ width: `${widthPercent}%`, right: 0, left: 'auto' }}
      />
      
      <span className={`relative z-10 font-mono ${type === 'bid' ? 'text-green-400' : 'text-red-400'}`}>
        {entry.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </span>
      <span className="relative z-10 text-right text-gray-400 font-mono">
        {entry.quantity.toFixed(4)}
      </span>
    </div>
  );
};

export default OrderBookWidget;
