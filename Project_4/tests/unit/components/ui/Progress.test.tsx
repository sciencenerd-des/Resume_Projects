import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Progress } from '@/components/ui/progress';

describe('Progress', () => {
  describe('rendering', () => {
    test('renders progress bar container', () => {
      const { container } = render(<Progress value={50} />);
      const outerDiv = container.querySelector('.bg-gray-200');
      expect(outerDiv).toBeInTheDocument();
    });

    test('renders inner bar with correct width', () => {
      const { container } = render(<Progress value={75} />);
      const innerBar = container.querySelector('.bg-blue-600');
      expect(innerBar).toHaveStyle({ width: '75%' });
    });

    test('handles 0 value', () => {
      const { container } = render(<Progress value={0} />);
      const innerBar = container.querySelector('.bg-blue-600');
      expect(innerBar).toHaveStyle({ width: '0%' });
    });

    test('handles 100 value', () => {
      const { container } = render(<Progress value={100} />);
      const innerBar = container.querySelector('.bg-blue-600');
      expect(innerBar).toHaveStyle({ width: '100%' });
    });
  });

  describe('styling', () => {
    test('applies custom className', () => {
      const { container } = render(<Progress value={50} className="custom-class" />);
      const outerDiv = container.querySelector('.bg-gray-200');
      expect(outerDiv).toHaveClass('custom-class');
    });

    test('has rounded styling', () => {
      const { container } = render(<Progress value={50} />);
      const outerDiv = container.querySelector('.bg-gray-200');
      expect(outerDiv).toHaveClass('rounded-full');
    });
  });
});
