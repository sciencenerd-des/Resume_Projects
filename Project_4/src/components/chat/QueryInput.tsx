import React, { useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';

/**
 * QueryInput - ChatGPT-style input component
 * Centered, auto-resizing textarea with clean design
 */
interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  isLoading?: boolean;
}

export function QueryInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Message VerityDraft...',
  isLoading = false,
}: QueryInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without shift submits the query
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSubmit();
      }
    }
  };

  const handleSubmit = () => {
    if (!disabled && value.trim()) {
      onSubmit();
    }
  };

  const canSubmit = !disabled && value.trim().length > 0;

  return (
    <div className="border-t border-border bg-background">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-muted/30 shadow-sm focus-within:border-primary/50 focus-within:shadow-md transition-all">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="
              flex-1 resize-none bg-transparent text-foreground
              pl-4 pr-2 py-3.5 text-sm
              focus:outline-none
              disabled:text-muted-foreground disabled:cursor-not-allowed
              placeholder:text-muted-foreground/60
              min-h-[48px] max-h-[200px]
            "
            aria-label="Message input"
          />

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`
              flex-shrink-0 mr-2 mb-2
              w-8 h-8 rounded-lg
              flex items-center justify-center
              transition-all duration-200
              ${canSubmit
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
              }
            `}
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Helper text */}
        <p className="text-[11px] text-muted-foreground/60 text-center mt-2">
          VerityDraft verifies claims against your documents. Press Enter to send, Shift+Enter for new line.
        </p>
      </div>
    </div>
  );
}

export default QueryInput;
