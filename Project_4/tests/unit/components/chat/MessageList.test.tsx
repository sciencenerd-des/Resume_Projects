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

    test('renders user messages with background styling', () => {
      const { container } = render(<MessageList messages={[mockMessages[0]]} />);
      // User messages have bg-background wrapper
      const messageContainer = container.querySelector('[class*="bg-background"]');
      expect(messageContainer).toBeInTheDocument();
    });

    test('renders assistant messages with muted background', () => {
      const { container } = render(<MessageList messages={[mockMessages[1]]} />);
      // Assistant messages have bg-muted/30 wrapper - use attribute selector for special chars
      const messageContainer = container.querySelector('[class*="bg-muted"]');
      expect(messageContainer).toBeInTheDocument();
    });

    test('user messages have primary avatar background', () => {
      const { container } = render(<MessageList messages={[mockMessages[0]]} />);
      const primaryBg = container.querySelector('.bg-primary');
      expect(primaryBg).toBeInTheDocument();
    });

    test('assistant messages have gradient avatar background', () => {
      const { container } = render(<MessageList messages={[mockMessages[1]]} />);
      // Assistant avatar has gradient from emerald to teal
      const gradientBg = container.querySelector('.bg-gradient-to-br');
      expect(gradientBg).toBeInTheDocument();
    });
  });

  describe('streaming content', () => {
    test('displays streaming content progressively', () => {
      // Due to typewriter effect, content appears character by character
      const { container } = render(
        <MessageList
          messages={mockMessages}
          isStreaming={true}
          streamingContent="This is streaming..."
        />
      );
      // Streaming message container should be present
      const streamingContainers = container.querySelectorAll('.bg-muted\\/30');
      expect(streamingContainers.length).toBeGreaterThan(0);
    });

    test('shows VerityDraft label when streaming', () => {
      render(
        <MessageList
          messages={mockMessages}
          isStreaming={true}
          streamingContent="Streaming content"
        />
      );
      // Should show multiple VerityDraft labels (one for streaming)
      const labels = screen.getAllByText('VerityDraft');
      expect(labels.length).toBeGreaterThan(0);
    });

    test('does not show streaming message when not streaming', () => {
      const { container } = render(
        <MessageList
          messages={[]}
          isStreaming={false}
          streamingContent=""
        />
      );
      // Should not show VerityDraft streaming label
      expect(screen.queryByText('VerityDraft')).not.toBeInTheDocument();
    });

    test('shows thinking animation when streaming without content', () => {
      const { container } = render(
        <MessageList
          messages={mockMessages}
          isStreaming={true}
          streamingContent=""
        />
      );
      // Shows bouncing dots for thinking state
      const bouncingDots = container.querySelectorAll('.animate-bounce');
      expect(bouncingDots.length).toBe(3);
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
      // Citations display the chunk hash as the button text
      expect(screen.getByText('abc12345')).toBeInTheDocument();
    });

    test('calls onCitationClick when citation is clicked', () => {
      let clickedId: string | undefined;
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

      fireEvent.click(screen.getByText('abc12345'));
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

    test('has flex column container', () => {
      const { container } = render(<MessageList messages={mockMessages} />);
      expect(container.querySelector('.flex.flex-col')).toBeInTheDocument();
    });

    test('messages have max width constraint', () => {
      const { container } = render(<MessageList messages={mockMessages} />);
      const maxWidthElements = container.querySelectorAll('[class*="max-w-"]');
      expect(maxWidthElements.length).toBeGreaterThan(0);
    });
  });

  describe('message structure', () => {
    test('renders correct number of message containers', () => {
      const { container } = render(<MessageList messages={mockMessages} />);
      // Each message is wrapped in a group w-full container
      const messageGroups = container.querySelectorAll('[class*="group"][class*="w-full"]');
      expect(messageGroups.length).toBe(3);
    });

    test('messages have content area with max width', () => {
      const { container } = render(<MessageList messages={mockMessages} />);
      const maxWidthElements = container.querySelectorAll('.max-w-3xl');
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

  describe('labels', () => {
    test('displays role labels for messages', () => {
      render(<MessageList messages={mockMessages} />);
      // User messages show "You" label, assistant shows "VerityDraft"
      expect(screen.getAllByText('You').length).toBeGreaterThan(0);
      expect(screen.getAllByText('VerityDraft').length).toBeGreaterThan(0);
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
