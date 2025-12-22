/**
 * Hooks Index - Export all custom hooks
 */

// Keyboard Shortcuts
export {
  useKeyboardShortcuts,
  useTradingShortcuts,
  useEscapeKey,
  useArrowNavigation,
  getShortcutGroups,
  formatShortcut,
} from './useKeyboardShortcuts';

// Accessibility
export {
  useFocusTrap,
  useSkipLinks,
  useAnnounce,
  announce,
  useKeyboardNav,
  usePrefersReducedMotion,
  usePrefersHighContrast,
  usePriceAnnouncer,
  generateChartDescription,
} from './useAccessibility';

// Touch Gestures
export {
  usePinchZoom,
  useSwipe,
  usePan,
  useGestures,
  useChartGestures,
} from './useTouchGestures';

// Mobile Gestures (Enhanced)
export { useGestures as useMobileGestures } from './useGestures';

// Haptic Feedback
export { useHaptics } from './useHaptics';

// Offline Support
export { useOffline } from './useOffline';
