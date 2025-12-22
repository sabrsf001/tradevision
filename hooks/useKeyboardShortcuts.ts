/**
 * Keyboard Shortcuts Hook for TradeVision
 * Global and component-specific keyboard shortcuts
 */

import { useEffect, useCallback, useRef } from 'react';

// ============================================
// Types
// ============================================
type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta';

interface ShortcutConfig {
  key: string;
  modifiers?: ModifierKey[];
  action: () => void;
  description: string;
  enabled?: boolean;
  preventDefault?: boolean;
}

interface ShortcutGroup {
  name: string;
  shortcuts: ShortcutConfig[];
}

// ============================================
// Keyboard Shortcut Hook
// ============================================
export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  options: {
    enabled?: boolean;
    scope?: 'global' | 'local';
  } = {}
) {
  const { enabled = true, scope = 'global' } = options;
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        scope === 'global' &&
        (e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target as HTMLElement).isContentEditable)
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue;

        const modifiers = shortcut.modifiers ?? [];
        const ctrlRequired = modifiers.includes('ctrl');
        const altRequired = modifiers.includes('alt');
        const shiftRequired = modifiers.includes('shift');
        const metaRequired = modifiers.includes('meta');

        const ctrlMatch = ctrlRequired === (e.ctrlKey || e.metaKey);
        const altMatch = altRequired === e.altKey;
        const shiftMatch = shiftRequired === e.shiftKey;
        const metaMatch = metaRequired === e.metaKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && altMatch && shiftMatch && metaMatch && keyMatch) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }
          shortcut.action();
          return;
        }
      }
    };

    const target = scope === 'local' && elementRef.current ? elementRef.current : window;
    target.addEventListener('keydown', handleKeyDown as EventListener);

    return () => {
      target.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [shortcuts, enabled, scope]);

  return elementRef;
}

// ============================================
// Default Trading Shortcuts
// ============================================
export function useTradingShortcuts(handlers: {
  onToggleSidebar?: () => void;
  onToggleWatchlist?: () => void;
  onToggleAIPanel?: () => void;
  onSearch?: () => void;
  onNewChart?: () => void;
  onScreenshot?: () => void;
  onToggleFullscreen?: () => void;
  onTimeframeChange?: (timeframe: string) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onToggleIndicators?: () => void;
  onToggleDrawingMode?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
}) {
  const shortcuts: ShortcutConfig[] = [
    // Layout shortcuts
    {
      key: 'b',
      modifiers: ['ctrl'],
      action: handlers.onToggleSidebar ?? (() => {}),
      description: 'Toggle sidebar',
      enabled: !!handlers.onToggleSidebar,
    },
    {
      key: 'w',
      modifiers: ['ctrl', 'shift'],
      action: handlers.onToggleWatchlist ?? (() => {}),
      description: 'Toggle watchlist',
      enabled: !!handlers.onToggleWatchlist,
    },
    {
      key: 'i',
      modifiers: ['ctrl', 'shift'],
      action: handlers.onToggleAIPanel ?? (() => {}),
      description: 'Toggle AI panel',
      enabled: !!handlers.onToggleAIPanel,
    },
    
    // Search and navigation
    {
      key: 'k',
      modifiers: ['ctrl'],
      action: handlers.onSearch ?? (() => {}),
      description: 'Open symbol search',
      enabled: !!handlers.onSearch,
    },
    {
      key: 'n',
      modifiers: ['ctrl'],
      action: handlers.onNewChart ?? (() => {}),
      description: 'New chart',
      enabled: !!handlers.onNewChart,
    },
    
    // Screenshot and export
    {
      key: 's',
      modifiers: ['ctrl', 'shift'],
      action: handlers.onScreenshot ?? (() => {}),
      description: 'Take screenshot',
      enabled: !!handlers.onScreenshot,
    },
    
    // Fullscreen
    {
      key: 'f',
      modifiers: ['ctrl'],
      action: handlers.onToggleFullscreen ?? (() => {}),
      description: 'Toggle fullscreen',
      enabled: !!handlers.onToggleFullscreen,
    },
    
    // Timeframe shortcuts
    {
      key: '1',
      action: () => handlers.onTimeframeChange?.('1m'),
      description: '1 minute timeframe',
      enabled: !!handlers.onTimeframeChange,
    },
    {
      key: '5',
      action: () => handlers.onTimeframeChange?.('5m'),
      description: '5 minute timeframe',
      enabled: !!handlers.onTimeframeChange,
    },
    {
      key: '0',
      action: () => handlers.onTimeframeChange?.('15m'),
      description: '15 minute timeframe',
      enabled: !!handlers.onTimeframeChange,
    },
    {
      key: 'h',
      action: () => handlers.onTimeframeChange?.('1h'),
      description: '1 hour timeframe',
      enabled: !!handlers.onTimeframeChange,
    },
    {
      key: 'd',
      action: () => handlers.onTimeframeChange?.('1d'),
      description: '1 day timeframe',
      enabled: !!handlers.onTimeframeChange,
    },
    {
      key: 'w',
      action: () => handlers.onTimeframeChange?.('1w'),
      description: '1 week timeframe',
      enabled: !!handlers.onTimeframeChange,
    },
    
    // Zoom controls
    {
      key: '+',
      modifiers: ['ctrl'],
      action: handlers.onZoomIn ?? (() => {}),
      description: 'Zoom in',
      enabled: !!handlers.onZoomIn,
    },
    {
      key: '=',
      modifiers: ['ctrl'],
      action: handlers.onZoomIn ?? (() => {}),
      description: 'Zoom in',
      enabled: !!handlers.onZoomIn,
    },
    {
      key: '-',
      modifiers: ['ctrl'],
      action: handlers.onZoomOut ?? (() => {}),
      description: 'Zoom out',
      enabled: !!handlers.onZoomOut,
    },
    {
      key: '0',
      modifiers: ['ctrl'],
      action: handlers.onResetZoom ?? (() => {}),
      description: 'Reset zoom',
      enabled: !!handlers.onResetZoom,
    },
    
    // Chart tools
    {
      key: 'i',
      modifiers: ['ctrl'],
      action: handlers.onToggleIndicators ?? (() => {}),
      description: 'Toggle indicators panel',
      enabled: !!handlers.onToggleIndicators,
    },
    {
      key: 'd',
      modifiers: ['ctrl'],
      action: handlers.onToggleDrawingMode ?? (() => {}),
      description: 'Toggle drawing mode',
      enabled: !!handlers.onToggleDrawingMode,
    },
    
    // Edit operations
    {
      key: 'z',
      modifiers: ['ctrl'],
      action: handlers.onUndo ?? (() => {}),
      description: 'Undo',
      enabled: !!handlers.onUndo,
    },
    {
      key: 'z',
      modifiers: ['ctrl', 'shift'],
      action: handlers.onRedo ?? (() => {}),
      description: 'Redo',
      enabled: !!handlers.onRedo,
    },
    {
      key: 'y',
      modifiers: ['ctrl'],
      action: handlers.onRedo ?? (() => {}),
      description: 'Redo',
      enabled: !!handlers.onRedo,
    },
    {
      key: 's',
      modifiers: ['ctrl'],
      action: handlers.onSave ?? (() => {}),
      description: 'Save',
      enabled: !!handlers.onSave,
    },
  ];

  return useKeyboardShortcuts(shortcuts);
}

// ============================================
// Shortcuts Help Modal Data
// ============================================
export function getShortcutGroups(): ShortcutGroup[] {
  return [
    {
      name: 'Navigation',
      shortcuts: [
        { key: 'k', modifiers: ['ctrl'], action: () => {}, description: 'Open symbol search' },
        { key: 'n', modifiers: ['ctrl'], action: () => {}, description: 'New chart' },
        { key: 'f', modifiers: ['ctrl'], action: () => {}, description: 'Toggle fullscreen' },
      ],
    },
    {
      name: 'Layout',
      shortcuts: [
        { key: 'b', modifiers: ['ctrl'], action: () => {}, description: 'Toggle sidebar' },
        { key: 'w', modifiers: ['ctrl', 'shift'], action: () => {}, description: 'Toggle watchlist' },
        { key: 'i', modifiers: ['ctrl', 'shift'], action: () => {}, description: 'Toggle AI panel' },
      ],
    },
    {
      name: 'Timeframes',
      shortcuts: [
        { key: '1', action: () => {}, description: '1 minute' },
        { key: '5', action: () => {}, description: '5 minutes' },
        { key: 'h', action: () => {}, description: '1 hour' },
        { key: 'd', action: () => {}, description: '1 day' },
        { key: 'w', action: () => {}, description: '1 week' },
      ],
    },
    {
      name: 'Zoom',
      shortcuts: [
        { key: '+', modifiers: ['ctrl'], action: () => {}, description: 'Zoom in' },
        { key: '-', modifiers: ['ctrl'], action: () => {}, description: 'Zoom out' },
        { key: '0', modifiers: ['ctrl'], action: () => {}, description: 'Reset zoom' },
      ],
    },
    {
      name: 'Chart Tools',
      shortcuts: [
        { key: 'i', modifiers: ['ctrl'], action: () => {}, description: 'Indicators' },
        { key: 'd', modifiers: ['ctrl'], action: () => {}, description: 'Drawing mode' },
        { key: 's', modifiers: ['ctrl', 'shift'], action: () => {}, description: 'Screenshot' },
      ],
    },
    {
      name: 'Edit',
      shortcuts: [
        { key: 'z', modifiers: ['ctrl'], action: () => {}, description: 'Undo' },
        { key: 'z', modifiers: ['ctrl', 'shift'], action: () => {}, description: 'Redo' },
        { key: 's', modifiers: ['ctrl'], action: () => {}, description: 'Save' },
      ],
    },
  ];
}

// ============================================
// Format Shortcut for Display
// ============================================
export function formatShortcut(config: Pick<ShortcutConfig, 'key' | 'modifiers'>): string {
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
  const parts: string[] = [];

  if (config.modifiers) {
    if (config.modifiers.includes('ctrl')) {
      parts.push(isMac ? '⌘' : 'Ctrl');
    }
    if (config.modifiers.includes('alt')) {
      parts.push(isMac ? '⌥' : 'Alt');
    }
    if (config.modifiers.includes('shift')) {
      parts.push(isMac ? '⇧' : 'Shift');
    }
    if (config.modifiers.includes('meta')) {
      parts.push(isMac ? '⌘' : 'Win');
    }
  }

  const keyDisplay = config.key.length === 1 ? config.key.toUpperCase() : config.key;
  parts.push(keyDisplay);

  return parts.join(isMac ? '' : '+');
}

// ============================================
// Escape Key Hook
// ============================================
export function useEscapeKey(onEscape: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, enabled]);
}

// ============================================
// Arrow Key Navigation
// ============================================
export function useArrowNavigation(
  onNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          onNavigate('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          onNavigate('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onNavigate('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNavigate('right');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate, enabled]);
}
