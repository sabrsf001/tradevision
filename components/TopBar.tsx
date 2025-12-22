import React, { useState } from 'react';
import { 
  Search, ChevronDown, CandlestickChart, AlertCircle, 
  History, Undo, Redo, Camera, Settings2, TrendingUp, LogIn, Keyboard
} from './Icons';
import { Timeframe, ChartType, User } from '../types';

interface TopBarProps {
  symbol: string;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  onToggleReplay: () => void;
  isReplayActive: boolean;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  onSave: () => void;
  onSymbolSearch?: () => void;
  onScreenshot?: () => void;
  isAuthenticated?: boolean;
  user?: User | null;
  onLogin?: () => void;
  onRegister?: () => void;
  onProfileClick?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ 
  symbol, 
  timeframe, 
  onTimeframeChange, 
  onToggleReplay, 
  isReplayActive,
  chartType,
  onChartTypeChange,
  onSave,
  onSymbolSearch,
  onScreenshot,
  isAuthenticated,
  user,
  onLogin,
  onRegister,
  onProfileClick
}) => {
  const timeframes: Timeframe[] = ['1m', '5m', '15m', '1H', '4H', '1D'];
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const getTimeframeClass = (tf: Timeframe) => {
    const base = "px-2 sm:px-3 py-1 rounded text-[10px] sm:text-xs font-medium transition-colors touch-active";
    if (timeframe === tf) {
      return base + " bg-[var(--text-primary)] text-[var(--bg-primary)]";
    }
    return base + " text-[var(--text-secondary)] hover:bg-[#252525] hover:text-white active:bg-[#252525]";
  };

  const getChartTypeButtonClass = () => {
    const base = "p-2 rounded hover:bg-[#252525] hover:text-white flex gap-1 items-center";
    if (showTypeMenu) {
      return base + " text-white bg-[#252525]";
    }
    return base + " text-[var(--text-secondary)]";
  };

  const getChartTypeOptionClass = (type: ChartType) => {
    const base = "w-full text-left px-4 py-3 text-sm rounded-lg flex items-center gap-3 transition-colors";
    if (chartType === type) {
      return base + " bg-[var(--accent-blue)] text-white";
    }
    return base + " text-gray-300 hover:bg-[#1a1a1a]";
  };

  const getReplayButtonClass = () => {
    const base = "p-1.5 sm:p-2 rounded transition-colors";
    if (isReplayActive) {
      return base + " bg-[var(--accent-blue)] text-white";
    }
    return base + " hover:bg-[#252525] text-[var(--text-secondary)] hover:text-white";
  };

  return (
    <header className="flex-shrink-0 h-[44px] sm:h-[50px] flex items-center px-2 sm:px-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] w-full overflow-x-auto scrollbar-hide">
      <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
        <span className="text-white font-bold text-sm sm:text-lg tracking-tight hidden sm:inline">TradeVision</span>
        <span className="text-white font-bold text-sm sm:text-lg tracking-tight sm:hidden">TV</span>
        <button 
          onClick={onSymbolSearch}
          className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-gray-500 cursor-pointer transition-colors w-28 sm:w-44 group touch-active"
        >
          <Search className="h-3 w-3 sm:h-4 sm:w-4 text-[var(--text-secondary)]" />
          <span className="text-white text-xs sm:text-sm font-medium flex-1 text-left truncate">{symbol}</span>
          <span className="text-xs text-gray-600 group-hover:text-gray-400 hidden sm:inline">/</span>
        </button>
      </div>

      <div className="flex items-center space-x-0.5 sm:space-x-1 mx-2 sm:mx-4 border-l border-[var(--border-color)] pl-2 sm:pl-4 flex-shrink-0">
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => onTimeframeChange(tf)}
            className={getTimeframeClass(tf)}
            disabled={isReplayActive}
          >
            {tf}
          </button>
        ))}
      </div>

      <div className="flex items-center space-x-1 border-l border-r border-[var(--border-color)] px-1 sm:px-2 relative flex-shrink-0 hidden sm:flex">
        <div className="relative">
          <button 
            onClick={() => setShowTypeMenu(!showTypeMenu)}
            className={getChartTypeButtonClass()} 
            title="Chart Type"
          >
            {chartType === 'Candlestick' && <CandlestickChart className="h-5 w-5" />}
            {chartType === 'Area' && <TrendingUp className="h-5 w-5" />}
            {chartType === 'Line' && <TrendingUp className="h-5 w-5" />}
            <ChevronDown className="h-3 w-3" />
          </button>

          {showTypeMenu && (
            <>
              <div className="fixed inset-0 z-[100]" onClick={() => setShowTypeMenu(false)} />
              <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] bg-[#0a0a0a] border border-[var(--border-color)] rounded-xl shadow-2xl z-[101] overflow-hidden">
                <div className="p-3 border-b border-[var(--border-color)] flex justify-between items-center">
                  <h3 className="text-white text-sm font-semibold">Chart Type</h3>
                  <button onClick={() => setShowTypeMenu(false)} className="text-gray-500 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-2">
                  <button 
                    onClick={() => { onChartTypeChange('Candlestick'); setShowTypeMenu(false); }}
                    className={getChartTypeOptionClass('Candlestick')}
                  >
                    <CandlestickChart className="h-5 w-5" />
                    <div><p className="font-medium">Candlestick</p><p className="text-xs text-gray-500">Classic OHLC candles</p></div>
                  </button>
                  <button 
                    onClick={() => { onChartTypeChange('Line'); setShowTypeMenu(false); }}
                    className={getChartTypeOptionClass('Line')}
                  >
                    <TrendingUp className="h-5 w-5" />
                    <div><p className="font-medium">Line</p><p className="text-xs text-gray-500">Simple line chart</p></div>
                  </button>
                  <button 
                    onClick={() => { onChartTypeChange('Area'); setShowTypeMenu(false); }}
                    className={getChartTypeOptionClass('Area')}
                  >
                    <TrendingUp className="h-5 w-5" />
                    <div><p className="font-medium">Area</p><p className="text-xs text-gray-500">Filled area chart</p></div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <button className="p-2 rounded hover:bg-[#252525] text-[var(--text-secondary)] hover:text-white hidden sm:block" title="Alerts">
          <AlertCircle className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-grow"></div>

      <div className="flex items-center space-x-1 sm:space-x-2">
        <button 
          onClick={onToggleReplay}
          className={getReplayButtonClass()}
          title="Replay Mode"
        >
          <History className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <button className="p-1.5 sm:p-2 rounded hover:bg-[#252525] text-[var(--text-secondary)] hover:text-white hidden sm:block" title="Undo"><Undo className="h-5 w-5" /></button>
        <button className="p-1.5 sm:p-2 rounded hover:bg-[#252525] text-[var(--text-secondary)] hover:text-white hidden sm:block" title="Redo"><Redo className="h-5 w-5" /></button>
        <div className="h-5 w-px bg-[var(--border-color)] mx-1 sm:mx-2 hidden sm:block"></div>
        <button className="p-1.5 sm:p-2 rounded hover:bg-[#252525] text-[var(--text-secondary)] hover:text-white hidden md:block" title="Keyboard Shortcuts"><Keyboard className="h-5 w-5" /></button>
        <button className="p-1.5 sm:p-2 rounded hover:bg-[#252525] text-[var(--text-secondary)] hover:text-white hidden md:block"><Settings2 className="h-5 w-5" /></button>
        <button onClick={onScreenshot} className="p-1.5 sm:p-2 rounded hover:bg-[#252525] text-[var(--text-secondary)] hover:text-white hidden sm:block" title="Screenshot (Ctrl+Shift+S)"><Camera className="h-5 w-5" /></button>
        <button onClick={onSave} className="px-2 sm:px-4 py-1 sm:py-1.5 text-black bg-white rounded-md text-[10px] sm:text-xs font-bold hover:bg-gray-200 transition-colors hidden sm:block">Save</button>
        <div className="h-5 w-px bg-[var(--border-color)] mx-1 sm:mx-2 hidden sm:block"></div>
        
        {isAuthenticated && user ? (
          <button onClick={onProfileClick} className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md border border-[var(--border-color)] hover:bg-[var(--bg-panel)] transition-colors">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-[var(--accent-blue)] to-purple-600 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs sm:text-sm text-white hidden md:inline">{user.name.split(' ')[0]}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={onLogin} className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-[var(--text-secondary)] hover:text-white transition-colors">
              <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
            <button onClick={onRegister} className="px-2 sm:px-4 py-1 sm:py-1.5 bg-[var(--accent-blue)] text-white rounded-md text-[10px] sm:text-xs font-bold hover:bg-neutral-700 transition-colors hidden sm:block">Sign Up</button>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;
