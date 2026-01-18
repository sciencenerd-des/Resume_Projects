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
  { index: 4, chunk_id: 'bbbb2222', document_id: 'doc4', verdict: 'expert_verified' },
  { index: 5, chunk_id: 'cccc3333', document_id: 'doc5', verdict: 'conflict_flagged' },
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
      // Citation button shows the chunk hash
      expect(screen.getByText('abc12345')).toBeInTheDocument();
    });

    test('renders multiple citations', () => {
      render(
        <ResponseContent
          content="Fact one [cite:abc12345] and fact two [cite:def67890]"
          citations={mockCitations}
        />
      );
      expect(screen.getByText('abc12345')).toBeInTheDocument();
      expect(screen.getByText('def67890')).toBeInTheDocument();
    });

    test('citation button is styled with rounded corners', () => {
      render(
        <ResponseContent
          content="Content [cite:abc12345]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button');
      expect(citation).toHaveClass('rounded');
    });

    test('citation button has hover effect', () => {
      render(
        <ResponseContent
          content="Content [cite:abc12345]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button');
      expect(citation).toHaveClass('cursor-pointer');
    });

    test('calls onCitationClick with source when citation clicked', () => {
      let clickedSource: string | undefined;
      render(
        <ResponseContent
          content="Fact [cite:abc12345]"
          citations={mockCitations}
          onCitationClick={(source) => {
            clickedSource = source;
          }}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(clickedSource).toBe('abc12345');
    });

    test('citation has title attribute with source info', () => {
      render(
        <ResponseContent
          content="Content [cite:abc12345]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button');
      expect(citation).toHaveAttribute('title');
      expect(citation.getAttribute('title')).toContain('Document source');
    });
  });

  describe('document citation styling', () => {
    test('document citation has emerald background', () => {
      render(
        <ResponseContent
          content="Text [cite:abc12345]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button');
      expect(citation).toHaveClass('bg-emerald-600');
    });

    test('document citations all use default emerald color', () => {
      render(
        <ResponseContent
          content="Text [cite:abc12345] and [cite:def67890]"
          citations={mockCitations}
        />
      );
      const citations = screen.getAllByRole('button');
      citations.forEach(citation => {
        expect(citation).toHaveClass('bg-emerald-600');
      });
    });
  });

  describe('LLM citation styling', () => {
    test('writer LLM citation has blue background', () => {
      render(
        <ResponseContent
          content="Text [llm:writer]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button');
      expect(citation).toHaveClass('bg-blue-500');
    });

    test('skeptic LLM citation has purple background', () => {
      render(
        <ResponseContent
          content="Text [llm:skeptic]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button');
      expect(citation).toHaveClass('bg-purple-500');
    });

    test('judge LLM citation has indigo background', () => {
      render(
        <ResponseContent
          content="Text [llm:judge]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button');
      expect(citation).toHaveClass('bg-indigo-600');
    });
  });

  describe('LLM citation labels', () => {
    test('writer shows W label', () => {
      render(<ResponseContent content="Text [llm:writer]" />);
      expect(screen.getByText('W')).toBeInTheDocument();
    });

    test('skeptic shows S label', () => {
      render(<ResponseContent content="Text [llm:skeptic]" />);
      expect(screen.getByText('S')).toBeInTheDocument();
    });

    test('judge shows J label', () => {
      render(<ResponseContent content="Text [llm:judge]" />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    test('LLM citation has descriptive tooltip', () => {
      render(<ResponseContent content="Text [llm:writer]" />);
      const citation = screen.getByRole('button');
      expect(citation.getAttribute('title')).toContain('Writer');
    });
  });

  describe('mixed citations', () => {
    test('renders both document and LLM citations together', () => {
      render(
        <ResponseContent
          content="Fact [cite:abc12345] was verified by [llm:judge]"
          citations={mockCitations}
        />
      );
      const citations = screen.getAllByRole('button');
      expect(citations.length).toBe(2);
      expect(citations[0]).toHaveClass('bg-emerald-600'); // document
      expect(citations[1]).toHaveClass('bg-indigo-600'); // judge
    });

    test('renders all three LLM types', () => {
      render(
        <ResponseContent
          content="Written [llm:writer], challenged [llm:skeptic], verified [llm:judge]"
          citations={mockCitations}
        />
      );
      expect(screen.getByText('W')).toBeInTheDocument();
      expect(screen.getByText('S')).toBeInTheDocument();
      expect(screen.getByText('J')).toBeInTheDocument();
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
      expect(screen.getByText('abc12345')).toBeInTheDocument();
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
      // Still renders the button with the chunk hash
      expect(screen.getByText('abc12345')).toBeInTheDocument();
    });

    test('clicking citation without onCitationClick does not crash', () => {
      render(
        <ResponseContent
          content="Text [cite:abc12345]"
          citations={mockCitations}
        />
      );
      // Should not throw
      fireEvent.click(screen.getByRole('button'));
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
      const citation = screen.getByRole('button');
      expect(citation).toHaveClass('text-white');
    });

    test('citation buttons have minimum width and height', () => {
      render(
        <ResponseContent
          content="Text [cite:abc12345]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button');
      expect(citation).toHaveClass('min-w-5', 'h-5');
    });

    test('citation buttons are inline-flex', () => {
      render(
        <ResponseContent
          content="Text [cite:abc12345]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button');
      expect(citation).toHaveClass('inline-flex');
    });

    test('citation buttons have font-semibold', () => {
      render(
        <ResponseContent
          content="Text [cite:abc12345]"
          citations={mockCitations}
        />
      );
      const citation = screen.getByRole('button');
      expect(citation).toHaveClass('font-semibold');
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
      expect(screen.getByText('abc12345')).toBeInTheDocument();
      expect(screen.getByText('def67890')).toBeInTheDocument();
    });
  });
});
