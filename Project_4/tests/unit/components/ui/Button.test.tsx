import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  describe('rendering', () => {
    test('renders with default variant', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('bg-primary');
    });

    test('renders with primary variant', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary');
    });

    test('renders with secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-secondary');
    });

    test('renders with ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-accent');
    });

    test('renders with danger variant', () => {
      render(<Button variant="danger">Delete</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-destructive');
    });
  });

  describe('states', () => {
    test('is disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
    });

    test('shows loading state when loading is true', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      // Loading shows dots animation
      expect(button.querySelector('.animate-bounce')).toBeInTheDocument();
    });

    test('applies correct classes for different sizes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-9', 'px-3');

      rerender(<Button size="md">Medium</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-10', 'px-4', 'py-2');

      rerender(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-11', 'px-8');
    });
  });

  describe('interactions', () => {
    test('calls onClick handler when clicked', () => {
      let mockClicks = 0;
      const handleClick = () => { mockClicks++; };
      render(<Button onClick={handleClick}>Click me</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(mockClicks).toBe(1);
    });

    test('does not call onClick when disabled', () => {
      let mockClicks = 0;
      const handleClick = () => { mockClicks++; };
      render(<Button onClick={handleClick} disabled>Click me</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(mockClicks).toBe(0);
    });

    test('supports keyboard navigation', () => {
      let mockClicks = 0;
      const handleClick = () => { mockClicks++; };
      render(<Button onClick={handleClick}>Click me</Button>);
      const button = screen.getByRole('button');
      button.focus();
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
      expect(button).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-ring');
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
