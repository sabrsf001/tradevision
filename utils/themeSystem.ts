/**
 * Theme System - TradeVision
 * Advanced theming with custom colors, presets, and real-time preview
 */

// ============================================
// Types
// ============================================

export interface ThemeColors {
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgPanel: string;
  bgHover: string;
  
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  // Accents
  accentBlue: string;
  accentGreen: string;
  accentRed: string;
  accentYellow: string;
  accentPurple: string;
  
  // Chart
  chartUp: string;
  chartDown: string;
  chartGrid: string;
  chartCrosshair: string;
  chartBackground: string;
  
  // Borders
  borderColor: string;
  borderHover: string;
  
  // Shadows
  shadowColor: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  isDark: boolean;
  colors: ThemeColors;
  
  // Typography
  fontFamily: string;
  fontSize: 'sm' | 'base' | 'lg';
  
  // Chart settings
  candleStyle: 'solid' | 'hollow' | 'gradient';
  gridStyle: 'solid' | 'dashed' | 'dotted' | 'none';
  
  // Effects
  blur: boolean;
  animations: boolean;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  
  // Custom
  isCustom: boolean;
  createdAt?: number;
}

// ============================================
// Default Themes
// ============================================

const darkTheme: ThemeColors = {
  bgPrimary: '#0a0a0f',
  bgSecondary: '#12121a',
  bgPanel: '#1a1a24',
  bgHover: '#22222e',
  
  textPrimary: '#ffffff',
  textSecondary: '#8b8b9e',
  textMuted: '#4a4a5a',
  
  accentBlue: '#3b82f6',
  accentGreen: '#22c55e',
  accentRed: '#ef4444',
  accentYellow: '#eab308',
  accentPurple: '#a855f7',
  
  chartUp: '#22c55e',
  chartDown: '#ef4444',
  chartGrid: '#1e1e2d',
  chartCrosshair: '#666680',
  chartBackground: '#0a0a0f',
  
  borderColor: '#2a2a3a',
  borderHover: '#3a3a4a',
  
  shadowColor: 'rgba(0, 0, 0, 0.5)',
};

const lightTheme: ThemeColors = {
  bgPrimary: '#ffffff',
  bgSecondary: '#f5f5f7',
  bgPanel: '#eaeaef',
  bgHover: '#e0e0e5',
  
  textPrimary: '#1a1a1f',
  textSecondary: '#6b6b7a',
  textMuted: '#9a9aaa',
  
  accentBlue: '#2563eb',
  accentGreen: '#16a34a',
  accentRed: '#dc2626',
  accentYellow: '#ca8a04',
  accentPurple: '#9333ea',
  
  chartUp: '#16a34a',
  chartDown: '#dc2626',
  chartGrid: '#e5e5ea',
  chartCrosshair: '#9999aa',
  chartBackground: '#ffffff',
  
  borderColor: '#d5d5da',
  borderHover: '#c5c5ca',
  
  shadowColor: 'rgba(0, 0, 0, 0.1)',
};

// Premium theme presets
const themes: Record<string, ThemeConfig> = {
  dark: {
    id: 'dark',
    name: 'Dark',
    isDark: true,
    colors: darkTheme,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 'base',
    candleStyle: 'solid',
    gridStyle: 'solid',
    blur: true,
    animations: true,
    borderRadius: 'lg',
    isCustom: false,
  },
  
  light: {
    id: 'light',
    name: 'Light',
    isDark: false,
    colors: lightTheme,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 'base',
    candleStyle: 'solid',
    gridStyle: 'solid',
    blur: true,
    animations: true,
    borderRadius: 'lg',
    isCustom: false,
  },
  
  midnight: {
    id: 'midnight',
    name: 'Midnight Blue',
    isDark: true,
    colors: {
      ...darkTheme,
      bgPrimary: '#0d1117',
      bgSecondary: '#161b22',
      bgPanel: '#21262d',
      bgHover: '#30363d',
      accentBlue: '#58a6ff',
      accentGreen: '#3fb950',
      accentRed: '#f85149',
      borderColor: '#30363d',
      chartBackground: '#0d1117',
      chartGrid: '#21262d',
    },
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 'base',
    candleStyle: 'solid',
    gridStyle: 'dashed',
    blur: true,
    animations: true,
    borderRadius: 'lg',
    isCustom: false,
  },
  
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    isDark: true,
    colors: {
      ...darkTheme,
      bgPrimary: '#0a0a12',
      bgSecondary: '#12121f',
      bgPanel: '#1a1a2e',
      accentBlue: '#00d4ff',
      accentGreen: '#00ff9f',
      accentRed: '#ff0055',
      accentYellow: '#ffcc00',
      accentPurple: '#ff00ff',
      chartUp: '#00ff9f',
      chartDown: '#ff0055',
      borderColor: '#2a2a4a',
    },
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 'base',
    candleStyle: 'hollow',
    gridStyle: 'dotted',
    blur: true,
    animations: true,
    borderRadius: 'sm',
    isCustom: false,
  },
  
  forest: {
    id: 'forest',
    name: 'Forest',
    isDark: true,
    colors: {
      ...darkTheme,
      bgPrimary: '#0d1510',
      bgSecondary: '#141f18',
      bgPanel: '#1c2920',
      accentBlue: '#4ade80',
      accentGreen: '#22c55e',
      accentRed: '#fb923c',
      chartUp: '#4ade80',
      chartDown: '#fb923c',
      borderColor: '#2a3a30',
    },
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 'base',
    candleStyle: 'solid',
    gridStyle: 'solid',
    blur: true,
    animations: true,
    borderRadius: 'lg',
    isCustom: false,
  },
  
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    isDark: true,
    colors: {
      ...darkTheme,
      bgPrimary: '#0a1520',
      bgSecondary: '#0f1f30',
      bgPanel: '#152940',
      accentBlue: '#60a5fa',
      accentGreen: '#34d399',
      accentRed: '#fb7185',
      chartUp: '#34d399',
      chartDown: '#fb7185',
      borderColor: '#1e3a50',
    },
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 'base',
    candleStyle: 'gradient',
    gridStyle: 'solid',
    blur: true,
    animations: true,
    borderRadius: 'lg',
    isCustom: false,
  },
  
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    isDark: true,
    colors: {
      ...darkTheme,
      bgPrimary: '#18100f',
      bgSecondary: '#251815',
      bgPanel: '#32201c',
      accentBlue: '#f97316',
      accentGreen: '#fbbf24',
      accentRed: '#ef4444',
      accentPurple: '#ec4899',
      chartUp: '#fbbf24',
      chartDown: '#ef4444',
      borderColor: '#3f2a25',
    },
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 'base',
    candleStyle: 'solid',
    gridStyle: 'solid',
    blur: true,
    animations: true,
    borderRadius: 'lg',
    isCustom: false,
  },
  
  monochrome: {
    id: 'monochrome',
    name: 'Monochrome',
    isDark: true,
    colors: {
      ...darkTheme,
      bgPrimary: '#0f0f0f',
      bgSecondary: '#1a1a1a',
      bgPanel: '#252525',
      accentBlue: '#ffffff',
      accentGreen: '#a0a0a0',
      accentRed: '#606060',
      chartUp: '#ffffff',
      chartDown: '#606060',
      borderColor: '#333333',
    },
    fontFamily: '"SF Mono", monospace',
    fontSize: 'base',
    candleStyle: 'hollow',
    gridStyle: 'dashed',
    blur: false,
    animations: false,
    borderRadius: 'none',
    isCustom: false,
  },
};

// ============================================
// Theme Manager
// ============================================

const THEME_KEY = 'tv_theme';
const CUSTOM_THEMES_KEY = 'tv_custom_themes';

class ThemeManager {
  private currentTheme: ThemeConfig;
  private customThemes: ThemeConfig[] = [];
  private listeners: Set<(theme: ThemeConfig) => void> = new Set();
  
  constructor() {
    this.loadCustomThemes();
    this.currentTheme = this.loadTheme();
    this.applyTheme(this.currentTheme);
  }
  
  /**
   * Get all available themes
   */
  getThemes(): ThemeConfig[] {
    return [...Object.values(themes), ...this.customThemes];
  }
  
  /**
   * Get current theme
   */
  getCurrentTheme(): ThemeConfig {
    return this.currentTheme;
  }
  
  /**
   * Set theme
   */
  setTheme(themeId: string): void {
    const theme = this.getThemes().find(t => t.id === themeId);
    if (!theme) return;
    
    this.currentTheme = theme;
    this.applyTheme(theme);
    this.saveTheme(themeId);
    this.notifyListeners();
  }
  
  /**
   * Create custom theme
   */
  createCustomTheme(config: Partial<ThemeConfig>): ThemeConfig {
    const baseTheme = themes.dark;
    
    const customTheme: ThemeConfig = {
      ...baseTheme,
      ...config,
      id: `custom_${Date.now()}`,
      name: config.name || 'Custom Theme',
      isCustom: true,
      createdAt: Date.now(),
      colors: {
        ...baseTheme.colors,
        ...config.colors,
      },
    };
    
    this.customThemes.push(customTheme);
    this.saveCustomThemes();
    
    return customTheme;
  }
  
  /**
   * Update custom theme
   */
  updateCustomTheme(id: string, updates: Partial<ThemeConfig>): ThemeConfig | null {
    const index = this.customThemes.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    this.customThemes[index] = {
      ...this.customThemes[index],
      ...updates,
      colors: {
        ...this.customThemes[index].colors,
        ...(updates.colors || {}),
      },
    };
    
    this.saveCustomThemes();
    
    if (this.currentTheme.id === id) {
      this.currentTheme = this.customThemes[index];
      this.applyTheme(this.currentTheme);
      this.notifyListeners();
    }
    
    return this.customThemes[index];
  }
  
  /**
   * Delete custom theme
   */
  deleteCustomTheme(id: string): boolean {
    const index = this.customThemes.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    this.customThemes.splice(index, 1);
    this.saveCustomThemes();
    
    if (this.currentTheme.id === id) {
      this.setTheme('dark');
    }
    
    return true;
  }
  
  /**
   * Export theme
   */
  exportTheme(id: string): string | null {
    const theme = this.getThemes().find(t => t.id === id);
    if (!theme) return null;
    
    return JSON.stringify(theme, null, 2);
  }
  
  /**
   * Import theme
   */
  importTheme(json: string): ThemeConfig | null {
    try {
      const data = JSON.parse(json);
      
      return this.createCustomTheme({
        ...data,
        name: `${data.name} (Imported)`,
      });
    } catch {
      return null;
    }
  }
  
  /**
   * Subscribe to theme changes
   */
  subscribe(callback: (theme: ThemeConfig) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  /**
   * Apply theme to DOM
   */
  private applyTheme(theme: ThemeConfig): void {
    const root = document.documentElement;
    const { colors } = theme;
    
    // CSS custom properties
    root.style.setProperty('--bg-primary', colors.bgPrimary);
    root.style.setProperty('--bg-secondary', colors.bgSecondary);
    root.style.setProperty('--bg-panel', colors.bgPanel);
    root.style.setProperty('--bg-hover', colors.bgHover);
    
    root.style.setProperty('--text-primary', colors.textPrimary);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--text-muted', colors.textMuted);
    
    root.style.setProperty('--accent-blue', colors.accentBlue);
    root.style.setProperty('--accent-green', colors.accentGreen);
    root.style.setProperty('--accent-red', colors.accentRed);
    root.style.setProperty('--accent-yellow', colors.accentYellow);
    root.style.setProperty('--accent-purple', colors.accentPurple);
    
    root.style.setProperty('--chart-up', colors.chartUp);
    root.style.setProperty('--chart-down', colors.chartDown);
    root.style.setProperty('--chart-grid', colors.chartGrid);
    root.style.setProperty('--chart-crosshair', colors.chartCrosshair);
    root.style.setProperty('--chart-background', colors.chartBackground);
    
    root.style.setProperty('--border-color', colors.borderColor);
    root.style.setProperty('--border-hover', colors.borderHover);
    root.style.setProperty('--shadow-color', colors.shadowColor);
    
    // Font settings
    root.style.setProperty('--font-family', theme.fontFamily);
    
    const fontSizes = { sm: '14px', base: '16px', lg: '18px' };
    root.style.setProperty('--font-size-base', fontSizes[theme.fontSize]);
    
    // Border radius
    const radii = { none: '0', sm: '4px', md: '8px', lg: '12px', xl: '16px' };
    root.style.setProperty('--border-radius', radii[theme.borderRadius]);
    
    // Toggle classes
    root.classList.toggle('dark', theme.isDark);
    root.classList.toggle('light', !theme.isDark);
    root.classList.toggle('no-animations', !theme.animations);
    root.classList.toggle('no-blur', !theme.blur);
  }
  
  private loadTheme(): ThemeConfig {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved) {
        const theme = this.getThemes().find(t => t.id === saved);
        if (theme) return theme;
      }
    } catch {}
    
    return themes.dark;
  }
  
  private saveTheme(id: string): void {
    localStorage.setItem(THEME_KEY, id);
  }
  
  private loadCustomThemes(): void {
    try {
      const saved = localStorage.getItem(CUSTOM_THEMES_KEY);
      if (saved) {
        this.customThemes = JSON.parse(saved);
      }
    } catch {}
  }
  
  private saveCustomThemes(): void {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(this.customThemes));
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.currentTheme));
  }
}

// ============================================
// Singleton Instance
// ============================================

export const themeManager = new ThemeManager();

export default themeManager;
