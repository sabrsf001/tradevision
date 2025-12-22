import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from './Icons';
import { ConnectionStatus as ConnectionStatusType } from '../types';

interface ConnectionStatusProps {
    /** Override the auto-detected status */
    status?: ConnectionStatusType;
    /** Show reconnect button */
    showReconnect?: boolean;
    /** Callback when reconnect is clicked */
    onReconnect?: () => void;
    /** Position on screen */
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    /** Show only when disconnected */
    showOnlyWhenOffline?: boolean;
}

const ConnectionStatusIndicator: React.FC<ConnectionStatusProps> = ({
    status: externalStatus,
    showReconnect = true,
    onReconnect,
    position = 'bottom-right',
    showOnlyWhenOffline = true,
}) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [showBanner, setShowBanner] = useState(false);

    // Use external status if provided, otherwise use browser online status
    const status: ConnectionStatusType = externalStatus ?? (isOnline ? 'connected' : 'disconnected');

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowBanner(true);
            // Hide success banner after 3 seconds
            setTimeout(() => setShowBanner(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowBanner(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleReconnect = async () => {
        setIsReconnecting(true);
        
        // Try to fetch a small resource to verify connection
        try {
            await fetch('https://api.binance.com/api/v3/ping', { 
                mode: 'no-cors',
                cache: 'no-store' 
            });
            setIsOnline(true);
            onReconnect?.();
        } catch {
            setIsOnline(false);
        } finally {
            setIsReconnecting(false);
        }
    };

    // Position classes
    const positionClasses = {
        'top-left': 'top-4 left-4',
        'top-right': 'top-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'bottom-right': 'bottom-4 right-4',
    };

    // Don't show if online and showOnlyWhenOffline is true
    if (showOnlyWhenOffline && status === 'connected' && !showBanner) {
        return null;
    }

    const getStatusConfig = () => {
        switch (status) {
            case 'connected':
                return {
                    icon: <Wifi className="w-4 h-4" />,
                    text: 'Connected',
                    bgColor: 'bg-white/10',
                    borderColor: 'border-green-500/30',
                    textColor: 'text-white',
                    iconColor: 'text-green-500',
                };
            case 'connecting':
                return {
                    icon: <RefreshCw className="w-4 h-4 animate-spin" />,
                    text: 'Connecting...',
                    bgColor: 'bg-yellow-500/10',
                    borderColor: 'border-yellow-500/30',
                    textColor: 'text-neutral-400',
                    iconColor: 'text-yellow-500',
                };
            case 'disconnected':
                return {
                    icon: <WifiOff className="w-4 h-4" />,
                    text: 'Disconnected',
                    bgColor: 'bg-red-500/10',
                    borderColor: 'border-red-500/30',
                    textColor: 'text-red-400',
                    iconColor: 'text-red-500',
                };
            case 'error':
                return {
                    icon: <WifiOff className="w-4 h-4" />,
                    text: 'Connection Error',
                    bgColor: 'bg-red-500/10',
                    borderColor: 'border-red-500/30',
                    textColor: 'text-red-400',
                    iconColor: 'text-red-500',
                };
        }
    };

    const config = getStatusConfig();

    return (
        <div 
            className={`fixed ${positionClasses[position]} z-50 animate-fade-in`}
            role="status"
            aria-live="polite"
        >
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${config.bgColor} border ${config.borderColor} backdrop-blur-sm shadow-lg`}>
                {/* Status Icon */}
                <div className={config.iconColor}>
                    {config.icon}
                </div>

                {/* Status Text */}
                <span className={`text-sm font-medium ${config.textColor}`}>
                    {config.text}
                </span>

                {/* Reconnect Button */}
                {showReconnect && (status === 'disconnected' || status === 'error') && (
                    <button
                        onClick={handleReconnect}
                        disabled={isReconnecting}
                        className={`ml-2 px-3 py-1 rounded-lg text-xs font-medium transition-all
                            ${isReconnecting 
                                ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed' 
                                : 'bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/80 text-white'
                            }`}
                    >
                        {isReconnecting ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                            'Retry'
                        )}
                    </button>
                )}

                {/* Close button for success banner */}
                {status === 'connected' && showBanner && (
                    <button
                        onClick={() => setShowBanner(false)}
                        className="ml-2 text-white/60 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );
};

export default ConnectionStatusIndicator;
