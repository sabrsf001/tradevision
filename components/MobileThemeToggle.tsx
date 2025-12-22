import React from 'react';
import { Sun, Moon } from './Icons';

interface MobileThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export const MobileThemeToggle: React.FC<MobileThemeToggleProps> = ({ isDark, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="relative w-14 h-8 rounded-full transition-colors duration-300 touch-manipulation"
      style={{
        background: isDark 
          ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
          : 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
        boxShadow: isDark 
          ? 'inset 0 2px 4px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)'
          : 'inset 0 2px 4px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.1)',
      }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Track stars/clouds decoration */}
      <div className="absolute inset-0 overflow-hidden rounded-full">
        {isDark ? (
          <>
            <span className="absolute w-1 h-1 bg-white rounded-full opacity-60" style={{ top: '20%', left: '15%' }} />
            <span className="absolute w-0.5 h-0.5 bg-white rounded-full opacity-40" style={{ top: '60%', left: '25%' }} />
            <span className="absolute w-1 h-1 bg-white rounded-full opacity-50" style={{ top: '35%', left: '35%' }} />
          </>
        ) : (
          <span 
            className="absolute w-6 h-3 bg-white/30 rounded-full blur-sm"
            style={{ top: '40%', left: '10%' }}
          />
        )}
      </div>

      {/* Toggle knob */}
      <div
        className="absolute top-1 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ease-out"
        style={{
          left: isDark ? '2px' : 'calc(100% - 26px)',
          background: isDark 
            ? 'linear-gradient(135deg, #475569 0%, #1e293b 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #fef3c7 100%)',
          boxShadow: isDark 
            ? '0 2px 8px rgba(0,0,0,0.4)'
            : '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        {isDark ? (
          <Moon className="w-4 h-4 text-slate-200" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
      </div>
    </button>
  );
};

// Compact version for header
export const MobileThemeToggleCompact: React.FC<MobileThemeToggleProps> = ({ isDark, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="w-10 h-10 rounded-xl flex items-center justify-center touch-manipulation active:scale-95 transition-transform"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
      }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
      ) : (
        <Moon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
      )}
    </button>
  );
};

export default MobileThemeToggle;
