import React, { useRef, useEffect, useState } from 'react';
import { User, Bot, Copy, Check, RefreshCw, ShieldCheck, AlertTriangle, Sparkles } from 'lucide-react';
import { ResponseContent } from './ResponseContent';
import type { Message, Citation } from '../../types';

interface MessageListProps {
  messages: Message[];
  isStreaming?: boolean;
  streamingContent?: string;
  onCitationClick?: (chunkId: string) => void;
  onRegenerate?: () => void;
  className?: string;
}

export function MessageList({
  messages,
  isStreaming = false,
  streamingContent,
  onCitationClick,
  onRegenerate,
  className = '',
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  return (
    <div
      className={`flex flex-col ${className}`}
      role="log"
      aria-label="Chat messages"
      aria-live={isStreaming ? 'polite' : 'off'}
    >
      {messages.map((message, index) => (
        <ChatMessage
          key={message.id}
          message={message}
          onCitationClick={onCitationClick}
          onRegenerate={onRegenerate}
          isLast={index === messages.length - 1 && !isStreaming}
        />
      ))}

      {/* Streaming message with typewriter effect */}
      {isStreaming && (
        <StreamingMessage
          content={streamingContent || ''}
          onCitationClick={onCitationClick}
        />
      )}

      <div ref={bottomRef} className="h-4" />
    </div>
  );
}

interface ChatMessageProps {
  message: Message;
  onCitationClick?: (chunkId: string) => void;
  onRegenerate?: () => void;
  isLast?: boolean;
}

function ChatMessage({ message, onCitationClick, onRegenerate, isLast }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div
      className={`
        group w-full
        ${isUser ? 'bg-background' : 'bg-muted/30'}
      `}
    >
      <div className="max-w-3xl mx-auto px-4 py-6 md:px-6">
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center
                ${isUser
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                }
              `}
            >
              {isUser ? (
                <User className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Role label */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {isUser ? 'You' : 'VerityDraft'}
              </span>
              {!isUser && message.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </span>
              )}
              {!isUser && message.isPartial && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3 h-3" />
                  Incomplete
                </span>
              )}
            </div>

            {/* Message content */}
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
              <ResponseContent
                content={message.content}
                citations={message.citations}
                onCitationClick={onCitationClick}
              />
            </div>

            {/* Action buttons - show on hover for assistant messages */}
            {!isUser && (
              <div className="flex items-center gap-1 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </button>
                {isLast && onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                    title="Regenerate response"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StreamingMessageProps {
  content: string;
  onCitationClick?: (chunkId: string) => void;
}

function StreamingMessage({ content, onCitationClick }: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);

  // Typewriter effect - reveal content character by character
  useEffect(() => {
    if (content.length === 0) {
      setDisplayedContent('');
      return;
    }

    // If content is longer than displayed, animate the new characters
    if (content.length > displayedContent.length) {
      const timeout = setTimeout(() => {
        // Add multiple characters at once for faster streaming feel
        const charsToAdd = Math.min(3, content.length - displayedContent.length);
        setDisplayedContent(content.slice(0, displayedContent.length + charsToAdd));
      }, 15); // Fast typing speed
      return () => clearTimeout(timeout);
    }
  }, [content, displayedContent]);

  // Blinking cursor
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  // Show thinking state if no content yet
  if (!content) {
    return (
      <div className="w-full bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 py-6 md:px-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <span className="text-sm font-semibold text-foreground">VerityDraft</span>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-muted/30">
      <div className="max-w-3xl mx-auto px-4 py-6 md:px-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <span className="text-sm font-semibold text-foreground">VerityDraft</span>
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
              <ResponseContent
                content={displayedContent}
                onCitationClick={onCitationClick}
              />
              {/* Blinking cursor */}
              <span
                className={`
                  inline-block w-2 h-4 ml-0.5 bg-foreground align-middle
                  ${cursorVisible ? 'opacity-100' : 'opacity-0'}
                `}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MessageList;
