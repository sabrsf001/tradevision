/**
 * Quick Actions Menu
 * Context menu for long-press on mobile
 */

import React, { useEffect, useRef } from 'react';
import { Star, Bell, TrendingUp, Copy, Share2, X, Eye, Target } from './Icons';

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

interface QuickActionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  symbol?: string;
  price?: number;
  actions?: QuickAction[];
  // Pre-built action handlers
  onAddToWatchlist?: () => void;
  onSetAlert?: () => void;
  onCopyPrice?: () => void;
  onShare?: () => void;
  onViewDetails?: () => void;
  isInWatchlist?: boolean;
}

export const QuickActionsMenu: React.FC<QuickActionsMenuProps> = ({
  isOpen,
  onClose,
  position,
  symbol,
  price,
  actions,
  onAddToWatchlist,
  onSetAlert,
  onCopyPrice,
  onShare,
  onViewDetails,
  isInWatchlist = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const defaultActions: QuickAction[] = [
    ...(onAddToWatchlist ? [{
      id: 'watchlist',
      icon: <Star className={`w-5 h-5 ${isInWatchlist ? 'fill-current' : ''}`} />,
      label: isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist',
      onClick: onAddToWatchlist,
      variant: isInWatchlist ? 'warning' as const : 'default' as const,
    }] : []),
    ...(onSetAlert ? [{
      id: 'alert',
      icon: <Bell className="w-5 h-5" />,
      label: 'Set Price Alert',
      onClick: onSetAlert,
    }] : []),
    ...(onCopyPrice && price ? [{
      id: 'copy',
      icon: <Copy className="w-5 h-5" />,
      label: 'Copy Price',
      onClick: () => {
        navigator.clipboard.writeText(price.toString());
        onCopyPrice();
      },
    }] : []),
    ...(onShare ? [{
      id: 'share',
      icon: <Share2 className="w-5 h-5" />,
      label: 'Share',
      onClick: async () => {
        if (navigator.share && symbol) {
          try {
            await navigator.share({
              title: `${symbol} - TradeVision`,
              text: `Check out ${symbol} at $${price?.toLocaleString()}`,
              url: window.location.href,
            });
          } catch {
            // User cancelled or error
          }
        }
        onShare();
      },
    }] : []),
    ...(onViewDetails ? [{
      id: 'details',
      icon: <Eye className="w-5 h-5" />,
      label: 'View Details',
      onClick: onViewDetails,
    }] : []),
  ] as QuickAction[];

  const menuActions = actions || defaultActions;

  // Calculate menu position (keep on screen)
  const menuWidth = 200;
  const menuHeight = menuActions.length * 48 + 80;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  let left = position.x - menuWidth / 2;
  let top = position.y - menuHeight / 2;

  // Keep on screen
  if (left < 16) left = 16;
  if (left + menuWidth > windowWidth - 16) left = windowWidth - menuWidth - 16;
  if (top < 16) top = 16;
  if (top + menuHeight > windowHeight - 16) top = windowHeight - menuHeight - 16;

  const getVariantStyles = (variant?: string) => {
    switch (variant) {
      case 'success':
        return 'text-[var(--accent-green)]';
      case 'warning':
        return 'text-neutral-400';
      case 'danger':
        return 'text-[var(--accent-red)]';
      default:
        return 'text-[var(--text-primary)]';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm animate-fade-in">
      <div
        ref={menuRef}
        className="absolute bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-color)] shadow-2xl overflow-hidden animate-scale-in"
        style={{
          left,
          top,
          width: menuWidth,
        }}
      >
        {/* Header */}
        {symbol && (
          <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">{symbol}</div>
                {price && (
                  <div className="text-sm text-[var(--text-secondary)]">
                    ${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-panel)] touch-active"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="py-1">
          {menuActions.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                // Haptic feedback
                if ('vibrate' in navigator) {
                  navigator.vibrate(15);
                }
                action.onClick();
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] touch-active transition-colors ${getVariantStyles(action.variant)}`}
            >
              {action.icon}
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickActionsMenu;
