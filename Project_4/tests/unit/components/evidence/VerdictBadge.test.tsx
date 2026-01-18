import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VerdictBadge } from '@/components/evidence/VerdictBadge';

describe('VerdictBadge', () => {
  describe('rendering', () => {
    test('renders supported verdict with correct styling', () => {
      render(<VerdictBadge verdict="supported" />);
      const badge = screen.getByText('Supported');
      expect(badge).toHaveClass('bg-verdict-supported/10', 'text-verdict-supported');
    });

    test('renders weak verdict with correct styling', () => {
      render(<VerdictBadge verdict="weak" />);
      const badge = screen.getByText('Weak');
      expect(badge).toHaveClass('bg-verdict-weak/10', 'text-verdict-weak');
    });

    test('renders contradicted verdict with correct styling', () => {
      render(<VerdictBadge verdict="contradicted" />);
      const badge = screen.getByText('Contradicted');
      expect(badge).toHaveClass('bg-verdict-contradicted/10', 'text-verdict-contradicted');
    });

    test('renders not_found verdict with correct styling', () => {
      render(<VerdictBadge verdict="not_found" />);
      const badge = screen.getByText('Not Found');
      expect(badge).toHaveClass('bg-verdict-missing/10', 'text-verdict-missing');
    });

    test('renders expert_verified verdict with correct styling', () => {
      render(<VerdictBadge verdict="expert_verified" />);
      const badge = screen.getByText('Expert Verified');
      expect(badge).toHaveClass('bg-teal-500/10', 'text-teal-500');
    });

    test('renders conflict_flagged verdict with correct styling', () => {
      render(<VerdictBadge verdict="conflict_flagged" />);
      const badge = screen.getByText('Conflict Flagged');
      expect(badge).toHaveClass('bg-orange-500/10', 'text-orange-500');
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
      // md size: px-2.5 py-1 text-xs
      expect(badge).toHaveClass('text-xs', 'px-2.5', 'py-1');
    });

    test('renders large size', () => {
      render(<VerdictBadge verdict="supported" size="lg" />);
      const badge = screen.getByText('Supported');
      expect(badge).toHaveClass('text-sm', 'px-3', 'py-1.5');
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

  describe('common styling', () => {
    test('has rounded-full class', () => {
      render(<VerdictBadge verdict="supported" />);
      const badge = screen.getByText('Supported');
      expect(badge).toHaveClass('rounded-full');
    });

    test('has border class', () => {
      render(<VerdictBadge verdict="supported" />);
      const badge = screen.getByText('Supported');
      expect(badge).toHaveClass('border');
    });

    test('has font-medium class', () => {
      render(<VerdictBadge verdict="supported" />);
      const badge = screen.getByText('Supported');
      expect(badge).toHaveClass('font-medium');
    });
  });
});
