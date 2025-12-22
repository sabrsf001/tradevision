/**
 * Offline Indicator
 * Shows connection status on mobile
 */

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from './Icons';

interface OfflineIndicatorProps {
  isOnline: boolean;
  onRetry?: () => void;
  lastUpdated?: Date;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOnline,
  onRetry,
  lastUpdated,
}) => {
  const [show, setShow] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
      setWasOffline(true);
    } else if (wasOffline) {
      // Show "Back online" briefly
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!show) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[60] safe-area-top transition-all duration-300 ${
        show ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div
        className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
          isOnline
            ? 'bg-[var(--accent-green)] text-white'
            : 'bg-[var(--accent-red)] text-white'
        }`}
      >
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>Back online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>You're offline</span>
            {lastUpdated && (
              <span className="opacity-75 text-xs">
                • Last updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            {onRetry && (
              <button
                onClick={onRetry}
                className="ml-2 p-1 rounded hover:bg-white/20 touch-active"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;
