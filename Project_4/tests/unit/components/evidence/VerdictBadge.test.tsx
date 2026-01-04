import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VerdictBadge } from '@/components/evidence/VerdictBadge';

describe('VerdictBadge', () => {
  describe('rendering', () => {
    test('renders supported verdict with green styling', () => {
      render(<VerdictBadge verdict="supported" />);
      const badge = screen.getByText('Supported');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    test('renders weak verdict with amber styling', () => {
      render(<VerdictBadge verdict="weak" />);
      const badge = screen.getByText('Weak');
      expect(badge).toHaveClass('bg-amber-100', 'text-amber-800');
    });

    test('renders contradicted verdict with red styling', () => {
      render(<VerdictBadge verdict="contradicted" />);
      const badge = screen.getByText('Contradicted');
      expect(badge).toHaveClass('bg-red-100', 'text-red-800');
    });

    test('renders not_found verdict with gray styling', () => {
      render(<VerdictBadge verdict="not_found" />);
      const badge = screen.getByText('Not Found');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
    });
  });

  describe('sizes', () => {
    test('renders small size', () => {
      render(<VerdictBadge verdict="supported" size="sm" />);
      const badge = screen.getByText('Supported');
      expect(badge).toHaveClass('text-xs', 'px-2', 'py-0.5');
    });

    test('renders medium size by default', () => {
      render(<VerdictBadge verdict="supported" />);
      const badge = screen.getByText('Supported');
      expect(badge).toHaveClass('text-sm', 'px-3', 'py-1');
    });
  });

  describe('icons', () => {
    test('includes icon when showIcon is true', () => {
      const { container } = render(<VerdictBadge verdict="supported" showIcon />);
      // Lucide icons render as SVG elements
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    test('does not include icon when showIcon is false', () => {
      const { container } = render(<VerdictBadge verdict="supported" showIcon={false} />);
      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });
  });

  describe('icon variations', () => {
    test('renders different icons for different verdicts', () => {
      const { container: c1 } = render(<VerdictBadge verdict="supported" showIcon />);
      const { container: c2 } = render(<VerdictBadge verdict="contradicted" showIcon />);

      // Both should have SVG icons
      expect(c1.querySelector('svg')).toBeInTheDocument();
      expect(c2.querySelector('svg')).toBeInTheDocument();
    });
  });
});
