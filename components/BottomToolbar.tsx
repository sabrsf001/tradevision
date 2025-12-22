/**
 * Bottom Toolbar - TradingView Style
 * Date range selector + Trading panel with exchanges
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Search, Star, Check, Calendar, Clock } from './Icons';

interface ExchangeOption {
  id: string;
  name: string;
  icon: string;
  rating: number;
  description: string;
  connected: boolean;
}

interface BottomToolbarProps {
  currentTimeframe: string;
  onTimeframeChange: (tf: string) => void;
  isPaperMode: boolean;
  paperBalance: number;
  activeExchange: string;
  connectedExchanges: string[];
  onSelectExchange: (exchangeId: string) => void;
  onOpenExchangeModal: () => void;
  isAuthenticated: boolean;
  onLoginRequired: () => void;
}

const DATE_RANGES = [
  { id: '1D', label: '1D', tooltip: '1 day in 1-minute intervals' },
  { id: '5D', label: '5D', tooltip: '5 days in 5-minute intervals' },
  { id: '1M', label: '1M', tooltip: '1 month in 30-minute intervals' },
  { id: '3M', label: '3M', tooltip: '3 months in 1-hour intervals' },
  { id: '6M', label: '6M', tooltip: '6 months in 2-hour intervals' },
  { id: 'YTD', label: 'YTD', tooltip: 'Year to date in 1-day intervals' },
  { id: '1Y', label: '1Y', tooltip: '1 year in 1-day intervals' },
  { id: '5Y', label: '5Y', tooltip: '5 years in 1-week intervals' },
  { id: 'ALL', label: 'All', tooltip: 'All data in 1-month intervals' },
];

const EXCHANGES: ExchangeOption[] = [
  { id: 'paper', name: 'Paper Trading', icon: '📝', rating: 0, description: 'TradeVision Simulator', connected: true },
  { id: 'okx', name: 'OKX', icon: '⚪', rating: 4.9, description: 'Global crypto exchange', connected: false },
  { id: 'bybit', name: 'Bybit', icon: '🟠', rating: 4.8, description: 'Crypto derivatives', connected: false },
  { id: 'capitalcom', name: 'Capital.com', icon: '🔴', rating: 4.8, description: 'CFD trading', connected: false },
  { id: 'whitebit', name: 'WhiteBIT', icon: '⬜', rating: 4.7, description: 'EU crypto exchange', connected: false },
  { id: 'icmarkets', name: 'IC Markets', icon: '🔵', rating: 4.7, description: 'Forex & CFD', connected: false },
  { id: 'easymarkets', name: 'easyMarkets', icon: '🟢', rating: 4.6, description: 'Easy trading', connected: false },
  { id: 'activtrades', name: 'ActivTrades', icon: '🟣', rating: 4.6, description: 'Multi-asset broker', connected: false },
  { id: 'tickmill', name: 'Tickmill', icon: '🔷', rating: 4.6, description: 'Low spreads', connected: false },
  { id: 'forexcom', name: 'FOREX.com', icon: '🟦', rating: 4.5, description: 'Forex trading', connected: false },
  { id: 'binance', name: 'Binance', icon: '🟡', rating: 4.5, description: 'World\'s largest exchange', connected: false },
  { id: 'eightcap', name: 'Eightcap', icon: '🟤', rating: 4.4, description: 'MT4/MT5 broker', connected: false },
  { id: 'fxpro', name: 'FxPro', icon: '🟠', rating: 4.4, description: 'Pro trading', connected: false },
  { id: 'cmcmarkets', name: 'CMC Markets', icon: '🔶', rating: 4.4, description: 'Spread betting', connected: false },
  { id: 'gate', name: 'Gate.io', icon: '🔷', rating: 4.4, description: 'Altcoin paradise', connected: false },
  { id: 'bingx', name: 'BingX', icon: '🔵', rating: 4.3, description: 'Social trading', connected: false },
  { id: 'bitget', name: 'Bitget', icon: '🟢', rating: 4.4, description: 'Copy trading', connected: false },
  { id: 'kucoin', name: 'KuCoin', icon: '🟩', rating: 4.2, description: 'People\'s exchange', connected: false },
  { id: 'mexc', name: 'MEXC', icon: '🔶', rating: 4.1, description: 'Global exchange', connected: false },
  { id: 'htx', name: 'HTX', icon: '🔴', rating: 3.8, description: 'Former Huobi', connected: false },
];

export const BottomToolbar: React.FC<BottomToolbarProps> = ({
  currentTimeframe,
  onTimeframeChange,
  isPaperMode,
  paperBalance,
  activeExchange,
  connectedExchanges,
  onSelectExchange,
  onOpenExchangeModal,
  isAuthenticated,
  onLoginRequired,
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [panelHeight, setPanelHeight] = useState(300);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState('5Y');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [visibleCount, setVisibleCount] = useState(8); // Show only top brokers initially
  
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Get visible exchanges (limited by visibleCount unless searching)
  const visibleExchanges = searchQuery 
    ? filteredExchanges 
    : filteredExchanges.slice(0, visibleCount);
  
  const hasMoreToShow = !searchQuery && filteredExchanges.length > visibleCount;

  const loadMoreBrokers = () => {
    setVisibleCount(prev => prev + 8);
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleSelect = (exchangeId: string) => {
    if (exchangeId === 'paper') {
      onSelectExchange('paper');
    } else if (!isAuthenticated) {
      onLoginRequired();
    } else if (connectedExchanges.includes(exchangeId)) {
      onSelectExchange(exchangeId);
    } else {
      onOpenExchangeModal();
    }
  };

  // Handle drag to resize
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = panelHeight;
  };

  useEffect(() => {
    const handleDrag = (e: MouseEvent) => {
      if (!isDragging) return;
      const delta = dragStartY.current - e.clientY;
      const newHeight = Math.min(Math.max(dragStartHeight.current + delta, 200), window.innerHeight * 0.8);
      setPanelHeight(newHeight);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging]);

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const offset = -date.getTimezoneOffset() / 60;
    const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
    return `${hours}:${minutes}:${seconds} UTC${offsetStr}`;
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
    <div className="absolute bottom-0 left-0 right-0 z-50 flex flex-col">
      {/* Expandable Trading Panel */}
      {isPanelOpen && (
        <div 
          ref={panelRef}
          className="bg-[#0a0a0a] border-t border-[var(--border-color)] overflow-hidden"
          style={{ height: isMaximized ? 'calc(100vh - 100px)' : panelHeight }}
        >
          {/* Drag Handle */}
          <div 
            className="h-1.5 cursor-ns-resize hover:bg-[var(--accent-blue)]/50 transition-colors flex justify-center items-center"
            onMouseDown={handleDragStart}
          >
            <div className="w-10 h-1 bg-gray-600 rounded-full" />
          </div>

          {/* Panel Content */}
          <div className="h-full overflow-y-auto p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Connect to Trade via Trusted Brokers</h2>
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Find broker..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-[#1a1a1a] border border-[var(--border-color)] rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent-blue)]"
                />
              </div>
            </div>

            {/* Exchange Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {visibleExchanges.map(exchange => (
                <button
                  key={exchange.id}
                  onClick={() => handleSelect(exchange.id)}
                  className={`relative flex flex-col items-center p-3 rounded-xl border transition-all hover:scale-[1.02] ${
                    currentExchange.id === exchange.id
                      ? 'bg-[var(--accent-blue)]/10 border-[var(--accent-blue)]'
                      : 'bg-[#111] border-[var(--border-color)] hover:border-gray-500'
                  }`}
                >
                  {/* Favorite button */}
                  {exchange.id !== 'paper' && (
                    <button
                      onClick={(e) => toggleFavorite(exchange.id, e)}
                      className="absolute top-2 right-2 p-0.5 hover:bg-white/10 rounded transition-colors"
                    >
                      <Star 
                        className={`w-3 h-3 ${favorites.includes(exchange.id) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} 
                      />
                    </button>
                  )}
                  
                  {/* Icon */}
                  <div className="text-2xl mb-1.5">{exchange.icon}</div>
                  
                  {/* Name */}
                  <span className="text-xs font-medium text-white mb-0.5">{exchange.name}</span>
                  
                  {/* Rating or Balance */}
                  {exchange.id === 'paper' ? (
                    <span className="text-[10px] text-gray-500">TradeVision Simulator</span>
                  ) : exchange.rating > 0 ? (
                    <StarRating rating={exchange.rating} />
                  ) : null}
                </button>
              ))}
            </div>

            {/* Load More Button */}
            {hasMoreToShow && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={loadMoreBrokers}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 border border-[var(--border-color)] rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="16" height="16" fill="currentColor">
                    <path fillRule="evenodd" d="M4.5 4.5h15a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1ZM2 5.5A2.5 2.5 0 0 1 4.5 3h15A2.5 2.5 0 0 1 22 5.5v.58l1.92.33a2.5 2.5 0 0 1 2.04 2.88L23.48 23.9a2.5 2.5 0 0 1-2.9 2.05L4.27 23.07V23A2.5 2.5 0 0 1 2 20.5v-15Zm9.25 7V8h1.5v4.5H17V14h-4.25v4h-1.5v-4H7v-1.5h4.25Z"/>
                  </svg>
                  Load more brokers ({filteredExchanges.length - visibleCount} remaining)
                </button>
              </div>
            )}

            {/* Bottom info */}
            <div className="flex justify-center mt-4 text-xs text-gray-500">
              {visibleExchanges.length} of {filteredExchanges.length} brokers shown
            </div>
          </div>
        </div>
      )}

      {/* Date Range Toolbar */}
      <div className="flex items-center h-8 bg-[#131313] border-t border-[var(--border-color)] px-2 gap-1">
        {/* Date Range Buttons */}
        <div className="flex items-center gap-0.5">
          {DATE_RANGES.map(range => (
            <button
              key={range.id}
              onClick={() => setSelectedDateRange(range.id)}
              className={`px-2 py-1 text-[11px] rounded transition-colors ${
                selectedDateRange === range.id
                  ? 'bg-[var(--accent-blue)] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title={range.tooltip}
            >
              {range.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-[var(--border-color)] mx-1" />

        {/* Go to date button */}
        <button 
          className="p-1 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
          title="Go to date"
        >
          <Calendar className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {/* Timezone */}
        <button className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors">
          <Clock className="w-3 h-3" />
          {formatTime(currentTime)}
        </button>
      </div>

      {/* Trading Panel Tab Bar */}
      <div className="flex items-center h-9 bg-[#0d0d0d] border-t border-[var(--border-color)]">
        {/* Tabs */}
        <div className="flex items-center h-full">
          <button
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className={`flex items-center gap-2 h-full px-4 text-sm border-r border-[var(--border-color)] transition-colors ${
              isPanelOpen ? 'bg-[#1a1a1a] text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>Trading Panel</span>
            {isPaperMode && (
              <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                ${paperBalance.toLocaleString()}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1" />

        {/* Panel controls */}
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`p-2 transition-colors border-l border-[var(--border-color)] ${
            isPanelOpen ? 'text-[var(--accent-blue)]' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          title={isPanelOpen ? 'Close panel' : 'Open panel'}
        >
          <svg width="19" height="12" fill="none" className={`transform transition-transform ${isPanelOpen ? 'rotate-180' : ''}`}>
            <path stroke="currentColor" strokeWidth="1.5" d="M1 8l8.5-6.5L18 8" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default BottomToolbar;
