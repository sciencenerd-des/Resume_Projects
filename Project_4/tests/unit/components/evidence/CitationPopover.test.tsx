import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CitationPopover } from '@/components/evidence/CitationPopover';
import type { Citation } from '@/types';

const mockCitation: Citation = {
  index: 1,
  chunk_id: 'chunk123',
  document_id: 'doc456',
  verdict: 'supported',
};

describe('CitationPopover', () => {
  const defaultProps = {
    citation: mockCitation,
    documentName: 'Research Paper.pdf',
    evidenceSnippet: 'This is the evidence snippet from the document.',
  };

  describe('trigger', () => {
    test('renders citation trigger', () => {
      render(<CitationPopover {...defaultProps}>[1]</CitationPopover>);
      expect(screen.getByText('[1]')).toBeInTheDocument();
    });

    test('trigger is a span with cursor-pointer', () => {
      render(<CitationPopover {...defaultProps}>[1]</CitationPopover>);
      const trigger = screen.getByText('[1]');
      expect(trigger.tagName).toBe('SPAN');
      expect(trigger).toHaveClass('cursor-pointer');
    });

    test('opens popover on click', () => {
      render(<CitationPopover {...defaultProps}>[1]</CitationPopover>);
      fireEvent.click(screen.getByText('[1]'));
      expect(screen.getByText('Research Paper.pdf')).toBeInTheDocument();
    });

    test('opens popover on mouse enter', () => {
      render(<CitationPopover {...defaultProps}>[1]</CitationPopover>);
      fireEvent.mouseEnter(screen.getByText('[1]'));
      expect(screen.getByText('Research Paper.pdf')).toBeInTheDocument();
    });

    test('closes popover on mouse leave', () => {
      render(<CitationPopover {...defaultProps}>[1]</CitationPopover>);
      const trigger = screen.getByText('[1]');
      fireEvent.mouseEnter(trigger);
      expect(screen.getByText('Research Paper.pdf')).toBeInTheDocument();

      fireEvent.mouseLeave(trigger);
      // Popover should close (element no longer visible)
      expect(screen.queryByText('Research Paper.pdf')).not.toBeInTheDocument();
    });
  });

  describe('popover content', () => {
    test('displays document name', () => {
      render(<CitationPopover {...defaultProps}>[1]</CitationPopover>);
      fireEvent.click(screen.getByText('[1]'));
      expect(screen.getByText('Research Paper.pdf')).toBeInTheDocument();
    });

    test('displays default document name when not provided', () => {
      render(
        <CitationPopover citation={mockCitation} evidenceSnippet="Some snippet">
          [1]
        </CitationPopover>
      );
      fireEvent.click(screen.getByText('[1]'));
      expect(screen.getByText('Source Document')).toBeInTheDocument();
    });

    test('displays snippet in blockquote', () => {
      render(<CitationPopover {...defaultProps}>[1]</CitationPopover>);
      fireEvent.click(screen.getByText('[1]'));
      expect(screen.getByText(/This is the evidence snippet/)).toBeInTheDocument();
    });

    test('shows message when no snippet provided', () => {
      render(
        <CitationPopover citation={mockCitation} documentName="Test.pdf">
          [1]
        </CitationPopover>
      );
      fireEvent.click(screen.getByText('[1]'));
      expect(screen.getByText('No evidence snippet available')).toBeInTheDocument();
    });

    test('displays verdict badge when citation has verdict', () => {
      render(<CitationPopover {...defaultProps}>[1]</CitationPopover>);
      fireEvent.click(screen.getByText('[1]'));
      expect(screen.getByText('Supported')).toBeInTheDocument();
    });

    test('hides verdict badge when citation has no verdict', () => {
      const citationNoVerdict: Citation = {
        index: 1,
        chunk_id: 'chunk123',
        document_id: 'doc456',
      };
      render(
        <CitationPopover citation={citationNoVerdict} documentName="Test.pdf">
          [1]
        </CitationPopover>
      );
      fireEvent.click(screen.getByText('[1]'));
      // VerdictBadge should not be rendered
      expect(screen.queryByText('Supported')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    test('popover has correct base classes', () => {
      const { container } = render(<CitationPopover {...defaultProps}>[1]</CitationPopover>);
      fireEvent.click(screen.getByText('[1]'));
      // The popover container should have fixed positioning - find it in the DOM
      const popoverContainer = container.querySelector('.fixed.z-50');
      expect(popoverContainer).toBeInTheDocument();
    });

    test('header has background styling', () => {
      const { container } = render(<CitationPopover {...defaultProps}>[1]</CitationPopover>);
      fireEvent.click(screen.getByText('[1]'));
      // Header uses semantic muted background
      const header = container.querySelector('[class*="bg-muted"]');
      expect(header).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    test('shows view source button when onViewSource provided', () => {
      render(
        <CitationPopover {...defaultProps} onViewSource={() => {}}>
          [1]
        </CitationPopover>
      );
      fireEvent.click(screen.getByText('[1]'));
      expect(screen.getByText('View in document')).toBeInTheDocument();
    });

    test('hides view source button when onViewSource not provided', () => {
      render(<CitationPopover {...defaultProps}>[1]</CitationPopover>);
      fireEvent.click(screen.getByText('[1]'));
      expect(screen.queryByText('View in document')).not.toBeInTheDocument();
    });

    test('calls onViewSource when button is clicked', () => {
      let clicked = false;
      render(
        <CitationPopover {...defaultProps} onViewSource={() => { clicked = true; }}>
          [1]
        </CitationPopover>
      );
      fireEvent.click(screen.getByText('[1]'));
      fireEvent.click(screen.getByText('View in document'));
      expect(clicked).toBe(true);
    });
  });

  describe('verdict variations', () => {
    test('shows supported verdict', () => {
      render(<CitationPopover {...defaultProps}>[1]</CitationPopover>);
      fireEvent.click(screen.getByText('[1]'));
      expect(screen.getByText('Supported')).toBeInTheDocument();
    });

    test('shows weak verdict', () => {
      const weakCitation: Citation = { ...mockCitation, verdict: 'weak' };
      render(
        <CitationPopover {...defaultProps} citation={weakCitation}>
          [1]
        </CitationPopover>
      );
      fireEvent.click(screen.getByText('[1]'));
      expect(screen.getByText('Weak')).toBeInTheDocument();
    });

    test('shows contradicted verdict', () => {
      const contradictedCitation: Citation = { ...mockCitation, verdict: 'contradicted' };
      render(
        <CitationPopover {...defaultProps} citation={contradictedCitation}>
          [1]
        </CitationPopover>
      );
      fireEvent.click(screen.getByText('[1]'));
      expect(screen.getByText('Contradicted')).toBeInTheDocument();
    });

    test('shows not_found verdict', () => {
      const notFoundCitation: Citation = { ...mockCitation, verdict: 'not_found' };
      render(
        <CitationPopover {...defaultProps} citation={notFoundCitation}>
          [1]
        </CitationPopover>
      );
      fireEvent.click(screen.getByText('[1]'));
      expect(screen.getByText('Not Found')).toBeInTheDocument();
    });
  });

  describe('popover positioning', () => {
    test('popover is positioned with fixed styling', () => {
      const { container } = render(<CitationPopover {...defaultProps}>[1]</CitationPopover>);
      fireEvent.click(screen.getByText('[1]'));
      const popover = container.querySelector('.fixed');
      expect(popover).toBeInTheDocument();
    });
  });

  describe('interaction states', () => {
    test('toggle popover on click', () => {
      render(<CitationPopover {...defaultProps}>[1]</CitationPopover>);
      const trigger = screen.getByText('[1]');

      // First click opens
      fireEvent.click(trigger);
      expect(screen.getByText('Research Paper.pdf')).toBeInTheDocument();

      // Second click closes
      fireEvent.click(trigger);
      expect(screen.queryByText('Research Paper.pdf')).not.toBeInTheDocument();
    });

    test('keeps popover open when hovering over content', () => {
      render(<CitationPopover {...defaultProps}>[1]</CitationPopover>);
      const trigger = screen.getByText('[1]');

      fireEvent.mouseEnter(trigger);
      expect(screen.getByText('Research Paper.pdf')).toBeInTheDocument();

      // Move mouse to popover content - should stay open
      const popover = screen.getByText('Research Paper.pdf').closest('div')?.parentElement;
      if (popover) {
        fireEvent.mouseEnter(popover);
        expect(screen.getByText('Research Paper.pdf')).toBeInTheDocument();
      }
    });
  });

  describe('content rendering', () => {
    test('renders snippet in italics', () => {
      render(<CitationPopover {...defaultProps}>[1]</CitationPopover>);
      fireEvent.click(screen.getByText('[1]'));
      const blockquote = screen.getByText(/This is the evidence snippet/).closest('blockquote');
      expect(blockquote).toHaveClass('italic');
    });

    test('renders file icon in header', () => {
      render(<CitationPopover {...defaultProps}>[1]</CitationPopover>);
      fireEvent.click(screen.getByText('[1]'));
      // FileText icon should be present (SVG element)
      const header = screen.getByText('Research Paper.pdf').closest('div');
      const svg = header?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });
});
