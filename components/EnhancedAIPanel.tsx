/**
 * Enhanced AI Chat Component
 * Professional trading assistant with multi-model support
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Sparkles, ChevronDown, TrendingUp, Target, Activity, Zap, Settings2 as Settings, Copy, Check, X, Bot, User } from './Icons';
import { CandleData, ChatMessage } from '../types';
import { aiService, AIContext, AIResponse } from '../services/aiProviders';
import { AITradingEngine, AIAnalysis, AISignal } from '../services/aiTradingEngine';
import { signalManager } from '../services/aiSignals';

// ============================================================================
// TYPES
// ============================================================================

interface EnhancedAIPanelProps {
  isVisible: boolean;
  currentSymbol: string;
  currentTimeframe: string;
  currentPrice: number;
  chartData: CandleData[];
  onDrawCommand: (command: any) => void;
  onSignalClick?: (signal: AISignal) => void;
  onClose?: () => void;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
  category: 'analysis' | 'signals' | 'drawing' | 'info';
}

// ============================================================================
// QUICK ACTIONS
// ============================================================================

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'analyze',
    label: 'Full Analysis',
    icon: <Activity className="w-4 h-4" />,
    prompt: 'Provide a comprehensive analysis of the current chart',
    category: 'analysis',
  },
  {
    id: 'signal',
    label: 'Get Signal',
    icon: <Zap className="w-4 h-4" />,
    prompt: 'Generate a trading signal with entry, stop loss, and targets',
    category: 'signals',
  },
  {
    id: 'zones',
    label: 'Draw Zones',
    icon: <Target className="w-4 h-4" />,
    prompt: 'Identify and draw supply and demand zones',
    category: 'drawing',
  },
  {
    id: 'levels',
    label: 'Key Levels',
    icon: <TrendingUp className="w-4 h-4" />,
    prompt: 'Identify key support and resistance levels',
    category: 'drawing',
  },
  {
    id: 'trend',
    label: 'Trend',
    icon: <TrendingUp className="w-4 h-4" />,
    prompt: 'What is the current trend direction and strength?',
    category: 'info',
  },
  {
    id: 'risk',
    label: 'Risk',
    icon: <Activity className="w-4 h-4" />,
    prompt: 'What is the current risk level and volatility?',
    category: 'info',
  },
];

// ============================================================================
// MESSAGE COMPONENT
// ============================================================================

interface MessageBubbleProps {
  message: ChatMessage;
  isTyping?: boolean;
  displayedText?: string;
  onCopy?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isTyping, 
  displayedText,
  onCopy 
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const content = isTyping ? displayedText : message.content;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };
  
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} group`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser 
          ? 'bg-[var(--accent-primary)]' 
          : 'bg-gradient-to-br from-purple-500 to-blue-500'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>
      
      {/* Message Content */}
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-2.5 rounded-2xl ${
          isUser 
            ? 'bg-[var(--accent-primary)] text-white rounded-br-md' 
            : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-bl-md'
        }`}>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {content}
            {isTyping && <span className="animate-pulse ml-0.5">|</span>}
          </div>
        </div>
        
        {/* Actions */}
        {!isUser && !isTyping && (
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
              title="Copy message"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <span className="text-[10px] text-[var(--text-tertiary)]">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SIGNAL CARD COMPONENT
// ============================================================================

interface SignalCardProps {
  signal: AISignal;
  onClick?: () => void;
}

const SignalCard: React.FC<SignalCardProps> = ({ signal, onClick }) => {
  const isBuy = signal.type === 'BUY';
  const color = isBuy ? 'text-green-400' : signal.type === 'SELL' ? 'text-red-400' : 'text-gray-400';
  const bgColor = isBuy ? 'bg-green-500/10' : signal.type === 'SELL' ? 'bg-red-500/10' : 'bg-gray-500/10';
  
  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-xl ${bgColor} border border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-all text-left`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${color}`}>{signal.type}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${bgColor} ${color}`}>
            {signal.strength}
          </span>
        </div>
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {signal.confidence}%
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-[var(--text-secondary)]">Entry</span>
          <div className="font-medium text-[var(--text-primary)]">
            ${signal.targets.entry.toLocaleString()}
          </div>
        </div>
        <div>
          <span className="text-[var(--text-secondary)]">SL</span>
          <div className="font-medium text-red-400">
            ${signal.targets.stopLoss.toLocaleString()}
          </div>
        </div>
        <div>
          <span className="text-[var(--text-secondary)]">TP1</span>
          <div className="font-medium text-green-400">
            ${signal.targets.takeProfit1.toLocaleString()}
          </div>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-[var(--text-secondary)]">
        R:R {signal.riskReward.toFixed(2)} • {signal.timeframe}
      </div>
    </button>
  );
};

// ============================================================================
// ANALYSIS CARD COMPONENT
// ============================================================================

interface AnalysisCardProps {
  analysis: AIAnalysis;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ analysis }) => {
  const trendColor = analysis.marketStructure.trend === 'BULLISH' ? 'text-green-400' :
                     analysis.marketStructure.trend === 'BEARISH' ? 'text-red-400' : 'text-yellow-400';
  
  return (
    <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--accent-primary)]" />
          <span className="font-medium text-[var(--text-primary)]">Market Analysis</span>
        </div>
        <span className={`text-sm font-bold ${trendColor}`}>
          {analysis.marketStructure.trend}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
          <span className="text-[var(--text-secondary)]">Trend Strength</span>
          <div className="font-medium text-[var(--text-primary)]">
            {analysis.marketStructure.trendStrength.toFixed(0)}%
          </div>
        </div>
        <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
          <span className="text-[var(--text-secondary)]">Volatility</span>
          <div className="font-medium text-[var(--text-primary)]">
            {analysis.volatility.toFixed(2)}%
          </div>
        </div>
        <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
          <span className="text-[var(--text-secondary)]">Risk Level</span>
          <div className={`font-medium ${
            analysis.riskLevel === 'LOW' ? 'text-green-400' :
            analysis.riskLevel === 'MEDIUM' ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {analysis.riskLevel}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
          <span className="text-[var(--text-secondary)]">Patterns</span>
          <div className="font-medium text-[var(--text-primary)]">
            {analysis.patterns.length}
          </div>
        </div>
      </div>
      
      {analysis.patterns.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {analysis.patterns.slice(0, 3).map((p, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]">
              {p.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const EnhancedAIPanel: React.FC<EnhancedAIPanelProps> = ({
  isVisible,
  currentSymbol,
  currentTimeframe,
  currentPrice,
  chartData,
  onDrawCommand,
  onSignalClick,
  onClose,
}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 Hi! I'm TradeVision AI, your intelligent trading assistant.\n\nI can analyze charts, generate signals, identify patterns, and help you make better trading decisions.\n\nTry the quick actions below or ask me anything!`,
      timestamp: Date.now(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [currentAnalysis, setCurrentAnalysis] = useState<AIAnalysis | null>(null);
  const [currentSignal, setCurrentSignal] = useState<AISignal | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, displayedText]);
  
  // Build AI context
  const aiContext = useMemo<AIContext>(() => ({
    symbol: currentSymbol,
    timeframe: currentTimeframe,
    currentPrice,
    priceChange24h: chartData.length > 1 
      ? ((currentPrice - chartData[0].close) / chartData[0].close) * 100 
      : undefined,
    candles: chartData,
    signals: currentSignal ? [currentSignal] : [],
  }), [currentSymbol, currentTimeframe, currentPrice, chartData, currentSignal]);
  
  // Typing effect
  const typeMessage = useCallback((messageId: string, fullText: string) => {
    setTypingMessageId(messageId);
    setDisplayedText('');
    let index = 0;
    
    const typeNextChar = () => {
      if (index < fullText.length) {
        setDisplayedText(fullText.slice(0, index + 1));
        index++;
        const delay = fullText[index - 1] === '\n' ? 50 : 10 + Math.random() * 15;
        setTimeout(typeNextChar, delay);
      } else {
        setTypingMessageId(null);
        setIsLoading(false);
      }
    };
    
    typeNextChar();
  }, []);
  
  // Add AI message with typing
  const addAIMessage = useCallback((content: string) => {
    const newId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: newId,
      role: 'assistant',
      content,
      timestamp: Date.now(),
    }]);
    typeMessage(newId, content);
  }, [typeMessage]);
  
  // Handle drawing commands from AI response
  const parseDrawCommands = useCallback((text: string) => {
    const drawPatterns = [
      /\[DRAW:HORIZONTAL:(\d+(?:\.\d+)?)\]/g,
      /\[DRAW:ZONE:(\d+(?:\.\d+)?):(\d+(?:\.\d+)?):(\w+)\]/g,
    ];
    
    let match;
    
    // Horizontal lines
    while ((match = drawPatterns[0].exec(text)) !== null) {
      onDrawCommand({
        type: 'HORIZONTAL',
        value: parseFloat(match[1]),
      });
    }
    
    // Zones
    while ((match = drawPatterns[1].exec(text)) !== null) {
      onDrawCommand({
        type: 'ZONE',
        priceTop: parseFloat(match[1]),
        priceBottom: parseFloat(match[2]),
        zoneType: match[3].toUpperCase(),
      });
    }
  }, [onDrawCommand]);
  
  // Process user input
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    
    const userText = input.trim();
    setInput('');
    setShowQuickActions(false);
    
    // Add user message
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    }]);
    
    setIsLoading(true);
    
    // Check for local commands first
    const lowerText = userText.toLowerCase();
    
    if (lowerText.includes('zone') || lowerText.includes('supply') || lowerText.includes('demand')) {
      // Local zone detection
      if (chartData.length >= 50) {
        const analysis = AITradingEngine.analyze(chartData, currentSymbol, currentTimeframe);
        setCurrentAnalysis(analysis);
        
        analysis.marketStructure.orderBlocks.forEach(ob => {
          onDrawCommand({
            type: 'ZONE',
            priceTop: ob.priceHigh,
            priceBottom: ob.priceLow,
            zoneType: ob.type === 'bullish' ? 'DEMAND' : 'SUPPLY',
          });
        });
        
        const count = analysis.marketStructure.orderBlocks.length;
        addAIMessage(`Drew ${count} supply/demand zones on the chart.\n\n${analysis.summary}`);
      } else {
        addAIMessage('Need at least 50 candles for zone detection. Please load more data.');
      }
      return;
    }
    
    if (lowerText.includes('level') || lowerText.includes('support') || lowerText.includes('resistance')) {
      // Local S/R detection
      if (chartData.length >= 20) {
        const swings = AITradingEngine.detectSwingPoints(chartData);
        
        swings.highs.slice(-3).forEach(h => {
          onDrawCommand({ type: 'HORIZONTAL', value: h });
        });
        
        swings.lows.slice(-3).forEach(l => {
          onDrawCommand({ type: 'HORIZONTAL', value: l });
        });
        
        addAIMessage(`Identified ${swings.highs.length + swings.lows.length} key levels.\n\nResistance: ${swings.highs.slice(-2).map(h => '$' + h.toLocaleString()).join(', ')}\nSupport: ${swings.lows.slice(-2).map(l => '$' + l.toLocaleString()).join(', ')}`);
      } else {
        addAIMessage('Need more candle data. Please wait for data to load.');
      }
      return;
    }
    
    if (lowerText.includes('signal') || lowerText.includes('trade') || lowerText.includes('entry')) {
      // Generate signal
      if (chartData.length >= 50) {
        const signals = AITradingEngine.generateSignals(chartData, currentSymbol, currentTimeframe);
        if (signals.length > 0) {
          const signal = signals[0];
          setCurrentSignal(signal);
          signalManager.analyze(chartData, currentSymbol, currentTimeframe);
          
          const emoji = signal.type === 'BUY' ? '🟢' : signal.type === 'SELL' ? '🔴' : '⚪';
          addAIMessage(`${emoji} ${signal.type} Signal Generated!\n\n📊 Entry: $${signal.targets.entry.toLocaleString()}\n🛑 Stop Loss: $${signal.targets.stopLoss.toLocaleString()}\n🎯 TP1: $${signal.targets.takeProfit1.toLocaleString()}\n🎯 TP2: $${signal.targets.takeProfit2.toLocaleString()}\n🎯 TP3: $${signal.targets.takeProfit3.toLocaleString()}\n\n💪 Confidence: ${signal.confidence}%\n📈 R:R: ${signal.riskReward.toFixed(2)}\n\nReasoning:\n${signal.reasoning.slice(0, 5).map(r => '• ' + r).join('\n')}`);
        } else {
          addAIMessage('No high-confidence signals at the moment. Market conditions are unclear.');
        }
      } else {
        addAIMessage('Need at least 50 candles to generate signals.');
      }
      return;
    }
    
    if (lowerText.includes('analy')) {
      // Full analysis
      if (chartData.length >= 50) {
        const analysis = AITradingEngine.analyze(chartData, currentSymbol, currentTimeframe);
        setCurrentAnalysis(analysis);
        
        addAIMessage(analysis.summary + '\n\n' + 
          `📊 Key Levels:\n${analysis.keyLevels.slice(0, 5).map(l => `• ${l.type}: $${l.price.toLocaleString()}`).join('\n')}\n\n` +
          `🔮 Predictions:\n• Short-term: ${analysis.predictions.shortTerm.direction} (${analysis.predictions.shortTerm.probability.toFixed(0)}%)\n• Medium-term: ${analysis.predictions.mediumTerm.direction} (${analysis.predictions.mediumTerm.probability.toFixed(0)}%)`
        );
      } else {
        addAIMessage('Need at least 50 candles for full analysis.');
      }
      return;
    }
    
    // Use AI provider for other queries
    try {
      const response = await aiService.ask(userText, aiContext);
      parseDrawCommands(response.text);
      addAIMessage(response.text);
    } catch (error) {
      console.error('AI error:', error);
      addAIMessage("I apologize, but I couldn't process that request. Try using specific commands like 'analyze', 'signal', or 'zones'.");
    }
  }, [input, isLoading, chartData, currentSymbol, currentTimeframe, aiContext, addAIMessage, onDrawCommand, parseDrawCommands]);
  
  // Handle quick action click
  const handleQuickAction = useCallback((action: QuickAction) => {
    setInput(action.prompt);
    inputRef.current?.focus();
  }, []);
  
  // Handle signal click
  const handleSignalClick = useCallback((signal: AISignal) => {
    onSignalClick?.(signal);
  }, [onSignalClick]);
  
  if (!isVisible) return null;
  
  return (
    <aside className="w-full sm:w-96 bg-[var(--bg-primary)] border-l border-[var(--border-color)] flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">TradeVision AI</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-[var(--text-secondary)]">
                {aiService.getActiveProvider() === 'local' ? 'Local Mode' : 'Online'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Context Bar */}
      <div className="px-4 py-2 bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-medium text-[var(--text-primary)]">{currentSymbol}</span>
          <span className="text-[var(--text-secondary)]">{currentTimeframe}</span>
          <span className="text-[var(--accent-primary)] font-medium">
            ${currentPrice.toLocaleString()}
          </span>
        </div>
        <span className="text-[10px] text-[var(--text-tertiary)]">
          {chartData.length} candles
        </span>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0" ref={scrollRef}>
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isTyping={typingMessageId === msg.id}
            displayedText={typingMessageId === msg.id ? displayedText : undefined}
          />
        ))}
        
        {/* Current Analysis Card */}
        {currentAnalysis && !isLoading && (
          <AnalysisCard analysis={currentAnalysis} />
        )}
        
        {/* Current Signal Card */}
        {currentSignal && !isLoading && (
          <SignalCard signal={currentSignal} onClick={() => handleSignalClick(currentSignal)} />
        )}
        
        {/* Loading Indicator */}
        {isLoading && !typingMessageId && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>
      
      {/* Quick Actions */}
      {showQuickActions && (
        <div className="px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Quick Actions</span>
            <button 
              onClick={() => setShowQuickActions(false)}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                disabled={isLoading}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-[var(--accent-primary)]">
                  {action.icon}
                </div>
                <span className="text-[10px] font-medium text-[var(--text-primary)]">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Input Area */}
      <div className="px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything about the chart..."
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-[var(--bg-tertiary)] rounded-xl text-[var(--text-primary)] text-sm placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-2.5 rounded-xl bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        {/* Expand Quick Actions */}
        {!showQuickActions && (
          <button
            onClick={() => setShowQuickActions(true)}
            className="w-full mt-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1"
          >
            Show quick actions
            <ChevronDown className="w-3 h-3 rotate-180" />
          </button>
        )}
      </div>
    </aside>
  );
};

export default EnhancedAIPanel;
