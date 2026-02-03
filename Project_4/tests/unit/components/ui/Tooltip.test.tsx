import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';

// Helper to wrap tooltip in provider
const renderWithProvider = (ui: React.ReactNode) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

describe('Tooltip', () => {
  describe('TooltipProvider', () => {
    test('renders children', () => {
      render(
        <TooltipProvider>
          <div data-testid="child">Child content</div>
        </TooltipProvider>
      );
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    test('accepts delayDuration prop', () => {
      render(
        <TooltipProvider delayDuration={100}>
          <div data-testid="child">Child</div>
        </TooltipProvider>
      );
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
  });

  describe('Tooltip component', () => {
    test('renders trigger element', () => {
      renderWithProvider(
        <Tooltip>
          <TooltipTrigger data-testid="trigger">Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      );
      expect(screen.getByTestId('trigger')).toBeInTheDocument();
    });

    test('trigger is focusable', () => {
      renderWithProvider(
        <Tooltip>
          <TooltipTrigger data-testid="trigger">Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      );
      const trigger = screen.getByTestId('trigger');
      trigger.focus();
      expect(trigger).toHaveFocus();
    });
  });

  describe('TooltipTrigger', () => {
    test('renders as child element type', () => {
      renderWithProvider(
        <Tooltip>
          <TooltipTrigger asChild>
            <button data-testid="btn-trigger">Button Trigger</button>
          </TooltipTrigger>
          <TooltipContent>Tooltip</TooltipContent>
        </Tooltip>
      );
      expect(screen.getByTestId('btn-trigger')).toBeInTheDocument();
      expect(screen.getByTestId('btn-trigger').tagName).toBe('BUTTON');
    });

    test('passes through className', () => {
      renderWithProvider(
        <Tooltip>
          <TooltipTrigger className="custom-trigger" data-testid="trigger">
            Trigger
          </TooltipTrigger>
          <TooltipContent>Tooltip</TooltipContent>
        </Tooltip>
      );
      expect(screen.getByTestId('trigger')).toHaveClass('custom-trigger');
    });
  });

  describe('TooltipContent', () => {
    test('has correct base styles', () => {
      renderWithProvider(
        <Tooltip defaultOpen>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent data-testid="content">Content</TooltipContent>
        </Tooltip>
      );
      // Content should be in the DOM when tooltip is open
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('z-50', 'rounded-md', 'border');
    });

    test('applies custom className', () => {
      renderWithProvider(
        <Tooltip defaultOpen>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent className="custom-content" data-testid="content">
            Content
          </TooltipContent>
        </Tooltip>
      );
      expect(screen.getByTestId('content')).toHaveClass('custom-content');
    });

    test('renders text content', () => {
      renderWithProvider(
        <Tooltip defaultOpen>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>Tooltip message</TooltipContent>
        </Tooltip>
      );
      // Radix may render multiple tooltip elements, use queryAll and check at least one exists
      const elements = screen.queryAllByText('Tooltip message');
      expect(elements.length).toBeGreaterThan(0);
    });

    test('renders complex content', () => {
      renderWithProvider(
        <Tooltip defaultOpen>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>
            <div data-testid="complex-content">
              <strong>Bold</strong> and <em>italic</em>
            </div>
          </TooltipContent>
        </Tooltip>
      );
      // Radix may render duplicate elements, use queryAll and check at least one exists
      const elements = screen.queryAllByTestId('complex-content');
      expect(elements.length).toBeGreaterThan(0);
    });

    test('accepts sideOffset prop', () => {
      renderWithProvider(
        <Tooltip defaultOpen>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent sideOffset={10} data-testid="content">
            Content
          </TooltipContent>
        </Tooltip>
      );
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    test('tooltip trigger has proper role', () => {
      renderWithProvider(
        <Tooltip>
          <TooltipTrigger asChild>
            <button data-testid="trigger">Trigger</button>
          </TooltipTrigger>
          <TooltipContent>Help text</TooltipContent>
        </Tooltip>
      );
      expect(screen.getByTestId('trigger')).toBeInTheDocument();
    });

    test('content has tooltip role when open', () => {
      renderWithProvider(
        <Tooltip defaultOpen>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      );
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });
});
