/**
 * Landscape Mode Components
 * Optimized layouts for horizontal orientation
 */

import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2 } from './Icons';

// Hook to detect orientation
export function useOrientation() {
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isLand = window.matchMedia('(orientation: landscape)').matches;
      const isMob = window.innerWidth <= 1024;
      setIsLandscape(isLand);
      setIsMobile(isMob);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return { isLandscape, isMobile, isLandscapeMobile: isLandscape && isMobile };
}

// Fullscreen Chart Mode
interface FullscreenChartProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  symbol?: string;
  price?: number;
}

export const FullscreenChart: React.FC<FullscreenChartProps> = ({
  isOpen,
  onClose,
  children,
  symbol,
  price,
}) => {
  useEffect(() => {
    if (isOpen) {
      // Try to enter fullscreen
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      // Lock to landscape on mobile (with type assertion for experimental API)
      const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
      if (orientation?.lock) {
        orientation.lock('landscape').catch(() => {});
      }
    } else {
      // Exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      // Unlock orientation (with type assertion for experimental API)
      const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void };
      if (orientation?.unlock) {
        orientation.unlock();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)]">
      {/* Minimal header */}
      <div className="absolute top-0 left-0 right-0 h-12 flex items-center justify-between px-4 bg-gradient-to-b from-black/50 to-transparent z-10">
        <div className="flex items-center gap-3">
          {symbol && (
            <span className="text-lg font-bold text-white">{symbol}</span>
          )}
          {price !== undefined && (
            <span className="text-lg text-[var(--text-secondary)]">
              ${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 touch-active"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      </div>

      {/* Chart content */}
      <div className="w-full h-full">
        {children}
      </div>
    </div>
  );
};

// Landscape Layout Wrapper
interface LandscapeLayoutProps {
  children: React.ReactNode;
  sidePanel?: React.ReactNode;
  showSidePanel?: boolean;
}

export const LandscapeLayout: React.FC<LandscapeLayoutProps> = ({
  children,
  sidePanel,
  showSidePanel = false,
}) => {
  const { isLandscapeMobile } = useOrientation();

  if (!isLandscapeMobile) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className={`flex-1 ${showSidePanel ? 'mr-64' : ''}`}>
        {children}
      </div>

      {/* Side panel in landscape */}
      {showSidePanel && sidePanel && (
        <div className="fixed right-0 top-0 bottom-0 w-64 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] z-40">
          {sidePanel}
        </div>
      )}
    </div>
  );
};

// Fullscreen Toggle Button
interface FullscreenButtonProps {
  isFullscreen: boolean;
  onToggle: () => void;
  className?: string;
}

export const FullscreenButton: React.FC<FullscreenButtonProps> = ({
  isFullscreen,
  onToggle,
  className = '',
}) => {
  return (
    <button
      onClick={() => {
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(15);
        }
        onToggle();
      }}
      className={`p-2 rounded-lg transition-colors touch-active ${className}`}
    >
      {isFullscreen ? (
        <Minimize2 className="w-5 h-5" />
      ) : (
        <Maximize2 className="w-5 h-5" />
      )}
    </button>
  );
};

export default FullscreenChart;
