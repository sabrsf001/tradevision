/**
 * Touch Gestures Hook for TradeVision
 * Pinch-to-zoom, swipe gestures for mobile
 */

import { useEffect, useRef, useCallback, useState } from 'react';

// ============================================
// Types
// ============================================
interface Point {
  x: number;
  y: number;
}

interface GestureState {
  isGesturing: boolean;
  scale: number;
  translation: Point;
  rotation: number;
}

interface SwipeEvent {
  direction: 'left' | 'right' | 'up' | 'down';
  velocity: number;
  distance: number;
}

type SwipeHandler = (event: SwipeEvent) => void;
type PinchHandler = (scale: number, center: Point) => void;
type PanHandler = (delta: Point, velocity: Point) => void;

// ============================================
// Utility Functions
// ============================================
function getDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getCenter(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

// ============================================
// Pinch-to-Zoom Hook
// ============================================
export function usePinchZoom(
  onPinch: PinchHandler,
  options: {
    minScale?: number;
    maxScale?: number;
  } = {}
) {
  const { minScale = 0.5, maxScale = 3 } = options;
  const elementRef = useRef<HTMLElement>(null);
  const initialDistance = useRef<number>(0);
  const lastScale = useRef<number>(1);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const p1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        const p2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
        initialDistance.current = getDistance(p1, p2);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const p1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        const p2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
        
        const currentDistance = getDistance(p1, p2);
        const scale = (currentDistance / initialDistance.current) * lastScale.current;
        const clampedScale = Math.min(maxScale, Math.max(minScale, scale));
        const center = getCenter(p1, p2);
        
        onPinch(clampedScale, center);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        // Store the last scale for the next gesture
        // This would need state management in real implementation
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onPinch, minScale, maxScale]);

  return elementRef;
}

// ============================================
// Swipe Hook
// ============================================
export function useSwipe(
  onSwipe: SwipeHandler,
  options: {
    threshold?: number;
    velocityThreshold?: number;
  } = {}
) {
  const { threshold = 50, velocityThreshold = 0.3 } = options;
  const elementRef = useRef<HTMLElement>(null);
  const startPoint = useRef<Point | null>(null);
  const startTime = useRef<number>(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startPoint.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        startTime.current = Date.now();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!startPoint.current) return;
      
      const endPoint = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
      };
      
      const dx = endPoint.x - startPoint.current.x;
      const dy = endPoint.y - startPoint.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const duration = Date.now() - startTime.current;
      const velocity = distance / duration;
      
      if (distance >= threshold && velocity >= velocityThreshold) {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        let direction: SwipeEvent['direction'];
        if (absDx > absDy) {
          direction = dx > 0 ? 'right' : 'left';
        } else {
          direction = dy > 0 ? 'down' : 'up';
        }
        
        onSwipe({ direction, velocity, distance });
      }
      
      startPoint.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipe, threshold, velocityThreshold]);

  return elementRef;
}

// ============================================
// Pan Hook (Single finger drag)
// ============================================
export function usePan(
  onPan: PanHandler,
  onPanEnd?: () => void
) {
  const elementRef = useRef<HTMLElement>(null);
  const lastPoint = useRef<Point | null>(null);
  const lastTime = useRef<number>(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        lastPoint.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        lastTime.current = Date.now();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && lastPoint.current) {
        const currentPoint = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        
        const delta = {
          x: currentPoint.x - lastPoint.current.x,
          y: currentPoint.y - lastPoint.current.y,
        };
        
        const currentTime = Date.now();
        const timeDelta = currentTime - lastTime.current;
        const velocity = {
          x: delta.x / timeDelta,
          y: delta.y / timeDelta,
        };
        
        onPan(delta, velocity);
        
        lastPoint.current = currentPoint;
        lastTime.current = currentTime;
      }
    };

    const handleTouchEnd = () => {
      lastPoint.current = null;
      onPanEnd?.();
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onPan, onPanEnd]);

  return elementRef;
}

// ============================================
// Combined Gesture Hook
// ============================================
export function useGestures(options: {
  onPinch?: PinchHandler;
  onSwipe?: SwipeHandler;
  onPan?: PanHandler;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  longPressDelay?: number;
  doubleTapDelay?: number;
} = {}) {
  const {
    onPinch,
    onSwipe,
    onPan,
    onDoubleTap,
    onLongPress,
    longPressDelay = 500,
    doubleTapDelay = 300,
  } = options;

  const elementRef = useRef<HTMLElement>(null);
  const [gestureState, setGestureState] = useState<GestureState>({
    isGesturing: false,
    scale: 1,
    translation: { x: 0, y: 0 },
    rotation: 0,
  });

  const touchState = useRef({
    startPoints: [] as Point[],
    lastTap: 0,
    longPressTimer: null as ReturnType<typeof setTimeout> | null,
    initialDistance: 0,
    lastScale: 1,
  });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touches = Array.from(e.touches).map((t) => ({
        x: t.clientX,
        y: t.clientY,
      }));
      touchState.current.startPoints = touches;

      // Double tap detection
      if (touches.length === 1) {
        const now = Date.now();
        if (now - touchState.current.lastTap < doubleTapDelay) {
          onDoubleTap?.();
          touchState.current.lastTap = 0;
        } else {
          touchState.current.lastTap = now;
        }

        // Long press detection
        touchState.current.longPressTimer = setTimeout(() => {
          onLongPress?.();
        }, longPressDelay);
      }

      // Pinch setup
      if (touches.length === 2) {
        touchState.current.initialDistance = getDistance(touches[0], touches[1]);
      }

      setGestureState((prev) => ({ ...prev, isGesturing: true }));
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchState.current.longPressTimer) {
        clearTimeout(touchState.current.longPressTimer);
        touchState.current.longPressTimer = null;
      }

      const touches = Array.from(e.touches).map((t) => ({
        x: t.clientX,
        y: t.clientY,
      }));

      // Pinch
      if (touches.length === 2 && onPinch) {
        e.preventDefault();
        const currentDistance = getDistance(touches[0], touches[1]);
        const scale =
          (currentDistance / touchState.current.initialDistance) *
          touchState.current.lastScale;
        const center = getCenter(touches[0], touches[1]);
        onPinch(scale, center);
        setGestureState((prev) => ({ ...prev, scale }));
      }

      // Pan
      if (touches.length === 1 && onPan && touchState.current.startPoints.length === 1) {
        const delta = {
          x: touches[0].x - touchState.current.startPoints[0].x,
          y: touches[0].y - touchState.current.startPoints[0].y,
        };
        onPan(delta, { x: 0, y: 0 });
        setGestureState((prev) => ({
          ...prev,
          translation: delta,
        }));
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchState.current.longPressTimer) {
        clearTimeout(touchState.current.longPressTimer);
        touchState.current.longPressTimer = null;
      }

      // Swipe detection
      if (
        touchState.current.startPoints.length === 1 &&
        e.changedTouches.length === 1 &&
        onSwipe
      ) {
        const endPoint = {
          x: e.changedTouches[0].clientX,
          y: e.changedTouches[0].clientY,
        };
        const startPoint = touchState.current.startPoints[0];
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 50) {
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);
          const direction: SwipeEvent['direction'] =
            absDx > absDy ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
          onSwipe({ direction, velocity: 1, distance });
        }
      }

      touchState.current.lastScale = gestureState.scale;
      setGestureState((prev) => ({ ...prev, isGesturing: false }));
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [
    onPinch,
    onSwipe,
    onPan,
    onDoubleTap,
    onLongPress,
    longPressDelay,
    doubleTapDelay,
    gestureState.scale,
  ]);

  return { ref: elementRef, gestureState };
}

// ============================================
// Chart-Specific Gestures
// ============================================
export function useChartGestures(options: {
  onZoom: (scale: number, center: Point) => void;
  onScroll: (delta: number) => void;
  onTimeframeSwipe?: (direction: 'next' | 'prev') => void;
}) {
  const { onZoom, onScroll, onTimeframeSwipe } = options;

  const handlePinch: PinchHandler = useCallback(
    (scale, center) => {
      onZoom(scale, center);
    },
    [onZoom]
  );

  const handleSwipe: SwipeHandler = useCallback(
    (event) => {
      if (event.direction === 'left' || event.direction === 'right') {
        // Horizontal swipe for scrolling through time
        const delta = event.direction === 'left' ? 10 : -10;
        onScroll(delta);
      } else if (onTimeframeSwipe) {
        // Vertical swipe for changing timeframe
        onTimeframeSwipe(event.direction === 'up' ? 'next' : 'prev');
      }
    },
    [onScroll, onTimeframeSwipe]
  );

  const handlePan: PanHandler = useCallback(
    (delta) => {
      // Pan for fine-grained scrolling
      onScroll(-delta.x * 0.5);
    },
    [onScroll]
  );

  return useGestures({
    onPinch: handlePinch,
    onSwipe: handleSwipe,
    onPan: handlePan,
  });
}
