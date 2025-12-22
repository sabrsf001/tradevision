
import React, { useState } from 'react';
import { X, Check, AlertTriangle, UserCircle2 } from './Icons';
import { Exchange } from '../types';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  connectedExchanges: Exchange[];
  onConnect: (exchange: Exchange) => void;
  onDisconnect: (id: string) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ isOpen, onClose, connectedExchanges, onConnect, onDisconnect }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'exchanges'>('exchanges');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [selectedExchange, setSelectedExchange] = useState('Binance');

  if (!isOpen) return null;

  const availableExchanges = ['Binance', 'Coinbase', 'Kraken', 'Bybit'];

  const handleConnect = () => {
    if (!apiKey) return;
    
    // Simulate connection
    const newExchange: Exchange = {
        id: Date.now().toString(),
        name: selectedExchange,
        status: 'connected',
        apiKey: apiKey.substring(0, 4) + '****'
    };
    
    onConnect(newExchange);
    setApiKey('');
    setApiSecret('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center backdrop-blur-sm animate-fade-in">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] w-[500px] rounded-lg shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-[var(--border-color)]">
                <h2 className="text-white font-bold text-lg flex items-center gap-2">
                    <UserCircle2 className="h-6 w-6" />
                    User Profile
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--border-color)]">
                <button 
                    onClick={() => setActiveTab('profile')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'text-white border-b-2 border-[var(--accent-blue)] bg-[var(--bg-panel)]' : 'text-gray-400 hover:bg-[var(--bg-panel)]'}`}
                >
                    Account Settings
                </button>
                <button 
                    onClick={() => setActiveTab('exchanges')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'exchanges' ? 'text-white border-b-2 border-[var(--accent-blue)] bg-[var(--bg-panel)]' : 'text-gray-400 hover:bg-[var(--bg-panel)]'}`}
                >
                    Connected Exchanges
                </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto">
                {activeTab === 'exchanges' ? (
                    <div className="space-y-6">
                        {/* Active Connections */}
                        <div>
                            <h3 className="text-xs uppercase text-gray-500 font-semibold tracking-wider mb-3">Active Connections</h3>
                            {connectedExchanges.length === 0 ? (
                                <div className="p-4 bg-[var(--bg-primary)] border border-dashed border-[var(--border-color)] rounded-lg text-center text-gray-500 text-sm">
                                    No exchanges connected.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {connectedExchanges.map(ex => (
                                        <div key={ex.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                                                <div>
                                                    <p className="text-white font-medium">{ex.name}</p>
                                                    <p className="text-xs text-gray-500 font-mono">API: {ex.apiKey}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => onDisconnect(ex.id)}
                                                className="text-xs text-red-400 hover:text-red-300 underline"
                                            >
                                                Disconnect
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add New Connection */}
                        <div className="pt-4 border-t border-[var(--border-color)]">
                            <h3 className="text-white font-medium mb-4">Connect New Exchange</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1.5">Exchange</label>
                                    <div className="flex gap-2">
                                        {availableExchanges.map(ex => (
                                            <button
                                                key={ex}
                                                onClick={() => setSelectedExchange(ex)}
                                                className={`px-3 py-1.5 rounded text-xs border transition-colors ${
                                                    selectedExchange === ex 
                                                    ? 'bg-[var(--accent-blue)] text-white border-transparent' 
                                                    : 'bg-[var(--bg-primary)] text-gray-400 border-[var(--border-color)] hover:border-gray-500'
                                                }`}
                                            >
                                                {ex}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-400 mb-1.5">API Key</label>
                                    <input 
                                        type="text" 
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--accent-blue)]"
                                        placeholder="Enter your API Key"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-400 mb-1.5">API Secret</label>
                                    <input 
                                        type="password" 
                                        value={apiSecret}
                                        onChange={(e) => setApiSecret(e.target.value)}
                                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--accent-blue)]"
                                        placeholder="Enter your API Secret"
                                    />
                                </div>

                                <div className="bg-neutral-800/20 border border-yellow-700/50 p-3 rounded flex gap-2 items-start">
                                    <AlertTriangle className="h-4 w-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-neutral-400/80 leading-relaxed">
                                        Your keys are encrypted locally. We only request <strong>Read-Only</strong> permissions. Never share your private keys.
                                    </p>
                                </div>

                                <button 
                                    onClick={handleConnect}
                                    disabled={!apiKey}
                                    className="w-full py-2.5 bg-white text-black font-semibold rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Connect Exchange
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <UserCircle2 className="h-16 w-16 mx-auto text-[var(--border-color)] mb-4" />
                        <p className="text-gray-400 mb-2">Logged in as <strong>Trader_01</strong></p>
                        <p className="text-xs text-gray-500">Pro Plan • Valid until Dec 2025</p>
                        
                        <button className="mt-6 px-4 py-2 border border-[var(--border-color)] rounded text-sm text-red-400 hover:bg-red-900/20 hover:border-red-800 transition-colors">
                            Sign Out
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default UserProfile;
