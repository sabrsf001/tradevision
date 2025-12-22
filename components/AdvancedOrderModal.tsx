/**
 * Advanced Order Modal
 * Full order form with SL/TP, order types, and more
 */

import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, AlertTriangle } from './Icons';

interface AdvancedOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
  side: 'buy' | 'sell';
  balance: number;
  onSubmitOrder: (order: OrderDetails) => void;
  isPaperMode: boolean;
}

export interface OrderDetails {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  quantity: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number;
}

export const AdvancedOrderModal: React.FC<AdvancedOrderModalProps> = ({
  isOpen,
  onClose,
  symbol,
  currentPrice,
  side,
  balance,
  onSubmitOrder,
  isPaperMode,
}) => {
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [quantity, setQuantity] = useState('0.01');
  const [limitPrice, setLimitPrice] = useState(currentPrice.toString());
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [useSL, setUseSL] = useState(false);
  const [useTP, setUseTP] = useState(false);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setOrderType('market');
      setLimitPrice(currentPrice.toString());
      // Default SL/TP based on side
      if (side === 'buy') {
        setStopLoss((currentPrice * 0.98).toFixed(2)); // 2% below
        setTakeProfit((currentPrice * 1.04).toFixed(2)); // 4% above
      } else {
        setStopLoss((currentPrice * 1.02).toFixed(2)); // 2% above
        setTakeProfit((currentPrice * 0.96).toFixed(2)); // 4% below
      }
    }
  }, [isOpen, currentPrice, side]);

  if (!isOpen) return null;

  const qty = parseFloat(quantity) || 0;
  const price = orderType === 'market' ? currentPrice : parseFloat(limitPrice) || currentPrice;
  const orderValue = qty * price;
  const margin = orderValue / leverage;
  
  // Risk calculations
  const slPrice = useSL ? parseFloat(stopLoss) : undefined;
  const tpPrice = useTP ? parseFloat(takeProfit) : undefined;
  
  const potentialLoss = slPrice 
    ? side === 'buy' 
      ? (price - slPrice) * qty 
      : (slPrice - price) * qty
    : null;
    
  const potentialProfit = tpPrice
    ? side === 'buy'
      ? (tpPrice - price) * qty
      : (price - tpPrice) * qty
    : null;

  const riskRewardRatio = potentialLoss && potentialProfit && potentialLoss > 0
    ? (potentialProfit / potentialLoss).toFixed(2)
    : null;

  const handleSubmit = () => {
    const order: OrderDetails = {
      symbol,
      side,
      type: orderType,
      quantity: qty,
      price: orderType !== 'market' ? parseFloat(limitPrice) : undefined,
      stopLoss: useSL ? parseFloat(stopLoss) : undefined,
      takeProfit: useTP ? parseFloat(takeProfit) : undefined,
      leverage,
    };
    onSubmitOrder(order);
    onClose();
  };

  const isBuy = side === 'buy';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        {/* Header */}
        <div className={`px-4 py-3 flex items-center justify-between ${isBuy ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isBuy ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {isBuy ? <TrendingUp className="w-5 h-5 text-green-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
            </div>
            <div>
              <h2 className={`font-bold ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
                {isBuy ? 'Buy' : 'Sell'} {symbol}
              </h2>
              <p className="text-xs text-gray-500">
                {isPaperMode ? 'Paper Trading' : 'Live Trading'} • ${currentPrice.toLocaleString()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-[var(--bg-primary)] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Order Type */}
          <div>
            <label className="text-xs text-gray-500 uppercase mb-2 block">Order Type</label>
            <div className="flex gap-2">
              {(['market', 'limit', 'stop'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors ${
                    orderType === type 
                      ? 'bg-[var(--accent-blue)] text-white' 
                      : 'bg-[var(--bg-primary)] text-gray-400 hover:text-white'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Price (for limit/stop orders) */}
          {orderType !== 'market' && (
            <div>
              <label className="text-xs text-gray-500 uppercase mb-2 block">
                {orderType === 'limit' ? 'Limit Price' : 'Stop Price'}
              </label>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-white font-mono focus:border-[var(--accent-blue)] focus:outline-none"
              />
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="text-xs text-gray-500 uppercase mb-2 block">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              step="0.001"
              min="0.001"
              className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-white font-mono focus:border-[var(--accent-blue)] focus:outline-none"
            />
            <div className="flex gap-2 mt-2">
              {['25%', '50%', '75%', '100%'].map((pct, i) => {
                const percent = [0.25, 0.5, 0.75, 1][i];
                const maxQty = (balance * leverage) / price;
                return (
                  <button
                    key={pct}
                    onClick={() => setQuantity((maxQty * percent).toFixed(4))}
                    className="flex-1 py-1 text-xs bg-[var(--bg-primary)] text-gray-400 hover:text-white rounded transition-colors"
                  >
                    {pct}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Leverage */}
          <div>
            <label className="text-xs text-gray-500 uppercase mb-2 block">Leverage: {leverage}x</label>
            <input
              type="range"
              min="1"
              max="20"
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="w-full accent-[var(--accent-blue)]"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>1x</span>
              <span>10x</span>
              <span>20x</span>
            </div>
          </div>

          {/* Stop Loss */}
          <div className="flex items-start gap-3">
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={useSL}
                onChange={(e) => setUseSL(e.target.checked)}
                className="w-4 h-4 rounded accent-red-500"
              />
              <span className="text-xs text-gray-400">SL</span>
            </label>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              disabled={!useSL}
              placeholder="Stop Loss Price"
              className="flex-1 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-red-400 font-mono focus:border-red-500 focus:outline-none disabled:opacity-50"
            />
          </div>

          {/* Take Profit */}
          <div className="flex items-start gap-3">
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={useTP}
                onChange={(e) => setUseTP(e.target.checked)}
                className="w-4 h-4 rounded accent-green-500"
              />
              <span className="text-xs text-gray-400">TP</span>
            </label>
            <input
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              disabled={!useTP}
              placeholder="Take Profit Price"
              className="flex-1 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-green-400 font-mono focus:border-green-500 focus:outline-none disabled:opacity-50"
            />
          </div>

          {/* Order Summary */}
          <div className="bg-[var(--bg-primary)] rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Order Value</span>
              <span className="text-white font-mono">${orderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Required Margin</span>
              <span className="text-white font-mono">${margin.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {potentialLoss !== null && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Max Loss (SL)</span>
                <span className="text-red-400 font-mono">-${Math.abs(potentialLoss).toFixed(2)}</span>
              </div>
            )}
            {potentialProfit !== null && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Target Profit (TP)</span>
                <span className="text-green-400 font-mono">+${potentialProfit.toFixed(2)}</span>
              </div>
            )}
            {riskRewardRatio && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Risk/Reward</span>
                <span className="text-[var(--accent-blue)] font-mono">1:{riskRewardRatio}</span>
              </div>
            )}
          </div>

          {margin > balance && (
            <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-400">Insufficient balance</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={qty <= 0 || margin > balance}
            className={`w-full py-3 rounded-xl font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
              isBuy 
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500' 
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500'
            }`}
          >
            {isBuy ? 'Buy' : 'Sell'} {symbol}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedOrderModal;
