import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MessageBubble } from '@/components/chat/MessageBubble';

const mockUserMessage = {
  id: '1',
  role: 'user' as const,
  content: 'What is the policy?',
  timestamp: new Date('2026-01-03T10:00:00'),
};

// Content needs [cite:hash] pattern for citations to be parsed by ResponseContent
const mockAssistantMessage = {
  id: '2',
  role: 'assistant' as const,
  content: 'The policy states that [cite:abc12345] refunds are allowed.',
  citations: [
    { index: 1, chunk_id: 'abc12345', document_id: 'doc1' },
  ],
  timestamp: new Date('2026-01-03T10:00:01'),
};

describe('MessageBubble', () => {
  describe('user messages', () => {
    test('renders user message with blue background', () => {
      const { container } = render(<MessageBubble message={mockUserMessage} />);
      const bubble = container.querySelector('.bg-blue-600');
      expect(bubble).toBeInTheDocument();
      expect(bubble).toHaveClass('text-white');
    });

    test('aligns user message to right', () => {
      const { container } = render(<MessageBubble message={mockUserMessage} />);
      const wrapper = container.querySelector('.justify-end');
      expect(wrapper).toBeInTheDocument();
    });

    test('does not show avatar for user messages', () => {
      const { container } = render(<MessageBubble message={mockUserMessage} />);
      // Bot avatar uses lucide Bot icon which renders as SVG
      expect(container.querySelector('.lucide-bot')).not.toBeInTheDocument();
    });
  });

  describe('assistant messages', () => {
    test('renders assistant message with white background', () => {
      const { container } = render(<MessageBubble message={mockAssistantMessage} />);
      const bubble = container.querySelector('.bg-white');
      expect(bubble).toBeInTheDocument();
      expect(bubble).toHaveClass('border', 'border-gray-200');
    });

    test('aligns assistant message to left', () => {
      const { container } = render(<MessageBubble message={mockAssistantMessage} />);
      const wrapper = container.querySelector('.justify-start');
      expect(wrapper).toBeInTheDocument();
    });

    test('shows bot avatar for assistant messages', () => {
      const { container } = render(<MessageBubble message={mockAssistantMessage} />);
      // Bot icon from lucide-react renders as SVG with lucide-bot class
      expect(container.querySelector('.lucide-bot')).toBeInTheDocument();
      expect(screen.getByText('VerityDraft')).toBeInTheDocument();
    });
  });

  describe('citations', () => {
    test('renders citations in assistant messages', () => {
      render(<MessageBubble message={mockAssistantMessage} />);
      // ResponseContent renders citations as buttons with the index number
      const citationButton = screen.getByRole('button', { name: '1' });
      expect(citationButton).toBeInTheDocument();
    });

    test('calls onCitationClick when citation is clicked', () => {
      let clickedChunkId = '';
      const handleCitationClick = (chunkId: string) => { clickedChunkId = chunkId; };
      render(
        <MessageBubble
          message={mockAssistantMessage}
          onCitationClick={handleCitationClick}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: '1' }));
      expect(clickedChunkId).toBe('abc12345');
    });
  });

  describe('streaming', () => {
    test('shows streaming indicator when isStreaming is true', () => {
      const { container } = render(
        <MessageBubble
          message={mockAssistantMessage}
          isStreaming={true}
        />
      );
      // Streaming indicator is a span with animate-pulse class
      const indicator = container.querySelector('.animate-pulse');
      expect(indicator).toBeInTheDocument();
    });

    test('does not show streaming indicator when isStreaming is false', () => {
      const { container } = render(
        <MessageBubble
          message={mockAssistantMessage}
          isStreaming={false}
        />
      );
      expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
    });
  });

  describe('timestamps', () => {
    test('displays formatted timestamp', () => {
      render(<MessageBubble message={mockUserMessage} />);
      // toLocaleTimeString formats the time - look for the hour:minute pattern
      // The exact format depends on locale, but we can search for the text containing "10:00"
      const timestampContainer = screen.getByText((content) => {
        return content.includes('10:00') || content.includes('10:') && content.includes('00');
      });
      expect(timestampContainer).toBeInTheDocument();
    });
  });
});
