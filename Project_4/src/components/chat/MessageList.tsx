import React, { useRef, useEffect } from 'react';
import { User, Bot, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ResponseContent } from './ResponseContent';
import { Spinner } from '../ui/Spinner';
import type { Message, Citation } from '../../types';

interface MessageListProps {
  messages: Message[];
  isStreaming?: boolean;
  streamingContent?: string;
  onCitationClick?: (chunkId: string) => void;
  className?: string;
}

export function MessageList({
  messages,
  isStreaming = false,
  streamingContent,
  onCitationClick,
  className = '',
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  return (
    <div
      className={`p-4 space-y-4 ${className}`}
      role="log"
      aria-label="Chat messages"
      aria-live={isStreaming ? 'polite' : 'off'}
    >
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onCitationClick={onCitationClick}
        />
      ))}

      {isStreaming && streamingContent && (
        <MessageBubble
          message={{
            id: 'streaming',
            role: 'assistant',
            content: streamingContent,
            timestamp: new Date(),
          }}
          isStreaming
          onCitationClick={onCitationClick}
        />
      )}

      <div ref={bottomRef} />
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onCitationClick?: (chunkId: string) => void;
}

function MessageBubble({ message, isStreaming, onCitationClick }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isPartial = message.isPartial;
  const isVerified = message.isVerified;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[80%] rounded-2xl px-4 py-3
          ${isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-foreground border border-border'
          }
          ${isPartial ? 'border-amber-500/50' : ''}
        `}
      >
        <div className="flex items-start gap-3">
          {!isUser && (
            <div
              className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                ${isUser ? 'bg-primary/80' : 'bg-muted border border-border'}
              `}
            >
              {isUser ? (
                <User className="w-4 h-4 text-primary-foreground" />
              ) : (
                <Bot className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="prose prose-sm prose-invert max-w-none">
              <ResponseContent
                content={message.content}
                citations={message.citations}
                onCitationClick={onCitationClick}
              />
            </div>

            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
            )}

            {isPartial && (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-status-warning/30 text-xs text-status-warning">
                <AlertTriangle className="w-3 h-3" />
                <span>Response interrupted - verification incomplete</span>
              </div>
            )}

            {isVerified && !isPartial && (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-verdict-supported/30 text-xs text-verdict-supported">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified by Evidence Ledger</span>
              </div>
            )}
          </div>

          {isUser && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
        </div>

        {!isStreaming && message.timestamp && (
          <div
            className={`
              text-xs mt-2
              ${isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}
            `}
          >
            {formatTime(message.timestamp)}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);
}

export default MessageList;
