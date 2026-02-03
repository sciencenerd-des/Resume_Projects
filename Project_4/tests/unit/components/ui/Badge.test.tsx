import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  describe('rendering', () => {
    test('renders with default variant', () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-primary');
    });

    test('renders with secondary variant', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      const badge = screen.getByText('Secondary');
      expect(badge).toHaveClass('bg-secondary');
    });

    test('renders with destructive variant', () => {
      render(<Badge variant="destructive">Destructive</Badge>);
      const badge = screen.getByText('Destructive');
      expect(badge).toHaveClass('bg-destructive');
    });

    test('renders with outline variant', () => {
      render(<Badge variant="outline">Outline</Badge>);
      const badge = screen.getByText('Outline');
      expect(badge).toHaveClass('text-foreground');
    });

    test('renders children correctly', () => {
      render(<Badge>Test Content</Badge>);
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    test('renders with icon children', () => {
      render(
        <Badge>
          <span data-testid="icon">★</span>
          Star Badge
        </Badge>
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Star Badge')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    test('applies custom className', () => {
      render(<Badge className="custom-class">Badge</Badge>);
      const badge = screen.getByText('Badge');
      expect(badge).toHaveClass('custom-class');
    });

    test('has rounded-full class', () => {
      render(<Badge>Rounded</Badge>);
      const badge = screen.getByText('Rounded');
      expect(badge).toHaveClass('rounded-full');
    });

    test('has correct padding classes', () => {
      render(<Badge>Padded</Badge>);
      const badge = screen.getByText('Padded');
      expect(badge).toHaveClass('px-2.5', 'py-0.5');
    });

    test('has text-xs font size', () => {
      render(<Badge>Small Text</Badge>);
      const badge = screen.getByText('Small Text');
      expect(badge).toHaveClass('text-xs');
    });

    test('has font-semibold', () => {
      render(<Badge>Bold</Badge>);
      const badge = screen.getByText('Bold');
      expect(badge).toHaveClass('font-semibold');
    });
  });

  describe('accessibility', () => {
    test('passes through aria attributes', () => {
      render(<Badge aria-label="Status badge">Active</Badge>);
      const badge = screen.getByText('Active');
      expect(badge).toHaveAttribute('aria-label', 'Status badge');
    });

    test('has focus ring styles', () => {
      render(<Badge>Focusable</Badge>);
      const badge = screen.getByText('Focusable');
      expect(badge).toHaveClass('focus:ring-2');
    });

    test('passes through data attributes', () => {
      render(<Badge data-testid="status-badge">Status</Badge>);
      expect(screen.getByTestId('status-badge')).toBeInTheDocument();
    });
  });

  describe('hover states', () => {
    test('default variant has hover opacity', () => {
      render(<Badge>Hover Default</Badge>);
      const badge = screen.getByText('Hover Default');
      expect(badge).toHaveClass('hover:bg-primary/80');
    });

    test('secondary variant has hover opacity', () => {
      render(<Badge variant="secondary">Hover Secondary</Badge>);
      const badge = screen.getByText('Hover Secondary');
      expect(badge).toHaveClass('hover:bg-secondary/80');
    });

    test('destructive variant has hover opacity', () => {
      render(<Badge variant="destructive">Hover Destructive</Badge>);
      const badge = screen.getByText('Hover Destructive');
      expect(badge).toHaveClass('hover:bg-destructive/80');
    });
  });
});
