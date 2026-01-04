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
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-900'
          }
        `}
      >
        {/* Avatar for assistant messages */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">VerityDraft</span>
          </div>
        )}

        {/* Message content */}
        <div
          className={`
            prose prose-sm max-w-none leading-relaxed
            ${isUser ? 'text-white' : 'text-gray-800'}
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
              isUser ? 'bg-white/50' : 'bg-blue-600/50'
            }`}
          />
        )}

        {/* Timestamp */}
        <div
          className={`text-xs mt-2 ${
            isUser ? 'text-white/70' : 'text-gray-400'
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
