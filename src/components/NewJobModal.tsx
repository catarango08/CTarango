import { useState } from 'react';
import { X, FileText, Zap } from 'lucide-react';
import { JOB_TEMPLATES, applyTemplate } from '../data/jobTemplates';

interface Props {
  onSelectBlank: () => void;
  onSelectTemplate: (templateId: string) => void;
  onClose: () => void;
}

export default function NewJobModal({ onSelectBlank, onSelectTemplate, onClose }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl my-8">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 text-lg">New Job</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Blank option */}
          <button
            onClick={onSelectBlank}
            className="w-full text-left flex items-center gap-4 p-4 border-2 border-blue-300 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <div className="bg-blue-600 text-white p-2.5 rounded-lg flex-shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Start from Blank</p>
              <p className="text-sm text-slate-500">Create an empty job and fill in the details yourself.</p>
            </div>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-slate-400">or start from a template</span>
            </div>
          </div>

          {/* Templates */}
          <div className="space-y-2">
            {JOB_TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template.id)}
                onMouseEnter={() => setHoveredId(template.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="w-full text-left flex items-start gap-3 p-3.5 border border-slate-200 rounded-xl hover:border-yellow-400 hover:bg-yellow-50 transition-colors"
              >
                <div className="bg-yellow-100 text-yellow-700 p-2 rounded-lg flex-shrink-0">
                  <Zap size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">{template.title}</p>
                  {hoveredId === template.id && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{template.scopeDescription}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-xs text-slate-400">{template.estimatedHours}h est.</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-400">{template.scopeItems.length} scope items</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-400">{template.materials.length} materials</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Export helper so App.tsx can call it
export { applyTemplate };
