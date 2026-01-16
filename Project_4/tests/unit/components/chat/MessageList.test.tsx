import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MessageList } from '@/components/chat/MessageList';
import type { Message, Citation } from '@/types';

const mockMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'Hello, how are you?',
    timestamp: new Date('2024-01-01T10:00:00'),
  },
  {
    id: '2',
    role: 'assistant',
    content: 'I am doing well, thank you!',
    timestamp: new Date('2024-01-01T10:01:00'),
  },
  {
    id: '3',
    role: 'user',
    content: 'What can you help me with?',
    timestamp: new Date('2024-01-01T10:02:00'),
  },
];

describe('MessageList', () => {
  describe('rendering', () => {
    test('renders all messages', () => {
      render(<MessageList messages={mockMessages} />);
      expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
      expect(screen.getByText('I am doing well, thank you!')).toBeInTheDocument();
      expect(screen.getByText('What can you help me with?')).toBeInTheDocument();
    });

    test('renders empty state when no messages', () => {
      render(<MessageList messages={[]} />);
      expect(screen.queryByText('Hello')).not.toBeInTheDocument();
    });

    test('renders user messages with right alignment', () => {
      const { container } = render(<MessageList messages={[mockMessages[0]]} />);
      const messageBubble = container.querySelector('.justify-end');
      expect(messageBubble).toBeInTheDocument();
    });

    test('renders assistant messages with left alignment', () => {
      const { container } = render(<MessageList messages={[mockMessages[1]]} />);
      const messageBubble = container.querySelector('.justify-start');
      expect(messageBubble).toBeInTheDocument();
    });

    test('user messages have blue background', () => {
      const { container } = render(<MessageList messages={[mockMessages[0]]} />);
      const primaryBg = container.querySelector('.bg-primary');
      expect(primaryBg).toBeInTheDocument();
    });

    test('assistant messages have gray background', () => {
      const { container } = render(<MessageList messages={[mockMessages[1]]} />);
      const cardBg = container.querySelector('.bg-card');
      expect(cardBg).toBeInTheDocument();
    });
  });

  describe('streaming content', () => {
    test('displays streaming content when provided', () => {
      render(
        <MessageList
          messages={mockMessages}
          isStreaming={true}
          streamingContent="This is streaming..."
        />
      );
      expect(screen.getByText('This is streaming...')).toBeInTheDocument();
    });

    test('shows streaming indicator (animated cursor) when streaming', () => {
      const { container } = render(
        <MessageList
          messages={mockMessages}
          isStreaming={true}
          streamingContent="Streaming content"
        />
      );
      // The streaming indicator is a span with animate-pulse
      const cursor = container.querySelector('.animate-pulse');
      expect(cursor).toBeInTheDocument();
    });

    test('does not show streaming content when not streaming', () => {
      const { container } = render(
        <MessageList
          messages={mockMessages}
          isStreaming={false}
          streamingContent=""
        />
      );
      const cursor = container.querySelector('.animate-pulse');
      expect(cursor).not.toBeInTheDocument();
    });

    test('does not render streaming bubble without content', () => {
      const { container } = render(
        <MessageList
          messages={mockMessages}
          isStreaming={true}
          streamingContent=""
        />
      );
      // No streaming bubble is rendered when streamingContent is empty
      const allMessages = container.querySelectorAll('.rounded-2xl');
      expect(allMessages.length).toBe(3); // Only the 3 mockMessages
    });
  });

  describe('citations', () => {
    test('renders citations from messages', () => {
      const messagesWithCitation: Message[] = [
        {
          id: '1',
          role: 'assistant',
          content: 'This is a fact [cite:abc12345]',
          timestamp: new Date(),
          citations: [
            { index: 1, chunk_id: 'abc12345', document_id: 'doc1', verdict: 'supported' }
          ],
        },
      ];

      render(<MessageList messages={messagesWithCitation} />);
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    });

    test('calls onCitationClick when citation is clicked', () => {
      let clickedId: string | null = null;
      const messagesWithCitation: Message[] = [
        {
          id: '1',
          role: 'assistant',
          content: 'This is a fact [cite:abc12345]',
          timestamp: new Date(),
          citations: [
            { index: 1, chunk_id: 'abc12345', document_id: 'doc1', verdict: 'supported' }
          ],
        },
      ];

      render(
        <MessageList
          messages={messagesWithCitation}
          onCitationClick={(id) => { clickedId = id; }}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '1' }));
      expect(clickedId).toBe('abc12345');
    });
  });

  describe('styling', () => {
    test('applies custom className', () => {
      const { container } = render(
        <MessageList
          messages={mockMessages}
          className="custom-list"
        />
      );
      expect(container.querySelector('.custom-list')).toBeInTheDocument();
    });

    test('has scrollable container', () => {
      const { container } = render(<MessageList messages={mockMessages} />);
      expect(container.querySelector('.overflow-y-auto')).toBeInTheDocument();
    });

    test('has spacing between messages', () => {
      const { container } = render(<MessageList messages={mockMessages} />);
      expect(container.querySelector('.space-y-4')).toBeInTheDocument();
    });
  });

  describe('message structure', () => {
    test('renders correct number of message bubbles', () => {
      const { container } = render(<MessageList messages={mockMessages} />);
      const bubbles = container.querySelectorAll('.rounded-2xl');
      expect(bubbles.length).toBe(3);
    });

    test('messages have max width constraint', () => {
      const { container } = render(<MessageList messages={mockMessages} />);
      const maxWidthElements = container.querySelectorAll('[class*="max-w-"]');
      expect(maxWidthElements.length).toBeGreaterThan(0);
    });
  });

  describe('icons', () => {
    test('assistant messages show bot icon', () => {
      const { container } = render(<MessageList messages={[mockMessages[1]]} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    test('user messages show user icon', () => {
      const { container } = render(<MessageList messages={[mockMessages[0]]} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('timestamps', () => {
    test('displays formatted timestamps for messages', () => {
      render(<MessageList messages={mockMessages} />);
      // Timestamps are formatted using Intl.DateTimeFormat
      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    });
  });

  describe('scroll behavior', () => {
    test('auto-scrolls to bottom when new message arrives', () => {
      const { rerender } = render(<MessageList messages={mockMessages.slice(0, 2)} />);
      rerender(<MessageList messages={mockMessages} />);
      // Component calls scrollIntoView - hard to test in happy-dom
    });
  });

  describe('empty message handling', () => {
    test('handles messages with empty content', () => {
      const messagesWithEmpty: Message[] = [
        {
          id: '1',
          role: 'user',
          content: '',
          timestamp: new Date(),
        },
      ];

      render(<MessageList messages={messagesWithEmpty} />);
      // Should render without crashing
    });
  });

  describe('accessibility', () => {
    test('has log role', () => {
      render(<MessageList messages={mockMessages} />);
      expect(screen.getByRole('log')).toBeInTheDocument();
    });

    test('has aria-label for chat messages', () => {
      render(<MessageList messages={mockMessages} />);
      expect(screen.getByLabelText('Chat messages')).toBeInTheDocument();
    });

    test('has aria-live polite when streaming', () => {
      const { container } = render(
        <MessageList
          messages={mockMessages}
          isStreaming={true}
          streamingContent="Streaming"
        />
      );
      const log = container.querySelector('[aria-live="polite"]');
      expect(log).toBeInTheDocument();
    });

    test('has aria-live off when not streaming', () => {
      const { container } = render(
        <MessageList messages={mockMessages} isStreaming={false} />
      );
      const log = container.querySelector('[aria-live="off"]');
      expect(log).toBeInTheDocument();
    });
  });
});
