/**
 * Mobile Navigation Bar
 * Bottom navigation for mobile devices
 */

import React from 'react';
import { TrendingUp, Bell, Sparkles, AlertTriangle, Settings2, Search, User } from './Icons';
import { ChartMode } from '../types';

interface MobileNavBarProps {
  currentMode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
  onAlertClick: () => void;
  onSettingsClick: () => void;
  onSearchClick: () => void;
  onProfileClick: () => void;
  hasActiveAlerts: boolean;
  isAuthenticated?: boolean;
}

const MobileNavBar: React.FC<MobileNavBarProps> = ({
  currentMode,
  onModeChange,
  onAlertClick,
  onSettingsClick,
  onSearchClick,
  onProfileClick,
  hasActiveAlerts,
  isAuthenticated,
}) => {
  const navItems = [
    {
      id: 'chart',
      icon: TrendingUp,
      label: 'Chart',
      onClick: () => onModeChange('standard'),
      isActive: currentMode === 'standard',
    },
    {
      id: 'search',
      icon: Search,
      label: 'Search',
      onClick: onSearchClick,
      isActive: false,
    },
    {
      id: 'ai',
      icon: Sparkles,
      label: 'AI',
      onClick: () => onModeChange('ai'),
      isActive: currentMode === 'ai',
    },
    {
      id: 'alerts',
      icon: Bell,
      label: 'Alerts',
      onClick: onAlertClick,
      isActive: false,
      badge: hasActiveAlerts,
    },
    {
      id: 'more',
      icon: Settings2,
      label: 'More',
      onClick: onSettingsClick,
      isActive: false,
    },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`flex flex-col items-center justify-center flex-1 h-full py-2 px-1 transition-colors relative touch-active ${
              item.isActive
                ? 'text-[var(--accent-blue)]'
                : 'text-[var(--text-secondary)] active:text-white'
            }`}
          >
            <div className="relative">
              <item.icon className="w-6 h-6" />
              {item.badge && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[var(--accent-bullish)] rounded-full animate-pulse" />
              )}
            </div>
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default MobileNavBar;
