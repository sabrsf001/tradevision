/**
 * Local AI Button - Quick access to AI analysis without API key
 */

import React, { useState } from 'react';
import { Sparkles, TrendingUp, Target, Layers, Activity, ChevronUp, ChevronDown } from './Icons';

interface AIAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  action: string;
}

const AI_ACTIONS: AIAction[] = [
  {
    id: 'zones',
    label: 'Supply & Demand',
    icon: <Layers className="w-5 h-5" />,
    description: 'Detect S/D zones',
    action: 'show_zones',
  },
  {
    id: 'sr',
    label: 'Support/Resistance',
    icon: <Target className="w-5 h-5" />,
    description: 'Find key levels',
    action: 'show_sr',
  },
  {
    id: 'trend',
    label: 'Trend Analysis',
    icon: <TrendingUp className="w-5 h-5" />,
    description: 'Identify trends',
    action: 'show_trend',
  },
  {
    id: 'patterns',
    label: 'Chart Patterns',
    icon: <Activity className="w-5 h-5" />,
    description: 'Detect patterns',
    action: 'show_patterns',
  },
];

interface LocalAIButtonProps {
  onAction: (action: string) => void;
  isAnalyzing?: boolean;
  className?: string;
}

export const LocalAIButton: React.FC<LocalAIButtonProps> = ({
  onAction,
  isAnalyzing = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* Expanded menu */}
      {isExpanded && (
        <div 
          className="absolute bottom-full right-0 mb-2 p-2 rounded-xl bg-[var(--bg-secondary)]/95 backdrop-blur-md border border-[var(--border-color)] shadow-xl animate-slide-up"
          style={{ minWidth: '200px' }}
        >
          <div className="flex items-center gap-2 px-3 py-2 mb-2 border-b border-[var(--border-color)]">
            <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              AI Analysis
            </span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]">
              Local
            </span>
          </div>
          
          <div className="space-y-1">
            {AI_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => {
                  onAction(action.action);
                  setIsExpanded(false);
                }}
                disabled={isAnalyzing}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors touch-manipulation active:scale-[0.98] disabled:opacity-50"
              >
                <div 
                  className="p-1.5 rounded-lg"
                  style={{ background: 'var(--accent-primary)', color: 'white' }}
                >
                  {action.icon}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {action.label}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {action.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
            <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
              ✨ No API key required
            </p>
          </div>
        </div>
      )}

      {/* Main button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={isAnalyzing}
        className={`
          relative flex items-center gap-2 px-4 py-3 rounded-xl font-medium
          transition-all duration-200 touch-manipulation
          ${isAnalyzing 
            ? 'bg-[var(--accent-primary)]/50' 
            : 'bg-gradient-to-r from-[var(--accent-primary)] to-purple-600 hover:shadow-lg hover:shadow-[var(--accent-primary)]/30'
          }
          text-white active:scale-[0.97]
        `}
      >
        {isAnalyzing ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Analyzing...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>AI</span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </>
        )}
        
        {/* Pulse effect */}
        {!isAnalyzing && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping" />
        )}
      </button>
    </div>
  );
};

// Compact version for mobile
export const LocalAIButtonCompact: React.FC<LocalAIButtonProps> = ({
  onAction,
  isAnalyzing = false,
}) => {
  return (
    <button
      onClick={() => onAction('show_zones')}
      disabled={isAnalyzing}
      className="relative p-3 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-purple-600 text-white shadow-lg active:scale-95 transition-transform touch-manipulation"
    >
      {isAnalyzing ? (
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          <Sparkles className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping" />
        </>
      )}
    </button>
  );
};

export default LocalAIButton;
