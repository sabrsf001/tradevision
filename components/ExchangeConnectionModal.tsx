/**
 * Exchange Connection Modal
 * Connect to Binance, BingX, and other exchanges
 */

import React, { useState } from 'react';
import { X, Link2, AlertTriangle, Check, ExternalLink } from './Icons';

interface Exchange {
  id: string;
  name: string;
  logo: string;
  color: string;
  description: string;
  supported: boolean;
}

const SUPPORTED_EXCHANGES: Exchange[] = [
  {
    id: 'binance',
    name: 'Binance',
    logo: '🟡',
    color: '#F0B90B',
    description: 'World\'s largest crypto exchange',
    supported: true,
  },
  {
    id: 'bingx',
    name: 'BingX',
    logo: '🔵',
    color: '#2D7CF6',
    description: 'Copy trading & derivatives',
    supported: true,
  },
  {
    id: 'bybit',
    name: 'Bybit',
    logo: '🟠',
    color: '#F7A600',
    description: 'Derivatives & spot trading',
    supported: true,
  },
  {
    id: 'okx',
    name: 'OKX',
    logo: '⚪',
    color: '#FFFFFF',
    description: 'Comprehensive trading platform',
    supported: true,
  },
  {
    id: 'bitget',
    name: 'Bitget',
    logo: '🔷',
    color: '#00D4AA',
    description: 'Copy trading specialists',
    supported: false,
  },
  {
    id: 'mexc',
    name: 'MEXC',
    logo: '🟢',
    color: '#00B897',
    description: 'Wide altcoin selection',
    supported: false,
  },
];

interface ExchangeConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onLoginRequired: () => void;
  onConnect: (exchangeId: string, apiKey: string, apiSecret: string) => void;
  connectedExchanges: string[];
  onDisconnect: (exchangeId: string) => void;
  onSwitchToPaper: () => void;
  isPaperMode: boolean;
}

export const ExchangeConnectionModal: React.FC<ExchangeConnectionModalProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  onLoginRequired,
  onConnect,
  connectedExchanges,
  onDisconnect,
  onSwitchToPaper,
  isPaperMode,
}) => {
  const [selectedExchange, setSelectedExchange] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  if (!isOpen) return null;

  const handleConnect = () => {
    if (!isAuthenticated) {
      onLoginRequired();
      return;
    }
    
    if (selectedExchange && apiKey && apiSecret) {
      onConnect(selectedExchange, apiKey, apiSecret);
      setApiKey('');
      setApiSecret('');
      setSelectedExchange(null);
    }
  };

  const selectedExchangeData = SUPPORTED_EXCHANGES.find(e => e.id === selectedExchange);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between sticky top-0 bg-[var(--bg-secondary)] z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--accent-blue)]/20 rounded-lg">
              <Link2 className="w-5 h-5 text-[var(--accent-blue)]" />
            </div>
            <div>
              <h2 className="font-bold text-white">Connect Exchange</h2>
              <p className="text-xs text-gray-500">Trade with real funds</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-[var(--bg-primary)] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Paper Trading Mode Toggle */}
          <div 
            onClick={onSwitchToPaper}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              isPaperMode 
                ? 'bg-yellow-500/10 border-yellow-500/50' 
                : 'bg-[var(--bg-primary)] border-[var(--border-color)] hover:border-yellow-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📝</span>
                <div>
                  <h3 className="font-medium text-white">Paper Trading</h3>
                  <p className="text-xs text-gray-500">Practice with $10,000 virtual funds</p>
                </div>
              </div>
              {isPaperMode && <Check className="w-5 h-5 text-yellow-400" />}
            </div>
          </div>

          <div className="text-center text-xs text-gray-500">— or connect a real exchange —</div>

          {!isAuthenticated && (
            <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-orange-400">
                Please <button onClick={onLoginRequired} className="underline hover:text-orange-300">sign in</button> to connect exchanges
              </span>
            </div>
          )}

          {/* Exchange List */}
          <div className="grid grid-cols-2 gap-2">
            {SUPPORTED_EXCHANGES.map(exchange => {
              const isConnected = connectedExchanges.includes(exchange.id);
              const isSelected = selectedExchange === exchange.id;
              
              return (
                <button
                  key={exchange.id}
                  onClick={() => {
                    if (!isAuthenticated) {
                      onLoginRequired();
                      return;
                    }
                    if (isConnected) {
                      onDisconnect(exchange.id);
                    } else {
                      setSelectedExchange(isSelected ? null : exchange.id);
                    }
                  }}
                  disabled={!exchange.supported && !isConnected}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isConnected
                      ? 'bg-green-500/10 border-green-500/50'
                      : isSelected
                        ? 'bg-[var(--accent-blue)]/10 border-[var(--accent-blue)]'
                        : exchange.supported
                          ? 'bg-[var(--bg-primary)] border-[var(--border-color)] hover:border-[var(--accent-blue)]/50'
                          : 'bg-[var(--bg-primary)] border-[var(--border-color)] opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{exchange.logo}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm truncate">{exchange.name}</div>
                      <div className="text-[10px] text-gray-500 truncate">{exchange.description}</div>
                    </div>
                    {isConnected && <Check className="w-4 h-4 text-green-400 flex-shrink-0" />}
                    {!exchange.supported && <span className="text-[8px] text-gray-500">Soon</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* API Key Form */}
          {selectedExchange && selectedExchangeData && (
            <div className="space-y-3 p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{selectedExchangeData.logo}</span>
                <h3 className="font-medium text-white">Connect {selectedExchangeData.name}</h3>
              </div>
              
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1 block">API Key</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-white font-mono text-sm focus:border-[var(--accent-blue)] focus:outline-none"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1 block">API Secret</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter your API secret"
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-white font-mono text-sm focus:border-[var(--accent-blue)] focus:outline-none pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
                  >
                    {showSecret ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-yellow-400/80 leading-relaxed">
                  Only use API keys with trading permissions. Never share your secret key. We encrypt all credentials.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedExchange(null)}
                  className="flex-1 py-2 bg-[var(--bg-secondary)] text-gray-400 hover:text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={!apiKey || !apiSecret}
                  className="flex-1 py-2 bg-[var(--accent-blue)] text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--accent-blue)]/80 transition-colors"
                >
                  Connect
                </button>
              </div>

              <a
                href={`https://${selectedExchange}.com/api-management`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-xs text-[var(--accent-blue)] hover:underline"
              >
                Get API keys from {selectedExchangeData.name}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExchangeConnectionModal;
