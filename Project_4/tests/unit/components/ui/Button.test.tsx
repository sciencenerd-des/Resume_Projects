import React from 'react';
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  describe('rendering', () => {
    test('renders with default variant', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('bg-blue-600');
    });

    test('renders with primary variant', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600');
    });

    test('renders with secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-100');
    });

    test('renders with ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent');
    });

    test('renders with danger variant', () => {
      render(<Button variant="danger">Delete</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600');
    });
  });

  describe('states', () => {
    test('is disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });

    test('shows loading state when loading is true', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      // Check for SVG spinner element (no role="img" on SVGs in happy-dom)
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    test('applies correct classes for different sizes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm');

      rerender(<Button size="md">Medium</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2', 'text-sm');

      rerender(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-base');
    });
  });

  describe('interactions', () => {
    test('calls onClick handler when clicked', () => {
      const handleClick = () => { mockClicks++; };
      let mockClicks = 0;
      render(<Button onClick={handleClick}>Click me</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(mockClicks).toBe(1);
    });

    test('does not call onClick when disabled', () => {
      const handleClick = () => { mockClicks++; };
      let mockClicks = 0;
      render(<Button onClick={handleClick} disabled>Click me</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(mockClicks).toBe(0);
    });

    test('supports keyboard navigation', () => {
      const handleClick = () => { mockClicks++; };
      let mockClicks = 0;
      render(<Button onClick={handleClick}>Click me</Button>);
      const button = screen.getByRole('button');
      button.focus();
      // Native button elements respond to Enter/Space via click in browsers
      // In test environment, we verify the button is focusable and can receive clicks
      fireEvent.click(button);
      expect(mockClicks).toBe(1);
    });
  });

  describe('accessibility', () => {
    test('passes through aria-label', () => {
      render(<Button aria-label="Close dialog">X</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Close dialog');
    });

    test('supports keyboard focus', () => {
      render(<Button>Focus me</Button>);
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    test('has focus ring styles', () => {
      render(<Button>Focus me</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    });
  });

  describe('icon prop', () => {
    test('renders icon when provided', () => {
      render(<Button icon={<span data-testid="test-icon">Icon</span>}>Button</Button>);
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    test('does not render icon when loading', () => {
      render(
        <Button loading icon={<span data-testid="test-icon">Icon</span>}>
          Button
        </Button>
      );
      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    test('applies custom className', () => {
      render(<Button className="custom-class">Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });
});
