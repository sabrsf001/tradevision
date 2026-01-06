/**
 * Multi-Chart Layout Component - Enhanced
 * Supports multiple grid layouts, workspace saving, and sync features
 */

import React, { useState, useCallback } from 'react';
import { useMultiChartStore, type ChartInstance } from '../store/appStore';
import { ChartSkeleton } from './LoadingSkeleton';
import { Square, Layers, Plus, X, Check, Save, Download, Share, Link, Settings } from './Icons';

type LayoutType = '1x1' | '1x2' | '2x1' | '2x2' | '1x3' | '3x1' | '2x3' | '3x2' | '3x3';

interface LayoutOption {
  value: LayoutType;
  label: string;
  icon: React.ReactNode;
  cols: number;
  rows: number;
  premium?: boolean;
}

interface Workspace {
  id: string;
  name: string;
  layout: LayoutType;
  charts: { symbol: string; timeframe: string; indicators?: string[] }[];
  createdAt: number;
  updatedAt: number;
}

const layoutOptions: LayoutOption[] = [
  { value: '1x1', label: '1×1', icon: <Square className="w-4 h-4" />, cols: 1, rows: 1 },
  { value: '1x2', label: '1×2', icon: <Layers className="w-4 h-4" />, cols: 2, rows: 1 },
  { value: '2x1', label: '2×1', icon: <Layers className="w-4 h-4 rotate-90" />, cols: 1, rows: 2 },
  { value: '2x2', label: '2×2', icon: <Layers className="w-4 h-4" />, cols: 2, rows: 2 },
  { value: '1x3', label: '1×3', icon: <Layers className="w-4 h-4" />, cols: 3, rows: 1 },
  { value: '3x1', label: '3×1', icon: <Layers className="w-4 h-4 rotate-90" />, cols: 1, rows: 3 },
  { value: '2x3', label: '2×3', icon: <Layers className="w-4 h-4" />, cols: 3, rows: 2, premium: true },
  { value: '3x2', label: '3×2', icon: <Layers className="w-4 h-4" />, cols: 2, rows: 3, premium: true },
  { value: '3x3', label: '3×3', icon: <Layers className="w-4 h-4" />, cols: 3, rows: 3, premium: true },
];

const WORKSPACES_KEY = 'tv_workspaces';

// Workspace manager hook
function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    try {
      const saved = localStorage.getItem(WORKSPACES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveWorkspace = useCallback((workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newWorkspace: Workspace = {
      ...workspace,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const updated = [...workspaces, newWorkspace];
    setWorkspaces(updated);
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(updated));
    
    return newWorkspace;
  }, [workspaces]);

  const deleteWorkspace = useCallback((id: string) => {
    const updated = workspaces.filter(w => w.id !== id);
    setWorkspaces(updated);
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(updated));
  }, [workspaces]);

  const updateWorkspace = useCallback((id: string, updates: Partial<Workspace>) => {
    const updated = workspaces.map(w => 
      w.id === id ? { ...w, ...updates, updatedAt: Date.now() } : w
    );
    setWorkspaces(updated);
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(updated));
  }, [workspaces]);

  return { workspaces, saveWorkspace, deleteWorkspace, updateWorkspace };
}

// Layout selector component with workspace management
export const LayoutSelector: React.FC = () => {
  const { layout, setLayout, charts } = useMultiChartStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showWorkspaces, setShowWorkspaces] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const { workspaces, saveWorkspace, deleteWorkspace } = useWorkspaces();

  const handleSaveWorkspace = () => {
    if (!workspaceName.trim()) return;
    
    saveWorkspace({
      name: workspaceName,
      layout,
      charts: charts.map(c => ({ symbol: c.symbol, timeframe: c.timeframe })),
    });
    
    setWorkspaceName('');
    setShowWorkspaces(false);
  };

  const handleLoadWorkspace = (workspace: Workspace) => {
    setLayout(workspace.layout);
    // In production, would also restore charts
    setIsOpen(false);
    setShowWorkspaces(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-secondary)] transition-colors"
          title="Chart Layout"
        >
          <Layers className="w-5 h-5 text-[var(--text-secondary)]" />
        </button>
        
        <button
          onClick={() => setShowWorkspaces(!showWorkspaces)}
          className="p-2 rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-secondary)] transition-colors"
          title="Workspaces"
        >
          <Save className="w-5 h-5 text-[var(--text-secondary)]" />
        </button>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl z-50">
            <div className="text-xs text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Layout</div>
            <div className="grid grid-cols-3 gap-2">
              {layoutOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setLayout(option.value);
                    setIsOpen(false);
                  }}
                  disabled={option.premium}
                  className={`relative flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                    layout === option.value
                      ? 'bg-[var(--accent-blue)] text-white'
                      : option.premium
                      ? 'bg-[var(--bg-panel)] text-[var(--text-secondary)]/50 cursor-not-allowed'
                      : 'bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
                  }`}
                >
                  {option.icon}
                  <span className="text-xs font-medium">{option.label}</span>
                  {option.premium && (
                    <span className="absolute top-1 right-1 text-[8px] bg-yellow-500/20 text-yellow-500 px-1 rounded">PRO</span>
                  )}
                </button>
              ))}
            </div>
            
            <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span>Sync crosshair</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span>Sync timeframe</span>
                </label>
              </div>
            </div>
          </div>
        </>
      )}

      {showWorkspaces && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowWorkspaces(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-[var(--border-color)]">
              <div className="text-xs text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Save Workspace</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Workspace name..."
                  className="flex-1 px-3 py-2 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                />
                <button
                  onClick={handleSaveWorkspace}
                  disabled={!workspaceName.trim()}
                  className="px-3 py-2 bg-[var(--accent-blue)] text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--accent-blue)]/80 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
            
            <div className="max-h-48 overflow-y-auto">
              {workspaces.length === 0 ? (
                <div className="p-4 text-center text-sm text-[var(--text-secondary)]">
                  No saved workspaces
                </div>
              ) : (
                workspaces.map((workspace) => (
                  <div
                    key={workspace.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-panel)] transition-colors"
                  >
                    <button
                      onClick={() => handleLoadWorkspace(workspace)}
                      className="flex-1 text-left"
                    >
                      <div className="text-sm text-white font-medium">{workspace.name}</div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {workspace.layout} · {workspace.charts.length} charts
                      </div>
                    </button>
                    <button
                      onClick={() => deleteWorkspace(workspace.id)}
                      className="p-1 rounded hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <X className="w-4 h-4 text-[var(--text-secondary)]" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Individual chart container
interface ChartContainerProps {
  chart: ChartInstance;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onSymbolChange: (symbol: string) => void;
  children?: React.ReactNode;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  chart,
  isActive,
  onSelect,
  onClose,
  onSymbolChange,
  children,
}) => {
  const canClose = useMultiChartStore(state => state.charts.length > 1);

  return (
    <div
      onClick={onSelect}
      className={`relative flex flex-col h-full bg-[var(--bg-primary)] border rounded-lg overflow-hidden transition-colors ${
        isActive
          ? 'border-[var(--accent-blue)] ring-2 ring-[var(--accent-blue)]/20'
          : 'border-[var(--border-color)]'
      }`}
    >
      {/* Chart Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-panel)] border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white text-sm">{chart.symbol}</span>
          <span className="text-xs text-[var(--text-secondary)]">{chart.timeframe}</span>
        </div>
        {canClose && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 rounded hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <X className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        )}
      </div>

      {/* Chart Content */}
      <div className="flex-1 min-h-0">
        {children || <ChartSkeleton />}
      </div>
    </div>
  );
};

// Symbol selector for multi-chart
interface SymbolSelectorProps {
  currentSymbol: string;
  onSelect: (symbol: string) => void;
}

export const SymbolSelector: React.FC<SymbolSelectorProps> = ({ currentSymbol, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const symbols = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
    'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT',
  ];

  const filtered = symbols.filter(s => 
    s.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-secondary)] transition-colors text-sm font-medium text-white"
      >
        {currentSymbol}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-48 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-2 border-b border-[var(--border-color)]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search symbol..."
                className="w-full px-3 py-2 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => {
                    onSelect(symbol);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                    symbol === currentSymbol
                      ? 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'
                      : 'text-white hover:bg-[var(--bg-panel)]'
                  }`}
                >
                  {symbol}
                  {symbol === currentSymbol && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Main multi-chart grid
interface MultiChartGridProps {
  renderChart: (chart: ChartInstance) => React.ReactNode;
}

export const MultiChartGrid: React.FC<MultiChartGridProps> = ({ renderChart }) => {
  const { charts, activeChartId, layout, addChart, removeChart, setActiveChart, updateChart } = useMultiChartStore();

  const currentLayout = layoutOptions.find(l => l.value === layout) || layoutOptions[0];
  const maxCharts = currentLayout.cols * currentLayout.rows;
  const canAddChart = charts.length < maxCharts;

  const gridCols: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
  };

  const gridRows: Record<number, string> = {
    1: 'grid-rows-1',
    2: 'grid-rows-2',
    3: 'grid-rows-3',
  };

  const defaultSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT'];
  
  const getNextSymbol = () => {
    const usedSymbols = charts.map(c => c.symbol);
    return defaultSymbols.find(s => !usedSymbols.includes(s)) || 'BTCUSDT';
  };

  return (
    <div className={`grid ${gridCols[currentLayout.cols] || 'grid-cols-1'} ${gridRows[currentLayout.rows] || 'grid-rows-1'} gap-2 h-full p-2`}>
      {charts.map((chart) => (
        <ChartContainer
          key={chart.id}
          chart={chart}
          isActive={chart.id === activeChartId}
          onSelect={() => setActiveChart(chart.id)}
          onClose={() => removeChart(chart.id)}
          onSymbolChange={(symbol) => updateChart(chart.id, { symbol })}
        >
          {renderChart(chart)}
        </ChartContainer>
      ))}

      {/* Add chart button */}
      {canAddChart && (
        <button
          onClick={() => addChart(getNextSymbol())}
          className="flex flex-col items-center justify-center gap-2 h-full min-h-[200px] border-2 border-dashed border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] transition-colors group"
        >
          <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Add Chart</span>
          <span className="text-xs opacity-60">{charts.length}/{maxCharts}</span>
        </button>
      )}
    </div>
  );
};

// Chart comparison view
interface ChartComparisonProps {
  symbols: string[];
  timeframe: string;
  renderChart: (symbol: string, index: number) => React.ReactNode;
}

export const ChartComparison: React.FC<ChartComparisonProps> = ({ 
  symbols, 
  timeframe, 
  renderChart 
}) => {
  const [baseSymbol, setBaseSymbol] = useState(symbols[0]);
  const [showPercentage, setShowPercentage] = useState(true);

  return (
    <div className="h-full flex flex-col">
      {/* Comparison toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-panel)] border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--text-secondary)]">Compare:</span>
          <div className="flex items-center gap-2">
            {symbols.map((symbol, i) => (
              <span 
                key={symbol} 
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ backgroundColor: `hsl(${i * 60}, 70%, 50%)20`, color: `hsl(${i * 60}, 70%, 60%)` }}
              >
                {symbol}
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
            <input 
              type="checkbox" 
              checked={showPercentage}
              onChange={(e) => setShowPercentage(e.target.checked)}
              className="rounded"
            />
            <span>Show %</span>
          </label>
          
          <select
            value={baseSymbol}
            onChange={(e) => setBaseSymbol(e.target.value)}
            className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-xs text-white"
          >
            {symbols.map(s => (
              <option key={s} value={s}>{s} (base)</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Comparison chart area */}
      <div className="flex-1 relative">
        {symbols.map((symbol, index) => (
          <div key={symbol} className="absolute inset-0" style={{ opacity: index === 0 ? 1 : 0.7 }}>
            {renderChart(symbol, index)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultiChartGrid;
