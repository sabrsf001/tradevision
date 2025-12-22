
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import SettingsPanel from './components/SettingsPanel';
import { useThemeStore } from './store/appStore';
import TopBar from './components/TopBar';
import DrawingToolbar from './components/DrawingToolbar';
import Watchlist from './components/Watchlist';
import Chart from './components/Chart';
import ReplayControls from './components/ReplayControls';
import AIPanel from './components/AIPanel';
import BlackSwanPanel from './components/BlackSwanPanel';
import Toast from './components/Toast';
import AlertsManager from './components/AlertsManager';
import UserProfileNew from './components/UserProfileNew';
import AuthModal from './components/AuthModal';
import SymbolSearch from './components/SymbolSearch';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import ConnectionStatusIndicator from './components/ConnectionStatus';
import { MobileDrawingToolbar, MobileTimeframeSelector } from './components/MobileChartControls';
import { ChartSkeleton } from './components/LoadingSkeleton';
import { useAuth } from './contexts/AuthContext';
import { ChartMode, Timeframe, DrawingTool, CandleData, DrawingObject, PurchaseInfo, WatchlistItem, ChartType, PriceAlert, Exchange, Indicator, ChartIndicatorSettings, AIDrawCommand, isHorizontalCommand, isZoneCommand } from './types';
import { fetchHistoricalData, subscribeToLiveTicker, getSecondsInTimeframe, subscribeToMultiTicker, DataSource } from './services/dataService';
import { calculateSMA, calculateRSI, clearIndicatorCaches } from './utils/indicators';
import { exportChartWithMetadata, copyChartToClipboard } from './utils/chartExport';
import { useNotifications, shouldPromptForNotifications, dismissNotificationPrompt } from './services/pushNotifications';
import NotificationBanner from './components/NotificationBanner';
import DrawingTemplatesPanel from './components/DrawingTemplates';
import TradingJournalCalendar from './components/TradingJournalCalendar';
import OrderBookPanel from './components/OrderBookPanel';
import OrderBookWidget from './components/OrderBookWidget';
import ChartPositionOverlay, { ChartPosition } from './components/ChartPositionOverlay';
import BottomToolbar from './components/BottomToolbar';
import AdvancedOrderModal, { OrderDetails } from './components/AdvancedOrderModal';
import ExchangeConnectionModal from './components/ExchangeConnectionModal';
import OnboardingTutorial, { hasCompletedOnboarding } from './components/OnboardingTutorial';
import { useHaptics } from './hooks/useHaptics';

const App: React.FC = () => {
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const haptics = useHaptics();
    const { theme, resolvedTheme, setTheme } = useThemeStore();
    
    // Apply theme on mount and when it changes
    useEffect(() => {
        const resolved = theme === 'system' 
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : theme;
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(resolved);
    }, [theme]);
    
    // App State
    const [mode, setMode] = useState<ChartMode>('standard');
    const [symbol, setSymbol] = useState('BTCUSD');
    const [timeframe, setTimeframe] = useState<Timeframe>('1D');
    const [chartType, setChartType] = useState<ChartType>('Candlestick');
    
    // Data State
    const [fullData, setFullData] = useState<CandleData[]>([]);
    const [liveData, setLiveData] = useState<CandleData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [dataSource, setDataSource] = useState<DataSource | null>(null);
    const [dataError, setDataError] = useState<string | null>(null);
    
    // Persistence Refs
    const dataCache = useRef<Record<string, CandleData[]>>({});
    const drawingsMap = useRef<Record<string, DrawingObject[]>>({});
    const chartContainerRef = useRef<HTMLDivElement>(null);
    
    // Tools State
    const [activeTool, setActiveTool] = useState<DrawingTool>('cursor');
    const [drawings, setDrawings] = useState<DrawingObject[]>([]);
    
    // Indicators State
    const [indicators, setIndicators] = useState<Indicator[]>([
        { id: '1', type: 'SMA', period: 20, color: '#FF9800', active: false },
        { id: '2', type: 'EMA', period: 50, color: '#2962FF', active: false },
        { id: '3', type: 'RSI', period: 14, color: '#E91E63', active: false },
    ]);

    // Chart Indicator Settings (Volume Profile, VWAP, etc.)
    const [chartIndicatorSettings, setChartIndicatorSettings] = useState<ChartIndicatorSettings>({
        volumeProfile: {
            enabled: false,
            rowCount: 24,
            valueAreaPercent: 70,
            pocColor: '#FFD700',
            valueAreaColor: '#3B82F6',
            volumeColor: '#6B7280'
        },
        vwap: {
            enabled: false,
            color: '#8B5CF6'
        },
        bollinger: {
            enabled: false,
            period: 20,
            stdDev: 2,
            color: '#10B981'
        },
        volume: {
            enabled: true,
            upColor: '#22C55E',
            downColor: '#EF4444'
        }
    });

    // Replay State
    const [isReplayActive, setIsReplayActive] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [replayIndex, setReplayIndex] = useState(0);
    const [replaySpeed, setReplaySpeed] = useState(1);
    
    const [timeLeft, setTimeLeft] = useState<string>("00:00");
    const [alerts, setAlerts] = useState<PriceAlert[]>([]);
    const [isAlertManagerOpen, setIsAlertManagerOpen] = useState(false);
    const [triggeredAlerts, setTriggeredAlerts] = useState<Set<string>>(new Set());
    const [toast, setToast] = useState<{message: string, type: 'alert' | 'success' | 'info'} | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [connectedExchanges, setConnectedExchanges] = useState<Exchange[]>([]);
    
    // Push Notifications
    const [showNotificationBanner, setShowNotificationBanner] = useState(false);
    const notifications = useNotifications();
    
    // Modal States
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
    const [isSymbolSearchOpen, setIsSymbolSearchOpen] = useState(false);
    const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
    const [showWatchlist, setShowWatchlist] = useState(true);
    const [isDrawingTemplatesOpen, setIsDrawingTemplatesOpen] = useState(false);
    const [isTradingJournalOpen, setIsTradingJournalOpen] = useState(false);
    const [isOrderBookOpen, setIsOrderBookOpen] = useState(false);
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    
    // Trading Panel States
    const [isAdvancedOrderOpen, setIsAdvancedOrderOpen] = useState(false);
    const [advancedOrderSide, setAdvancedOrderSide] = useState<'buy' | 'sell'>('buy');
    const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
    const [isPaperMode, setIsPaperMode] = useState(true);
    const [paperBalance, setPaperBalance] = useState(10000);
    const [tradePositions, setTradePositions] = useState<ChartPosition[]>([]);
    const [tradeHistory, setTradeHistory] = useState<{
        id: string;
        symbol: string;
        side: 'long' | 'short';
        entryPrice: number;
        exitPrice?: number;
        quantity: number;
        entryTime: number;
        exitTime?: number;
        status: 'open' | 'closed';
        notes: string;
        tags: string[];
        pnl?: number;
        pnlPercent?: number;
    }[]>([]);
    const [connectedExchangeIds, setConnectedExchangeIds] = useState<string[]>([]);
    const [activeExchange, setActiveExchange] = useState('paper');
    const [chartHeight, setChartHeight] = useState(500);

    const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([
        { symbol: 'BTCUSD', price: 0, change: 0 },
        { symbol: 'ETHUSD', price: 0, change: 0 },
        { symbol: 'SOLUSD', price: 0, change: 0 },
        { symbol: 'XRPUSD', price: 0, change: 0 },
        { symbol: 'BNBUSD', price: 0, change: 0 },
        { symbol: 'ADAUSD', price: 0, change: 0 },
        { symbol: 'DOGEUSD', price: 0, change: 0 },
        { symbol: 'AVAXUSD', price: 0, change: 0 },
        { symbol: 'LINKUSD', price: 0, change: 0 },
        { symbol: 'DOTUSD', price: 0, change: 0 },
    ]);

    const portfolio = useMemo(() => [
        { symbol: 'BTCUSD', amount: 0.52, avgPrice: 45000, entryTime: Math.floor(Date.now() / 1000) - 86400 * 7 },
        { symbol: 'ETHUSD', amount: 3.1, avgPrice: 2800, entryTime: Math.floor(Date.now() / 1000) - 86400 * 14 },
        { symbol: 'SOLUSD', amount: 150, avgPrice: 85, entryTime: Math.floor(Date.now() / 1000) - 86400 * 3 }
    ], []);

    // Entry point marker state
    const [entryMarker, setEntryMarker] = useState<{symbol: string, price: number, time?: number} | null>(null);

    // Load from LocalStorage
    useEffect(() => {
        const savedDrawings = localStorage.getItem('tv_drawings');
        if (savedDrawings) drawingsMap.current = JSON.parse(savedDrawings);
        
        const savedAlerts = localStorage.getItem('tv_alerts');
        if (savedAlerts) setAlerts(JSON.parse(savedAlerts));

        const savedInd = localStorage.getItem('tv_indicators');
        if (savedInd) setIndicators(JSON.parse(savedInd));

        const savedChartIndicators = localStorage.getItem('tv_chart_indicators');
        if (savedChartIndicators) setChartIndicatorSettings(JSON.parse(savedChartIndicators));
        
        // Check if we should prompt for push notifications
        if (shouldPromptForNotifications()) {
            // Delay the prompt slightly for better UX
            setTimeout(() => setShowNotificationBanner(true), 3000);
        }
        
        // Show onboarding for new users
        if (!hasCompletedOnboarding()) {
            setTimeout(() => setIsOnboardingOpen(true), 1000);
        }
    }, []);

    const playAlertSound = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Audio play failed (interaction required):", e));
    };

    // Helper to persist drawings
    const saveDrawingsToStorage = () => {
        localStorage.setItem('tv_drawings', JSON.stringify(drawingsMap.current));
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in input fields
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            
            const key = e.key.toLowerCase();
            
            // Search: / or Ctrl+K
            if (key === '/' || (e.ctrlKey && key === 'k')) {
                e.preventDefault();
                setIsSymbolSearchOpen(true);
                return;
            }
            
            // Save: Ctrl+S
            if (e.ctrlKey && key === 's') {
                e.preventDefault();
                handleSave();
                return;
            }
            
            // Show shortcuts: ?
            if (key === '?' || (e.shiftKey && key === '/')) {
                e.preventDefault();
                setIsShortcutsOpen(prev => !prev);
                return;
            }
            
            // Escape: Close modals, deselect
            if (key === 'escape') {
                setIsSymbolSearchOpen(false);
                setIsShortcutsOpen(false);
                setIsAlertManagerOpen(false);
                setActiveTool('cursor');
                return;
            }
            
            // Timeframe shortcuts: 1-6
            const timeframes: Timeframe[] = ['1m', '5m', '15m', '1H', '4H', '1D'];
            if (['1', '2', '3', '4', '5', '6'].includes(key)) {
                const idx = parseInt(key) - 1;
                if (timeframes[idx]) setTimeframe(timeframes[idx]);
                return;
            }
            
            // Drawing tool shortcuts
            const toolMap: Record<string, DrawingTool> = {
                'v': 'cursor',
                'c': 'crosshair',
                't': 'trendline',
                'h': 'horizontal',
                'r': 'rectangle',
                'f': 'fibonacci',
            };
            if (toolMap[key]) {
                setActiveTool(toolMap[key]);
                return;
            }
            
            // Panel shortcuts
            if (key === 'a') { setIsAlertManagerOpen(prev => !prev); return; }
            if (key === 'i') { setMode(prev => prev === 'ai' ? 'standard' : 'ai'); return; }
            if (key === 'w') { setShowWatchlist(prev => !prev); return; }
            
            // Replay shortcuts
            if (key === ' ' && isReplayActive) {
                e.preventDefault();
                setIsPlaying(prev => !prev);
                return;
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isReplayActive]);

    // Watchlist Live Stream
    useEffect(() => {
        const symbols = watchlistItems.map(w => w.symbol);
        const cleanup = subscribeToMultiTicker(symbols, (updates) => {
            setWatchlistItems(prev => prev.map(item => {
                if (updates[item.symbol]) {
                    return { ...item, price: updates[item.symbol].price, change: updates[item.symbol].change };
                }
                return item;
            }));
        });
        return cleanup;
    }, []); 

    // Load Chart Data
    useEffect(() => {
        // Clear data and caches immediately when symbol changes to prevent flickering
        setFullData([]);
        setLiveData([]);
        setDrawings(drawingsMap.current[symbol] || []);
        clearIndicatorCaches(); // Clear memoization caches for new symbol
        
        let cleanupSubscription: (() => void) | undefined;
        let isCancelled = false; // Track if this effect was cancelled

        const loadData = async () => {
            setIsLoading(true);
            setDataError(null);
            try {
                const result = await fetchHistoricalData(symbol, timeframe);
                
                // Only update if this effect is still active
                if (isCancelled) return;
                
                setFullData(result.data);
                setLiveData(result.data);
                setDataSource(result.source);
                
                // Show toast if using mock data
                if (result.source === 'mock') {
                    setDataError(result.error || 'Using simulated data');
                    setToast({ 
                        type: 'alert', 
                        message: `⚠️ Showing simulated data: ${result.error || 'Could not connect to exchange'}` 
                    });
                }
                
                // Create closure with current symbol to validate updates
                const currentSymbol = symbol;
                cleanupSubscription = subscribeToLiveTicker(symbol, timeframe, (updatedCandle) => {
                    // Extra safety check - ignore if symbol changed
                    if (isCancelled) return;
                    
                    setLiveData(prevData => {
                        if (prevData.length === 0) return [updatedCandle];
                        const lastCandle = prevData[prevData.length - 1];
                        let newData;
                        if (updatedCandle.time === lastCandle.time) {
                            newData = [...prevData]; newData[newData.length - 1] = updatedCandle;
                        } else if (updatedCandle.time > lastCandle.time) {
                            newData = [...prevData, updatedCandle];
                        } else {
                            return prevData;
                        }
                        return newData;
                    });
                });
            } catch (err) {
                if (!isCancelled) {
                    console.error("Failed to load data", err);
                    setDataError('Failed to load data');
                    setToast({ type: 'alert', message: 'Failed to load live data.' });
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };
        loadData();
        
        return () => { 
            isCancelled = true;
            if (cleanupSubscription) cleanupSubscription(); 
        };
    }, [symbol, timeframe]);

    // Timer Logic - format time properly based on timeframe
    useEffect(() => {
        const intervalId = setInterval(() => {
            const nowUnix = Math.floor(Date.now() / 1000);
            const intervalSeconds = getSecondsInTimeframe(timeframe);
            const remainder = nowUnix % intervalSeconds;
            const diff = intervalSeconds - remainder;
            
            // Format based on duration
            if (diff >= 86400) {
                // Days + hours + minutes + seconds
                const days = Math.floor(diff / 86400);
                const hours = Math.floor((diff % 86400) / 3600);
                const minutes = Math.floor((diff % 3600) / 60);
                const seconds = diff % 60;
                setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
            } else if (diff >= 3600) {
                // Hours + minutes + seconds
                const hours = Math.floor(diff / 3600);
                const minutes = Math.floor((diff % 3600) / 60);
                const seconds = diff % 60;
                setTimeLeft(`${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`);
            } else {
                // Minutes + seconds
                const minutes = Math.floor(diff / 60);
                const seconds = diff % 60;
                setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }
        }, 1000); 
        return () => clearInterval(intervalId);
    }, [timeframe]);

    // Alert Check
    useEffect(() => {
        if(liveData.length === 0) return;
        const currentPrice = liveData[liveData.length - 1].close;

        alerts.forEach(alertItem => {
            if (alertItem.isActive && alertItem.symbol === symbol) {
                if (triggeredAlerts.has(alertItem.id)) return;
                if ((alertItem.condition === 'above' && currentPrice >= alertItem.targetPrice) ||
                    (alertItem.condition === 'below' && currentPrice <= alertItem.targetPrice)) {
                        setTriggeredAlerts(prev => new Set(prev).add(alertItem.id));
                        setAlerts(prev => prev.map(a => a.id === alertItem.id ? { ...a, isActive: false } : a));
                        setToast({ type: 'alert', message: `Price Alert: ${symbol} crossed ${alertItem.targetPrice.toFixed(2)}` });
                        playAlertSound();
                        
                        // Haptic feedback for alert
                        haptics.notification('warning');
                        
                        // Send push notification
                        notifications.sendAlert(alertItem.symbol, alertItem.targetPrice, currentPrice, alertItem.condition);
                }
            }
        });
    }, [liveData, alerts, symbol, triggeredAlerts, notifications, haptics]);

    const displayData = useMemo(() => {
        return isReplayActive ? fullData.slice(0, replayIndex + 1) : liveData;
    }, [isReplayActive, fullData, replayIndex, liveData]);

    // Current price - derived from display data
    const currentPrice = displayData.length > 0 ? displayData[displayData.length-1].close : 0;

    const aiContextData = useMemo(() => {
        // Pass more candles for better zone detection
        return displayData.slice(-150);
    }, [displayData]);

    const handleSave = () => {
        saveDrawingsToStorage();
        localStorage.setItem('tv_alerts', JSON.stringify(alerts));
        localStorage.setItem('tv_indicators', JSON.stringify(indicators));
        setToast({ type: 'success', message: 'Workspace Saved Successfully' });
        haptics.notification('success');
    };

    const handleScreenshot = useCallback(async () => {
        if (!chartContainerRef.current) {
            setToast({ type: 'alert', message: 'Chart not ready for screenshot' });
            haptics.notification('error');
            return;
        }
        
        try {
            await exportChartWithMetadata(chartContainerRef.current, symbol, timeframe);
            setToast({ type: 'success', message: 'Chart exported successfully!' });
            haptics.notification('success');
        } catch (error) {
            console.error('Screenshot failed:', error);
            setToast({ type: 'alert', message: 'Failed to export chart' });
            haptics.notification('error');
        }
    }, [symbol, timeframe, haptics]);

    const handleToggleIndicator = (type: string) => {
        setIndicators(prev => prev.map(ind => ind.type === type ? { ...ind, active: !ind.active } : ind));
    };

    const handleToggleReplay = () => {
        if (isReplayActive) { setIsReplayActive(false); setIsPlaying(false); } 
        else { setFullData([...liveData]); setIsReplayActive(true); setReplayIndex(Math.floor(liveData.length * 0.7)); }
    };
    const handleStepReplay = (dir: number) => { setIsPlaying(false); setReplayIndex(prev => Math.min(Math.max(0, prev + dir), fullData.length - 1)); };
    
    // Replay playback effect
    useEffect(() => {
        if (!isPlaying || !isReplayActive) return;
        
        const interval = setInterval(() => {
            setReplayIndex(prev => {
                if (prev >= fullData.length - 1) {
                    setIsPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, 1000 / replaySpeed);
        
        return () => clearInterval(interval);
    }, [isPlaying, isReplayActive, replaySpeed, fullData.length]);
    
    // --- Entry Marker Handler (Black Swan) ---
    const handleShowEntry = useCallback((sym: string, price: number, time?: number) => {
        setEntryMarker({ symbol: sym, price, time });
        // Clear the marker after 10 seconds
        setTimeout(() => setEntryMarker(null), 10000);
    }, []);

    // --- Trading Panel Handlers ---
    const handleOpenAdvancedOrder = useCallback((side: 'buy' | 'sell') => {
        setAdvancedOrderSide(side);
        setIsAdvancedOrderOpen(true);
    }, []);

    const handleSubmitOrder = useCallback((order: OrderDetails) => {
        if (!isPaperMode && !isAuthenticated) {
            setToast({ message: 'Please login to trade with real funds', type: 'alert' });
            return;
        }
        
        const price = order.price || currentPrice;
        const orderValue = order.quantity * price / (order.leverage || 1);
        
        if (isPaperMode) {
            if (orderValue > paperBalance) {
                setToast({ message: 'Insufficient margin', type: 'alert' });
                return;
            }
            
            const newPosition: ChartPosition = {
                id: `pos_${Date.now()}`,
                symbol: order.symbol,
                side: order.side === 'buy' ? 'long' : 'short',
                entryPrice: price,
                quantity: order.quantity,
                entryTime: Date.now(),
                stopLoss: order.stopLoss,
                takeProfit: order.takeProfit,
            };
            
            setTradePositions(prev => [...prev, newPosition]);
            setPaperBalance(prev => prev - orderValue);
            haptics.success();
            setToast({ 
                message: `Position opened: ${order.side.toUpperCase()} ${order.quantity} ${order.symbol}`, 
                type: 'success' 
            });
        }
    }, [isPaperMode, isAuthenticated, currentPrice, paperBalance, haptics]);

    const handleUpdatePosition = useCallback((id: string, updates: Partial<ChartPosition>) => {
        setTradePositions(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    }, []);

    const handleClosePosition = useCallback((id: string) => {
        const position = tradePositions.find(p => p.id === id);
        if (position && isPaperMode) {
            const pnl = position.side === 'long'
                ? (currentPrice - position.entryPrice) * position.quantity
                : (position.entryPrice - currentPrice) * position.quantity;
            const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100 * (position.side === 'long' ? 1 : -1);
            
            // Add to trade history
            setTradeHistory(prev => [...prev, {
                id: position.id,
                symbol: position.symbol,
                side: position.side,
                entryPrice: position.entryPrice,
                exitPrice: currentPrice,
                quantity: position.quantity,
                entryTime: position.entryTime,
                exitTime: Date.now(),
                status: 'closed',
                notes: '',
                tags: [],
                pnl,
                pnlPercent
            }]);
            
            setPaperBalance(prev => prev + (position.entryPrice * position.quantity) + pnl);
            haptics.success();
            setToast({ 
                message: `Position closed: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`, 
                type: pnl >= 0 ? 'success' : 'alert' 
            });
        }
        setTradePositions(prev => prev.filter(p => p.id !== id));
    }, [tradePositions, isPaperMode, currentPrice, haptics]);

    const handleAddStopLoss = useCallback((id: string) => {
        const position = tradePositions.find(p => p.id === id);
        if (position) {
            const slPrice = position.side === 'long' 
                ? currentPrice * 0.98 
                : currentPrice * 1.02;
            handleUpdatePosition(id, { stopLoss: slPrice });
        }
    }, [tradePositions, currentPrice, handleUpdatePosition]);

    const handleAddTakeProfit = useCallback((id: string) => {
        const position = tradePositions.find(p => p.id === id);
        if (position) {
            const tpPrice = position.side === 'long' 
                ? currentPrice * 1.04 
                : currentPrice * 0.96;
            handleUpdatePosition(id, { takeProfit: tpPrice });
        }
    }, [tradePositions, currentPrice, handleUpdatePosition]);

    const handleSelectExchange = useCallback((exchangeId: string) => {
        if (exchangeId === 'paper') {
            setIsPaperMode(true);
            setActiveExchange('paper');
        } else {
            setIsPaperMode(false);
            setActiveExchange(exchangeId);
        }
    }, []);

    const handleConnectExchange = useCallback((exchangeId: string, apiKey: string, apiSecret: string) => {
        // In production, you would validate and store encrypted credentials
        setConnectedExchangeIds(prev => [...prev, exchangeId]);
        setIsPaperMode(false);
        setActiveExchange(exchangeId);
        haptics.success();
        setToast({ message: `Connected to ${exchangeId}!`, type: 'success' });
    }, [haptics]);

    const handleDisconnectExchange = useCallback((exchangeId: string) => {
        setConnectedExchangeIds(prev => prev.filter(id => id !== exchangeId));
        if (connectedExchangeIds.length <= 1) {
            setIsPaperMode(true);
        }
        setToast({ message: `Disconnected from ${exchangeId}`, type: 'info' });
    }, [connectedExchangeIds.length]);

    // --- Drawing Handlers ---
    const handleAddDrawing = (d: DrawingObject) => { 
        const newDrawings = [...drawings, d]; 
        setDrawings(newDrawings); 
        drawingsMap.current[symbol] = newDrawings;
        saveDrawingsToStorage(); 
    };

    const handleUpdateDrawing = (id: string, updates: Partial<DrawingObject>) => {
        const newDrawings = drawings.map(d => d.id === id ? { ...d, ...updates } : d);
        setDrawings(newDrawings);
        drawingsMap.current[symbol] = newDrawings;
        saveDrawingsToStorage();
    };

    const handleDeleteDrawing = (id: string) => {
        const newDrawings = drawings.filter(d => d.id !== id);
        setDrawings(newDrawings);
        drawingsMap.current[symbol] = newDrawings;
        saveDrawingsToStorage();
    };
    
    const handleAIDrawCommand = (command: AIDrawCommand) => {
        console.log('🎯 AI Draw Command received:', command);
        
        if (!displayData || displayData.length < 5) {
            console.error('❌ Not enough display data:', displayData?.length);
            return;
        }
        
        const defaultStyle = { lineColor: '#2962ff', lineWidth: 2, lineStyle: 0, fillColor: '#2962ff', fillOpacity: 0.2, fillEnabled: true, showLabel: true, fontSize: 12 };
        let newDrawing: DrawingObject;
        
        const lastIdx = displayData.length - 1;
        const startIdx = Math.max(0, displayData.length - 30);

        if (isHorizontalCommand(command)) { 
            console.log('📈 Drawing horizontal line at:', command.value);
            newDrawing = { 
                id: 'ai_h_' + Date.now() + '_' + Math.random().toString(36).substr(2,5), 
                tool: 'horizontal', 
                start: { time: displayData[startIdx].time, price: command.value }, 
                end: { time: displayData[lastIdx].time, price: command.value }, 
                value: command.value,
                style: { ...defaultStyle, lineColor: '#2962ff' }
            }; 
        } else if (isZoneCommand(command)) { 
            console.log('📦 Drawing zone:', command.zoneType, 'from', command.priceBottom, 'to', command.priceTop);
            const color = command.zoneType === 'SUPPLY' ? '#ef5350' : '#26a69a';
            
            newDrawing = { 
                id: 'ai_z_' + Date.now() + '_' + Math.random().toString(36).substr(2,5), 
                tool: 'rectangle', 
                start: { time: displayData[startIdx].time, price: command.priceTop }, 
                end: { time: displayData[lastIdx].time, price: command.priceBottom }, 
                style: { ...defaultStyle, lineColor: color, fillColor: color, fillOpacity: 0.25 }
            }; 
        } else {
            console.log('❓ Unknown command type:', command);
            return;
        }
        
        console.log('✅ Adding drawing:', newDrawing);
        handleAddDrawing(newDrawing);
    };

    const handleCreateAlert = (price: number) => {
        const currentPrice = displayData[displayData.length - 1].close;
        const newAlert: PriceAlert = { id: Date.now().toString(), symbol: symbol, targetPrice: price, condition: price > currentPrice ? 'above' : 'below', isActive: true };
        setAlerts([...alerts, newAlert]); setToast({ type: 'success', message: `Alert set for ${price.toFixed(2)}` });
        if (activeTool === 'alert') setActiveTool('cursor');
    };

    const purchaseMarkers = useMemo(() => {
        const asset = portfolio.find(p => p.symbol === symbol);
        if (asset && displayData.length > 50) return [{ time: displayData[displayData.length - 50].time, price: asset.avgPrice, text: `BOT BUY: ${asset.amount} units @ ${asset.avgPrice}` }];
        return undefined;
    }, [symbol, portfolio, displayData]);

    const openAuthModal = (mode: 'login' | 'register') => {
        setAuthModalMode(mode);
        setIsAuthModalOpen(true);
    };

    return (
        <div className="h-[100dvh] w-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-secondary)] overflow-hidden font-inter">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <NotificationBanner 
                isVisible={showNotificationBanner}
                onEnable={async () => {
                    await notifications.requestPermission();
                    setShowNotificationBanner(false);
                    if (notifications.permission === 'granted') {
                        setToast({ type: 'success', message: 'Push notifications enabled!' });
                    }
                }}
                onDismiss={() => {
                    setShowNotificationBanner(false);
                    dismissNotificationPrompt();
                }}
            />
            <ConnectionStatusIndicator position="bottom-left" showOnlyWhenOffline={true} />
            <TopBar 
                symbol={symbol} 
                timeframe={timeframe} 
                onTimeframeChange={setTimeframe} 
                onToggleReplay={handleToggleReplay} 
                isReplayActive={isReplayActive} 
                chartType={chartType} 
                onChartTypeChange={setChartType} 
                onSave={handleSave}
                onScreenshot={handleScreenshot}
                onSymbolSearch={() => setIsSymbolSearchOpen(true)}
                isAuthenticated={isAuthenticated}
                user={user}
                onLogin={() => openAuthModal('login')}
                onRegister={() => openAuthModal('register')}
                onProfileClick={() => setIsProfileOpen(true)}
            />
            <div className="flex flex-1 overflow-hidden relative min-h-0 sm:pb-0 pb-16">
                {/* Sidebar - hidden on mobile */}
                <Sidebar 
                    currentMode={mode} 
                    onModeChange={setMode} 
                    onAlertClick={() => setIsAlertManagerOpen(true)} 
                    hasActiveAlerts={alerts.some(a => a.isActive && a.symbol === symbol && !triggeredAlerts.has(a.id))} 
                    onProfileClick={() => isAuthenticated ? setIsProfileOpen(true) : openAuthModal('login')}
                    onSettingsClick={() => setIsSettingsOpen(true)}
                    onJournalClick={() => setIsTradingJournalOpen(true)}
                    onShortcutsClick={() => setIsShortcutsOpen(true)}
                    isAuthenticated={isAuthenticated}
                />
                <AIPanel isVisible={mode === 'ai'} currentSymbol={symbol} currentTimeframe={timeframe} currentPrice={currentPrice} chartData={aiContextData} onDrawCommand={handleAIDrawCommand} connectedExchanges={connectedExchanges} />
                <BlackSwanPanel isVisible={mode === 'black-swan'} portfolio={portfolio} onSymbolSelect={setSymbol} onShowEntry={handleShowEntry} />
                <main className="flex flex-1 overflow-hidden relative min-h-0">
                    {/* Drawing toolbar - hidden on mobile */}
                    <DrawingToolbar activeTool={activeTool} onToolChange={setActiveTool} isHidden={mode !== 'standard'} onClearDrawings={() => { setDrawings([]); drawingsMap.current[symbol] = []; saveDrawingsToStorage(); }} onOpenTemplates={() => setIsDrawingTemplatesOpen(true)} />
                    <div ref={chartContainerRef} className="flex-1 relative min-w-0 min-h-0 bg-[var(--bg-primary)] pb-[68px]">
                         {/* Data Source Indicator */}
                         {dataSource === 'mock' && !isLoading && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 bg-yellow-900/90 backdrop-blur-sm border border-yellow-700/50 rounded-full flex items-center gap-2 shadow-lg">
                                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                                <span className="text-yellow-200 text-[10px] font-medium uppercase tracking-wider">Simulated Data</span>
                                <button 
                                    onClick={() => {
                                        setDataSource(null);
                                        setToast({ type: 'info', message: 'Retrying connection...' });
                                        // Force re-fetch by changing symbol slightly then back
                                        const currentSymbol = symbol;
                                        setSymbol('');
                                        setTimeout(() => setSymbol(currentSymbol), 100);
                                    }}
                                    className="text-yellow-300 hover:text-white text-[10px] underline ml-1"
                                >
                                    Retry
                                </button>
                            </div>
                         )}
                         {isLoading && (
                            <div className="absolute inset-0 z-50 bg-[var(--bg-primary)]">
                                <ChartSkeleton />
                            </div>
                         )}
                        <Chart 
                            data={displayData} 
                            symbol={symbol} 
                            activeTool={activeTool} 
                            onAddDrawing={handleAddDrawing}
                            onUpdateDrawing={handleUpdateDrawing}
                            onDeleteDrawing={handleDeleteDrawing}
                            drawings={drawings} 
                            purchaseMarkers={purchaseMarkers} 
                            chartType={chartType} 
                            timeLeft={timeLeft} 
                            onCreateAlert={handleCreateAlert} 
                            alerts={alerts.filter(a => a.symbol === symbol && a.isActive)} 
                            indicators={indicators}
                            entryMarker={entryMarker}
                            chartIndicatorSettings={chartIndicatorSettings}
                            onToggleIndicator={(id) => {
                                const newIndicators = indicators.map(ind => 
                                    ind.id === id ? { ...ind, active: !ind.active } : ind
                                );
                                setIndicators(newIndicators);
                                localStorage.setItem('tv_indicators', JSON.stringify(newIndicators));
                            }}
                            onRemoveIndicator={(id) => {
                                const newIndicators = indicators.filter(ind => ind.id !== id);
                                setIndicators(newIndicators);
                                localStorage.setItem('tv_indicators', JSON.stringify(newIndicators));
                            }}
                            onChartIndicatorToggle={(key, enabled) => {
                                const newSettings = {
                                    ...chartIndicatorSettings,
                                    [key]: { ...chartIndicatorSettings[key], enabled }
                                };
                                setChartIndicatorSettings(newSettings);
                                localStorage.setItem('tv_chart_indicators', JSON.stringify(newSettings));
                            }}
                            onUpdateChartIndicatorSettings={(settings) => {
                                setChartIndicatorSettings(settings);
                                localStorage.setItem('tv_chart_indicators', JSON.stringify(settings));
                            }}
                            onBuy={() => handleOpenAdvancedOrder('buy')}
                            onSell={() => handleOpenAdvancedOrder('sell')}
                            isPaperMode={isPaperMode}
                            currentPrice={currentPrice}
                        />
                        {isReplayActive && <ReplayControls isPlaying={isPlaying} onPlayPause={() => setIsPlaying(!isPlaying)} onStep={handleStepReplay} onExit={handleToggleReplay} progress={replayIndex} total={fullData.length} onSeek={setReplayIndex} currentDate={displayData[displayData.length-1] ? new Date(displayData[displayData.length-1].time * 1000).toLocaleDateString() : ''} speed={replaySpeed} onSpeedChange={setReplaySpeed} />}

                        {/* Chart Position Overlay */}
                        {mode === 'standard' && tradePositions.filter(p => p.symbol === symbol).length > 0 && (
                            <ChartPositionOverlay
                                positions={tradePositions.filter(p => p.symbol === symbol)}
                                currentPrice={currentPrice}
                                priceRange={{
                                    min: Math.min(...displayData.map(d => d.low)) * 0.995,
                                    max: Math.max(...displayData.map(d => d.high)) * 1.005,
                                }}
                                chartHeight={chartHeight}
                                onUpdatePosition={handleUpdatePosition}
                                onClosePosition={handleClosePosition}
                                onAddStopLoss={handleAddStopLoss}
                                onAddTakeProfit={handleAddTakeProfit}
                            />
                        )}

                        {/* Bottom Toolbar with Date Range + Trading Panel */}
                        {mode === 'standard' && (
                            <BottomToolbar
                                currentTimeframe={timeframe}
                                onTimeframeChange={(tf) => setTimeframe(tf)}
                                isPaperMode={isPaperMode}
                                paperBalance={paperBalance}
                                activeExchange={activeExchange}
                                connectedExchanges={connectedExchangeIds}
                                onSelectExchange={handleSelectExchange}
                                onOpenExchangeModal={() => setIsExchangeModalOpen(true)}
                                isAuthenticated={isAuthenticated}
                                onLoginRequired={() => openAuthModal('login')}
                            />
                        )}
                    </div>
                    {/* Watchlist + Order Book - hidden on small screens */}
                    <div className={`hidden sm:flex flex-col flex-shrink-0 ${mode !== 'standard' || !showWatchlist ? 'w-0 overflow-hidden' : 'w-[200px]'}`}>
                        <Watchlist items={watchlistItems} currentSymbol={symbol} onSelect={setSymbol} isHidden={mode !== 'standard' || !showWatchlist} />
                        <OrderBookWidget 
                            symbol={symbol} 
                            currentPrice={currentPrice} 
                            isVisible={mode === 'standard' && showWatchlist}
                        />
                    </div>
                </main>
            </div>
            
            {/* Mobile Drawing Tools (Improved) */}
            {activeTool !== 'cursor' && (
                <div className="sm:hidden fixed bottom-0 left-0 right-0 z-[60]">
                    <MobileDrawingToolbar
                        selectedTool={activeTool}
                        onSelectTool={(tool) => setActiveTool(tool as DrawingTool)}
                        onDone={() => setActiveTool('cursor')}
                        onClearAll={() => { setDrawings([]); drawingsMap.current[symbol] = []; saveDrawingsToStorage(); }}
                    />
                </div>
            )}
            
            {/* Mobile Bottom Navigation - Improved (hidden when drawing) */}
            <nav className={`sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-secondary)]/95 backdrop-blur-md border-t border-[var(--border-color)] safe-area-bottom transition-transform duration-200 ${activeTool !== 'cursor' ? 'translate-y-full' : 'translate-y-0'}`}>
                <div className="flex items-center justify-around h-16">
                    <button 
                        onClick={() => setMode('standard')}
                        className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors touch-active ${
                            mode === 'standard' && activeTool === 'cursor' 
                                ? 'text-[var(--accent-primary)]' 
                                : 'text-[var(--text-secondary)]'
                        }`}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                        <span className="text-[10px] font-medium">Chart</span>
                    </button>
                    <button 
                        onClick={() => {
                            setMode('standard');
                            setActiveTool(activeTool === 'cursor' ? 'trendline' : 'cursor');
                        }}
                        className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors touch-active ${
                            activeTool !== 'cursor' 
                                ? 'text-[var(--accent-primary)]' 
                                : 'text-[var(--text-secondary)]'
                        }`}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        <span className="text-[10px] font-medium">Draw</span>
                    </button>
                    <button 
                        onClick={() => setIsAlertManagerOpen(true)}
                        className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors touch-active relative ${
                            alerts.some(a => a.isActive) 
                                ? 'text-[var(--accent-green)]' 
                                : 'text-[var(--text-secondary)]'
                        }`}
                    >
                        <div className="relative">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                            </svg>
                            {alerts.some(a => a.isActive) && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[var(--accent-green)] rounded-full animate-pulse" />
                            )}
                        </div>
                        <span className="text-[10px] font-medium">Alerts</span>
                    </button>
                    <button 
                        onClick={() => setMode(mode === 'ai' ? 'standard' : 'ai')}
                        className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors touch-active ${
                            mode === 'ai' 
                                ? 'text-[var(--accent-primary)]' 
                                : 'text-[var(--text-secondary)]'
                        }`}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                        </svg>
                        <span className="text-[10px] font-medium">AI</span>
                    </button>
                    <button 
                        onClick={() => isAuthenticated ? setIsProfileOpen(true) : openAuthModal('login')}
                        className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors touch-active ${
                            isAuthenticated 
                                ? 'text-[var(--accent-primary)]' 
                                : 'text-[var(--text-secondary)]'
                        }`}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-[10px] font-medium">Profile</span>
                    </button>
                </div>
            </nav>
            
            {/* Modals */}
            <AlertsManager isOpen={isAlertManagerOpen} onClose={() => setIsAlertManagerOpen(false)} alerts={alerts.filter(a => a.symbol === symbol)} currentPrice={currentPrice} symbol={symbol} onCreateAlert={handleCreateAlert} onDeleteAlert={(id) => setAlerts(alerts.filter(a => a.id !== id))} onPickOnChart={() => { setIsAlertManagerOpen(false); setActiveTool('alert'); setToast({ type: 'info', message: 'Click chart to set alert.' }); }} />
            <UserProfileNew 
                isOpen={isProfileOpen} 
                onClose={() => setIsProfileOpen(false)} 
                connectedExchanges={connectedExchanges} 
                onConnect={(ex) => setConnectedExchanges([...connectedExchanges, ex])} 
                onDisconnect={(id) => setConnectedExchanges(connectedExchanges.filter(e => e.id !== id))} 
            />
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode={authModalMode} />
            <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <SymbolSearch isOpen={isSymbolSearchOpen} onClose={() => setIsSymbolSearchOpen(false)} onSelect={setSymbol} currentSymbol={symbol} />
            <KeyboardShortcuts isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
            <DrawingTemplatesPanel
                isOpen={isDrawingTemplatesOpen}
                onClose={() => setIsDrawingTemplatesOpen(false)}
                currentDrawings={drawings}
                onApplyTemplate={(newDrawings) => {
                    setDrawings([...drawings, ...newDrawings]);
                    saveDrawingsToStorage();
                }}
                onToast={(message, type) => setToast({ message, type })}
            />
            <TradingJournalCalendar
                isOpen={isTradingJournalOpen}
                onClose={() => setIsTradingJournalOpen(false)}
                currentSymbol={symbol}
                currentPrice={liveData.length > 0 ? liveData[liveData.length - 1].close : 0}
                onToast={(message, type) => setToast({ message, type })}
                tradeHistory={tradeHistory}
            />
            <OrderBookPanel
                isOpen={isOrderBookOpen}
                onClose={() => setIsOrderBookOpen(false)}
                symbol={symbol}
                currentPrice={liveData.length > 0 ? liveData[liveData.length - 1].close : 0}
            />
            <AdvancedOrderModal
                isOpen={isAdvancedOrderOpen}
                onClose={() => setIsAdvancedOrderOpen(false)}
                symbol={symbol}
                currentPrice={currentPrice}
                side={advancedOrderSide}
                balance={isPaperMode ? paperBalance : 0}
                onSubmitOrder={handleSubmitOrder}
                isPaperMode={isPaperMode}
            />
            <ExchangeConnectionModal
                isOpen={isExchangeModalOpen}
                onClose={() => setIsExchangeModalOpen(false)}
                isAuthenticated={isAuthenticated}
                onLoginRequired={() => { setIsExchangeModalOpen(false); openAuthModal('login'); }}
                onConnect={handleConnectExchange}
                connectedExchanges={connectedExchangeIds}
                onDisconnect={handleDisconnectExchange}
                onSwitchToPaper={() => setIsPaperMode(true)}
                isPaperMode={isPaperMode}
            />
            <OnboardingTutorial
                isOpen={isOnboardingOpen}
                onClose={() => setIsOnboardingOpen(false)}
                onComplete={() => setToast({ message: 'Welcome to TradeVision AI! 🚀', type: 'success' })}
            />
        </div>
    );
};

export default App;
