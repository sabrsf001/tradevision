
import React, { useState } from 'react';
import { AlertTriangle, MinusCircle, PlusSquare, Target } from './Icons';

interface BlackSwanPanelProps {
  isVisible: boolean;
  portfolio: { symbol: string, amount: number, avgPrice: number, entryTime?: number }[];
  onSymbolSelect: (symbol: string) => void;
  onShowEntry?: (symbol: string, price: number, time?: number) => void;
}

const BlackSwanPanel: React.FC<BlackSwanPanelProps> = ({ isVisible, portfolio, onSymbolSelect, onShowEntry }) => {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'watchlist'>('portfolio');
  const [watchlist, setWatchlist] = useState<string[]>(['SOLUSD', 'AVAXUSD', 'MATICUSD']);
  const [newSymbol, setNewSymbol] = useState('');

  if (!isVisible) return null;

  const handleAddWatchlist = () => {
      if (newSymbol && !watchlist.includes(newSymbol.toUpperCase())) {
          setWatchlist([...watchlist, newSymbol.toUpperCase()]);
          setNewSymbol('');
      }
  };

  const handleRemoveWatchlist = (sym: string) => {
      setWatchlist(watchlist.filter(s => s !== sym));
  };

  const handleAssetClick = (asset: { symbol: string, avgPrice: number, entryTime?: number }) => {
    onSymbolSelect(asset.symbol);
    if (onShowEntry) {
      onShowEntry(asset.symbol, asset.avgPrice, asset.entryTime);
    }
  };

  return (
    <aside className="w-[400px] bg-[var(--bg-primary)] border-r border-[var(--border-color)] flex flex-col flex-shrink-0 animate-fade-in">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black border border-red-900 flex items-center justify-center text-red-500">
                <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
                <h2 className="text-white font-semibold">Black Swan Spot</h2>
                <p className="text-xs text-[var(--text-secondary)]">Anomaly Detection & Portfolio</p>
            </div>
        </div>

        <div className="flex border-b border-[var(--border-color)]">
            <button 
                onClick={() => setActiveTab('portfolio')}
                className={`flex-1 p-3 text-sm font-medium transition-colors ${activeTab === 'portfolio' ? 'text-white border-b-2 border-[var(--accent-blue)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}
            >
                My Portfolio
            </button>
            <button 
                onClick={() => setActiveTab('watchlist')}
                className={`flex-1 p-3 text-sm font-medium transition-colors ${activeTab === 'watchlist' ? 'text-white border-b-2 border-[var(--accent-blue)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}
            >
                Watchlist
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeTab === 'portfolio' ? (
                <>
                    <h3 className="text-white font-semibold mb-2 text-xs uppercase tracking-wider text-gray-500">Active Holdings</h3>
                    {portfolio.map((asset) => (
                        <div 
                            key={asset.symbol} 
                            onClick={() => handleAssetClick(asset)}
                            className="p-3 bg-[var(--bg-secondary)] rounded-lg cursor-pointer hover:bg-[var(--bg-panel)] transition-all border border-transparent hover:border-[var(--accent-blue)] group"
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-white font-bold text-lg">{asset.symbol}</span>
                                <span className="text-[var(--accent-bullish)] font-mono text-sm">+2.4%</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-[var(--text-secondary)]">
                                <span>Size: <span className="text-white">{asset.amount}</span></span>
                                <span>Entry: <span className="text-white">${asset.avgPrice.toLocaleString()}</span></span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <div className="text-[10px] text-gray-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                    Bot Active
                                </div>
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if (onShowEntry) onShowEntry(asset.symbol, asset.avgPrice, asset.entryTime);
                                        onSymbolSelect(asset.symbol);
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] text-[10px] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--accent-blue)]/30"
                                    title="Show entry point on chart"
                                >
                                    <Target className="h-3 w-3" />
                                    Show Entry
                                </button>
                            </div>
                        </div>
                    ))}
                </>
            ) : (
                <>
                     <h3 className="text-white font-semibold mb-2 text-xs uppercase tracking-wider text-gray-500">Anomaly Monitor</h3>
                     <div className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            value={newSymbol}
                            onChange={(e) => setNewSymbol(e.target.value)}
                            placeholder="Add Symbol (e.g. DOTUSD)"
                            className="flex-grow bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[var(--accent-blue)]"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddWatchlist()}
                        />
                        <button 
                            onClick={handleAddWatchlist}
                            className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded px-3 hover:bg-[var(--bg-secondary)] text-white"
                        >
                            <PlusSquare className="h-4 w-4" />
                        </button>
                     </div>
                     <div className="space-y-2">
                        {watchlist.map(sym => (
                            <div key={sym} className="p-2 bg-[var(--bg-secondary)] rounded-lg flex justify-between items-center group hover:border border-[var(--border-color)] transition-colors">
                                <span 
                                    className="text-white cursor-pointer hover:text-[var(--accent-blue)] font-medium"
                                    onClick={() => onSymbolSelect(sym)}
                                >
                                    {sym}
                                </span>
                                <button 
                                    onClick={() => handleRemoveWatchlist(sym)}
                                    className="p-1.5 rounded text-[var(--text-secondary)] hover:text-red-400 hover:bg-[#252525] opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <MinusCircle className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                     </div>
                </>
            )}
        </div>

        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
            <p className="text-xs text-[var(--text-secondary)] mb-1">System Status:</p>
            <p className="text-sm text-white flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Monitoring 3 Assets
            </p>
        </div>
    </aside>
  );
};

export default BlackSwanPanel;
