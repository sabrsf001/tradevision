import React from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, X } from './Icons';

interface ReplayControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onStep: (dir: number) => void;
  onExit: () => void;
  progress: number;
  total: number;
  onSeek: (val: number) => void;
  currentDate: string;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

const ReplayControls: React.FC<ReplayControlsProps> = ({
  isPlaying, onPlayPause, onStep, onExit, progress, total, onSeek, currentDate, speed, onSpeedChange
}) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] p-4 z-[60] shadow-[0_-4px_12px_rgba(0,0,0,0.5)] animate-fade-in">
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <button 
            onClick={onPlayPause}
            className={`flex items-center gap-2 px-3 py-1.5 rounded border border-[var(--border-color)] transition-colors ${isPlaying ? 'bg-white text-black' : 'bg-[var(--bg-panel)] text-white hover:bg-[#252525]'}`}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span className="text-sm font-medium">{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button onClick={() => onStep(-1)} className="p-2 rounded border border-[var(--border-color)] bg-[var(--bg-panel)] hover:bg-[#252525]">
            <ChevronLeft className="h-4 w-4 text-white" />
          </button>
          <button onClick={() => onStep(1)} className="p-2 rounded border border-[var(--border-color)] bg-[var(--bg-panel)] hover:bg-[#252525]">
            <ChevronRight className="h-4 w-4 text-white" />
          </button>
        </div>

        <div className="h-6 w-px bg-[var(--border-color)] mx-2"></div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Speed:</span>
          {[0.5, 1, 2, 5].map(s => (
            <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-2 py-0.5 rounded text-xs border border-[var(--border-color)] transition-colors ${speed === s ? 'bg-white text-black' : 'bg-[var(--bg-panel)] text-white hover:bg-[#252525]'}`}
            >
                {s}x
            </button>
          ))}
        </div>

        <div className="flex-grow"></div>

        <div className="text-sm text-white font-mono bg-[var(--bg-primary)] px-3 py-1 rounded border border-[var(--border-color)]">
           {currentDate}
        </div>

        <button 
            onClick={onExit}
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-[var(--border-color)] bg-[var(--bg-panel)] text-white hover:bg-red-900/30 hover:border-red-800 hover:text-red-400 transition-colors"
        >
            <X className="h-4 w-4" />
            <span className="text-sm">Exit Replay</span>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-400 w-24 text-right">{progress} / {total}</span>
        <input 
            type="range"
            min="0"
            max={total}
            value={progress}
            onChange={(e) => onSeek(parseInt(e.target.value))}
            className="flex-grow h-1.5 bg-[var(--bg-panel)] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
        />
      </div>
    </div>
  );
};

export default ReplayControls;