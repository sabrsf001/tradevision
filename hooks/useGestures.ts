/**
 * useGestures Hook
 * Touch gesture handling for mobile devices
 * Supports: pinch-to-zoom, swipe, double-tap, long-press
 */

import { useRef, useCallback, useEffect } from 'react';

interface GestureConfig {
  onPinchZoom?: (scale: number) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onDoubleTap?: (x: number, y: number) => void;
  onLongPress?: (x: number, y: number) => void;
  onPan?: (deltaX: number, deltaY: number) => void;
  swipeThreshold?: number;
  longPressDelay?: number;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  lastTapTime: number;
  initialPinchDistance: number;
  isPinching: boolean;
  longPressTimer: ReturnType<typeof setTimeout> | null;
}

export function useGestures(config: GestureConfig) {
  const {
    onPinchZoom,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onDoubleTap,
    onLongPress,
    onPan,
    swipeThreshold = 50,
    longPressDelay = 500,
  } = config;

  const touchState = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    lastTapTime: 0,
    initialPinchDistance: 0,
    isPinching: false,
    longPressTimer: null,
  });

  const getDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const clearLongPressTimer = useCallback(() => {
    if (touchState.current.longPressTimer) {
      clearTimeout(touchState.current.longPressTimer);
      touchState.current.longPressTimer = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const state = touchState.current;
    
    if (e.touches.length === 2) {
      // Pinch start
      state.isPinching = true;
      state.initialPinchDistance = getDistance(e.touches);
      clearLongPressTimer();
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      state.startX = touch.clientX;
      state.startY = touch.clientY;
      state.startTime = Date.now();
      state.isPinching = false;

      // Long press detection
      if (onLongPress) {
        state.longPressTimer = setTimeout(() => {
          onLongPress(touch.clientX, touch.clientY);
          // Trigger haptic feedback
          if ('vibrate' in navigator) {
            navigator.vibrate(50);
          }
        }, longPressDelay);
      }
    }
  }, [onLongPress, longPressDelay, clearLongPressTimer]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const state = touchState.current;
    clearLongPressTimer();

    if (e.touches.length === 2 && state.isPinching && onPinchZoom) {
      // Pinch zoom
      const currentDistance = getDistance(e.touches);
      if (state.initialPinchDistance > 0) {
        const scale = currentDistance / state.initialPinchDistance;
        onPinchZoom(scale);
      }
    } else if (e.touches.length === 1 && onPan && !state.isPinching) {
      // Pan
      const touch = e.touches[0];
      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;
      onPan(deltaX, deltaY);
    }
  }, [onPinchZoom, onPan, clearLongPressTimer]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const state = touchState.current;
    clearLongPressTimer();

    if (state.isPinching) {
      state.isPinching = false;
      state.initialPinchDistance = 0;
      return;
    }

    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;
      const deltaTime = Date.now() - state.startTime;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Double tap detection
      const now = Date.now();
      if (deltaTime < 300 && absDeltaX < 10 && absDeltaY < 10) {
        if (now - state.lastTapTime < 300 && onDoubleTap) {
          onDoubleTap(touch.clientX, touch.clientY);
          // Trigger haptic feedback
          if ('vibrate' in navigator) {
            navigator.vibrate(30);
          }
          state.lastTapTime = 0;
        } else {
          state.lastTapTime = now;
        }
      }

      // Swipe detection
      if (deltaTime < 300) {
        if (absDeltaX > swipeThreshold && absDeltaX > absDeltaY) {
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft();
          }
          // Trigger haptic feedback
          if ('vibrate' in navigator) {
            navigator.vibrate(20);
          }
        } else if (absDeltaY > swipeThreshold && absDeltaY > absDeltaX) {
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown();
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp();
          }
        }
      }
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onDoubleTap, swipeThreshold, clearLongPressTimer]);

  const bind = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { bind };
}

export default useGestures;
