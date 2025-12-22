
import React from 'react';
import { DrawingObject, DrawingStyle } from '../types';
import { Trash2, LockOpen, Copy, Minus, MoreHorizontal, Check, Lock, X } from './Icons';

interface DrawingSettingsPopupProps {
    drawing: DrawingObject;
    position: { x: number; y: number };
    onUpdate: (id: string, updates: Partial<DrawingObject>) => void;
    onDelete: (id: string) => void;
    onDuplicate: (drawing: DrawingObject) => void;
    onClose: () => void;
}

const DrawingSettingsPopup: React.FC<DrawingSettingsPopupProps> = ({
    drawing, position, onUpdate, onDelete, onDuplicate, onClose
}) => {
    const { style } = drawing;

    const updateStyle = (updates: Partial<DrawingStyle>) => {
        onUpdate(drawing.id, { style: { ...style, ...updates } });
    };

    // Helper to ensure color picker gets a valid Hex
    const getHexColor = (color: string) => {
        if (color && color.startsWith('#')) return color;
        return '#2962ff'; 
    };

    // Calculate position to keep it on screen (basic clamping)
    const popupStyle = {
        left: Math.max(10, position.x),
        top: Math.max(10, position.y - 180) 
    };

    return (
        <div 
            className="absolute z-50 bg-[#1a1a1a] border border-[#333333] rounded-md shadow-2xl p-0 flex flex-col w-[240px] animate-fade-in text-sm font-sans"
            style={popupStyle}
            onMouseDown={(e) => e.stopPropagation()} 
        >
            {/* Header */}
            <div className="flex justify-between items-center px-3 py-2 border-b border-[#333333] bg-[#1f1f1f] rounded-t-md">
                <span className="text-[11px] font-bold text-[#cccccc] uppercase tracking-wider">{drawing.tool}</span>
                <button onClick={onClose} className="text-[#666666] hover:text-white transition-colors">
                    <X className="w-3 h-3" />
                </button>
            </div>

            <div className="p-3 flex flex-col gap-3">
                
                {/* --- BORDER / STROKE SECTION --- */}
                <div className="flex flex-col gap-2">
                    <label className="text-[11px] text-[#888888] font-medium uppercase">Stroke</label>
                    <div className="flex items-center gap-2">
                        {/* Color Picker */}
                        <div 
                            className="relative w-8 h-8 rounded border border-[#444444] overflow-hidden cursor-pointer hover:border-white transition-colors"
                            style={{ backgroundColor: getHexColor(style.lineColor) }}
                        >
                            <input 
                                type="color" 
                                value={getHexColor(style.lineColor)}
                                onChange={(e) => updateStyle({ lineColor: e.target.value })}
                                className="absolute opacity-0 w-full h-full cursor-pointer"
                                title="Border Color"
                            />
                        </div>

                        {/* Width Dropdown */}
                        <select 
                            value={style.lineWidth}
                            onChange={(e) => updateStyle({ lineWidth: parseInt(e.target.value) })}
                            className="bg-[#2a2a2a] text-[#eeeeee] border border-[#444444] rounded h-8 px-2 text-xs outline-none focus:border-[#2962ff] flex-1 cursor-pointer"
                        >
                            <option value="1">1px</option>
                            <option value="2">2px</option>
                            <option value="3">3px</option>
                            <option value="4">4px</option>
                        </select>

                        {/* Style Toggle (Solid/Dashed) */}
                        <button 
                            onClick={() => updateStyle({ lineStyle: style.lineStyle === 0 ? 1 : 0 })}
                            className="bg-[#2a2a2a] border border-[#444444] rounded h-8 w-8 flex items-center justify-center hover:bg-[#3a3a3a] transition-colors"
                            title="Toggle Line Style"
                        >
                            {style.lineStyle === 0 
                                ? <Minus className="w-4 h-4 text-white -rotate-45" /> 
                                : <MoreHorizontal className="w-4 h-4 text-white" />
                            }
                        </button>
                    </div>
                </div>

                {/* --- FILL SECTION (Rectangles) --- */}
                {(drawing.tool === 'rectangle') && (
                    <>
                        <div className="h-px bg-[#333333] w-full my-1" />
                        
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[11px] text-[#888888] font-medium uppercase">Background</label>
                                
                                {/* No Fill Toggle */}
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-3 h-3 border rounded-sm flex items-center justify-center transition-colors ${style.fillEnabled !== false ? 'bg-[#2962ff] border-[#2962ff]' : 'border-[#666666] group-hover:border-[#888888]'}`}>
                                        {style.fillEnabled !== false && <Check className="w-2.5 h-2.5 text-white" />}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={style.fillEnabled !== false}
                                        onChange={() => updateStyle({ fillEnabled: !style.fillEnabled })}
                                        className="hidden"
                                    />
                                    <span className={`text-[10px] ${style.fillEnabled !== false ? 'text-white' : 'text-[#666666]'}`}>Enable</span>
                                </label>
                            </div>

                            <div className={`flex flex-col gap-2 transition-opacity ${style.fillEnabled === false ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                <div className="flex items-center gap-2">
                                    {/* Fill Color Picker */}
                                    <div 
                                        className="relative w-8 h-8 rounded border border-[#444444] overflow-hidden cursor-pointer hover:border-white transition-colors"
                                        style={{ backgroundColor: getHexColor(style.fillColor) }}
                                    >
                                        <input 
                                            type="color" 
                                            value={getHexColor(style.fillColor)}
                                            onChange={(e) => updateStyle({ fillColor: e.target.value })}
                                            className="absolute opacity-0 w-full h-full cursor-pointer"
                                            title="Fill Color"
                                        />
                                    </div>

                                    {/* Opacity Slider */}
                                    <div className="flex-1 flex flex-col justify-center gap-1">
                                        <div className="flex justify-between text-[10px] text-[#888888]">
                                            <span>Opacity</span>
                                            <span>{Math.round((style.fillOpacity ?? 0.2) * 100)}%</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="0.5" 
                                            step="0.01"
                                            value={style.fillOpacity ?? 0.2}
                                            onChange={(e) => updateStyle({ fillOpacity: parseFloat(e.target.value) })}
                                            className="w-full h-1 bg-[#2a2a2a] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#cccccc] hover:[&::-webkit-slider-thumb]:bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <div className="h-px bg-[#333333] w-full my-1" />

                {/* --- FOOTER ACTIONS --- */}
                <div className="flex justify-between items-center pt-1">
                    <button 
                        onClick={() => onUpdate(drawing.id, { locked: !drawing.locked })}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors ${drawing.locked ? 'text-[#2962ff] bg-[#2962ff]/10' : 'text-[#888888] hover:text-white hover:bg-[#2a2a2a]'}`}
                    >
                        {drawing.locked ? <Lock className="w-3 h-3" /> : <LockOpen className="w-3 h-3" />}
                        <span>{drawing.locked ? 'Locked' : 'Lock'}</span>
                    </button>

                    <div className="flex gap-1">
                        <button 
                            onClick={() => onDuplicate(drawing)}
                            className="p-1.5 text-[#888888] hover:text-white hover:bg-[#2a2a2a] rounded transition-colors" 
                            title="Duplicate"
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button 
                            onClick={() => onDelete(drawing.id)}
                            className="p-1.5 text-[#888888] hover:text-[#ef5350] hover:bg-[#2a2a2a] rounded transition-colors" 
                            title="Delete"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DrawingSettingsPopup;
