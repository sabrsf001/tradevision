/**
 * Drawing Templates Panel
 * Save and load drawing configurations as reusable templates
 */

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Copy, Save } from './Icons';
import { DrawingObject, DrawingStyle } from '../types';

export interface DrawingTemplate {
  id: string;
  name: string;
  description?: string;
  drawings: Omit<DrawingObject, 'id'>[];
  createdAt: number;
  updatedAt: number;
}

interface DrawingTemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  currentDrawings: DrawingObject[];
  onApplyTemplate: (drawings: DrawingObject[]) => void;
  onToast: (message: string, type: 'success' | 'alert' | 'info') => void;
}

const TEMPLATES_STORAGE_KEY = 'tv_drawing_templates';

// Generate unique ID
const generateId = () => `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateDrawingId = () => `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Load templates from localStorage
const loadTemplates = (): DrawingTemplate[] => {
  try {
    const saved = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Save templates to localStorage
const saveTemplates = (templates: DrawingTemplate[]) => {
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
};

// Preset templates
const PRESET_TEMPLATES: DrawingTemplate[] = [
  {
    id: 'preset_support_resistance',
    name: 'Support & Resistance',
    description: 'Two horizontal lines for S/R levels',
    drawings: [
      {
        tool: 'horizontal',
        start: { time: 0, price: 0 },
        end: { time: 0, price: 0 },
        style: { lineColor: '#22c55e', lineWidth: 2, lineStyle: 0, fillColor: '#22c55e', showLabel: true, fontSize: 12 },
        value: 0,
      },
      {
        tool: 'horizontal',
        start: { time: 0, price: 0 },
        end: { time: 0, price: 0 },
        style: { lineColor: '#ef4444', lineWidth: 2, lineStyle: 0, fillColor: '#ef4444', showLabel: true, fontSize: 12 },
        value: 0,
      },
    ],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'preset_fib_setup',
    name: 'Fibonacci Setup',
    description: 'Fibonacci retracement with horizontal levels',
    drawings: [
      {
        tool: 'fibonacci',
        start: { time: 0, price: 0 },
        end: { time: 0, price: 0 },
        style: { lineColor: '#f59e0b', lineWidth: 1, lineStyle: 1, fillColor: '#f59e0b', showLabel: true, fontSize: 12 },
      },
    ],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'preset_channel',
    name: 'Price Channel',
    description: 'Two parallel trend lines',
    drawings: [
      {
        tool: 'trendline',
        start: { time: 0, price: 0 },
        end: { time: 0, price: 0 },
        style: { lineColor: '#3b82f6', lineWidth: 2, lineStyle: 0, fillColor: '#3b82f6', showLabel: true, fontSize: 12 },
      },
      {
        tool: 'trendline',
        start: { time: 0, price: 0 },
        end: { time: 0, price: 0 },
        style: { lineColor: '#3b82f6', lineWidth: 2, lineStyle: 1, fillColor: '#3b82f6', showLabel: true, fontSize: 12 },
      },
    ],
    createdAt: 0,
    updatedAt: 0,
  },
];

export const DrawingTemplatesPanel: React.FC<DrawingTemplatesProps> = ({
  isOpen,
  onClose,
  currentDrawings,
  onApplyTemplate,
  onToast,
}) => {
  const [templates, setTemplates] = useState<DrawingTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Load templates on mount
  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  if (!isOpen) return null;

  const handleSaveAsTemplate = () => {
    if (!newTemplateName.trim()) {
      onToast('Please enter a template name', 'alert');
      return;
    }

    if (currentDrawings.length === 0) {
      onToast('No drawings to save', 'alert');
      return;
    }

    const template: DrawingTemplate = {
      id: generateId(),
      name: newTemplateName.trim(),
      drawings: currentDrawings.map(({ id, ...rest }) => rest),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedTemplates = [...templates, template];
    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
    setNewTemplateName('');
    setIsCreating(false);
    onToast(`Template "${template.name}" saved!`, 'success');
  };

  const handleApplyTemplate = (template: DrawingTemplate) => {
    // Convert template drawings to actual DrawingObjects with unique IDs
    const drawings: DrawingObject[] = template.drawings.map((d) => ({
      ...d,
      id: generateDrawingId(),
    }));
    
    onApplyTemplate(drawings);
    onToast(`Applied template: ${template.name}`, 'success');
    onClose();
  };

  const handleDeleteTemplate = (templateId: string) => {
    const updatedTemplates = templates.filter((t) => t.id !== templateId);
    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
    onToast('Template deleted', 'info');
  };

  const handleDuplicateTemplate = (template: DrawingTemplate) => {
    const duplicate: DrawingTemplate = {
      ...template,
      id: generateId(),
      name: `${template.name} (copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedTemplates = [...templates, duplicate];
    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
    onToast('Template duplicated', 'success');
  };

  const allTemplates = [...PRESET_TEMPLATES, ...templates];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            Drawing Templates
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-primary)] rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Save Current Drawings */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              Save Current Drawings
            </h3>
            {isCreating ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Template name..."
                  className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--accent-blue)]"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveAsTemplate()}
                />
                <button
                  onClick={handleSaveAsTemplate}
                  className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                disabled={currentDrawings.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--bg-primary)] border border-dashed border-[var(--border-color)] rounded-lg text-sm text-gray-400 hover:text-white hover:border-[var(--accent-blue)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Save {currentDrawings.length} drawing{currentDrawings.length !== 1 ? 's' : ''} as template
              </button>
            )}
          </div>

          {/* Preset Templates */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              Preset Templates
            </h3>
            <div className="space-y-2">
              {PRESET_TEMPLATES.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isPreset
                  onApply={() => handleApplyTemplate(template)}
                />
              ))}
            </div>
          </div>

          {/* User Templates */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              My Templates ({templates.length})
            </h3>
            {templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No saved templates yet</p>
                <p className="text-xs mt-1">Save your current drawings as a template to reuse them</p>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onApply={() => handleApplyTemplate(template)}
                    onDelete={() => handleDeleteTemplate(template.id)}
                    onDuplicate={() => handleDuplicateTemplate(template)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Template Card Component
interface TemplateCardProps {
  template: DrawingTemplate;
  isPreset?: boolean;
  onApply: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  isPreset,
  onApply,
  onDelete,
  onDuplicate,
}) => {
  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-3 group hover:border-[var(--accent-blue)] transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white truncate">
            {template.name}
            {isPreset && (
              <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                Preset
              </span>
            )}
          </h4>
          {template.description && (
            <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
          )}
          <p className="text-xs text-gray-600 mt-1">
            {template.drawings.length} drawing{template.drawings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={onApply}
            className="px-3 py-1.5 bg-[var(--accent-blue)] text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors"
          >
            Apply
          </button>
          {!isPreset && (
            <>
              <button
                onClick={onDuplicate}
                className="p-1.5 text-gray-500 hover:text-white hover:bg-[var(--bg-secondary)] rounded transition-colors"
                title="Duplicate"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-[var(--bg-secondary)] rounded transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrawingTemplatesPanel;
