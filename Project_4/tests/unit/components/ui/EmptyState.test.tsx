import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { FileText, Plus } from 'lucide-react';

describe('EmptyState', () => {
  describe('rendering', () => {
    test('renders with title', () => {
      render(<EmptyState title="No items found" />);
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    test('renders with description', () => {
      render(
        <EmptyState
          title="No documents"
          description="Upload your first document to get started"
        />
      );
      expect(screen.getByText('Upload your first document to get started')).toBeInTheDocument();
    });

    test('renders with icon', () => {
      const { container } = render(
        <EmptyState
          title="No files"
          icon={FileText}
        />
      );
      // The icon is rendered inside a wrapper
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    test('renders without icon when not provided', () => {
      const { container } = render(<EmptyState title="No items" />);
      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });
  });

  describe('action button', () => {
    test('renders action button when provided', () => {
      render(
        <EmptyState
          title="No documents"
          action={{
            label: 'Upload Document',
            onClick: () => {},
          }}
        />
      );
      expect(screen.getByRole('button', { name: 'Upload Document' })).toBeInTheDocument();
    });

    test('calls onClick when action button is clicked', () => {
      let clicked = false;
      render(
        <EmptyState
          title="No items"
          action={{
            label: 'Add Item',
            onClick: () => { clicked = true; },
          }}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Add Item' }));
      expect(clicked).toBe(true);
    });

    test('does not render button when action not provided', () => {
      render(<EmptyState title="No items" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('secondary action', () => {
    test('renders secondary action button when provided', () => {
      render(
        <EmptyState
          title="No documents"
          secondaryAction={{
            label: 'Go Back',
            onClick: () => {},
          }}
        />
      );
      expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument();
    });

    test('calls secondary onClick when clicked', () => {
      let clicked = false;
      render(
        <EmptyState
          title="No items"
          secondaryAction={{
            label: 'Cancel',
            onClick: () => { clicked = true; },
          }}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(clicked).toBe(true);
    });

    test('renders both primary and secondary actions', () => {
      render(
        <EmptyState
          title="No data"
          action={{
            label: 'Add New',
            onClick: () => {},
          }}
          secondaryAction={{
            label: 'Learn More',
            onClick: () => {},
          }}
        />
      );
      expect(screen.getByRole('button', { name: 'Add New' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Learn More' })).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    test('applies custom className', () => {
      const { container } = render(<EmptyState title="Empty" className="custom-empty" />);
      expect(container.firstChild).toHaveClass('custom-empty');
    });

    test('centers content by default', () => {
      const { container } = render(<EmptyState title="Empty" />);
      expect(container.firstChild).toHaveClass('text-center');
    });

    test('has appropriate padding', () => {
      const { container } = render(<EmptyState title="Empty" />);
      expect(container.firstChild).toHaveClass('py-12');
    });
  });

  describe('icon sizing', () => {
    test('icon wrapper has correct background', () => {
      const { container } = render(
        <EmptyState
          title="Empty"
          icon={FileText}
        />
      );
      const iconWrapper = container.querySelector('.bg-muted');
      expect(iconWrapper).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    test('title has proper heading level', () => {
      render(<EmptyState title="No Data Available" />);
      expect(screen.getByRole('heading')).toHaveTextContent('No Data Available');
    });

    test('description is associated with content', () => {
      render(
        <EmptyState
          title="Empty State"
          description="This is the description text"
        />
      );
      expect(screen.getByText('This is the description text')).toBeInTheDocument();
    });
  });
});
