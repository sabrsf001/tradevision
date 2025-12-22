/**
 * useOffline Hook
 * Offline detection and data caching
 */

import { useState, useEffect, useCallback } from 'react';

interface CachedData<T> {
  data: T;
  timestamp: number;
  key: string;
}

export function useOffline() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Trigger haptic feedback on reconnect
        if ('vibrate' in navigator) {
          navigator.vibrate([30, 50, 30]);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      // Trigger haptic feedback on disconnect
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  const cacheData = useCallback(<T>(key: string, data: T) => {
    try {
      const cached: CachedData<T> = {
        data,
        timestamp: Date.now(),
        key,
      };
      localStorage.setItem(`offline_cache_${key}`, JSON.stringify(cached));
      return true;
    } catch {
      return false;
    }
  }, []);

  const getCachedData = useCallback(<T>(key: string, maxAge?: number): T | null => {
    try {
      const item = localStorage.getItem(`offline_cache_${key}`);
      if (!item) return null;

      const cached: CachedData<T> = JSON.parse(item);
      
      // Check if data is too old
      if (maxAge && Date.now() - cached.timestamp > maxAge) {
        localStorage.removeItem(`offline_cache_${key}`);
        return null;
      }

      return cached.data;
    } catch {
      return null;
    }
  }, []);

  const clearCache = useCallback((key?: string) => {
    try {
      if (key) {
        localStorage.removeItem(`offline_cache_${key}`);
      } else {
        // Clear all offline cache
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('offline_cache_')) {
            localStorage.removeItem(k);
          }
        });
      }
    } catch {
      // Ignore errors
    }
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
    cacheData,
    getCachedData,
    clearCache,
  };
}

export default useOffline;
