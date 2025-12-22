import React from 'react';
import { 
  MousePointer2, Crosshair, TrendingUp, Minus, SeparatorVertical, 
  Square, GitMerge, Type, Magnet, LockOpen, Eye, Trash2 
} from './Icons';
import { DrawingTool } from '../types';

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onClearDrawings: () => void;
  onOpenTemplates?: () => void;
  isHidden: boolean;
}

const DrawingToolbar: React.FC<DrawingToolbarProps> = ({ activeTool, onToolChange, onClearDrawings, onOpenTemplates, isHidden }) => {
  if (isHidden) return null;

  const tools: { id: DrawingTool; icon: React.ReactNode; label: string }[] = [
    { id: 'cursor', icon: <MousePointer2 className="h-5 w-5" />, label: 'Cursor' },
    { id: 'crosshair', icon: <Crosshair className="h-5 w-5" />, label: 'Crosshair' },
    { id: 'trendline', icon: <TrendingUp className="h-5 w-5" />, label: 'Trend Line' },
    { id: 'horizontal', icon: <Minus className="h-5 w-5" />, label: 'Horizontal Line' },
    { id: 'vertical', icon: <SeparatorVertical className="h-5 w-5" />, label: 'Vertical Line' },
    { id: 'rectangle', icon: <Square className="h-5 w-5" />, label: 'Rectangle' },
    { id: 'text', icon: <Type className="h-5 w-5" />, label: 'Text' },
  ];

  return (
    <div className="hidden sm:flex flex-shrink-0 w-[44px] sm:w-[50px] bg-[var(--bg-primary)] border-r border-[var(--border-color)] flex-col items-center py-1 sm:py-2 space-y-0.5 sm:space-y-1 overflow-y-auto z-10">
      {tools.map((tool, index) => (
        <React.Fragment key={tool.id}>
           {index === 2 && <div className="h-px w-6 sm:w-8 bg-[var(--border-color)] my-0.5 sm:my-1"></div>}
           <button
             onClick={() => onToolChange(tool.id)}
             className={`p-2 sm:p-3 rounded transition-colors touch-active ${
               activeTool === tool.id 
                 ? 'bg-[#2d2d2d] text-[var(--accent-blue)]' 
                 : 'text-[var(--text-secondary)] hover:bg-[#252525] hover:text-white active:bg-[#2d2d2d]'
             }`}
             title={tool.label}
           >
             <span className="[&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-5 sm:[&>svg]:w-5">{tool.icon}</span>
           </button>
        </React.Fragment>
      ))}
      
      <div className="h-px w-6 sm:w-8 bg-[var(--border-color)] my-0.5 sm:my-1"></div>
      
      <button className="p-2 sm:p-3 rounded text-[var(--text-secondary)] hover:bg-[#252525] hover:text-white active:bg-[#2d2d2d] touch-active" title="Magnet Mode">
        <Magnet className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
      <button className="p-2 sm:p-3 rounded text-[var(--text-secondary)] hover:bg-[#252525] hover:text-white active:bg-[#2d2d2d] touch-active" title="Lock">
        <LockOpen className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
      <button className="p-2 sm:p-3 rounded text-[var(--text-secondary)] hover:bg-[#252525] hover:text-white active:bg-[#2d2d2d] touch-active" title="Hide">
        <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
      <button 
        onClick={onClearDrawings}
        className="p-2 sm:p-3 rounded text-[var(--text-secondary)] hover:bg-[#252525] hover:text-red-400 active:bg-[#2d2d2d] touch-active" 
        title="Delete All"
      >
        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
      
      {onOpenTemplates && (
        <>
          <div className="h-px w-6 sm:w-8 bg-[var(--border-color)] my-0.5 sm:my-1"></div>
          <button 
            onClick={onOpenTemplates}
            className="p-2 sm:p-3 rounded text-[var(--text-secondary)] hover:bg-[#252525] hover:text-[var(--accent-blue)] active:bg-[#2d2d2d] touch-active" 
            title="Drawing Templates"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
};

export default DrawingToolbar;