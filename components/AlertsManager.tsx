import React, { useState, useRef, useCallback } from 'react';
import { Bell, X, Trash2, BellRing, Crosshair } from './Icons';
import { PriceAlert } from '../types';

interface AlertsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: PriceAlert[];
  currentPrice: number;
  symbol: string;
  onCreateAlert: (price: number) => void;
  onDeleteAlert: (id: string) => void;
  onPickOnChart: () => void;
}

const AlertsManager: React.FC<AlertsManagerProps> = ({ 
  isOpen, onClose, alerts, currentPrice, symbol, onCreateAlert, onDeleteAlert, onPickOnChart 
}) => {
  const [priceInput, setPriceInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.sheet-handle')) return;
    setIsDragging(true);
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startY.current;
    if (deltaY > 0) {
      currentY.current = deltaY;
      setDragY(deltaY);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (currentY.current > 100) onClose();
    setDragY(0);
    currentY.current = 0;
  }, [isDragging, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(priceInput);
    if (!isNaN(price) && price > 0) {
      onCreateAlert(price);
      setPriceInput('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm">
      <div 
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] w-full sm:w-[400px] rounded-t-2xl sm:rounded-lg shadow-2xl animate-fade-in flex flex-col max-h-[85vh] sm:max-h-[80vh] safe-area-bottom"
        style={{ transform: `translateY(${dragY}px)`, transition: isDragging ? 'none' : 'transform 0.2s ease-out' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="sheet-handle sm:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 bg-[var(--border-color)] rounded-full" />
        </div>
        
        <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <BellRing className="h-5 w-5 text-[var(--accent-blue)]" />
            Alerts Manager
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 -mr-1 touch-active rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No active alerts for {symbol}</p>
            </div>
          ) : (
            alerts.map(alert => (
              <div key={alert.id} className="bg-[var(--bg-primary)] p-3 rounded-xl sm:rounded border border-[var(--border-color)] flex justify-between items-center group">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{alert.symbol}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${alert.condition === 'above' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                      Crossing {alert.condition === 'above' ? 'Up' : 'Down'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 mt-1 font-mono">
                    Target: <span className="text-white">${alert.targetPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <button onClick={() => onDeleteAlert(alert.id)} className="p-3 sm:p-2 text-gray-500 hover:text-red-400 hover:bg-[#252525] rounded-lg transition-colors touch-active">
                  <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-panel)]">
          <form onSubmit={handleSubmit}>
            <label className="block text-xs text-gray-400 mb-2">
              Create new alert for <span className="text-white font-bold">{symbol}</span>
            </label>
            <div className="flex gap-2 mb-3">
              <input 
                type="number"
                step="0.01"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder={`Current: $${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                className="flex-grow bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-3 sm:py-2 text-white text-base sm:text-sm focus:outline-none focus:border-[var(--accent-blue)] font-mono"
                autoFocus
              />
              <button type="submit" disabled={!priceInput}
                className="bg-[var(--accent-blue)] text-white px-5 sm:px-4 py-3 sm:py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed touch-active">
                Add
              </button>
            </div>
            <button type="button" onClick={onPickOnChart}
              className="w-full py-3 sm:py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-secondary)] hover:text-white hover:bg-[#252525] transition-colors flex items-center justify-center gap-2 touch-active">
              <Crosshair className="h-4 w-4" />
              Pick on Chart
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AlertsManager;
