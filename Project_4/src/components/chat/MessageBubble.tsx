import React from 'react';
import { Bot } from 'lucide-react';
import { Message, Citation } from '../../types';
import { ResponseContent } from './ResponseContent';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onCitationClick?: (chunkId: string) => void;
}

/**
 * Renders a single message bubble with role-based styling
 */
export function MessageBubble({
  message,
  isStreaming = false,
  onCitationClick,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[85%] rounded-2xl px-5 py-3
          ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border text-foreground'
          }
        `}
      >
        {/* Avatar for assistant messages */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">VerityDraft</span>
          </div>
        )}

        {/* Message content */}
        <div
          className={`
            prose prose-sm max-w-none leading-relaxed
            ${isUser ? 'text-primary-foreground' : 'text-foreground'}
          `}
        >
          <ResponseContent
            content={message.content}
            citations={message.citations}
            onCitationClick={onCitationClick}
          />
        </div>

        {/* Streaming indicator */}
        {isStreaming && (
          <span
            className={`inline-block w-2 h-4 ml-1 animate-pulse ${
              isUser ? 'bg-white/50' : 'bg-primary/50'
            }`}
          />
        )}

        {/* Timestamp */}
        <div
          className={`text-xs mt-2 ${
            isUser ? 'text-white/70' : 'text-muted-foreground'
          }`}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
