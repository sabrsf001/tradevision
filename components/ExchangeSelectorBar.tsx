/**
 * Exchange Selector Panel
 * TradingView-style bottom sheet with broker cards
 */

import React, { useState } from 'react';
import { Check, X, Search, Star, ExternalLink } from './Icons';

interface ExchangeOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  rating: number;
  description: string;
  connected: boolean;
}

interface ExchangeSelectorBarProps {
  isPaperMode: boolean;
  paperBalance: number;
  activeExchange: string;
  connectedExchanges: string[];
  onSelectExchange: (exchangeId: string) => void;
  onOpenExchangeModal: () => void;
  isAuthenticated: boolean;
  onLoginRequired: () => void;
}

const EXCHANGES: ExchangeOption[] = [
  { id: 'paper', name: 'Paper Trading', icon: '📝', color: '#3B82F6', rating: 0, description: 'TradeVision Simulator', connected: true },
  { id: 'binance', name: 'Binance', icon: '🟡', color: '#F0B90B', rating: 4.5, description: 'World\'s largest crypto exchange', connected: false },
  { id: 'bybit', name: 'Bybit', icon: '🟠', color: '#F7A600', rating: 4.8, description: 'Crypto derivatives platform', connected: false },
  { id: 'okx', name: 'OKX', icon: '⚪', color: '#FFFFFF', rating: 4.9, description: 'Global crypto exchange', connected: false },
  { id: 'bingx', name: 'BingX', icon: '🔵', color: '#2962FF', rating: 4.3, description: 'Social trading platform', connected: false },
  { id: 'bitget', name: 'Bitget', icon: '🟢', color: '#00C853', rating: 4.4, description: 'Copy trading leader', connected: false },
  { id: 'kucoin', name: 'KuCoin', icon: '🟩', color: '#23AF91', rating: 4.2, description: 'People\'s exchange', connected: false },
  { id: 'gate', name: 'Gate.io', icon: '🔷', color: '#17E6A1', rating: 4.4, description: 'Altcoin paradise', connected: false },
  { id: 'mexc', name: 'MEXC', icon: '🔶', color: '#1972E2', rating: 4.1, description: 'Global exchange', connected: false },
];

export const ExchangeSelectorBar: React.FC<ExchangeSelectorBarProps> = ({
  isPaperMode,
  paperBalance,
  activeExchange,
  connectedExchanges,
  onSelectExchange,
  onOpenExchangeModal,
  isAuthenticated,
  onLoginRequired,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);

  const exchanges = EXCHANGES.map(ex => ({
    ...ex,
    connected: ex.id === 'paper' || connectedExchanges.includes(ex.id),
  }));

  const currentExchange = exchanges.find(ex => 
    isPaperMode ? ex.id === 'paper' : ex.id === activeExchange
  ) || exchanges[0];

  const filteredExchanges = exchanges.filter(ex => 
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleSelect = (exchangeId: string) => {
    if (exchangeId === 'paper') {
      onSelectExchange('paper');
      setIsOpen(false);
    } else if (!isAuthenticated) {
      onLoginRequired();
    } else if (connectedExchanges.includes(exchangeId)) {
      onSelectExchange(exchangeId);
      setIsOpen(false);
    } else {
      onOpenExchangeModal();
    }
  };

  // Star rating component
  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-1">
      <svg className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 18 18">
        <path d="m9 1.5 2.08 4.55 4.92.6-3.63 3.42.89 4.93L9 12.56 4.74 15l.88-4.93L2 6.66l4.91-.6L9 1.5Z" />
      </svg>
      <span className="text-xs text-gray-400">{rating.toFixed(1)}</span>
    </div>
  );

  return (
    <>
      {/* Bottom Sheet Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div 
            className="relative bg-[#0a0a0a] border-t border-[var(--border-color)] rounded-t-2xl overflow-hidden animate-slide-up"
            style={{ maxHeight: '70vh' }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-[var(--border-color)]">
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-600 rounded-full" />
              </div>
              
              {/* Title & Close */}
              <div className="flex items-center justify-between px-4 pb-3">
                <h2 className="text-lg font-semibold text-white">Connect to Trade</h2>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              {/* Search */}
              <div className="px-4 pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search exchanges..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#1a1a1a] border border-[var(--border-color)] rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent-blue)]"
                  />
                </div>
              </div>
            </div>
            
            {/* Exchange Cards Grid */}
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 140px)' }}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredExchanges.map(exchange => (
                  <button
                    key={exchange.id}
                    onClick={() => handleSelect(exchange.id)}
                    className={`relative flex flex-col items-center p-4 rounded-xl border transition-all hover:scale-[1.02] ${
                      currentExchange.id === exchange.id
                        ? 'bg-[var(--accent-blue)]/10 border-[var(--accent-blue)]'
                        : 'bg-[#111] border-[var(--border-color)] hover:border-gray-500'
                    }`}
                  >
                    {/* Favorite button */}
                    {exchange.id !== 'paper' && (
                      <button
                        onClick={(e) => toggleFavorite(exchange.id, e)}
                        className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded transition-colors"
                      >
                        <Star 
                          className={`w-3.5 h-3.5 ${favorites.includes(exchange.id) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}`} 
                        />
                      </button>
                    )}
                    
                    {/* Selected check */}
                    {currentExchange.id === exchange.id && (
                      <div className="absolute top-2 left-2">
                        <Check className="w-4 h-4 text-[var(--accent-blue)]" />
                      </div>
                    )}
                    
                    {/* Icon */}
                    <div className="text-3xl mb-2">{exchange.icon}</div>
                    
                    {/* Name */}
                    <span className="text-sm font-medium text-white mb-1">{exchange.name}</span>
                    
                    {/* Rating or Balance */}
                    {exchange.id === 'paper' ? (
                      <span className="text-xs text-yellow-400 font-mono">
                        ${paperBalance.toLocaleString()}
                      </span>
                    ) : exchange.rating > 0 ? (
                      <StarRating rating={exchange.rating} />
                    ) : null}
                    
                    {/* Status */}
                    <div className="mt-2">
                      {exchange.connected ? (
                        <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                          {exchange.id === 'paper' ? 'Simulator' : 'Connected'}
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded-full">
                          Connect
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Show all button */}
              <div className="flex justify-center mt-4">
                <button
                  onClick={onOpenExchangeModal}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Manage all exchanges
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button - TradingView style */}
      <div className="absolute bottom-2 right-16 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-center w-7 h-7 rounded-md transition-all ${
            isOpen 
              ? 'bg-[var(--accent-blue)] text-white' 
              : 'bg-[#1a1a1a] hover:bg-[#252525] text-gray-400 hover:text-white border border-[var(--border-color)]'
          }`}
          title="Select Exchange"
        >
          <svg viewBox="0 0 28 28" width="18" height="18" fill="currentColor">
            <path d="M19.32 6H8.68A2.68 2.68 0 0 0 6 8.68V11h1V8.68C7 7.75 7.75 7 8.68 7h10.64c.93 0 1.68.75 1.68 1.68V11h1V8.68C22 7.2 20.8 6 19.32 6ZM7 19.32c0 .93.75 1.68 1.68 1.68h10.64c.93 0 1.68-.75 1.68-1.68V17h1v2.32C22 20.8 20.8 22 19.32 22H8.68A2.68 2.68 0 0 1 6 19.32V17h1v2.32Z" />
          </svg>
        </button>
      </div>
    </>
  );
};

export default ExchangeSelectorBar;
