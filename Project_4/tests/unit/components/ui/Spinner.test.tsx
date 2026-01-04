import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Spinner } from '@/components/ui/Spinner';

describe('Spinner', () => {
  describe('rendering', () => {
    test('renders with default size', () => {
      const { container } = render(<Spinner />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('w-6', 'h-6'); // md size
    });

    test('renders with small size', () => {
      const { container } = render(<Spinner size="sm" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-4', 'h-4');
    });

    test('renders with large size', () => {
      const { container } = render(<Spinner size="lg" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-8', 'h-8');
    });

    test('renders with custom className', () => {
      const { container } = render(<Spinner className="text-blue-600" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-blue-600');
    });

    test('has animation class', () => {
      const { container } = render(<Spinner />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('animate-spin');
    });
  });
});
