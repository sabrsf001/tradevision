import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { 
  ChartMode, 
  Timeframe, 
  DrawingTool, 
  DrawingObject, 
  PriceAlert,
  Indicator,
  ChartIndicatorSettings,
  WatchlistItem,
  ChartType 
} from '../types';

// ============================================
// Theme Store
// ============================================
export type Theme = 'dark' | 'light' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      resolvedTheme: 'dark',
      setTheme: (theme) => {
        const resolved = theme === 'system' 
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : theme;
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(resolved);
        set({ theme, resolvedTheme: resolved });
      },
    }),
    {
      name: 'tradevision-theme',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============================================
// Layout Store
// ============================================
export interface LayoutTemplate {
  id: string;
  name: string;
  createdAt: number;
  config: {
    sidebarCollapsed: boolean;
    watchlistVisible: boolean;
    aiPanelVisible: boolean;
    chartType: ChartType;
    timeframe: Timeframe;
    indicators: string[];
  };
}

interface LayoutState {
  sidebarCollapsed: boolean;
  watchlistVisible: boolean;
  aiPanelVisible: boolean;
  templates: LayoutTemplate[];
  activeTemplateId: string | null;
  toggleSidebar: () => void;
  toggleWatchlist: () => void;
  toggleAIPanel: () => void;
  saveTemplate: (name: string, config: LayoutTemplate['config']) => void;
  loadTemplate: (id: string) => LayoutTemplate['config'] | null;
  deleteTemplate: (id: string) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      watchlistVisible: true,
      aiPanelVisible: false,
      templates: [],
      activeTemplateId: null,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleWatchlist: () => set((s) => ({ watchlistVisible: !s.watchlistVisible })),
      toggleAIPanel: () => set((s) => ({ aiPanelVisible: !s.aiPanelVisible })),
      saveTemplate: (name, config) => {
        const template: LayoutTemplate = {
          id: crypto.randomUUID(),
          name,
          createdAt: Date.now(),
          config,
        };
        set((s) => ({ templates: [...s.templates, template] }));
      },
      loadTemplate: (id) => {
        const template = get().templates.find((t) => t.id === id);
        if (template) {
          set({ activeTemplateId: id });
          return template.config;
        }
        return null;
      },
      deleteTemplate: (id) => {
        set((s) => ({
          templates: s.templates.filter((t) => t.id !== id),
          activeTemplateId: s.activeTemplateId === id ? null : s.activeTemplateId,
        }));
      },
    }),
    {
      name: 'tradevision-layout',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============================================
// Alerts Store
// ============================================
interface AlertsState {
  alerts: PriceAlert[];
  triggeredAlerts: Set<string>;
  addAlert: (alert: Omit<PriceAlert, 'id'>) => void;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;
  triggerAlert: (id: string) => void;
  checkAlerts: (symbol: string, price: number) => PriceAlert[];
}

export const useAlertsStore = create<AlertsState>()(
  persist(
    (set, get) => ({
      alerts: [],
      triggeredAlerts: new Set(),
      addAlert: (alert) => {
        const newAlert: PriceAlert = {
          ...alert,
          id: crypto.randomUUID(),
        };
        set((s) => ({ alerts: [...s.alerts, newAlert] }));
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      },
      removeAlert: (id) => {
        set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) }));
      },
      toggleAlert: (id) => {
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id ? { ...a, isActive: !a.isActive } : a
          ),
        }));
      },
      triggerAlert: (id) => {
        const alert = get().alerts.find((a) => a.id === id);
        if (alert && !get().triggeredAlerts.has(id)) {
          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Price Alert Triggered!', {
              body: `${alert.symbol} is ${alert.condition} $${alert.targetPrice}`,
              icon: '/icons/icon-192.png',
            });
          }
          set((s) => ({
            triggeredAlerts: new Set([...s.triggeredAlerts, id]),
          }));
        }
      },
      checkAlerts: (symbol, price) => {
        const { alerts, triggerAlert, triggeredAlerts } = get();
        const triggered: PriceAlert[] = [];
        
        alerts
          .filter((a) => a.symbol === symbol && a.isActive && !triggeredAlerts.has(a.id))
          .forEach((alert) => {
            const shouldTrigger =
              (alert.condition === 'above' && price >= alert.targetPrice) ||
              (alert.condition === 'below' && price <= alert.targetPrice);
            
            if (shouldTrigger) {
              triggerAlert(alert.id);
              triggered.push(alert);
            }
          });
        
        return triggered;
      },
    }),
    {
      name: 'tradevision-alerts',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ alerts: state.alerts }),
    }
  )
);

// ============================================
// Multi-Chart Store
// ============================================
export interface ChartInstance {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
}

interface MultiChartState {
  charts: ChartInstance[];
  activeChartId: string | null;
  layout: '1x1' | '1x2' | '2x1' | '2x2';
  addChart: (symbol: string) => void;
  removeChart: (id: string) => void;
  setActiveChart: (id: string) => void;
  updateChart: (id: string, updates: Partial<ChartInstance>) => void;
  setLayout: (layout: MultiChartState['layout']) => void;
}

export const useMultiChartStore = create<MultiChartState>((set, get) => ({
  charts: [{ id: 'main', symbol: 'BTCUSD', timeframe: '1D', chartType: 'Candlestick' }],
  activeChartId: 'main',
  layout: '1x1',
  addChart: (symbol) => {
    const maxCharts = { '1x1': 1, '1x2': 2, '2x1': 2, '2x2': 4 };
    if (get().charts.length >= maxCharts[get().layout]) return;
    
    const newChart: ChartInstance = {
      id: crypto.randomUUID(),
      symbol,
      timeframe: '1D',
      chartType: 'Candlestick',
    };
    set((s) => ({ charts: [...s.charts, newChart], activeChartId: newChart.id }));
  },
  removeChart: (id) => {
    if (get().charts.length <= 1) return;
    set((s) => ({
      charts: s.charts.filter((c) => c.id !== id),
      activeChartId: s.activeChartId === id ? s.charts[0].id : s.activeChartId,
    }));
  },
  setActiveChart: (id) => set({ activeChartId: id }),
  updateChart: (id, updates) => {
    set((s) => ({
      charts: s.charts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  },
  setLayout: (layout) => {
    const maxCharts = { '1x1': 1, '1x2': 2, '2x1': 2, '2x2': 4 };
    set((s) => ({
      layout,
      charts: s.charts.slice(0, maxCharts[layout]),
    }));
  },
}));

// ============================================
// Keyboard Shortcuts Store
// ============================================
export interface KeyboardShortcut {
  key: string;
  modifiers: ('ctrl' | 'shift' | 'alt' | 'meta')[];
  action: string;
  description: string;
}

interface ShortcutsState {
  shortcuts: KeyboardShortcut[];
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useShortcutsStore = create<ShortcutsState>()((set) => ({
  shortcuts: [
    { key: 's', modifiers: ['ctrl'], action: 'save', description: 'Save layout' },
    { key: 'z', modifiers: ['ctrl'], action: 'undo', description: 'Undo drawing' },
    { key: 'y', modifiers: ['ctrl'], action: 'redo', description: 'Redo drawing' },
    { key: 'Delete', modifiers: [], action: 'delete', description: 'Delete selected' },
    { key: 'Escape', modifiers: [], action: 'deselect', description: 'Deselect tool' },
    { key: '1', modifiers: [], action: 'tool-cursor', description: 'Cursor tool' },
    { key: '2', modifiers: [], action: 'tool-crosshair', description: 'Crosshair' },
    { key: '3', modifiers: [], action: 'tool-trendline', description: 'Trendline' },
    { key: '4', modifiers: [], action: 'tool-horizontal', description: 'Horizontal line' },
    { key: '5', modifiers: [], action: 'tool-rectangle', description: 'Rectangle' },
    { key: 'f', modifiers: [], action: 'tool-fibonacci', description: 'Fibonacci' },
    { key: 't', modifiers: [], action: 'tool-text', description: 'Text tool' },
    { key: '+', modifiers: [], action: 'zoom-in', description: 'Zoom in' },
    { key: '-', modifiers: [], action: 'zoom-out', description: 'Zoom out' },
    { key: '0', modifiers: [], action: 'zoom-reset', description: 'Reset zoom' },
    { key: 'ArrowLeft', modifiers: [], action: 'pan-left', description: 'Pan left' },
    { key: 'ArrowRight', modifiers: [], action: 'pan-right', description: 'Pan right' },
    { key: 'i', modifiers: ['ctrl'], action: 'toggle-ai', description: 'Toggle AI panel' },
    { key: 'w', modifiers: ['ctrl'], action: 'toggle-watchlist', description: 'Toggle watchlist' },
    { key: '/', modifiers: ['ctrl'], action: 'search', description: 'Search symbol' },
    { key: '?', modifiers: ['shift'], action: 'help', description: 'Show shortcuts' },
  ],
  enabled: true,
  setEnabled: (enabled) => set({ enabled }),
}));
