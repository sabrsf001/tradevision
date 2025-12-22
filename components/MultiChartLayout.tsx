/**
 * Multi-Chart Layout Component
 * Supports 1x1, 1x2, 2x1, and 2x2 chart grid layouts
 */

import React, { useState } from 'react';
import { useMultiChartStore, type ChartInstance } from '../store/appStore';
import { ChartSkeleton } from './LoadingSkeleton';
import { Square, Layers, Plus, X, Check } from './Icons';

type LayoutType = '1x1' | '1x2' | '2x1' | '2x2';

interface LayoutOption {
  value: LayoutType;
  label: string;
  icon: React.ReactNode;
  cols: number;
  rows: number;
}

const layoutOptions: LayoutOption[] = [
  { value: '1x1', label: '1×1', icon: <Square className="w-4 h-4" />, cols: 1, rows: 1 },
  { value: '1x2', label: '1×2', icon: <Layers className="w-4 h-4" />, cols: 2, rows: 1 },
  { value: '2x1', label: '2×1', icon: <Layers className="w-4 h-4 rotate-90" />, cols: 1, rows: 2 },
  { value: '2x2', label: '2×2', icon: <Layers className="w-4 h-4" />, cols: 2, rows: 2 },
];

// Layout selector component
export const LayoutSelector: React.FC = () => {
  const { layout, setLayout } = useMultiChartStore();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-secondary)] transition-colors"
        title="Chart Layout"
      >
        <Layers className="w-5 h-5 text-[var(--text-secondary)]" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 p-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl z-50">
            <div className="grid grid-cols-2 gap-2">
              {layoutOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setLayout(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                    layout === option.value
                      ? 'bg-[var(--accent-blue)] text-white'
                      : 'bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
                  }`}
                >
                  {option.icon}
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              ))}
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

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
  }[currentLayout.cols] || 'grid-cols-1';

  const gridRows = {
    1: 'grid-rows-1',
    2: 'grid-rows-2',
  }[currentLayout.rows] || 'grid-rows-1';

  return (
    <div className={`grid ${gridCols} ${gridRows} gap-2 h-full p-2`}>
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
          onClick={() => addChart('ETHUSDT')}
          className="flex flex-col items-center justify-center gap-2 h-full min-h-[200px] border-2 border-dashed border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] transition-colors"
        >
          <Plus className="w-8 h-8" />
          <span className="text-sm font-medium">Add Chart</span>
        </button>
      )}
    </div>
  );
};

export default MultiChartGrid;
