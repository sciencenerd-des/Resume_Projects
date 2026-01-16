import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Skeleton } from '@/components/ui/skeleton';

describe('Skeleton', () => {
  describe('rendering', () => {
    test('renders as a div element', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton.tagName).toBe('DIV');
    });

    test('has animation classes', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('animate-pulse');
    });

    test('has rounded-md class', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('rounded-md');
    });

    test('has muted background', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('bg-muted');
    });
  });

  describe('customization', () => {
    test('applies custom className', () => {
      render(<Skeleton className="w-full h-8" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('w-full', 'h-8');
    });

    test('merges default and custom classes', () => {
      render(<Skeleton className="custom-class" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('animate-pulse', 'rounded-md', 'bg-muted', 'custom-class');
    });

    test('passes through style prop', () => {
      render(<Skeleton style={{ width: '200px', height: '20px' }} data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({ width: '200px', height: '20px' });
    });
  });

  describe('props passthrough', () => {
    test('passes through id attribute', () => {
      render(<Skeleton id="my-skeleton" data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toHaveAttribute('id', 'my-skeleton');
    });

    test('passes through aria attributes', () => {
      render(<Skeleton aria-label="Loading content" data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-label', 'Loading content');
    });

    test('passes through data attributes', () => {
      render(<Skeleton data-loading="true" data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toHaveAttribute('data-loading', 'true');
    });
  });

  describe('common use cases', () => {
    test('can be used as text placeholder', () => {
      render(<Skeleton className="h-4 w-48" data-testid="text-skeleton" />);
      const skeleton = screen.getByTestId('text-skeleton');
      expect(skeleton).toHaveClass('h-4', 'w-48');
    });

    test('can be used as avatar placeholder', () => {
      render(<Skeleton className="h-12 w-12 rounded-full" data-testid="avatar-skeleton" />);
      const skeleton = screen.getByTestId('avatar-skeleton');
      expect(skeleton).toHaveClass('h-12', 'w-12', 'rounded-full');
    });

    test('can be used as card placeholder', () => {
      render(<Skeleton className="h-32 w-full" data-testid="card-skeleton" />);
      const skeleton = screen.getByTestId('card-skeleton');
      expect(skeleton).toHaveClass('h-32', 'w-full');
    });

    test('can be grouped for complex loading states', () => {
      render(
        <div data-testid="skeleton-group">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      );

      const group = screen.getByTestId('skeleton-group');
      const skeletons = group.querySelectorAll('.animate-pulse');
      expect(skeletons).toHaveLength(3);
    });
  });
});
