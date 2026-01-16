import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StreamingIndicator } from '@/components/chat/StreamingIndicator';

describe('StreamingIndicator', () => {
  describe('rendering', () => {
    test('renders the indicator with flex layout', () => {
      const { container } = render(<StreamingIndicator />);
      const indicator = container.querySelector('.flex.items-center');
      expect(indicator).toBeInTheDocument();
    });

    test('displays thinking label by default', () => {
      render(<StreamingIndicator />);
      expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });

    test('renders animated dots', () => {
      const { container } = render(<StreamingIndicator />);
      const dots = container.querySelectorAll('.animate-bounce');
      expect(dots.length).toBe(3);
    });

    test('renders icon in circle', () => {
      const { container } = render(<StreamingIndicator />);
      const iconContainer = container.querySelector('.w-8.h-8.rounded-full');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer?.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    test('renders thinking variant with blue dot', () => {
      const { container } = render(<StreamingIndicator variant="thinking" />);
      expect(screen.getByText('Thinking...')).toBeInTheDocument();
      expect(container.querySelector('.bg-blue-500')).toBeInTheDocument();
    });

    test('renders generating variant with purple dot', () => {
      const { container } = render(<StreamingIndicator variant="generating" />);
      expect(screen.getByText('Generating response...')).toBeInTheDocument();
      expect(container.querySelector('.bg-purple-500')).toBeInTheDocument();
    });

    test('renders verifying variant with green dot', () => {
      const { container } = render(<StreamingIndicator variant="verifying" />);
      expect(screen.getByText('Verifying claims...')).toBeInTheDocument();
      expect(container.querySelector('.bg-green-500')).toBeInTheDocument();
    });

    test('defaults to thinking variant', () => {
      const { container } = render(<StreamingIndicator />);
      expect(screen.getByText('Thinking...')).toBeInTheDocument();
      expect(container.querySelector('.bg-blue-500')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    test('applies custom className', () => {
      const { container } = render(<StreamingIndicator className="custom-indicator" />);
      expect(container.querySelector('.custom-indicator')).toBeInTheDocument();
    });

    test('has flex layout with gap', () => {
      const { container } = render(<StreamingIndicator />);
      expect(container.querySelector('.gap-3')).toBeInTheDocument();
    });

    test('has items-center alignment', () => {
      const { container } = render(<StreamingIndicator />);
      expect(container.querySelector('.items-center')).toBeInTheDocument();
    });

    test('label has gray text styling', () => {
      const { container } = render(<StreamingIndicator />);
      const label = container.querySelector('.text-gray-500');
      expect(label).toBeInTheDocument();
    });

    test('label is sm text size', () => {
      const { container } = render(<StreamingIndicator />);
      const label = container.querySelector('.text-sm');
      expect(label).toBeInTheDocument();
    });
  });

  describe('animation', () => {
    test('has animate-pulse on status dot', () => {
      const { container } = render(<StreamingIndicator />);
      const statusDot = container.querySelector('.animate-pulse');
      expect(statusDot).toBeInTheDocument();
    });

    test('dots have animate-bounce class', () => {
      const { container } = render(<StreamingIndicator />);
      const dots = container.querySelectorAll('.animate-bounce');
      expect(dots.length).toBe(3);
    });

    test('dots have staggered animation delays', () => {
      const { container } = render(<StreamingIndicator />);
      const dots = container.querySelectorAll('.animate-bounce');
      expect(dots[0]).toHaveStyle({ animationDelay: '0ms' });
      expect(dots[1]).toHaveStyle({ animationDelay: '150ms' });
      expect(dots[2]).toHaveStyle({ animationDelay: '300ms' });
    });
  });

  describe('icon', () => {
    test('thinking variant shows Bot icon', () => {
      const { container } = render(<StreamingIndicator variant="thinking" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('w-4', 'h-4');
    });

    test('generating variant shows Sparkles icon', () => {
      const { container } = render(<StreamingIndicator variant="generating" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    test('verifying variant shows Sparkles icon', () => {
      const { container } = render(<StreamingIndicator variant="verifying" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    test('icon container has background', () => {
      const { container } = render(<StreamingIndicator />);
      const iconContainer = container.querySelector('.bg-gray-100');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('status indicator dot', () => {
    test('status dot is positioned absolutely', () => {
      const { container } = render(<StreamingIndicator />);
      const statusDot = container.querySelector('.absolute');
      expect(statusDot).toBeInTheDocument();
    });

    test('status dot is rounded-full', () => {
      const { container } = render(<StreamingIndicator />);
      const statusDots = container.querySelectorAll('.rounded-full');
      // One for icon container, one for status dot, three for thinking dots
      expect(statusDots.length).toBeGreaterThan(1);
    });

    test('status dot changes color based on variant', () => {
      const { container: thinkingContainer } = render(<StreamingIndicator variant="thinking" />);
      const { container: generatingContainer } = render(<StreamingIndicator variant="generating" />);

      expect(thinkingContainer.querySelector('.bg-blue-500')).toBeInTheDocument();
      expect(generatingContainer.querySelector('.bg-purple-500')).toBeInTheDocument();
    });
  });

  describe('layout', () => {
    test('icon section is relative positioned', () => {
      const { container } = render(<StreamingIndicator />);
      const relativeDiv = container.querySelector('.relative');
      expect(relativeDiv).toBeInTheDocument();
    });

    test('text and dots are in flex container', () => {
      const { container } = render(<StreamingIndicator />);
      const textContainer = container.querySelectorAll('.flex.items-center');
      expect(textContainer.length).toBeGreaterThanOrEqual(1);
    });
  });
});
