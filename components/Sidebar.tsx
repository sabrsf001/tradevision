
import React from 'react';
import { TrendingUp, Bell, Sparkles, AlertTriangle, UserCircle2, LogIn, Settings2, BookOpen, Keyboard } from './Icons';
import { ChartMode } from '../types';

interface SidebarProps {
  currentMode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
  onAlertClick: () => void;
  hasActiveAlerts: boolean;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onJournalClick?: () => void;
  onShortcutsClick?: () => void;
  isAuthenticated?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentMode, onModeChange, onAlertClick, hasActiveAlerts, onProfileClick, onSettingsClick, onJournalClick, onShortcutsClick, isAuthenticated }) => {
  const getButtonClass = (mode: ChartMode) => {
    const isActive = currentMode === mode;
    return `w-full p-2 sm:p-3 flex justify-center items-center transition-all duration-200 border-l-2 touch-active ${isActive 
        ? 'border-[var(--accent-blue)] text-white bg-[#2d2d2d]' 
        : 'border-transparent text-gray-400 hover:text-white hover:bg-[#252525] active:bg-[#2d2d2d]'
    }`;
  };

  return (
    <aside className="hidden sm:flex flex-shrink-0 w-[44px] sm:w-[50px] bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex-col items-center py-1 sm:py-2 space-y-1 sm:space-y-2 z-20">
      <button 
        className={getButtonClass('standard')} 
        onClick={() => onModeChange('standard')}
        title="Chart Mode"
      >
        <TrendingUp className="h-5 w-5" />
      </button>

      <button 
        onClick={onAlertClick}
        className={`w-full p-2 sm:p-3 flex justify-center items-center transition-colors relative touch-active ${hasActiveAlerts ? 'text-[var(--accent-bullish)]' : 'text-gray-400 hover:text-white hover:bg-[#252525] active:bg-[#2d2d2d]'}`}
        title="Set Price Alert"
      >
        <Bell className="h-5 w-5" />
        {hasActiveAlerts && <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--accent-bullish)] rounded-full animate-pulse"></span>}
      </button>

      <button 
        className={getButtonClass('ai')} 
        onClick={() => onModeChange('ai')}
        title="AI Assistant"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      <button 
        className={getButtonClass('black-swan')} 
        onClick={() => onModeChange('black-swan')}
        title="Black Swan / Risk"
      >
        <AlertTriangle className="h-5 w-5" />
      </button>

      <button 
        onClick={onJournalClick}
        className="w-full p-2 sm:p-3 flex justify-center items-center text-gray-400 hover:text-white hover:bg-[#252525] active:bg-[#2d2d2d] transition-colors touch-active"
        title="Trading Journal"
      >
        <BookOpen className="h-5 w-5" />
      </button>

      <div className="flex-grow"></div>

      <button 
        onClick={onShortcutsClick}
        className="w-full p-2 sm:p-3 flex justify-center items-center text-gray-400 hover:text-white hover:bg-[#252525] active:bg-[#2d2d2d] transition-colors touch-active"
        title="Keyboard Shortcuts (?)"
      >
        <Keyboard className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>

      <button 
        onClick={onSettingsClick}
        className="w-full p-2 sm:p-3 flex justify-center items-center text-gray-400 hover:text-white hover:bg-[#252525] active:bg-[#2d2d2d] transition-colors touch-active"
        title="Settings"
      >
        <Settings2 className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>

      <button 
        onClick={onProfileClick}
        className={`w-full p-2 sm:p-3 flex justify-center items-center transition-colors mb-2 touch-active ${
          isAuthenticated 
            ? 'text-[var(--accent-blue)] hover:bg-[#252525] active:bg-[#2d2d2d]' 
            : 'text-gray-400 hover:text-white hover:bg-[#252525] active:bg-[#2d2d2d]'
        }`}
        title={isAuthenticated ? 'Profile' : 'Sign In'}
      >
        {isAuthenticated ? (
          <UserCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
        ) : (
          <LogIn className="h-4 w-4 sm:h-5 sm:w-5" />
        )}
      </button>
    </aside>
  );
};

export default Sidebar;
