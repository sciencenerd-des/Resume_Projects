import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Progress } from '@/components/ui/progress';

describe('Progress', () => {
  describe('rendering', () => {
    test('renders progress bar container', () => {
      const { container } = render(<Progress value={50} />);
      const outerDiv = container.querySelector('.bg-secondary');
      expect(outerDiv).toBeInTheDocument();
    });

    test('renders inner bar with correct transform', () => {
      const { container } = render(<Progress value={75} />);
      const innerBar = container.querySelector('.bg-primary');
      // Progress uses translateX(-25%) for 75% value (100 - 75 = 25)
      expect(innerBar).toHaveStyle({ transform: 'translateX(-25%)' });
    });

    test('handles 0 value', () => {
      const { container } = render(<Progress value={0} />);
      const innerBar = container.querySelector('.bg-primary');
      // 0% value means translateX(-100%)
      expect(innerBar).toHaveStyle({ transform: 'translateX(-100%)' });
    });

    test('handles 100 value', () => {
      const { container } = render(<Progress value={100} />);
      const innerBar = container.querySelector('.bg-primary');
      // 100% value means translateX(0%)
      expect(innerBar).toHaveStyle({ transform: 'translateX(-0%)' });
    });
  });

  describe('styling', () => {
    test('applies custom className', () => {
      const { container } = render(<Progress value={50} className="custom-class" />);
      const outerDiv = container.querySelector('.bg-secondary');
      expect(outerDiv).toHaveClass('custom-class');
    });

    test('has rounded styling', () => {
      const { container } = render(<Progress value={50} />);
      const outerDiv = container.querySelector('.bg-secondary');
      expect(outerDiv).toHaveClass('rounded-full');
    });
  });

  describe('indicator', () => {
    test('indicator has primary background', () => {
      const { container } = render(<Progress value={50} />);
      const indicator = container.querySelector('.bg-primary');
      expect(indicator).toBeInTheDocument();
    });

    test('indicator has transition styling', () => {
      const { container } = render(<Progress value={50} />);
      const indicator = container.querySelector('.bg-primary');
      expect(indicator).toHaveClass('transition-all');
    });
  });
});
