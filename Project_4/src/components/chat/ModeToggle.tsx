import React from 'react';
import { FileText, MessageSquare } from 'lucide-react';

/**
 * ModeToggle - Toggle between Answer and Draft modes
 */
export type QueryMode = 'answer' | 'draft';

interface ModeToggleProps {
  mode: QueryMode;
  onChange: (mode: QueryMode) => void;
  className?: string;
}

export function ModeToggle({ mode, onChange, className = '' }: ModeToggleProps) {
  return (
    <div
      className={`inline-flex rounded-lg border border-gray-300 p-1 ${className}`}
      role="group"
      aria-label="Query mode selection"
    >
      <button
        onClick={() => onChange('answer')}
        className={`
          flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md
          transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
          ${mode === 'answer'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-700 hover:bg-gray-100'
          }
        `}
        aria-pressed={mode === 'answer'}
      >
        <MessageSquare className="w-4 h-4" />
        Answer
      </button>

      <button
        onClick={() => onChange('draft')}
        className={`
          flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md
          transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
          ${mode === 'draft'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-700 hover:bg-gray-100'
          }
        `}
        aria-pressed={mode === 'draft'}
      >
        <FileText className="w-4 h-4" />
        Draft
      </button>
    </div>
  );
}

export default ModeToggle;
