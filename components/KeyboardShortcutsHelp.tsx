/**
 * Keyboard Shortcuts Help Modal
 * Displays all available keyboard shortcuts
 */

import React from 'react';
import { getShortcutGroups, formatShortcut } from '../hooks/useKeyboardShortcuts';
import { useEscapeKey } from '../hooks/useKeyboardShortcuts';
import { useFocusTrap } from '../hooks/useAccessibility';

// ============================================
// Keyboard Shortcuts Modal
// ============================================
interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const containerRef = useFocusTrap(isOpen);
  
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const shortcutGroups = getShortcutGroups();

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        ref={containerRef}
        className="bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 id="shortcuts-title" className="text-xl font-semibold text-white">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            aria-label="Close shortcuts help"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shortcutGroups.map((group) => (
              <div key={group.name}>
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                  {group.name}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm text-gray-300">
                        {shortcut.description}
                      </span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-gray-800 border border-gray-600 rounded text-gray-200">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <p className="text-sm text-gray-400 text-center">
            Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-700 rounded">?</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Inline Shortcut Display
// ============================================
interface ShortcutBadgeProps {
  keys: string;
  className?: string;
}

export function ShortcutBadge({ keys, className = '' }: ShortcutBadgeProps) {
  return (
    <kbd
      className={`px-1.5 py-0.5 text-xs font-mono bg-gray-700 border border-gray-600 rounded text-gray-300 ${className}`}
    >
      {keys}
    </kbd>
  );
}

// ============================================
// Shortcut Hint Tooltip
// ============================================
interface ShortcutHintProps {
  children: React.ReactNode;
  shortcut: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function ShortcutHint({
  children,
  shortcut,
  position = 'bottom',
}: ShortcutHintProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute ${positionClasses[position]} px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded shadow-lg whitespace-nowrap z-50`}
          role="tooltip"
        >
          <span className="text-gray-300">Shortcut: </span>
          <ShortcutBadge keys={shortcut} />
        </div>
      )}
    </div>
  );
}

// ============================================
// Hook for Shortcuts Modal
// ============================================
export function useKeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '?' &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
    Modal: () => <KeyboardShortcutsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />,
  };
}

export default KeyboardShortcutsModal;
