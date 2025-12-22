import React, { useState, useEffect, useCallback } from 'react';
import { Search, Clock, TrendingUp, Star, X } from './Icons';

interface MobileSymbolSearchProps {
  onSelect: (symbol: string) => void;
  onClose: () => void;
  favorites?: string[];
  onToggleFavorite?: (symbol: string) => void;
}

interface SymbolInfo {
  symbol: string;
  name: string;
  category: 'forex' | 'crypto' | 'stock' | 'index' | 'commodity';
}

const TRENDING_SYMBOLS: SymbolInfo[] = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', category: 'crypto' },
  { symbol: 'ETHUSDT', name: 'Ethereum', category: 'crypto' },
  { symbol: 'EURUSD', name: 'Euro/USD', category: 'forex' },
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'stock' },
  { symbol: 'XAUUSD', name: 'Gold', category: 'commodity' },
];

const ALL_SYMBOLS: SymbolInfo[] = [
  // Crypto
  { symbol: 'BTCUSDT', name: 'Bitcoin', category: 'crypto' },
  { symbol: 'ETHUSDT', name: 'Ethereum', category: 'crypto' },
  { symbol: 'BNBUSDT', name: 'Binance Coin', category: 'crypto' },
  { symbol: 'XRPUSDT', name: 'Ripple', category: 'crypto' },
  { symbol: 'SOLUSDT', name: 'Solana', category: 'crypto' },
  { symbol: 'ADAUSDT', name: 'Cardano', category: 'crypto' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', category: 'crypto' },
  // Forex
  { symbol: 'EURUSD', name: 'Euro/USD', category: 'forex' },
  { symbol: 'GBPUSD', name: 'GBP/USD', category: 'forex' },
  { symbol: 'USDJPY', name: 'USD/JPY', category: 'forex' },
  { symbol: 'AUDUSD', name: 'AUD/USD', category: 'forex' },
  { symbol: 'USDCAD', name: 'USD/CAD', category: 'forex' },
  // Stocks
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', category: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft', category: 'stock' },
  { symbol: 'AMZN', name: 'Amazon', category: 'stock' },
  { symbol: 'TSLA', name: 'Tesla', category: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA', category: 'stock' },
  // Commodities
  { symbol: 'XAUUSD', name: 'Gold', category: 'commodity' },
  { symbol: 'XAGUSD', name: 'Silver', category: 'commodity' },
  // Indices
  { symbol: 'SPX500', name: 'S&P 500', category: 'index' },
  { symbol: 'NAS100', name: 'Nasdaq 100', category: 'index' },
];

const CATEGORY_COLORS = {
  crypto: '#f7931a',
  forex: '#2962ff',
  stock: '#26a69a',
  index: '#ab47bc',
  commodity: '#ffd700',
};

export const MobileSymbolSearch: React.FC<MobileSymbolSearchProps> = ({
  onSelect,
  onClose,
  favorites = [],
  onToggleFavorite,
}) => {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    const stored = localStorage.getItem('recentSymbolSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  const addToRecent = useCallback((symbol: string) => {
    const updated = [symbol, ...recentSearches.filter(s => s !== symbol)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSymbolSearches', JSON.stringify(updated));
  }, [recentSearches]);

  const handleSelect = (symbol: string) => {
    addToRecent(symbol);
    onSelect(symbol);
    onClose();
  };

  const filteredSymbols = ALL_SYMBOLS.filter(s => {
    const matchesQuery = query === '' || 
      s.symbol.toLowerCase().includes(query.toLowerCase()) ||
      s.name.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = activeCategory === 'all' || s.category === activeCategory;
    return matchesQuery && matchesCategory;
  });

  const categories = ['all', 'crypto', 'forex', 'stock', 'commodity', 'index'];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border-primary)' }}>
        <div 
          className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ background: 'var(--bg-secondary)' }}
        >
          <Search className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbols..."
            autoFocus
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: 'var(--text-primary)' }}
          />
          {query && (
            <button onClick={() => setQuery('')} className="touch-manipulation">
              <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            </button>
          )}
        </div>
        <button 
          onClick={onClose}
          className="px-3 py-2 text-sm font-medium touch-manipulation"
          style={{ color: 'var(--accent-primary)' }}
        >
          Cancel
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto hide-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap touch-manipulation transition-colors"
            style={{
              background: activeCategory === cat ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: activeCategory === cat ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Recent searches */}
        {query === '' && recentSearches.length > 0 && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Recent
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map(symbol => (
                <button
                  key={symbol}
                  onClick={() => handleSelect(symbol)}
                  className="px-4 py-2 rounded-lg text-sm font-medium touch-manipulation"
                  style={{ 
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trending */}
        {query === '' && activeCategory === 'all' && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4" style={{ color: '#26a69a' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Trending
              </span>
            </div>
            <div className="space-y-1">
              {TRENDING_SYMBOLS.map((item, index) => (
                <button
                  key={item.symbol}
                  onClick={() => handleSelect(item.symbol)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl touch-manipulation active:scale-[0.98] transition-transform"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                    #{index + 1}
                  </span>
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: CATEGORY_COLORS[item.category] }}
                  >
                    {item.symbol.slice(0, 2)}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {item.symbol}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {item.name}
                    </div>
                  </div>
                  {onToggleFavorite && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.symbol); }}
                      className="p-2"
                    >
                      <Star 
                        className="w-5 h-5" 
                        style={{ 
                          color: favorites.includes(item.symbol) ? '#ffd700' : 'var(--text-secondary)',
                          fill: favorites.includes(item.symbol) ? '#ffd700' : 'transparent',
                        }} 
                      />
                    </button>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search results */}
        {(query !== '' || activeCategory !== 'all') && (
          <div className="px-4 py-3 space-y-1">
            {filteredSymbols.map(item => (
              <button
                key={item.symbol}
                onClick={() => handleSelect(item.symbol)}
                className="w-full flex items-center gap-3 p-3 rounded-xl touch-manipulation active:scale-[0.98] transition-transform"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: CATEGORY_COLORS[item.category] }}
                >
                  {item.symbol.slice(0, 2)}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {item.symbol}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {item.name}
                  </div>
                </div>
                <span 
                  className="px-2 py-1 rounded text-xs capitalize"
                  style={{ 
                    background: `${CATEGORY_COLORS[item.category]}20`,
                    color: CATEGORY_COLORS[item.category],
                  }}
                >
                  {item.category}
                </span>
              </button>
            ))}
            {filteredSymbols.length === 0 && (
              <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                No symbols found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileSymbolSearch;
