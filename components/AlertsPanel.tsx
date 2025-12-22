/**
 * Alerts Panel Component
 * Manage price alerts with various conditions
 */

import React, { useState, useMemo } from 'react';
import { useAlertsStore } from '../store/appStore';
import type { PriceAlert } from '../types';
import { Bell, BellRing, Plus, Trash2, Check, X, TrendingUp, ArrowDownRight } from './Icons';

interface AlertFormProps {
  onSubmit: (alert: Omit<PriceAlert, 'id'>) => void;
  onClose: () => void;
  defaultSymbol?: string;
  defaultPrice?: number;
}

const AlertForm: React.FC<AlertFormProps> = ({ 
  onSubmit, 
  onClose, 
  defaultSymbol = 'BTCUSDT',
  defaultPrice = 0 
}) => {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [targetPrice, setTargetPrice] = useState(defaultPrice);
  const [condition, setCondition] = useState<'above' | 'below'>('above');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol && targetPrice > 0) {
      onSubmit({
        symbol: symbol.toUpperCase(),
        targetPrice,
        condition,
        isActive: true,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Create Price Alert</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-panel)] transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-2">
              Symbol
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="BTCUSDT"
              className="w-full px-4 py-3 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-2">
              Target Price
            </label>
            <input
              type="number"
              value={targetPrice || ''}
              onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
              placeholder="50000"
              step="any"
              className="w-full px-4 py-3 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-2">
              Condition
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCondition('above')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                  condition === 'above'
                    ? 'bg-neutral-800 border-neutral-600 text-white'
                    : 'bg-[var(--bg-panel)] border-[var(--border-color)] text-[var(--text-secondary)]'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Above
              </button>
              <button
                type="button"
                onClick={() => setCondition('below')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                  condition === 'below'
                    ? 'bg-red-500/20 border-red-500 text-red-400'
                    : 'bg-[var(--bg-panel)] border-[var(--border-color)] text-[var(--text-secondary)]'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                Below
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-[var(--bg-panel)] border border-[var(--border-color)] text-white rounded-lg hover:bg-[var(--bg-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-[var(--accent-blue)]/80 transition-colors"
            >
              Create Alert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AlertItemProps {
  alert: PriceAlert;
  currentPrice?: number;
  onToggle: () => void;
  onDelete: () => void;
}

const AlertItem: React.FC<AlertItemProps> = ({ alert, currentPrice, onToggle, onDelete }) => {
  const distance = currentPrice 
    ? ((alert.targetPrice - currentPrice) / currentPrice) * 100 
    : null;

  return (
    <div className={`p-4 rounded-lg border transition-colors ${
      alert.isActive 
        ? 'bg-[var(--bg-panel)] border-[var(--border-color)]' 
        : 'bg-[var(--bg-panel)]/50 border-[var(--border-color)]/50 opacity-60'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white">{alert.symbol}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
              alert.condition === 'above'
                ? 'bg-neutral-800 text-white'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {alert.condition === 'above' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {alert.condition}
            </span>
          </div>
          
          <div className="text-lg font-mono text-white">
            ${alert.targetPrice.toLocaleString()}
          </div>
          
          {distance !== null && (
            <div className={`text-xs mt-1 ${distance >= 0 ? 'text-white' : 'text-red-400'}`}>
              {distance >= 0 ? '+' : ''}{distance.toFixed(2)}% from current
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            title={alert.isActive ? 'Disable alert' : 'Enable alert'}
          >
            {alert.isActive ? (
              <Check className="w-5 h-5 text-white" />
            ) : (
              <X className="w-5 h-5 text-[var(--text-secondary)]" />
            )}
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-[var(--text-secondary)] hover:text-red-400"
            title="Delete alert"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface AlertsPanelProps {
  symbol?: string;
  currentPrice?: number;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ 
  symbol = 'BTCUSDT',
  currentPrice 
}) => {
  const [showForm, setShowForm] = useState(false);
  const { alerts, addAlert, removeAlert, toggleAlert } = useAlertsStore();

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => a.symbol === symbol);
  }, [alerts, symbol]);

  const activeCount = filteredAlerts.filter(a => a.isActive).length;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[var(--accent-blue)]" />
          <h2 className="font-semibold text-white">Price Alerts</h2>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 bg-[var(--accent-blue)] text-white text-xs rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="p-2 rounded-lg bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/80 transition-colors"
          title="Add alert"
        >
          <Plus className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <BellRing className="w-12 h-12 text-[var(--text-secondary)] mb-4" />
            <p className="text-[var(--text-secondary)] mb-2">No alerts for {symbol}</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-[var(--accent-blue)] hover:underline text-sm"
            >
              Create your first alert
            </button>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <AlertItem
              key={alert.id}
              alert={alert}
              currentPrice={currentPrice}
              onToggle={() => toggleAlert(alert.id)}
              onDelete={() => removeAlert(alert.id)}
            />
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <AlertForm
          onSubmit={addAlert}
          onClose={() => setShowForm(false)}
          defaultSymbol={symbol}
          defaultPrice={currentPrice}
        />
      )}
    </div>
  );
};

export default AlertsPanel;
