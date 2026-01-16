/**
 * ChatInterface Component
 * @version 1.0.0
 * Main chat container with messages, input, and optional ledger panel
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Shield, PanelRightOpen, PanelRightClose, AlertCircle } from 'lucide-react';
import { MessageList } from './MessageList';
import { QueryInput } from './QueryInput';
import { ModeToggle, QueryMode } from './ModeToggle';
import { EvidenceLedgerPanel } from '../evidence/EvidenceLedgerPanel';
import { Button } from '@/components/ui/button';
import type { Message, EvidenceLedger, LedgerEntry } from '../../types';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (query: string, mode: QueryMode) => Promise<void>;
  isStreaming?: boolean;
  streamingContent?: string;
  ledger?: EvidenceLedger | null;
  isLedgerLoading?: boolean;
  error?: string | null;
  onClearError?: () => void;
  onCitationClick?: (chunkId: string) => void;
  showLedger?: boolean;
  initialMode?: QueryMode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isStreaming = false,
  streamingContent,
  ledger,
  isLedgerLoading = false,
  error,
  onClearError,
  onCitationClick,
  showLedger = true,
  initialMode = 'answer',
  placeholder,
  disabled = false,
  className = '',
}: ChatInterfaceProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<QueryMode>(initialMode);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  // Auto-open ledger when entries appear
  useEffect(() => {
    if (ledger && ledger.entries.length > 0 && !isLedgerOpen) {
      setIsLedgerOpen(true);
    }
  }, [ledger]);

  const handleSubmit = useCallback(async () => {
    if (!query.trim() || isStreaming || disabled) return;

    const trimmedQuery = query.trim();
    setQuery('');

    try {
      await onSendMessage(trimmedQuery, mode);
    } catch (err) {
      // Error handling is done by parent component
      console.error('Failed to send message:', err);
    }
  }, [query, mode, isStreaming, disabled, onSendMessage]);

  const handleCitationClick = (chunkId: string) => {
    // Open ledger panel when citation is clicked
    setIsLedgerOpen(true);
    onCitationClick?.(chunkId);
  };

  const defaultPlaceholder = mode === 'answer'
    ? 'Ask a question about your documents...'
    : 'Describe what you want to draft...';

  return (
    <div className={`flex h-full ${className}`}>
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <div className="flex items-center gap-3">
            <ModeToggle mode={mode} onChange={setMode} />
          </div>

          <div className="flex items-center gap-2">
            {showLedger && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLedgerOpen(!isLedgerOpen)}
                icon={isLedgerOpen ? (
                  <PanelRightClose className="w-4 h-4" />
                ) : (
                  <PanelRightOpen className="w-4 h-4" />
                )}
              >
                {isLedgerOpen ? 'Hide' : 'Show'} Ledger
                {ledger && ledger.entries.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                    {ledger.entries.length}
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-4 mt-3 flex items-center justify-between gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
            {onClearError && (
              <button
                onClick={onClearError}
                className="text-destructive/70 hover:text-destructive text-xs font-medium px-2 py-1 rounded hover:bg-destructive/10"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        {/* Messages Area */}
        {messages.length === 0 && !isStreaming ? (
          <WelcomeState mode={mode} />
        ) : (
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            onCitationClick={handleCitationClick}
            className="flex-1"
          />
        )}

        {/* Input Area */}
        <QueryInput
          value={query}
          onChange={setQuery}
          onSubmit={handleSubmit}
          disabled={isStreaming || disabled}
          placeholder={placeholder || defaultPlaceholder}
        />
      </div>

      {/* Evidence Ledger Panel */}
      {showLedger && isLedgerOpen && (
        <EvidenceLedgerPanel
          ledger={ledger || null}
          isLoading={isLedgerLoading}
          onChunkClick={onCitationClick}
          className="w-80 flex-shrink-0"
        />
      )}
    </div>
  );
}

function WelcomeState({ mode }: { mode: QueryMode }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <Shield className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {mode === 'answer' ? 'Ask Questions with Confidence' : 'Draft with Evidence'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {mode === 'answer'
            ? 'Every answer is backed by evidence from your documents. Citations link directly to source material.'
            : 'Generate comprehensive content with automatic fact-checking. Each claim is verified against your knowledge base.'}
        </p>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground/70">
          <FeatureIndicator label="Evidence verified" />
          <FeatureIndicator label="Source linked" />
          <FeatureIndicator label="Risk flagged" />
        </div>
      </div>
    </div>
  );
}

function FeatureIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-verdict-supported" />
      {label}
    </div>
  );
}

export default ChatInterface;
