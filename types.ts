
export interface CandleData {
    time: number; // Unix timestamp
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number; // Trading volume
}

export interface ChartMarker {
    time: number;
    position: 'aboveBar' | 'belowBar' | 'inBar';
    color: string;
    shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
    text: string;
}

export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

export type ChartMode = 'standard' | 'ai' | 'black-swan';

export type DrawingTool = 'cursor' | 'crosshair' | 'trendline' | 'horizontal' | 'vertical' | 'rectangle' | 'text' | 'alert' | 'fibonacci' | 'arrow';

export type ChartType = 'Candlestick' | 'Area' | 'Line';

export interface DrawingStyle {
    lineColor: string;
    lineWidth: number;
    lineStyle: number; // 0: solid, 1: dashed, 2: dotted
    fillColor: string; // Hex string preferred now
    fillOpacity?: number; // 0.0 - 1.0
    fillEnabled?: boolean;
    showLabel: boolean;
    fontSize: number;
}

export interface DrawingObject {
    id: string;
    tool: DrawingTool;
    start: { time: number; price: number }; // Logic coordinates
    end: { time: number; price: number };   // Logic coordinates
    style: DrawingStyle;
    text?: string;
    locked?: boolean;
    value?: number; // legacy support for horizontal
}

export interface WatchlistItem {
    symbol: string;
    price: number;
    change: number;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export interface PurchaseInfo {
    time: number;
    price: number;
    text: string;
}

export interface PriceAlert {
    id: string;
    symbol: string;
    targetPrice: number;
    condition: 'above' | 'below';
    isActive: boolean;
}

export interface Exchange {
    id: string;
    name: string;
    status: 'connected' | 'disconnected' | 'error';
    apiKey?: string;
}

export type IndicatorType = 'SMA' | 'EMA' | 'RSI';

export interface Indicator {
    id: string;
    type: IndicatorType;
    period: number;
    color: string;
    active: boolean;
}

// Chart Indicators (overlays and panels)
export type ChartIndicatorType = 'volumeProfile' | 'vwap' | 'bollinger' | 'macd' | 'rsi' | 'volume';

export interface ChartIndicatorSettings {
    volumeProfile: {
        enabled: boolean;
        rowCount: number;
        valueAreaPercent: number;
        pocColor: string;
        valueAreaColor: string;
        volumeColor: string;
    };
    vwap: {
        enabled: boolean;
        color: string;
    };
    bollinger: {
        enabled: boolean;
        period: number;
        stdDev: number;
        color: string;
    };
    volume: {
        enabled: boolean;
        upColor: string;
        downColor: string;
    };
}

// User & Authentication Types
export interface UserPreferences {
    theme: 'dark' | 'light';
    defaultTimeframe: Timeframe;
    notifications: boolean;
    defaultWatchlist?: string[];
}

export interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    plan: 'free' | 'pro' | 'premium';
    planExpiresAt?: string;
    createdAt: string;
    lastLoginAt?: string;
    emailVerified?: boolean;
    preferences: UserPreferences;
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

// Search & Symbol Types
export interface SymbolInfo {
    symbol: string;
    name: string;
    exchange: string;
    type: 'crypto' | 'stock' | 'forex' | 'futures';
}

// ============================================
// AI Drawing Command Types
// ============================================

/** Command to draw a horizontal line at a specific price level */
export interface AIHorizontalCommand {
    type: 'HORIZONTAL';
    value: number;
}

/** Command to draw a supply/demand zone */
export interface AIZoneCommand {
    type: 'ZONE';
    priceTop: number;
    priceBottom: number;
    zoneType: 'SUPPLY' | 'DEMAND';
}

/** Command to draw a trendline */
export interface AITrendlineCommand {
    type: 'TRENDLINE';
    startPrice: number;
    endPrice: number;
    startTime?: number;
    endTime?: number;
}

/** Union type for all AI drawing commands */
export type AIDrawCommand = AIHorizontalCommand | AIZoneCommand | AITrendlineCommand;

/** Type guard for horizontal commands */
export const isHorizontalCommand = (cmd: AIDrawCommand): cmd is AIHorizontalCommand => 
    cmd.type === 'HORIZONTAL';

/** Type guard for zone commands */
export const isZoneCommand = (cmd: AIDrawCommand): cmd is AIZoneCommand => 
    cmd.type === 'ZONE';

/** Type guard for trendline commands */
export const isTrendlineCommand = (cmd: AIDrawCommand): cmd is AITrendlineCommand => 
    cmd.type === 'TRENDLINE';

// ============================================
// Connection Status Types
// ============================================

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface ConnectionState {
    status: ConnectionStatus;
    lastConnected?: number;
    error?: string;
}

// ============================================
// Toast Notification Types
// ============================================

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'alert';

export interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}
