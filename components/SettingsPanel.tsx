/**
 * Settings Panel Component
 * Application settings and preferences - Mobile-friendly with bottom sheet
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Moon, Sun, Monitor, Bell, Download, Trash2, RefreshCw } from './Icons';
import { useThemeStore } from '../store/appStore';
import { clearAllData, exportData } from '../utils/db';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useThemeStore();
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);

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
    const savedNotifications = localStorage.getItem('tv_notifications');
    const savedSound = localStorage.getItem('tv_sound');
    const savedAutoRefresh = localStorage.getItem('tv_auto_refresh');
    if (savedNotifications !== null) setNotifications(savedNotifications === 'true');
    if (savedSound !== null) setSoundEnabled(savedSound === 'true');
    if (savedAutoRefresh !== null) setAutoRefresh(savedAutoRefresh === 'true');
  }, []);

  const saveSettings = (key: string, value: boolean) => {
    localStorage.setItem(key, String(value));
  };

  const handleExportData = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tradevision-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleClearData = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    try {
      await clearAllData();
      localStorage.clear();
      setConfirmClear(false);
      window.location.reload();
    } catch (error) {
      console.error('Clear data failed:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-hidden shadow-xl flex flex-col"
        style={{ transform: `translateY(${dragY}px)`, transition: isDragging ? 'none' : 'transform 0.2s ease-out' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="sheet-handle sm:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 bg-[var(--border-color)] rounded-full" />
        </div>
        
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-bold text-white">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-panel)] transition-colors touch-active">
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto overscroll-contain flex-1 safe-area-bottom">
          <section>
            <h3 className="text-sm font-semibold text-white mb-3">Appearance</h3>
            <div className="space-y-2">
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Theme</label>
              <div className="flex gap-2">
                {[
                  { value: 'light', icon: Sun, label: 'Light' },
                  { value: 'dark', icon: Moon, label: 'Dark' },
                  { value: 'system', icon: Monitor, label: 'System' },
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value as 'light' | 'dark' | 'system')}
                    className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl sm:rounded-lg border transition-colors touch-active ${
                      theme === value
                        ? 'bg-[var(--accent-blue)] border-[var(--accent-blue)] text-white'
                        : 'bg-[var(--bg-panel)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-blue)]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-white mb-3">Notifications</h3>
            <div className="space-y-3">
              <ToggleSetting icon={Bell} label="Price Alerts" description="Get notified when price targets are hit"
                checked={notifications} onChange={(v) => { setNotifications(v); saveSettings('tv_notifications', v); }} />
              <ToggleSetting icon={Bell} label="Sound Effects" description="Play sound for notifications"
                checked={soundEnabled} onChange={(v) => { setSoundEnabled(v); saveSettings('tv_sound', v); }} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-white mb-3">Data & Sync</h3>
            <div className="space-y-3">
              <ToggleSetting icon={RefreshCw} label="Auto Refresh" description="Automatically update chart data"
                checked={autoRefresh} onChange={(v) => { setAutoRefresh(v); saveSettings('tv_auto_refresh', v); }} />
            </div>
          </section>

          <section className="hidden sm:block">
            <h3 className="text-sm font-semibold text-white mb-3">Keyboard Shortcuts</h3>
            <div className="bg-[var(--bg-panel)] rounded-lg p-3 space-y-2 text-sm">
              <ShortcutRow keys={['?']} description="Show shortcuts" />
              <ShortcutRow keys={['⌘', 'K']} description="Search" />
              <ShortcutRow keys={['⌘', '/']} description="Toggle AI panel" />
              <ShortcutRow keys={['Esc']} description="Close modals" />
              <ShortcutRow keys={['1-5']} description="Switch timeframes" />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-white mb-3">Data Management</h3>
            <div className="space-y-2">
              <button onClick={handleExportData}
                className="w-full flex items-center gap-3 px-4 py-4 sm:py-3 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl sm:rounded-lg text-white hover:bg-[var(--bg-primary)] transition-colors touch-active">
                <Download className="w-5 h-5 text-[var(--accent-blue)]" />
                <div className="text-left">
                  <p className="text-sm font-medium">Export Data</p>
                  <p className="text-xs text-[var(--text-secondary)]">Download your watchlist and settings</p>
                </div>
              </button>
              
              <button onClick={handleClearData}
                className={`w-full flex items-center gap-3 px-4 py-4 sm:py-3 border rounded-xl sm:rounded-lg transition-colors touch-active ${
                  confirmClear ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-[var(--bg-panel)] border-[var(--border-color)] text-white hover:bg-[var(--bg-primary)]'
                }`}>
                <Trash2 className="w-5 h-5 text-red-400" />
                <div className="text-left">
                  <p className="text-sm font-medium">{confirmClear ? 'Click again to confirm' : 'Clear All Data'}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{confirmClear ? 'This action cannot be undone' : 'Reset app to default state'}</p>
                </div>
              </button>
            </div>
          </section>

          <div className="pt-4 border-t border-[var(--border-color)] text-center">
            <p className="text-xs text-[var(--text-secondary)]">TradeVision AI v0.0.2</p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ToggleSettingProps {
  icon: React.FC<{ className?: string }>;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleSetting: React.FC<ToggleSettingProps> = ({ icon: Icon, label, description, checked, onChange }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-[var(--bg-panel)] rounded-xl sm:rounded-lg">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-[var(--text-secondary)]" />
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>
      <button onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 sm:w-11 sm:h-6 rounded-full transition-colors touch-active ${checked ? 'bg-[var(--accent-blue)]' : 'bg-[var(--border-color)]'}`}>
        <span className={`absolute top-1 w-5 h-5 sm:w-4 sm:h-4 rounded-full bg-white transition-transform ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
};

const ShortcutRow: React.FC<{ keys: string[]; description: string }> = ({ keys, description }) => (
  <div className="flex items-center justify-between">
    <span className="text-[var(--text-secondary)]">{description}</span>
    <div className="flex gap-1">
      {keys.map((key, i) => (
        <kbd key={i} className="px-2 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-xs font-mono text-white">{key}</kbd>
      ))}
    </div>
  </div>
);

export default SettingsPanel;
