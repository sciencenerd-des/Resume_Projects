import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResponseContent } from '@/components/chat/ResponseContent';
import type { Citation } from '@/types';

const mockCitations: Citation[] = [
  { index: 1, chunk_id: 'abc12345', document_id: 'doc1', verdict: 'supported' },
  { index: 2, chunk_id: 'def67890', document_id: 'doc2', verdict: 'weak' },
  { index: 3, chunk_id: 'aaaa1111', document_id: 'doc3', verdict: 'contradicted' },
];

describe('ResponseContent', () => {
  describe('rendering', () => {
    test('renders plain text content', () => {
      render(<ResponseContent content="Hello, this is a response." />);
      expect(screen.getByText('Hello, this is a response.')).toBeInTheDocument();
    });

    test('renders container with leading-relaxed class', () => {
      const { container } = render(<ResponseContent content="Test" />);
      expect(container.querySelector('.leading-relaxed')).toBeInTheDocument();
    });

    test('renders empty content without errors', () => {
      const { container } = render(<ResponseContent content="" />);
      expect(container.querySelector('.leading-relaxed')).toBeInTheDocument();
    });
  });

  describe('inline markdown', () => {
    test('renders bold text with strong tag', () => {
      render(<ResponseContent content="This is **bold** text" />);
      const boldElement = screen.getByText('bold');
      expect(boldElement.tagName).toBe('STRONG');
    });

    test('renders italic text with em tag', () => {
      render(<ResponseContent content="This is *italic* text" />);
      const italicElement = screen.getByText('italic');
      expect(italicElement.tagName).toBe('EM');
    });

    test('renders inline code with code tag', () => {
      render(<ResponseContent content="Use the `useState` hook" />);
      const codeElement = screen.getByText('useState');
      expect(codeElement.tagName).toBe('CODE');
    });

    test('inline code has styling classes', () => {
      render(<ResponseContent content="Use `code` here" />);
      const codeElement = screen.getByText('code');
      expect(codeElement).toHaveClass('bg-muted', 'rounded');
    });

    test('handles newline characters in content', () => {
      // Component uses dangerouslySetInnerHTML which processes \n to <br />
      // In test env, just verify the content renders without error
      render(<ResponseContent content="Line 1\nLine 2" />);
      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    });
  });

  describe('citations with [cite:hash] pattern', () => {
    test('renders citation button for [cite:abc12345]', () => {
      render(
        <ResponseContent
          content="This is a fact [cite:abc12345]"
          citations={mockCitations}
        />
      );
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    });

    test('renders multiple citations', () => {
      render(
        <ResponseContent
          content="Fact one [cite:abc12345] and fact two [cite:def67890]"
          citations={mockCitations}
        />
      );
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    });

    test('citation button is styled as circle', () => {
      render(
        <ResponseContent
          content="Content [cite:abc12345]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button', { name: '1' });
      expect(citation).toHaveClass('rounded-full');
    });

    test('citation button has hover effect', () => {
      render(
        <ResponseContent
          content="Content [cite:abc12345]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button', { name: '1' });
      expect(citation).toHaveClass('cursor-pointer');
    });

    test('calls onCitationClick with chunk ID when citation clicked', () => {
      let clickedChunkId: string | null = null;
      render(
        <ResponseContent
          content="Fact [cite:abc12345]"
          citations={mockCitations}
          onCitationClick={(id) => {
            clickedChunkId = id;
          }}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '1' }));
      expect(clickedChunkId).toBe('abc12345');
    });

    test('citation has title attribute with index info', () => {
      render(
        <ResponseContent
          content="Content [cite:abc12345]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button', { name: '1' });
      expect(citation).toHaveAttribute('title');
      expect(citation.getAttribute('title')).toContain('[1]');
    });
  });

  describe('verdict-based styling', () => {
    test('supported verdict has green background', () => {
      render(
        <ResponseContent
          content="Text [cite:abc12345]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button', { name: '1' });
      expect(citation).toHaveClass('bg-green-500');
    });

    test('weak verdict has amber background', () => {
      render(
        <ResponseContent
          content="Text [cite:def67890]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button', { name: '1' });
      expect(citation).toHaveClass('bg-amber-500');
    });

    test('contradicted verdict has red background', () => {
      render(
        <ResponseContent
          content="Text [cite:aaaa1111]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button', { name: '1' });
      expect(citation).toHaveClass('bg-red-500');
    });

    test('unknown citation defaults to supported styling', () => {
      render(
        <ResponseContent
          content="Text [cite:eeee9999]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button', { name: '1' });
      // When citation not found in metadata, defaults to supported
      expect(citation).toHaveClass('bg-green-500');
    });
  });

  describe('text with citations mixed in', () => {
    test('renders text before and after citation', () => {
      render(
        <ResponseContent
          content="Before [cite:abc12345] after"
          citations={mockCitations}
        />
      );
      expect(screen.getByText(/Before/)).toBeInTheDocument();
      expect(screen.getByText(/after/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    });

    test('renders multiple text segments with citations', () => {
      render(
        <ResponseContent
          content="First [cite:abc12345] second [cite:def67890] third"
          citations={mockCitations}
        />
      );
      expect(screen.getByText(/First/)).toBeInTheDocument();
      expect(screen.getByText(/second/)).toBeInTheDocument();
      expect(screen.getByText(/third/)).toBeInTheDocument();
    });
  });

  describe('no citations provided', () => {
    test('renders citation button without citations array', () => {
      render(<ResponseContent content="Text [cite:abc12345]" />);
      // Still renders the button but with default behavior
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    });

    test('clicking citation without onCitationClick does not crash', () => {
      render(
        <ResponseContent
          content="Text [cite:abc12345]"
          citations={mockCitations}
        />
      );
      // Should not throw
      fireEvent.click(screen.getByRole('button', { name: '1' }));
    });
  });

  describe('styling', () => {
    test('citation buttons are white text', () => {
      render(
        <ResponseContent
          content="Text [cite:abc12345]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button', { name: '1' });
      expect(citation).toHaveClass('text-white');
    });

    test('citation buttons have fixed dimensions', () => {
      render(
        <ResponseContent
          content="Text [cite:abc12345]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button', { name: '1' });
      expect(citation).toHaveClass('w-5', 'h-5');
    });

    test('citation buttons are inline-flex', () => {
      render(
        <ResponseContent
          content="Text [cite:abc12345]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button', { name: '1' });
      expect(citation).toHaveClass('inline-flex');
    });
  });

  describe('adjacent citations', () => {
    test('handles adjacent citations correctly', () => {
      render(
        <ResponseContent
          content="Fact [cite:abc12345][cite:def67890]"
          citations={mockCitations}
        />
      );
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    });
  });
});
