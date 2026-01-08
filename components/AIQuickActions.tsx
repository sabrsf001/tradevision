/**
 * AI Quick Actions - Floating AI buttons on chart for instant analysis
 * Draws zones and levels with smooth animation
 */

import React, { useState, useCallback } from 'react';
import { CandleData, AIDrawCommand } from '../types';
import { AITradingEngine } from '../services/aiTradingEngine';

interface AIQuickActionsProps {
  chartData: CandleData[];
  symbol: string;
  timeframe: string;
  onDrawCommand: (command: AIDrawCommand) => void;
  isVisible?: boolean;
}

const AIQuickActions: React.FC<AIQuickActionsProps> = ({
  chartData,
  symbol,
  timeframe,
  onDrawCommand,
  isVisible = true,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  
  // Animated drawing with delay between each
  const drawWithAnimation = useCallback((commands: AIDrawCommand[], delay: number = 300) => {
    commands.forEach((cmd, index) => {
      setTimeout(() => {
        onDrawCommand(cmd);
      }, index * delay);
    });
  }, [onDrawCommand]);
  
  // Draw Supply & Demand Zones
  const handleDrawZones = useCallback(() => {
    if (!chartData || chartData.length < 50 || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setLastAction('zones');
    
    setTimeout(() => {
      const analysis = AITradingEngine.analyze(chartData, symbol, timeframe);
      const orderBlocks = analysis.marketStructure.orderBlocks;
      
      if (orderBlocks.length === 0) {
        setResultMessage('No zones found');
        setShowResult(true);
        setTimeout(() => setShowResult(false), 2000);
        setIsAnalyzing(false);
        return;
      }
      
      const commands: AIDrawCommand[] = orderBlocks.slice(0, 4).map(ob => ({
        type: 'ZONE' as const,
        priceTop: ob.priceHigh,
        priceBottom: ob.priceLow,
        zoneType: ob.type === 'bullish' ? 'DEMAND' as const : 'SUPPLY' as const,
      }));
      
      drawWithAnimation(commands, 400);
      
      const demand = orderBlocks.filter(ob => ob.type === 'bullish').length;
      const supply = orderBlocks.filter(ob => ob.type === 'bearish').length;
      setResultMessage(`📊 ${demand} demand, ${supply} supply`);
      setShowResult(true);
      setTimeout(() => setShowResult(false), 3000);
      setIsAnalyzing(false);
    }, 500);
  }, [chartData, symbol, timeframe, isAnalyzing, drawWithAnimation]);
  
  // Draw Support & Resistance Levels
  const handleDrawLevels = useCallback(() => {
    if (!chartData || chartData.length < 30 || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setLastAction('levels');
    
    setTimeout(() => {
      const swings = AITradingEngine.detectSwingPoints(chartData);
      
      const allLevels = [
        ...swings.highs.slice(-3).map(h => ({ price: h, type: 'resistance' })),
        ...swings.lows.slice(-3).map(l => ({ price: l, type: 'support' })),
      ];
      
      if (allLevels.length === 0) {
        setResultMessage('No levels found');
        setShowResult(true);
        setTimeout(() => setShowResult(false), 2000);
        setIsAnalyzing(false);
        return;
      }
      
      const commands: AIDrawCommand[] = allLevels.map(level => ({
        type: 'HORIZONTAL' as const,
        value: level.price,
      }));
      
      drawWithAnimation(commands, 250);
      
      const supports = allLevels.filter(l => l.type === 'support').length;
      const resistances = allLevels.filter(l => l.type === 'resistance').length;
      setResultMessage(`📈 ${supports} support, ${resistances} resistance`);
      setShowResult(true);
      setTimeout(() => setShowResult(false), 3000);
      setIsAnalyzing(false);
    }, 500);
  }, [chartData, isAnalyzing, drawWithAnimation]);
  
  // Full AI Analysis
  const handleFullAnalysis = useCallback(() => {
    if (!chartData || chartData.length < 50 || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setLastAction('full');
    
    setTimeout(() => {
      const analysis = AITradingEngine.analyze(chartData, symbol, timeframe);
      
      const commands: AIDrawCommand[] = [];
      
      // Add order blocks as zones
      analysis.marketStructure.orderBlocks.slice(0, 3).forEach(ob => {
        commands.push({
          type: 'ZONE' as const,
          priceTop: ob.priceHigh,
          priceBottom: ob.priceLow,
          zoneType: ob.type === 'bullish' ? 'DEMAND' as const : 'SUPPLY' as const,
        });
      });
      
      // Add key swing levels
      const swings = analysis.marketStructure;
      swings.swingHighs.slice(-2).forEach(h => {
        commands.push({ type: 'HORIZONTAL' as const, value: h });
      });
      swings.swingLows.slice(-2).forEach(l => {
        commands.push({ type: 'HORIZONTAL' as const, value: l });
      });
      
      if (commands.length === 0) {
        setResultMessage('No patterns found');
        setShowResult(true);
        setTimeout(() => setShowResult(false), 2000);
        setIsAnalyzing(false);
        return;
      }
      
      drawWithAnimation(commands, 350);
      
      const emoji = analysis.marketStructure.trend === 'BULLISH' ? '📈' : 
                    analysis.marketStructure.trend === 'BEARISH' ? '📉' : '➡️';
      setResultMessage(`${emoji} ${analysis.marketStructure.trend} ${analysis.marketStructure.trendStrength.toFixed(0)}%`);
      setShowResult(true);
      setTimeout(() => setShowResult(false), 4000);
      setIsAnalyzing(false);
    }, 800);
  }, [chartData, symbol, timeframe, isAnalyzing, drawWithAnimation]);
  
  if (!isVisible || !chartData || chartData.length < 30) return null;
  
  return (
    <>
      {/* Floating AI Button Group */}
      <div className="absolute top-3 right-3 z-50 flex flex-col gap-2">
        {/* Main AI Analysis Button */}
        <button
          onClick={handleFullAnalysis}
          disabled={isAnalyzing}
          className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 shadow-lg ${
            isAnalyzing && lastAction === 'full'
              ? 'bg-purple-500 text-white scale-105'
              : 'bg-[var(--bg-secondary)]/90 backdrop-blur-md border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] hover:border-purple-500 hover:scale-105'
          }`}
        >
          {isAnalyzing && lastAction === 'full' ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-purple-400 group-hover:text-purple-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          )}
          <span className="text-sm font-medium">
            {isAnalyzing && lastAction === 'full' ? 'Analyzing...' : 'AI Analyze'}
          </span>
        </button>
        
        {/* Quick Action Buttons */}
        <div className="flex gap-1.5">
          {/* Zones Button */}
          <button
            onClick={handleDrawZones}
            disabled={isAnalyzing}
            title="Draw Supply & Demand Zones"
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 shadow-md ${
              isAnalyzing && lastAction === 'zones'
                ? 'bg-emerald-500 text-white animate-pulse'
                : 'bg-[var(--bg-secondary)]/90 backdrop-blur-md border border-[var(--border-color)] text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500'
            }`}
          >
            {isAnalyzing && lastAction === 'zones' ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16M4 10h16M4 15h16M4 20h16" />
              </svg>
            )}
          </button>
          
          {/* Levels Button */}
          <button
            onClick={handleDrawLevels}
            disabled={isAnalyzing}
            title="Draw Support & Resistance"
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 shadow-md ${
              isAnalyzing && lastAction === 'levels'
                ? 'bg-blue-500 text-white animate-pulse'
                : 'bg-[var(--bg-secondary)]/90 backdrop-blur-md border border-[var(--border-color)] text-blue-400 hover:bg-blue-500/20 hover:border-blue-500'
            }`}
          >
            {isAnalyzing && lastAction === 'levels' ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {/* Result Toast */}
      {showResult && (
        <div className="absolute top-16 right-3 z-50 animate-slide-in-right">
          <div className="px-4 py-2 rounded-xl bg-[var(--bg-secondary)]/95 backdrop-blur-md border border-[var(--border-color)] shadow-xl">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {resultMessage}
            </span>
          </div>
        </div>
      )}
    </>
  );
};

export default AIQuickActions;
