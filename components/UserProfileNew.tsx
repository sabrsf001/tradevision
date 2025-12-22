import React, { useState } from 'react';
import { X, Check, AlertTriangle, UserCircle2, LogOut, Crown, Star, Settings2, Mail, User as UserIcon } from './Icons';
import { Exchange, User } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  connectedExchanges: Exchange[];
  onConnect: (exchange: Exchange) => void;
  onDisconnect: (id: string) => void;
}

const UserProfileNew: React.FC<UserProfileProps> = ({ 
  isOpen, 
  onClose, 
  connectedExchanges, 
  onConnect, 
  onDisconnect
}) => {
  const { user, logout, updateProfile, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'exchanges' | 'settings'>('exchanges');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [selectedExchange, setSelectedExchange] = useState('Binance');
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const availableExchanges = ['Binance', 'Coinbase', 'Kraken', 'Bybit'];

  const handleConnect = () => {
    if (!apiKey) return;
    
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

  const handleSaveName = async () => {
    if (!newName.trim() || newName === user?.name) {
      setEditingName(false);
      return;
    }
    setIsSaving(true);
    await updateProfile({ name: newName.trim() });
    setIsSaving(false);
    setEditingName(false);
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const getPlanBadge = (plan: string) => {
    switch(plan) {
      case 'pro':
        return <span className="flex items-center gap-1 px-2 py-0.5 bg-neutral-800/30 text-white rounded text-xs"><Star className="h-3 w-3" /> Pro</span>;
      case 'premium':
        return <span className="flex items-center gap-1 px-2 py-0.5 bg-neutral-800/30 text-neutral-400 rounded text-xs"><Crown className="h-3 w-3" /> Premium</span>;
      default:
        return <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-xs">Free</span>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm animate-fade-in p-4">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] w-full max-w-[520px] rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-[var(--border-color)] flex-shrink-0">
                <h2 className="text-white font-bold text-lg flex items-center gap-2">
                    <UserCircle2 className="h-6 w-6" />
                    Account Settings
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--border-color)] flex-shrink-0">
                <button 
                    onClick={() => setActiveTab('profile')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'text-white border-b-2 border-[var(--accent-blue)] bg-[var(--bg-panel)]' : 'text-gray-400 hover:bg-[var(--bg-panel)]'}`}
                >
                    Profile
                </button>
                <button 
                    onClick={() => setActiveTab('exchanges')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'exchanges' ? 'text-white border-b-2 border-[var(--accent-blue)] bg-[var(--bg-panel)]' : 'text-gray-400 hover:bg-[var(--bg-panel)]'}`}
                >
                    Exchanges
                </button>
                <button 
                    onClick={() => setActiveTab('settings')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'settings' ? 'text-white border-b-2 border-[var(--accent-blue)] bg-[var(--bg-panel)]' : 'text-gray-400 hover:bg-[var(--bg-panel)]'}`}
                >
                    Settings
                </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
                {activeTab === 'profile' && !isAuthenticated && (
                    <div className="text-center py-10">
                        <UserCircle2 className="h-16 w-16 mx-auto text-gray-600 mb-4" />
                        <h3 className="text-white font-semibold mb-2">Not Signed In</h3>
                        <p className="text-sm text-gray-500 mb-4">Sign in to view your profile and settings</p>
                        <button 
                            onClick={onClose}
                            className="px-6 py-2 bg-white text-black font-semibold rounded-lg text-sm hover:bg-gray-200 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                )}
                {activeTab === 'profile' && isAuthenticated && (
                    <div className="space-y-6">
                        {/* User Info Card */}
                        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-5">
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--accent-blue)] to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        {editingName ? (
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="text"
                                                    value={newName}
                                                    onChange={(e) => setNewName(e.target.value)}
                                                    className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-2 py-1 text-white text-lg font-bold focus:outline-none focus:border-[var(--accent-blue)]"
                                                    autoFocus
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                                />
                                                <button 
                                                    onClick={handleSaveName}
                                                    disabled={isSaving}
                                                    className="text-white hover:text-green-300"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => { setEditingName(false); setNewName(user?.name || ''); }}
                                                    className="text-gray-400 hover:text-gray-300"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-white text-lg font-bold">{user?.name}</span>
                                                <button 
                                                    onClick={() => setEditingName(true)}
                                                    className="text-gray-500 hover:text-gray-300"
                                                >
                                                    <Settings2 className="h-3 w-3" />
                                                </button>
                                            </>
                                        )}
                                        {user && getPlanBadge(user.plan)}
                                    </div>
                                    <p className="text-sm text-gray-400 flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {user?.email}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-[var(--border-color)] grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Member since</span>
                                    <p className="text-white">{formatDate(user?.createdAt)}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Last login</span>
                                    <p className="text-white">{formatDate(user?.lastLoginAt)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Upgrade Card */}
                        {user?.plan === 'free' && (
                            <div className="bg-gradient-to-r from-neutral-900/30 to-neutral-900/30 border border-neutral-700/50 rounded-lg p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                                        <Crown className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-semibold mb-1">Upgrade to Pro</h3>
                                        <p className="text-sm text-gray-400 mb-3">
                                            Unlock unlimited AI analysis, advanced indicators, and priority support.
                                        </p>
                                        <button className="px-4 py-2 bg-white text-black font-semibold rounded-lg text-sm hover:bg-gray-200 transition-colors">
                                            View Plans
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Sign Out */}
                        <button 
                            onClick={handleLogout}
                            className="w-full py-3 border border-red-800/50 rounded-lg text-red-400 hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </button>
                    </div>
                )}

                {activeTab === 'exchanges' && (
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
                                    <div className="flex gap-2 flex-wrap">
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
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xs uppercase text-gray-500 font-semibold tracking-wider mb-3">Preferences</h3>
                            
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg">
                                    <div>
                                        <p className="text-white text-sm font-medium">Email Notifications</p>
                                        <p className="text-xs text-gray-500">Receive alerts via email</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" defaultChecked className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-blue)]"></div>
                                    </label>
                                </div>

                                <div className="flex justify-between items-center p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg">
                                    <div>
                                        <p className="text-white text-sm font-medium">Sound Alerts</p>
                                        <p className="text-xs text-gray-500">Play sound on price alerts</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" defaultChecked className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-blue)]"></div>
                                    </label>
                                </div>

                                <div className="flex justify-between items-center p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg">
                                    <div>
                                        <p className="text-white text-sm font-medium">Default Timeframe</p>
                                        <p className="text-xs text-gray-500">Chart loads with this timeframe</p>
                                    </div>
                                    <select className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-2 py-1 text-sm text-white">
                                        <option>1D</option>
                                        <option>4H</option>
                                        <option>1H</option>
                                        <option>15m</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-[var(--border-color)]">
                            <h3 className="text-xs uppercase text-gray-500 font-semibold tracking-wider mb-3">Data & Privacy</h3>
                            
                            <div className="space-y-2">
                                <button className="w-full text-left p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-gray-300 hover:bg-[var(--bg-panel)] transition-colors">
                                    Export My Data
                                </button>
                                <button className="w-full text-left p-3 bg-[var(--bg-primary)] border border-red-900/30 rounded-lg text-sm text-red-400 hover:bg-red-900/10 transition-colors">
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default UserProfileNew;
