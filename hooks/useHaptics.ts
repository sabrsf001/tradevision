/**
 * useHaptics Hook
 * Haptic feedback for mobile interactions
 */

import { useCallback } from 'react';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

const hapticPatterns: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [30, 50, 30],
  warning: [50, 30, 50],
  error: [100, 50, 100],
  selection: 15,
};

export function useHaptics() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const trigger = useCallback((type: HapticType = 'light') => {
    if (!isSupported) return false;
    
    try {
      const pattern = hapticPatterns[type];
      navigator.vibrate(pattern);
      return true;
    } catch {
      return false;
    }
  }, [isSupported]);

  const impact = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    return trigger(intensity);
  }, [trigger]);

  const notification = useCallback((type: 'success' | 'warning' | 'error' = 'success') => {
    return trigger(type);
  }, [trigger]);

  const selection = useCallback(() => {
    return trigger('selection');
  }, [trigger]);

  const custom = useCallback((pattern: number | number[]) => {
    if (!isSupported) return false;
    try {
      navigator.vibrate(pattern);
      return true;
    } catch {
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    trigger,
    impact,
    notification,
    selection,
    custom,
  };
}

export default useHaptics;
