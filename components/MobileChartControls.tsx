/**
 * Mobile Chart Controls
 * Touch-friendly chart controls for mobile devices and tablets
 * Redesigned for better UX on phones and iPads
 */

import React, { useState } from 'react';
import { 
  TrendingUp, Activity, Plus, Minus, RotateCcw, 
  MousePointer2, Crosshair, Square, Type, Trash2,
  Undo, Redo, Palette, X, Check, Minus as HorizontalLine,
  SeparatorVertical, GitMerge, Eye, EyeOff, Lock, LockOpen,
  Layers, ChevronUp, ChevronDown, Settings2, Target
} from './Icons';

// Types
interface DrawingToolItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  shortLabel?: string;
}

// ============ MOBILE CHART FLOATING CONTROLS ============
interface MobileChartControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleIndicators: () => void;
  onToggleDrawing: () => void;
  showIndicators?: boolean;
  isDrawingMode?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const MobileChartControls: React.FC<MobileChartControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleIndicators,
  onToggleDrawing,
  showIndicators = false,
  isDrawingMode = false,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  return (
    <>
      {/* Zoom Controls - Right side */}
      <div className="sm:hidden md:flex absolute bottom-24 right-3 flex-col gap-1.5 z-20">
        <div className="flex flex-col bg-[var(--bg-panel)]/95 backdrop-blur-md rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-xl">
          <button 
            onClick={onZoomIn} 
            className="p-3.5 text-[var(--text-secondary)] hover:text-white hover:bg-white/10 active:bg-white/20 transition-all touch-active"
            aria-label="Zoom In"
          >
            <Plus className="w-5 h-5" />
          </button>
          <div className="h-px bg-[var(--border-color)]" />
          <button 
            onClick={onZoomOut} 
            className="p-3.5 text-[var(--text-secondary)] hover:text-white hover:bg-white/10 active:bg-white/20 transition-all touch-active"
            aria-label="Zoom Out"
          >
            <Minus className="w-5 h-5" />
          </button>
          <div className="h-px bg-[var(--border-color)]" />
          <button 
            onClick={onResetZoom} 
            className="p-3.5 text-[var(--text-secondary)] hover:text-white hover:bg-white/10 active:bg-white/20 transition-all touch-active"
            aria-label="Reset Zoom"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tools Toggle - Left side */}
      <div className="sm:hidden md:flex absolute bottom-24 left-3 flex-col gap-1.5 z-20">
        <div className="flex flex-col bg-[var(--bg-panel)]/95 backdrop-blur-md rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-xl">
          <button 
            onClick={onToggleIndicators}
            className={`p-3.5 transition-all touch-active ${
              showIndicators 
                ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/15' 
                : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/10'
            }`}
            aria-label="Toggle Indicators"
          >
            <Activity className="w-5 h-5" />
          </button>
          <div className="h-px bg-[var(--border-color)]" />
          <button 
            onClick={onToggleDrawing}
            className={`p-3.5 transition-all touch-active ${
              isDrawingMode 
                ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/15' 
                : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/10'
            }`}
            aria-label="Drawing Tools"
          >
            <TrendingUp className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Undo/Redo - Top right when drawing */}
      {isDrawingMode && (onUndo || onRedo) && (
        <div className="sm:hidden md:flex absolute top-20 right-3 flex-row gap-1.5 z-20">
          <div className="flex flex-row bg-[var(--bg-panel)]/95 backdrop-blur-md rounded-xl border border-[var(--border-color)] overflow-hidden shadow-xl">
            <button 
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-3 transition-all touch-active ${
                canUndo 
                  ? 'text-[var(--text-secondary)] hover:text-white hover:bg-white/10' 
                  : 'text-[var(--text-secondary)]/30 cursor-not-allowed'
              }`}
              aria-label="Undo"
            >
              <Undo className="w-4 h-4" />
            </button>
            <div className="w-px bg-[var(--border-color)]" />
            <button 
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-3 transition-all touch-active ${
                canRedo 
                  ? 'text-[var(--text-secondary)] hover:text-white hover:bg-white/10' 
                  : 'text-[var(--text-secondary)]/30 cursor-not-allowed'
              }`}
              aria-label="Redo"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// ============ MOBILE TIMEFRAME SELECTOR ============
interface MobileTimeframeSelectorProps {
  timeframes: string[];
  selected: string;
  onChange: (tf: string) => void;
}

export const MobileTimeframeSelector: React.FC<MobileTimeframeSelectorProps> = ({ 
  timeframes, 
  selected, 
  onChange 
}) => {
  return (
    <div className="flex gap-1.5 px-3 py-2.5 overflow-x-auto scrollbar-hide bg-[var(--bg-secondary)]/80 backdrop-blur-sm border-b border-[var(--border-color)]">
      {timeframes.map((tf) => (
        <button 
          key={tf} 
          onClick={() => onChange(tf)}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all touch-active ${
            selected === tf 
              ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/25' 
              : 'bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)]'
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
};

// ============ MOBILE PRICE DISPLAY ============
interface MobilePriceDisplayProps {
  price: number;
  change: number;
  changePercent: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
}

export const MobilePriceDisplay: React.FC<MobilePriceDisplayProps> = ({ 
  price, 
  change, 
  changePercent, 
  high24h, 
  low24h,
  volume24h 
}) => {
  const isPositive = change >= 0;
  const changeColor = isPositive ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]';
  const changeBg = isPositive ? 'bg-[var(--accent-green)]/10' : 'bg-[var(--accent-red)]/10';

  return (
    <div className="px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
      <div className="flex items-center gap-3">
        <span className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tabular-nums">
          ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className={`px-2.5 py-1 rounded-lg text-sm font-semibold ${changeColor} ${changeBg}`}>
          {isPositive ? '↑' : '↓'} {Math.abs(changePercent).toFixed(2)}%
        </span>
      </div>
      
      {(high24h !== undefined || low24h !== undefined || volume24h !== undefined) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs md:text-sm">
          {high24h !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-secondary)]">H:</span>
              <span className="text-[var(--accent-green)] font-medium tabular-nums">${high24h.toLocaleString()}</span>
            </div>
          )}
          {low24h !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-secondary)]">L:</span>
              <span className="text-[var(--accent-red)] font-medium tabular-nums">${low24h.toLocaleString()}</span>
            </div>
          )}
          {volume24h !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-secondary)]">Vol:</span>
              <span className="text-[var(--text-primary)] font-medium tabular-nums">
                ${(volume24h / 1e9).toFixed(2)}B
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============ MOBILE DRAWING TOOLBAR (HORIZONTAL) ============
interface MobileDrawingToolbarProps {
  selectedTool: string;
  onSelectTool: (tool: string) => void;
  onDone: () => void;
  onClearAll?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

const drawingTools: DrawingToolItem[] = [
  { id: 'cursor', icon: <MousePointer2 className="w-5 h-5" />, label: 'Select', shortLabel: 'Select' },
  { id: 'crosshair', icon: <Crosshair className="w-5 h-5" />, label: 'Crosshair', shortLabel: 'Cross' },
  { id: 'trendline', icon: <TrendingUp className="w-5 h-5" />, label: 'Trend Line', shortLabel: 'Trend' },
  { id: 'horizontal', icon: <HorizontalLine className="w-5 h-5" />, label: 'Horizontal', shortLabel: 'H-Line' },
  { id: 'vertical', icon: <SeparatorVertical className="w-5 h-5" />, label: 'Vertical', shortLabel: 'V-Line' },
  { id: 'rectangle', icon: <Square className="w-5 h-5" />, label: 'Rectangle', shortLabel: 'Rect' },
  { id: 'fibonacci', icon: <GitMerge className="w-5 h-5" />, label: 'Fibonacci', shortLabel: 'Fib' },
  { id: 'text', icon: <Type className="w-5 h-5" />, label: 'Text', shortLabel: 'Text' },
];

export const MobileDrawingToolbar: React.FC<MobileDrawingToolbarProps> = ({
  selectedTool,
  onSelectTool,
  onDone,
  onClearAll,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) => {
  return (
    <div className="bg-[var(--bg-panel)] border-t border-[var(--border-color)] safe-area-bottom">
      {/* Main Tools Row */}
      <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto scrollbar-hide">
        {drawingTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[56px] transition-all touch-active ${
              selectedTool === tool.id
                ? 'bg-[var(--accent-primary)] text-white shadow-lg'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)]'
            }`}
          >
            {tool.icon}
            <span className="text-[10px] font-medium whitespace-nowrap">{tool.shortLabel || tool.label}</span>
          </button>
        ))}
        
        {/* Spacer */}
        <div className="flex-1 min-w-[8px]" />
        
        {/* Action buttons */}
        <div className="flex items-center gap-1 pl-2 border-l border-[var(--border-color)]">
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-2.5 rounded-xl transition-all touch-active ${
                canUndo
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)]'
                  : 'bg-[var(--bg-secondary)]/50 text-[var(--text-secondary)]/30 border border-transparent cursor-not-allowed'
              }`}
            >
              <Undo className="w-5 h-5" />
            </button>
          )}
          {onRedo && (
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-2.5 rounded-xl transition-all touch-active ${
                canRedo
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)]'
                  : 'bg-[var(--bg-secondary)]/50 text-[var(--text-secondary)]/30 border border-transparent cursor-not-allowed'
              }`}
            >
              <Redo className="w-5 h-5" />
            </button>
          )}
          {onClearAll && (
            <button
              onClick={onClearAll}
              className="p-2.5 rounded-xl bg-[var(--accent-red)]/10 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/20 border border-[var(--accent-red)]/30 transition-all touch-active"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onDone}
            className="px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-white font-semibold shadow-lg shadow-[var(--accent-primary)]/25 transition-all touch-active flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span className="text-sm">Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============ MOBILE DRAWING TOOLS PANEL (BOTTOM SHEET CONTENT) ============
interface MobileDrawingToolsPanelProps {
  selectedTool: string | null;
  onSelectTool: (tool: string) => void;
  onClearDrawings: () => void;
  selectedColor?: string;
  onColorChange?: (color: string) => void;
  lineWidth?: number;
  onLineWidthChange?: (width: number) => void;
  onClose?: () => void;
}

const toolColors = [
  '#2962FF', // Blue
  '#FF6B6B', // Red
  '#4CAF50', // Green  
  '#FF9800', // Orange
  '#9C27B0', // Purple
  '#00BCD4', // Cyan
  '#FFEB3B', // Yellow
  '#FFFFFF', // White
];

const lineWidths = [1, 2, 3, 4];

export const MobileDrawingToolsPanel: React.FC<MobileDrawingToolsPanelProps> = ({ 
  selectedTool, 
  onSelectTool, 
  onClearDrawings,
  selectedColor = '#2962FF',
  onColorChange,
  lineWidth = 2,
  onLineWidthChange,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'tools' | 'style'>('tools');

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-[var(--border-color)]">
        <button
          onClick={() => setActiveTab('tools')}
          className={`flex-1 py-3 text-sm font-semibold transition-all ${
            activeTab === 'tools'
              ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          Drawing Tools
        </button>
        <button
          onClick={() => setActiveTab('style')}
          className={`flex-1 py-3 text-sm font-semibold transition-all ${
            activeTab === 'style'
              ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          Style
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-4">
        {activeTab === 'tools' ? (
          <>
            {/* Tools Grid */}
            <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mb-6">
              {drawingTools.map((tool) => (
                <button 
                  key={tool.id} 
                  onClick={() => {
                    onSelectTool(tool.id);
                    if (onClose) setTimeout(onClose, 150);
                  }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all touch-active ${
                    selectedTool === tool.id 
                      ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/30 scale-105' 
                      : 'bg-[var(--bg-panel)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/50'
                  }`}
                >
                  {tool.icon}
                  <span className="text-xs font-medium text-center leading-tight">{tool.label}</span>
                </button>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={onClearDrawings} 
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-[var(--accent-red)]/10 text-[var(--accent-red)] font-semibold border border-[var(--accent-red)]/30 touch-active hover:bg-[var(--accent-red)]/20 transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Clear All</span>
                </button>
                <button 
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-[var(--bg-panel)] text-[var(--text-secondary)] font-semibold border border-[var(--border-color)] touch-active hover:text-white transition-all"
                >
                  <Eye className="w-5 h-5" />
                  <span>Hide All</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Color Picker */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Color</h3>
              <div className="flex flex-wrap gap-3">
                {toolColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => onColorChange?.(color)}
                    className={`w-12 h-12 rounded-2xl transition-all touch-active ${
                      selectedColor === color
                        ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-secondary)] ring-[var(--accent-primary)] scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Line Width */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Line Width</h3>
              <div className="flex gap-3">
                {lineWidths.map((width) => (
                  <button
                    key={width}
                    onClick={() => onLineWidthChange?.(width)}
                    className={`flex-1 py-4 rounded-2xl transition-all touch-active flex flex-col items-center gap-2 ${
                      lineWidth === width
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--bg-panel)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                    }`}
                  >
                    <div 
                      className="rounded-full bg-current"
                      style={{ width: `${width * 8 + 8}px`, height: `${width + 1}px` }}
                    />
                    <span className="text-xs font-medium">{width}px</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Line Style (future) */}
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Line Style</h3>
              <div className="flex gap-3">
                <button className="flex-1 py-4 rounded-2xl bg-[var(--accent-primary)] text-white transition-all touch-active">
                  <div className="w-full h-0.5 bg-current mx-4" />
                </button>
                <button className="flex-1 py-4 rounded-2xl bg-[var(--bg-panel)] text-[var(--text-secondary)] border border-[var(--border-color)] transition-all touch-active">
                  <div className="w-full h-0.5 mx-4 border-t-2 border-dashed border-current" />
                </button>
                <button className="flex-1 py-4 rounded-2xl bg-[var(--bg-panel)] text-[var(--text-secondary)] border border-[var(--border-color)] transition-all touch-active">
                  <div className="w-full h-0.5 mx-4 border-t-2 border-dotted border-current" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ============ TABLET DRAWING SIDEBAR ============
interface TabletDrawingSidebarProps {
  isOpen: boolean;
  selectedTool: string;
  onSelectTool: (tool: string) => void;
  onClearDrawings: () => void;
  onClose: () => void;
}

export const TabletDrawingSidebar: React.FC<TabletDrawingSidebarProps> = ({
  isOpen,
  selectedTool,
  onSelectTool,
  onClearDrawings,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="hidden md:flex lg:hidden fixed right-0 top-0 bottom-0 w-72 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] z-40 flex-col shadow-2xl animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
        <h2 className="text-lg font-semibold text-white">Drawing Tools</h2>
        <button onClick={onClose} className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-panel)] touch-active">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tools */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-2">
          {drawingTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all touch-active ${
                selectedTool === tool.id
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)]'
              }`}
            >
              {tool.icon}
              <span className="text-[10px] font-medium">{tool.shortLabel || tool.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={onClearDrawings}
            className="w-full py-3 rounded-xl bg-[var(--accent-red)]/10 text-[var(--accent-red)] font-medium border border-[var(--accent-red)]/30 touch-active"
          >
            Clear All Drawings
          </button>
        </div>
      </div>
    </div>
  );
};

// ============ MOBILE INDICATOR QUICK TOGGLE ============
interface MobileIndicatorToggleProps {
  indicators: Array<{ id: string; type: string; active: boolean; color: string }>;
  onToggle: (id: string) => void;
}

export const MobileIndicatorToggle: React.FC<MobileIndicatorToggleProps> = ({
  indicators,
  onToggle,
}) => {
  return (
    <div className="flex gap-2 px-3 py-2 overflow-x-auto scrollbar-hide">
      {indicators.map((indicator) => (
        <button
          key={indicator.id}
          onClick={() => onToggle(indicator.id)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all touch-active ${
            indicator.active
              ? 'text-white'
              : 'bg-[var(--bg-panel)] text-[var(--text-secondary)] border border-[var(--border-color)]'
          }`}
          style={indicator.active ? { backgroundColor: indicator.color } : {}}
        >
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: indicator.color }}
          />
          {indicator.type}
        </button>
      ))}
    </div>
  );
};

export default MobileChartControls;
