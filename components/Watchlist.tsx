
import React, { useEffect, useState } from 'react';
import { WatchlistItem } from '../types';
import { Plus, X, Star, RefreshCw } from './Icons';

interface WatchlistProps {
  items: WatchlistItem[];
  currentSymbol: string;
  onSelect: (symbol: string) => void;
  isHidden: boolean;
  onAddSymbol?: (symbol: string) => void;
  onRemoveSymbol?: (symbol: string) => void;
}

const Watchlist: React.FC<WatchlistProps> = ({ items, currentSymbol, onSelect, isHidden, onAddSymbol, onRemoveSymbol }) => {
  const [editMode, setEditMode] = useState(false);

  if (isHidden) return null;

  return (
    <aside className="flex flex-1 bg-[var(--bg-primary)] border-l border-[var(--border-color)] flex-col overflow-hidden animate-fade-in">
      <div className="p-3 border-b border-[var(--border-color)] flex justify-between items-center">
        <h2 className="text-white font-semibold text-sm">Watchlist</h2>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setEditMode(!editMode)}
            className={`p-1.5 rounded transition-colors ${editMode ? 'bg-[var(--accent-blue)] text-white' : 'text-gray-400 hover:text-white hover:bg-[#252525]'}`}
            title="Edit Watchlist"
          >
            <Star className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto flex-grow">
        <table className="w-full text-xs text-left">
            <thead className="text-[var(--text-secondary)] sticky top-0 bg-[var(--bg-primary)] z-10">
                <tr className="border-b border-[var(--border-color)]">
                    <th className="p-2 font-normal">Symbol</th>
                    <th className="p-2 font-normal text-right">Price</th>
                    <th className="p-2 font-normal text-right">{editMode ? '' : 'Change %'}</th>
                </tr>
            </thead>
            <tbody>
                {items.map((item) => (
                    <WatchlistRow 
                        key={item.symbol} 
                        item={item} 
                        isSelected={item.symbol === currentSymbol}
                        onClick={() => onSelect(item.symbol)}
                        editMode={editMode}
                        onRemove={onRemoveSymbol}
                    />
                ))}
            </tbody>
        </table>
      </div>
      
      {/* Quick Stats Footer */}
      <div className="p-2 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Total Assets</span>
          <span className="text-white">{items.length}</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-gray-500">Gainers / Losers</span>
          <span>
            <span className="text-[var(--accent-bullish)]">{items.filter(i => i.change > 0).length}</span>
            <span className="text-gray-500"> / </span>
            <span className="text-[var(--accent-bearish)]">{items.filter(i => i.change < 0).length}</span>
          </span>
        </div>
      </div>
    </aside>
  );
};

interface WatchlistRowProps {
  item: WatchlistItem;
  isSelected: boolean;
  onClick: () => void;
  editMode: boolean;
  onRemove?: (symbol: string) => void;
}

const WatchlistRow: React.FC<WatchlistRowProps> = ({ item, isSelected, onClick, editMode, onRemove }) => {
    const [flash, setFlash] = useState<'green' | 'red' | null>(null);
    const [prevPrice, setPrevPrice] = useState(item.price);

    useEffect(() => {
        if (item.price > prevPrice) {
            setFlash('green');
        } else if (item.price < prevPrice) {
            setFlash('red');
        }
        setPrevPrice(item.price);

        const timeout = setTimeout(() => setFlash(null), 500);
        return () => clearTimeout(timeout);
    }, [item.price]);

    return (
        <tr 
            onClick={onClick}
            className={`cursor-pointer transition-colors border-l-2 ${
                isSelected 
                ? 'bg-[var(--bg-panel)] border-[var(--accent-blue)]' 
                : 'border-transparent hover:bg-[var(--bg-secondary)]'
            } ${flash === 'green' ? 'bg-neutral-800/30' : flash === 'red' ? 'bg-red-900/30' : ''}`}
        >
            <td className="p-2 text-white font-medium">{item.symbol}</td>
            <td className={`p-2 text-right font-mono transition-colors ${flash === 'green' ? 'text-white' : flash === 'red' ? 'text-red-400' : 'text-white'}`}>
                {item.price.toFixed(2)}
            </td>
            <td className="p-2 text-right">
                {editMode ? (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRemove?.(item.symbol); }}
                        className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded"
                    >
                        <X className="h-3 w-3" />
                    </button>
                ) : (
                    <span className={`${item.change >= 0 ? 'text-[var(--accent-bullish)]' : 'text-[var(--accent-bearish)]'}`}>
                        {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                    </span>
                )}
            </td>
        </tr>
    );
};

export default Watchlist;
