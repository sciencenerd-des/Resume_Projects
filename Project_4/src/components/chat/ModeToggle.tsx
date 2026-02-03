import React from 'react';
import { MessageSquare, PenLine } from 'lucide-react';

/**
 * ModeToggle - Toggle between Answer and Draft modes
 * ChatGPT-style minimal toggle
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
      className={`inline-flex rounded-lg bg-muted p-1 ${className}`}
      role="group"
      aria-label="Query mode selection"
    >
      <button
        onClick={() => onChange('answer')}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md
          transition-all duration-200
          ${mode === 'answer'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
          }
        `}
        aria-pressed={mode === 'answer'}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Answer
      </button>

      <button
        onClick={() => onChange('draft')}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md
          transition-all duration-200
          ${mode === 'draft'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
          }
        `}
        aria-pressed={mode === 'draft'}
      >
        <PenLine className="w-3.5 h-3.5" />
        Draft
      </button>
    </div>
  );
}

export default ModeToggle;
