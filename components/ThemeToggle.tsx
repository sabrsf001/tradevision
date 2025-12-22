/**
 * Theme Toggle Component
 * Allows users to switch between light, dark, and system themes
 */

import React, { useState, useRef, useEffect } from 'react';
import { useThemeStore, type Theme } from '../store/appStore';
import { Sun, Moon, Monitor, ChevronDown, Check } from './Icons';

// Simple theme toggle button
export const ThemeToggleButton: React.FC = () => {
  const { theme, resolvedTheme, setTheme } = useThemeStore();

  const toggleTheme = () => {
    // Cycle through: dark -> light -> system -> dark
    const nextTheme: Theme = 
      theme === 'dark' ? 'light' : 
      theme === 'light' ? 'system' : 'dark';
    setTheme(nextTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-secondary)] transition-colors"
      title={`Theme: ${theme}`}
    >
      {resolvedTheme === 'dark' ? (
        <Moon className="w-5 h-5 text-[var(--text-secondary)]" />
      ) : (
        <Sun className="w-5 h-5 text-yellow-500" />
      )}
    </button>
  );
};

// Theme dropdown with all options
export const ThemeDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, resolvedTheme, setTheme } = useThemeStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
    { value: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
  ];

  const currentThemeConfig = themes.find(t => t.value === theme) || themes[1];

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)] transition-colors"
      >
        {currentThemeConfig.icon}
        <span className="text-sm text-[var(--text-primary)]">{currentThemeConfig.label}</span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl z-50">
          {themes.map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => {
                setTheme(value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                theme === value
                  ? 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'
                  : 'text-[var(--text-primary)] hover:bg-[var(--bg-panel)]'
              }`}
            >
              {icon}
              <span className="flex-1 text-left">{label}</span>
              {theme === value && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Theme provider wrapper (initializes theme on mount)
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    // Initialize theme on mount
    setTheme(theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        setTheme('system'); // Re-apply to update resolved theme
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, setTheme]);

  return <>{children}</>;
};

export default ThemeDropdown;
