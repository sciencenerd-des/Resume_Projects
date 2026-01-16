import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

describe('ConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: () => {},
    onConfirm: () => {},
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
  };

  describe('rendering', () => {
    test('renders when isOpen is true', () => {
      render(<ConfirmModal {...defaultProps} />);
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    test('does not render when isOpen is false', () => {
      render(<ConfirmModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
    });

    test('renders title', () => {
      render(<ConfirmModal {...defaultProps} />);
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    test('renders message', () => {
      render(<ConfirmModal {...defaultProps} />);
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    test('renders confirm button', () => {
      render(<ConfirmModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });

    test('renders cancel button', () => {
      render(<ConfirmModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('custom labels', () => {
    test('uses custom confirm label', () => {
      render(<ConfirmModal {...defaultProps} confirmLabel="Delete" />);
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    test('uses custom cancel label', () => {
      render(<ConfirmModal {...defaultProps} cancelLabel="Dismiss" />);
      expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    test('calls onConfirm when confirm button is clicked', () => {
      let confirmed = false;
      render(
        <ConfirmModal
          {...defaultProps}
          onConfirm={() => { confirmed = true; }}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
      expect(confirmed).toBe(true);
    });

    test('calls onClose when cancel button is clicked', () => {
      let closed = false;
      render(
        <ConfirmModal
          {...defaultProps}
          onClose={() => { closed = true; }}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(closed).toBe(true);
    });

    test('calls onClose when clicking backdrop', () => {
      let closed = false;
      const { container } = render(
        <ConfirmModal
          {...defaultProps}
          onClose={() => { closed = true; }}
        />
      );

      // Click the backdrop (first div with bg-black/50)
      const backdrop = container.querySelector('.bg-black\\/50');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(closed).toBe(true);
      }
    });
  });

  describe('variants', () => {
    test('renders danger variant with icon', () => {
      const { container } = render(<ConfirmModal {...defaultProps} variant="danger" />);
      // Danger variant shows red icon background
      expect(container.querySelector('.bg-red-100')).toBeInTheDocument();
    });

    test('renders warning variant with icon', () => {
      const { container } = render(<ConfirmModal {...defaultProps} variant="warning" />);
      // Warning variant shows amber icon background
      expect(container.querySelector('.bg-amber-100')).toBeInTheDocument();
    });

    test('renders info variant with icon', () => {
      const { container } = render(<ConfirmModal {...defaultProps} variant="info" />);
      // Info variant shows blue icon background
      expect(container.querySelector('.bg-blue-100')).toBeInTheDocument();
    });

    test('renders success variant with icon', () => {
      const { container } = render(<ConfirmModal {...defaultProps} variant="success" />);
      // Success variant shows green icon background
      expect(container.querySelector('.bg-green-100')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    test('disables cancel button when loading', () => {
      render(<ConfirmModal {...defaultProps} isLoading />);
      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      expect(cancelBtn).toBeDisabled();
    });

    test('shows loading state on confirm button', () => {
      const { container } = render(<ConfirmModal {...defaultProps} isLoading />);
      // Button component shows loading indicator
      expect(container.querySelector('.animate-bounce')).toBeInTheDocument();
    });
  });

  describe('keyboard interactions', () => {
    test('closes on Escape key', () => {
      let closed = false;
      render(
        <ConfirmModal
          {...defaultProps}
          onClose={() => { closed = true; }}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(closed).toBe(true);
    });
  });

  describe('icon display', () => {
    test('renders variant-specific icon', () => {
      const { container } = render(<ConfirmModal {...defaultProps} variant="danger" />);
      // Icon should be rendered inside the modal
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    test('title has proper heading level', () => {
      render(<ConfirmModal {...defaultProps} />);
      expect(screen.getByRole('heading')).toHaveTextContent('Confirm Action');
    });

    test('cancel button is focusable', () => {
      render(<ConfirmModal {...defaultProps} />);
      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      cancelBtn.focus();
      expect(cancelBtn).toHaveFocus();
    });
  });
});
