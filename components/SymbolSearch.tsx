import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Star, TrendingUp } from './Icons';
import { SymbolInfo } from '../types';

interface SymbolSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (symbol: string) => void;
  currentSymbol: string;
}

// Mock symbol data - in production, this would come from an API
const AVAILABLE_SYMBOLS: SymbolInfo[] = [
  { symbol: 'BTCUSD', name: 'Bitcoin', exchange: 'Binance', type: 'crypto' },
  { symbol: 'ETHUSD', name: 'Ethereum', exchange: 'Binance', type: 'crypto' },
  { symbol: 'SOLUSD', name: 'Solana', exchange: 'Binance', type: 'crypto' },
  { symbol: 'XRPUSD', name: 'XRP', exchange: 'Binance', type: 'crypto' },
  { symbol: 'BNBUSD', name: 'BNB', exchange: 'Binance', type: 'crypto' },
  { symbol: 'ADAUSD', name: 'Cardano', exchange: 'Binance', type: 'crypto' },
  { symbol: 'DOGEUSD', name: 'Dogecoin', exchange: 'Binance', type: 'crypto' },
  { symbol: 'AVAXUSD', name: 'Avalanche', exchange: 'Binance', type: 'crypto' },
  { symbol: 'DOTUSD', name: 'Polkadot', exchange: 'Binance', type: 'crypto' },
  { symbol: 'MATICUSD', name: 'Polygon', exchange: 'Binance', type: 'crypto' },
  { symbol: 'LINKUSD', name: 'Chainlink', exchange: 'Binance', type: 'crypto' },
  { symbol: 'UNIUSD', name: 'Uniswap', exchange: 'Binance', type: 'crypto' },
  { symbol: 'ATOMUSD', name: 'Cosmos', exchange: 'Binance', type: 'crypto' },
  { symbol: 'LTCUSD', name: 'Litecoin', exchange: 'Binance', type: 'crypto' },
  { symbol: 'NEARUSD', name: 'NEAR Protocol', exchange: 'Binance', type: 'crypto' },
  { symbol: 'ARBUSD', name: 'Arbitrum', exchange: 'Binance', type: 'crypto' },
  { symbol: 'OPUSD', name: 'Optimism', exchange: 'Binance', type: 'crypto' },
  { symbol: 'APTUSD', name: 'Aptos', exchange: 'Binance', type: 'crypto' },
  { symbol: 'SUIUSD', name: 'Sui', exchange: 'Binance', type: 'crypto' },
  { symbol: 'PEPEUSD', name: 'Pepe', exchange: 'Binance', type: 'crypto' },
];

const SymbolSearch: React.FC<SymbolSearchProps> = ({ isOpen, onClose, onSelect, currentSymbol }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const stored = localStorage.getItem('tv_favorites');
    return stored ? JSON.parse(stored) : ['BTCUSD', 'ETHUSD'];
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.sheet-handle')) return;
    setIsDragging(true);
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startY.current;
    if (deltaY > 0) {
      currentY.current = deltaY;
      setDragY(deltaY);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (currentY.current > 100) onClose();
    setDragY(0);
    currentY.current = 0;
  }, [isDragging, onClose]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem('tv_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const filteredSymbols = query
    ? AVAILABLE_SYMBOLS.filter(
        s => s.symbol.toLowerCase().includes(query.toLowerCase()) ||
             s.name.toLowerCase().includes(query.toLowerCase())
      )
    : AVAILABLE_SYMBOLS;

  const favoriteSymbols = AVAILABLE_SYMBOLS.filter(s => favorites.includes(s.symbol));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const displayList = query ? filteredSymbols : [...favoriteSymbols, ...filteredSymbols.filter(s => !favorites.includes(s.symbol))];
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, displayList.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (displayList[selectedIndex]) handleSelect(displayList[selectedIndex].symbol);
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  const handleSelect = (symbol: string) => {
    onSelect(symbol);
    onClose();
  };

  const toggleFavorite = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]);
  };

  if (!isOpen) return null;

  const displayList = query ? filteredSymbols : [...favoriteSymbols, ...filteredSymbols.filter(s => !favorites.includes(s.symbol))];

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-start sm:justify-center sm:pt-20 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] w-full sm:w-[500px] rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ transform: `translateY(${dragY}px)`, transition: isDragging ? 'none' : 'transform 0.2s ease-out' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="sheet-handle sm:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 bg-[var(--border-color)] rounded-full" />
        </div>
        
        <div className="p-3 sm:p-4 border-b border-[var(--border-color)]">
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Search symbols..."
              className="w-full pl-10 sm:pl-12 pr-10 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--accent-blue)] transition-colors text-base sm:text-lg"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 touch-active">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="hidden sm:flex gap-2 mt-3 text-xs text-gray-500">
            <span className="px-2 py-1 bg-[var(--bg-primary)] rounded">↑↓ Navigate</span>
            <span className="px-2 py-1 bg-[var(--bg-primary)] rounded">Enter Select</span>
            <span className="px-2 py-1 bg-[var(--bg-primary)] rounded">Esc Close</span>
          </div>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain max-h-[60vh] sm:max-h-[400px]">
          {!query && favoriteSymbols.length > 0 && (
            <div className="px-4 py-2 text-xs uppercase text-gray-500 font-semibold tracking-wider bg-[var(--bg-panel)] sticky top-0">Favorites</div>
          )}
          
          {displayList.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No symbols found</p>
            </div>
          ) : (
            displayList.map((symbol, index) => {
              const isFavorite = favorites.includes(symbol.symbol);
              const showDivider = !query && index === favoriteSymbols.length && favoriteSymbols.length > 0;
              const isSelected = index === selectedIndex;
              const isActive = symbol.symbol === currentSymbol;
              
              return (
                <React.Fragment key={symbol.symbol}>
                  {showDivider && (
                    <div className="px-4 py-2 text-xs uppercase text-gray-500 font-semibold tracking-wider bg-[var(--bg-panel)] sticky top-0">All Symbols</div>
                  )}
                  <div
                    onClick={() => handleSelect(symbol.symbol)}
                    className={`flex items-center justify-between px-3 sm:px-4 py-3 cursor-pointer transition-colors touch-active ${isSelected ? 'bg-[var(--accent-blue)]/20 border-l-2 border-[var(--accent-blue)]' : 'border-l-2 border-transparent hover:bg-[var(--bg-panel)]'} ${isActive ? 'bg-[var(--bg-panel)]' : ''}`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button onClick={(e) => toggleFavorite(symbol.symbol, e)} className={`p-1 ${isFavorite ? 'text-neutral-400' : 'text-gray-600 hover:text-gray-400'}`}>
                        <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                      </button>
                      <div className="w-8 h-8 rounded-full bg-[var(--bg-primary)] flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold text-sm sm:text-base">{symbol.symbol}</span>
                          {isActive && <span className="text-[10px] px-1.5 py-0.5 bg-[var(--accent-blue)] rounded text-white flex-shrink-0">Active</span>}
                        </div>
                        <span className="text-xs sm:text-sm text-gray-500 truncate block">{symbol.name}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <span className="text-[10px] sm:text-xs text-gray-500 uppercase">{symbol.exchange}</span>
                      <div className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-[var(--bg-primary)] rounded text-gray-400 mt-1">{symbol.type}</div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>
        
        <div className="sm:hidden p-3 border-t border-[var(--border-color)] bg-[var(--bg-panel)] safe-area-bottom">
          <button onClick={onClose} className="w-full py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[var(--text-secondary)] font-medium touch-active">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default SymbolSearch;
