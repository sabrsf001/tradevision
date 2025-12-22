/**
 * AI Zone Overlay - Beautiful animated supply/demand zones
 * Works locally without API key
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Zone, SupportResistance, analyzeChart, detectSupplyDemandZones, detectSupportResistance } from '../utils/localAI';
import { CandleData } from '../types';
import { TrendingUp, Activity, Target, Layers, Sparkles, X } from './Icons';

interface AIZoneOverlayProps {
  candles: CandleData[];
  chartWidth: number;
  chartHeight: number;
  priceToY: (price: number) => number;
  timeToX: (time: number) => number;
  visibleRange?: { start: number; end: number };
  isVisible: boolean;
  onClose: () => void;
}

export const AIZoneOverlay: React.FC<AIZoneOverlayProps> = ({
  candles,
  chartWidth,
  chartHeight,
  priceToY,
  timeToX,
  isVisible,
  onClose,
}) => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [srLevels, setSRLevels] = useState<SupportResistance[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    if (isVisible && candles.length > 20) {
      setIsAnalyzing(true);
      setAnimationPhase(0);
      
      // Simulate analysis with staggered animation
      setTimeout(() => {
        const detectedZones = detectSupplyDemandZones(candles);
        const detectedSR = detectSupportResistance(candles);
        setZones(detectedZones);
        setSRLevels(detectedSR);
        setIsAnalyzing(false);
        
        // Start animation sequence
        let phase = 0;
        const interval = setInterval(() => {
          phase++;
          setAnimationPhase(phase);
          if (phase >= detectedZones.length + detectedSR.length + 1) {
            clearInterval(interval);
          }
        }, 200);
        
        return () => clearInterval(interval);
      }, 500);
    }
  }, [isVisible, candles]);

  if (!isVisible) return null;

  const lastCandle = candles[candles.length - 1];
  const firstCandle = candles[0];

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Analyzing overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm pointer-events-auto animate-fade-in">
          <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-[var(--bg-secondary)]/90 border border-[var(--border-color)]">
            <div className="relative">
              <Sparkles className="w-12 h-12 text-[var(--accent-primary)] animate-pulse" />
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                <div className="w-full h-full border-2 border-transparent border-t-[var(--accent-primary)] rounded-full" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Analyzing Chart
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Detecting supply & demand zones...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SVG overlay for zones */}
      <svg 
        width={chartWidth} 
        height={chartHeight} 
        className="absolute inset-0"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Gradient for demand zones */}
          <linearGradient id="demandGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#26a69a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#26a69a" stopOpacity="0.1" />
          </linearGradient>
          
          {/* Gradient for supply zones */}
          <linearGradient id="supplyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef5350" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ef5350" stopOpacity="0.4" />
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Pulse animation */}
          <filter id="pulse">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2">
              <animate attributeName="stdDeviation" values="2;4;2" dur="2s" repeatCount="indefinite" />
            </feGaussianBlur>
          </filter>
        </defs>

        {/* Supply/Demand Zones */}
        {zones.map((zone, index) => {
          const y1 = priceToY(zone.priceTop);
          const y2 = priceToY(zone.priceBottom);
          const x1 = timeToX(zone.startTime);
          const x2 = chartWidth; // Extend to right edge
          const height = Math.abs(y2 - y1);
          const isAnimated = animationPhase > index;
          
          const color = zone.type === 'demand' ? '#26a69a' : '#ef5350';
          const gradientId = zone.type === 'demand' ? 'demandGradient' : 'supplyGradient';
          
          return (
            <g 
              key={zone.id} 
              className={`transition-all duration-500 ${isAnimated ? 'opacity-100' : 'opacity-0'}`}
              style={{ 
                transform: isAnimated ? 'scaleX(1)' : 'scaleX(0)',
                transformOrigin: 'left',
                transition: 'transform 0.6s ease-out, opacity 0.4s ease-out',
              }}
            >
              {/* Zone rectangle */}
              <rect
                x={x1}
                y={Math.min(y1, y2)}
                width={x2 - x1}
                height={height}
                fill={`url(#${gradientId})`}
                stroke={color}
                strokeWidth={zone.strength === 'strong' ? 2 : 1}
                strokeDasharray={zone.strength === 'weak' ? '4,4' : 'none'}
                rx={4}
              >
                <animate 
                  attributeName="opacity" 
                  values="0.8;1;0.8" 
                  dur="3s" 
                  repeatCount="indefinite" 
                />
              </rect>
              
              {/* Zone label */}
              <g transform={`translate(${x1 + 8}, ${Math.min(y1, y2) + 20})`}>
                <rect
                  x={-4}
                  y={-14}
                  width={zone.type === 'demand' ? 70 : 60}
                  height={20}
                  rx={4}
                  fill={color}
                  opacity={0.9}
                />
                <text
                  x={0}
                  y={0}
                  fill="white"
                  fontSize={11}
                  fontWeight={600}
                  fontFamily="Inter, sans-serif"
                >
                  {zone.type === 'demand' ? '🟢 DEMAND' : '🔴 SUPPLY'}
                </text>
              </g>
              
              {/* Strength indicator */}
              {zone.strength === 'strong' && (
                <g transform={`translate(${x1 + 8}, ${Math.min(y1, y2) + 38})`}>
                  <text
                    fill={color}
                    fontSize={9}
                    fontWeight={500}
                    opacity={0.8}
                  >
                    ★ Strong Zone
                  </text>
                </g>
              )}
              
              {/* Pulse effect on zone edges */}
              <line
                x1={x1}
                y1={Math.min(y1, y2)}
                x2={x2}
                y2={Math.min(y1, y2)}
                stroke={color}
                strokeWidth={2}
                filter="url(#glow)"
              >
                <animate 
                  attributeName="stroke-opacity" 
                  values="1;0.5;1" 
                  dur="2s" 
                  repeatCount="indefinite" 
                />
              </line>
            </g>
          );
        })}

        {/* Support/Resistance Lines */}
        {srLevels.map((level, index) => {
          const y = priceToY(level.price);
          const isAnimated = animationPhase > zones.length + index;
          const color = level.type === 'support' ? '#26a69a' : '#ef5350';
          
          return (
            <g 
              key={`sr-${level.price}`}
              className={`transition-all duration-500 ${isAnimated ? 'opacity-100' : 'opacity-0'}`}
            >
              <line
                x1={0}
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke={color}
                strokeWidth={1.5}
                strokeDasharray="8,4"
                filter="url(#glow)"
              >
                <animate 
                  attributeName="stroke-dashoffset" 
                  values="0;24" 
                  dur="2s" 
                  repeatCount="indefinite" 
                />
              </line>
              
              {/* Price label */}
              <g transform={`translate(${chartWidth - 80}, ${y - 8})`}>
                <rect
                  x={0}
                  y={-10}
                  width={75}
                  height={20}
                  rx={4}
                  fill="var(--bg-secondary)"
                  stroke={color}
                  strokeWidth={1}
                />
                <text
                  x={8}
                  y={4}
                  fill={color}
                  fontSize={10}
                  fontWeight={600}
                >
                  {level.type === 'support' ? 'S' : 'R'}: ${level.price.toFixed(2)}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Analysis Summary Panel */}
      {!isAnalyzing && zones.length > 0 && (
        <div 
          className="absolute top-4 left-4 p-4 rounded-xl bg-[var(--bg-secondary)]/95 backdrop-blur-md border border-[var(--border-color)] pointer-events-auto animate-slide-down"
          style={{ maxWidth: '280px' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--accent-primary)]" />
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                AI Analysis
              </span>
            </div>
            <button 
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#26a69a]" />
              <span style={{ color: 'var(--text-secondary)' }}>
                {zones.filter(z => z.type === 'demand').length} Demand Zones
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ef5350]" />
              <span style={{ color: 'var(--text-secondary)' }}>
                {zones.filter(z => z.type === 'supply').length} Supply Zones
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-3 h-3" style={{ color: 'var(--text-secondary)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>
                {srLevels.length} Key Levels
              </span>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              💡 Zones extend to current price. Strong zones have solid borders.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIZoneOverlay;
