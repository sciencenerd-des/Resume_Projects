import React, { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * QueryInput - A textarea input component for chat queries
 * with auto-resize and keyboard shortcuts
 */
interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function QueryInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Ask a question about your documents...',
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
      onSubmit();
    }
  };

  const handleSubmit = () => {
    if (!disabled && value.trim()) {
      onSubmit();
    }
  };

  return (
    <div className="relative flex items-end gap-2 p-4 border-t border-border bg-card">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="
          flex-1 resize-none rounded-xl border border-border bg-background text-foreground
          px-4 py-3 text-sm
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
          disabled:bg-muted disabled:text-muted-foreground
          placeholder:text-muted-foreground
        "
        aria-label="Query input"
      />

      <Button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="shrink-0"
      >
        <Send className="w-4 h-4 mr-2" />
        Send
      </Button>
    </div>
  );
}

export default QueryInput;
