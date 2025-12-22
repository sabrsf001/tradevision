import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send } from './Icons';
import { ChatMessage, CandleData, Exchange } from '../types';
import { detectSupplyDemandZones, detectSupportResistance, analyzeChart } from '../utils/localAI';

interface AIPanelProps {
  isVisible: boolean;
  currentSymbol: string;
  currentTimeframe: string;
  currentPrice: number;
  chartData: CandleData[];
  onDrawCommand: (command: any) => void;
  connectedExchanges?: Exchange[];
}

const AIPanel: React.FC<AIPanelProps> = ({ 
  isVisible, 
  chartData, 
  onDrawCommand, 
}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: '1', 
      role: 'assistant', 
      content: `Ready — zones · levels · analyze`, 
      timestamp: Date.now()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, displayedText]);

  // Typing effect for AI messages
  const typeMessage = useCallback((messageId: string, fullText: string) => {
    setTypingMessageId(messageId);
    setDisplayedText('');
    let index = 0;
    
    const typeNextChar = () => {
      if (index < fullText.length) {
        setDisplayedText(fullText.slice(0, index + 1));
        index++;
        setTimeout(typeNextChar, 15 + Math.random() * 25);
      } else {
        setTypingMessageId(null);
        setIsLoading(false);
      }
    };
    
    typeNextChar();
  }, []);

  // Add message with typing effect
  const addAIMessage = useCallback((content: string) => {
    const newId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: newId,
      role: 'assistant',
      content: content,
      timestamp: Date.now()
    }]);
    typeMessage(newId, content);
  }, [typeMessage]);

  // Draw Supply & Demand Zones
  const handleLocalSupplyDemand = useCallback(() => {
    if (!chartData || chartData.length < 20) {
      addAIMessage('waiting for data...');
      return;
    }

    setIsLoading(true);
    
    const zones = detectSupplyDemandZones(chartData);
    
    if (zones.length === 0) {
      addAIMessage('no zones found');
      return;
    }
    
    zones.forEach(zone => {
      onDrawCommand({
        type: 'ZONE',
        priceTop: zone.priceTop,
        priceBottom: zone.priceBottom,
        zoneType: zone.type.toUpperCase(),
      });
    });

    const d = zones.filter(z => z.type === 'demand').length;
    const s = zones.filter(z => z.type === 'supply').length;

    addAIMessage(`drew ${zones.length} zones — ${d} demand · ${s} supply`);
  }, [chartData, onDrawCommand, addAIMessage]);

  // Draw Support & Resistance
  const handleLocalSupportResistance = useCallback(() => {
    if (!chartData || chartData.length < 20) {
      addAIMessage('waiting for data...');
      return;
    }

    setIsLoading(true);
    
    const levels = detectSupportResistance(chartData);
    
    if (levels.length === 0) {
      addAIMessage('no levels found');
      return;
    }
    
    levels.forEach(level => {
      onDrawCommand({
        type: 'HORIZONTAL',
        value: level.price,
      });
    });

    const sup = levels.filter(l => l.type === 'support').length;
    const res = levels.filter(l => l.type === 'resistance').length;

    addAIMessage(`drew ${levels.length} levels — ${sup} support · ${res} resistance`);
  }, [chartData, onDrawCommand, addAIMessage]);

  // Full Analysis
  const handleLocalFullAnalysis = useCallback(() => {
    if (!chartData || chartData.length < 20) {
      addAIMessage('waiting for data...');
      return;
    }

    setIsLoading(true);
    
    const analysis = analyzeChart(chartData);
    
    analysis.zones.forEach(zone => {
      onDrawCommand({
        type: 'ZONE',
        priceTop: zone.priceTop,
        priceBottom: zone.priceBottom,
        zoneType: zone.type.toUpperCase(),
      });
    });

    analysis.supportResistance.forEach(level => {
      onDrawCommand({
        type: 'HORIZONTAL',
        value: level.price,
      });
    });

    const total = analysis.zones.length + analysis.supportResistance.length;

    addAIMessage(`${analysis.sentiment} ${analysis.confidence}% — ${total} drawings`);
  }, [chartData, onDrawCommand, addAIMessage]);

  // Generate AI response for general questions
  const generateAIResponse = useCallback((userText: string): string => {
    const text = userText.toLowerCase();
    
    // Greetings
    if (text.match(/^(hi|hello|hey|sup|yo|greetings)/)) {
      const greetings = [
        "Hey! I'm your trading assistant. Try 'zones', 'levels', or 'analyze' to get started.",
        "Hello trader! Ready to help. Ask me about support/resistance, supply/demand zones, or chart analysis.",
        "Hi there! I can draw zones, identify levels, and analyze charts. What do you need?"
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    // Help
    if (text.includes('help') || text.includes('what can you do') || text.includes('commands')) {
      return "I can help with:\n• 'zones' — draw supply & demand zones\n• 'levels' — identify support & resistance\n• 'analyze' — full chart analysis\n• Ask about trends, price action, or trading concepts!";
    }
    
    // Price/market questions
    if (text.includes('price') || text.includes('current')) {
      const lastCandle = chartData?.[chartData.length - 1];
      if (lastCandle) {
        const change = ((lastCandle.close - lastCandle.open) / lastCandle.open * 100).toFixed(2);
        return `Current price: $${lastCandle.close.toLocaleString()}. ${Number(change) >= 0 ? '📈' : '📉'} ${change}% this candle.`;
      }
      return "Loading price data...";
    }
    
    // Trend questions
    if (text.includes('trend') || text.includes('direction') || text.includes('bullish') || text.includes('bearish')) {
      if (chartData && chartData.length >= 20) {
        const recent = chartData.slice(-20);
        const firstPrice = recent[0].close;
        const lastPrice = recent[recent.length - 1].close;
        const change = ((lastPrice - firstPrice) / firstPrice * 100).toFixed(2);
        const trend = Number(change) > 1 ? 'bullish 📈' : Number(change) < -1 ? 'bearish 📉' : 'neutral ➡️';
        return `Short-term trend looks ${trend} (${change}% over last 20 candles). Use 'analyze' for full breakdown.`;
      }
      return "Need more data to determine trend. Try again shortly.";
    }
    
    // Volume questions
    if (text.includes('volume')) {
      if (chartData && chartData.length >= 10) {
        const recentVol = chartData.slice(-5).reduce((sum, c) => sum + (c.volume || 0), 0) / 5;
        const prevVol = chartData.slice(-10, -5).reduce((sum, c) => sum + (c.volume || 0), 0) / 5;
        const volChange = prevVol > 0 ? ((recentVol - prevVol) / prevVol * 100).toFixed(0) : 0;
        return `Recent volume is ${Number(volChange) > 0 ? 'up' : 'down'} ${Math.abs(Number(volChange))}% compared to previous period.`;
      }
      return "Volume data is loading...";
    }
    
    // Thanks
    if (text.includes('thank') || text.includes('thanks')) {
      return "You're welcome! Happy trading! 📊";
    }
    
    // Trading concepts
    if (text.includes('what is') || text.includes('explain') || text.includes('define')) {
      if (text.includes('supply') || text.includes('demand')) {
        return "Supply zones are areas where sellers dominated, causing price drops. Demand zones are where buyers took control, pushing prices up. These zones often act as future reversal points.";
      }
      if (text.includes('support') || text.includes('resistance')) {
        return "Support is a price level where buying pressure prevents further decline. Resistance is where selling pressure caps upward movement. These levels are key for entries/exits.";
      }
      if (text.includes('trend')) {
        return "A trend is the overall direction of price movement. Uptrend = higher highs & higher lows. Downtrend = lower highs & lower lows. Always trade with the trend!";
      }
    }
    
    // Default response
    const defaults = [
      "I understand! Try 'zones', 'levels', or 'analyze' for chart tools. Or ask me about trends, price, or trading concepts.",
      "Interesting question! My main features are: zones, levels, analyze. I can also discuss basic trading concepts.",
      "Got it! For chart analysis, try: zones · levels · analyze. For info, ask about trends, support/resistance, or price action."
    ];
    return defaults[Math.floor(Math.random() * defaults.length)];
  }, [chartData]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;

    const text = input.toLowerCase().trim();
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    }]);
    setInput('');

    if (text.includes('zone') || text.includes('s&d') || text.includes('supply') || text.includes('demand')) {
      handleLocalSupplyDemand();
    } else if (text.includes('level') || text.includes('s/r') || text.includes('support') || text.includes('resistance')) {
      handleLocalSupportResistance();
    } else if (text.includes('analy') || text.includes('full')) {
      handleLocalFullAnalysis();
    } else {
      // Generate intelligent response
      setIsLoading(true);
      setTimeout(() => {
        const response = generateAIResponse(input);
        addAIMessage(response);
      }, 300 + Math.random() * 400);
    }
  }, [input, isLoading, handleLocalSupplyDemand, handleLocalSupportResistance, handleLocalFullAnalysis, generateAIResponse, addAIMessage]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInput(suggestion);
  }, []);

  if (!isVisible) return null;

  return (
    <aside className="w-full sm:w-80 bg-black border-l border-neutral-800 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white" />
          <span className="text-white text-xs font-medium tracking-widest uppercase">ai</span>
        </div>
        <span className="text-neutral-600 text-[10px] font-mono">{chartData?.length || 0}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0" ref={scrollRef}>
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <span className={`text-[11px] leading-relaxed max-w-[90%] ${
              msg.role === 'user' 
                ? 'text-white bg-neutral-800 px-3 py-1.5 rounded-2xl rounded-br-sm' 
                : 'text-neutral-400'
            }`}>
              {typingMessageId === msg.id ? displayedText : msg.content}
              {typingMessageId === msg.id && <span className="animate-pulse">|</span>}
            </span>
          </div>
        ))}
        {isLoading && !typingMessageId && (
          <div className="flex justify-start">
            <span className="text-neutral-600 text-[11px] flex gap-1">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
            </span>
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="px-4 py-2 flex gap-1.5 flex-wrap">
        <button 
          onClick={() => handleSuggestionClick('draw zones')}
          disabled={isLoading || !chartData || chartData.length < 20}
          className="px-2.5 py-1 text-[9px] font-medium rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-600 hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          zones
        </button>
        <button 
          onClick={() => handleSuggestionClick('draw levels')}
          disabled={isLoading || !chartData || chartData.length < 20}
          className="px-2.5 py-1 text-[9px] font-medium rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-600 hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          levels
        </button>
        <button 
          onClick={() => handleSuggestionClick('full analysis')}
          disabled={isLoading || !chartData || chartData.length < 20}
          className="px-2.5 py-1 text-[9px] font-medium rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-600 hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          analyze
        </button>
        <button 
          onClick={() => handleSuggestionClick('what is the trend?')}
          disabled={isLoading}
          className="px-2.5 py-1 text-[9px] font-medium rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-600 hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          trend?
        </button>
        <button 
          onClick={() => handleSuggestionClick('current price')}
          disabled={isLoading}
          className="px-2.5 py-1 text-[9px] font-medium rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-600 hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          price
        </button>
        <button 
          onClick={() => handleSuggestionClick('help')}
          disabled={isLoading}
          className="px-2.5 py-1 text-[9px] font-medium rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-600 hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          help
        </button>
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-neutral-800">
        <div className="flex gap-2 items-center">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..."
            className="flex-1 px-3 py-2 bg-neutral-900 rounded-full text-white text-[11px] placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-700"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-2 rounded-full bg-neutral-800 text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AIPanel;
