import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DocumentCard } from '@/components/documents/DocumentCard';
import type { Document } from '@/types';

const mockDocument: Document = {
  id: 'doc1',
  workspace_id: 'ws1',
  filename: 'research-paper.pdf',
  file_type: 'pdf',
  file_size: 2048576, // 2MB
  status: 'ready',
  chunk_count: 45,
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T10:35:00Z',
};

describe('DocumentCard', () => {
  describe('rendering', () => {
    test('renders document name', () => {
      render(<DocumentCard document={mockDocument} />);
      expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
    });

    test('renders chunk count for ready documents', () => {
      render(<DocumentCard document={mockDocument} />);
      expect(screen.getByText('45 chunks')).toBeInTheDocument();
    });

    test('does not render chunk count for processing documents', () => {
      const processingDoc = { ...mockDocument, status: 'processing' as const };
      render(<DocumentCard document={processingDoc} />);
      expect(screen.queryByText('45 chunks')).not.toBeInTheDocument();
    });

    test('renders file icon', () => {
      const { container } = render(<DocumentCard document={mockDocument} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('status indicators', () => {
    test('shows ready status', () => {
      render(<DocumentCard document={mockDocument} />);
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    test('shows processing status', () => {
      const processingDoc = { ...mockDocument, status: 'processing' as const };
      render(<DocumentCard document={processingDoc} />);
      expect(screen.getByText('Processing')).toBeInTheDocument();
    });

    test('shows error status', () => {
      const errorDoc = { ...mockDocument, status: 'error' as const };
      render(<DocumentCard document={errorDoc} />);
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    test('shows uploading status', () => {
      const uploadingDoc = { ...mockDocument, status: 'uploading' as const };
      render(<DocumentCard document={uploadingDoc} />);
      expect(screen.getByText('Uploading')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    test('renders view button when onView provided', () => {
      const { container } = render(
        <DocumentCard document={mockDocument} onView={() => {}} />
      );
      // View button has Eye icon
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    test('calls onView when view button is clicked', () => {
      let viewed = false;
      const { container } = render(
        <DocumentCard
          document={mockDocument}
          onView={() => { viewed = true; }}
        />
      );
      const buttons = container.querySelectorAll('button');
      fireEvent.click(buttons[0]);
      expect(viewed).toBe(true);
    });

    test('renders delete button when onDelete provided', () => {
      const { container } = render(
        <DocumentCard document={mockDocument} onDelete={() => {}} />
      );
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    test('calls onDelete when delete button is clicked', () => {
      let deleted = false;
      const { container } = render(
        <DocumentCard
          document={mockDocument}
          onDelete={() => { deleted = true; }}
        />
      );
      const buttons = container.querySelectorAll('button');
      fireEvent.click(buttons[0]);
      expect(deleted).toBe(true);
    });

    test('renders both buttons when both callbacks provided', () => {
      const { container } = render(
        <DocumentCard
          document={mockDocument}
          onView={() => {}}
          onDelete={() => {}}
        />
      );
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(2);
    });
  });

  describe('styling', () => {
    test('has card styling', () => {
      const { container } = render(<DocumentCard document={mockDocument} />);
      const card = container.firstChild;
      expect(card).toHaveClass('bg-card', 'rounded-lg', 'border');
    });

    test('has flex layout', () => {
      const { container } = render(<DocumentCard document={mockDocument} />);
      const card = container.firstChild;
      expect(card).toHaveClass('flex', 'items-center');
    });

    test('ready status has green color', () => {
      render(<DocumentCard document={mockDocument} />);
      const status = screen.getByText('Ready');
      expect(status).toHaveClass('text-green-600');
    });

    test('error status has red color', () => {
      const errorDoc = { ...mockDocument, status: 'error' as const };
      render(<DocumentCard document={errorDoc} />);
      const status = screen.getByText('Error');
      expect(status).toHaveClass('text-red-600');
    });

    test('processing status has amber color', () => {
      const processingDoc = { ...mockDocument, status: 'processing' as const };
      render(<DocumentCard document={processingDoc} />);
      const status = screen.getByText('Processing');
      expect(status).toHaveClass('text-amber-600');
    });

    test('uploading status has blue color', () => {
      const uploadingDoc = { ...mockDocument, status: 'uploading' as const };
      render(<DocumentCard document={uploadingDoc} />);
      const status = screen.getByText('Uploading');
      expect(status).toHaveClass('text-blue-600');
    });
  });

  describe('layout', () => {
    test('has icon container', () => {
      const { container } = render(<DocumentCard document={mockDocument} />);
      const iconContainer = container.querySelector('.w-10.h-10');
      expect(iconContainer).toBeInTheDocument();
    });

    test('has content area with truncate for filename', () => {
      const { container } = render(<DocumentCard document={mockDocument} />);
      const title = container.querySelector('.truncate');
      expect(title).toBeInTheDocument();
    });

    test('document name is in h3', () => {
      const { container } = render(<DocumentCard document={mockDocument} />);
      const heading = container.querySelector('h3');
      expect(heading).toBeInTheDocument();
      expect(heading?.textContent).toBe('research-paper.pdf');
    });
  });

  describe('icons', () => {
    test('renders file icon in container', () => {
      const { container } = render(<DocumentCard document={mockDocument} />);
      const iconContainer = container.querySelector('.bg-muted.rounded-lg');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer?.querySelector('svg')).toBeInTheDocument();
    });

    test('file icon has correct size', () => {
      const { container } = render(<DocumentCard document={mockDocument} />);
      const icon = container.querySelector('.bg-muted svg');
      expect(icon).toHaveClass('w-5', 'h-5');
    });
  });
});
