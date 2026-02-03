/**
 * InlineError Component
 * @version 1.0.0
 * Compact inline error message display
 */

import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface InlineErrorProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function InlineError({ message, onDismiss, className = '' }: InlineErrorProps) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/30 ${className}`}
      role="alert"
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-0.5 hover:bg-destructive/20 rounded transition-colors"
          aria-label="Dismiss error"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default InlineError;
