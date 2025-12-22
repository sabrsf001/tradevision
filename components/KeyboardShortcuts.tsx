import React from 'react';
import { X, Keyboard } from './Icons';

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { category: 'Navigation', items: [
    { keys: ['/', 'Ctrl', 'K'], description: 'Search symbols' },
    { keys: ['1-6'], description: 'Switch timeframe (1m-1D)' },
    { keys: ['Esc'], description: 'Close panel / Deselect' },
  ]},
  { category: 'Drawing Tools', items: [
    { keys: ['V'], description: 'Select tool (cursor)' },
    { keys: ['C'], description: 'Crosshair' },
    { keys: ['T'], description: 'Trendline' },
    { keys: ['H'], description: 'Horizontal line' },
    { keys: ['R'], description: 'Rectangle' },
    { keys: ['F'], description: 'Fibonacci retracement' },
    { keys: ['Delete'], description: 'Delete selected drawing' },
  ]},
  { category: 'Chart Actions', items: [
    { keys: ['Ctrl', 'Z'], description: 'Undo' },
    { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
    { keys: ['Ctrl', 'S'], description: 'Save workspace' },
    { keys: ['Space'], description: 'Toggle replay play/pause' },
    { keys: ['+', '-'], description: 'Zoom in/out' },
  ]},
  { category: 'Panels', items: [
    { keys: ['A'], description: 'Open alerts manager' },
    { keys: ['I'], description: 'Toggle AI assistant' },
    { keys: ['W'], description: 'Toggle watchlist' },
    { keys: ['?'], description: 'Show shortcuts' },
  ]},
];

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] w-[600px] max-h-[80vh] rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)] bg-[var(--bg-panel)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--bg-primary)] flex items-center justify-center">
              <Keyboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold">Keyboard Shortcuts</h2>
              <p className="text-xs text-gray-500">Master the keyboard for faster trading</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          <div className="grid grid-cols-2 gap-6">
            {shortcuts.map(category => (
              <div key={category.category}>
                <h3 className="text-xs uppercase text-gray-500 font-semibold tracking-wider mb-3">
                  {category.category}
                </h3>
                <div className="space-y-2">
                  {category.items.map((shortcut, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between py-2 px-3 rounded bg-[var(--bg-primary)] border border-[var(--border-color)]"
                    >
                      <span className="text-sm text-gray-300">{shortcut.description}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, j) => (
                          <React.Fragment key={j}>
                            <kbd className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-xs text-white font-mono min-w-[24px] text-center">
                              {key}
                            </kbd>
                            {j < shortcut.keys.length - 1 && shortcut.keys.length > 1 && (
                              <span className="text-gray-600">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-panel)]">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-white">?</kbd> anywhere to toggle this panel
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;
