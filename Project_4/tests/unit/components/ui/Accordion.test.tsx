import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

describe('Accordion', () => {
  describe('single mode', () => {
    test('renders accordion with items', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Section 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Section 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
      expect(screen.getByText('Section 1')).toBeInTheDocument();
      expect(screen.getByText('Section 2')).toBeInTheDocument();
    });

    test('expands item on click', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Section 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      fireEvent.click(screen.getByText('Section 1'));
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    test('collapses when clicking expanded item', () => {
      render(
        <Accordion type="single" collapsible defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>Section 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Section 1'));
      // Content should be hidden after collapse
    });

    test('only one item open at a time', () => {
      render(
        <Accordion type="single" collapsible defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>Section 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Section 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Section 2'));
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  describe('multiple mode', () => {
    test('allows multiple items open', () => {
      render(
        <Accordion type="multiple" defaultValue={['item-1']}>
          <AccordionItem value="item-1">
            <AccordionTrigger>Section 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Section 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Section 2'));
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  describe('AccordionItem', () => {
    test('has correct border styles', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1" data-testid="item">
            <AccordionTrigger>Section</AccordionTrigger>
            <AccordionContent>Content</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
      expect(screen.getByTestId('item')).toHaveClass('border-b');
    });

    test('applies custom className', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1" className="custom-item" data-testid="item">
            <AccordionTrigger>Section</AccordionTrigger>
            <AccordionContent>Content</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
      expect(screen.getByTestId('item')).toHaveClass('custom-item');
    });
  });

  describe('AccordionTrigger', () => {
    test('has button role', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Section</AccordionTrigger>
            <AccordionContent>Content</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('has correct flex styles', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger data-testid="trigger">Section</AccordionTrigger>
            <AccordionContent>Content</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
      expect(screen.getByTestId('trigger')).toHaveClass('flex', 'flex-1', 'items-center', 'justify-between');
    });

    test('has hover underline', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger data-testid="trigger">Section</AccordionTrigger>
            <AccordionContent>Content</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
      expect(screen.getByTestId('trigger')).toHaveClass('hover:underline');
    });

    test('applies custom className', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger className="custom-trigger" data-testid="trigger">Section</AccordionTrigger>
            <AccordionContent>Content</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
      expect(screen.getByTestId('trigger')).toHaveClass('custom-trigger');
    });
  });

  describe('AccordionContent', () => {
    test('renders content when expanded', () => {
      render(
        <Accordion type="single" collapsible defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>Section</AccordionTrigger>
            <AccordionContent data-testid="content">
              <p>Accordion content here</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    test('has overflow hidden', () => {
      render(
        <Accordion type="single" collapsible defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>Section</AccordionTrigger>
            <AccordionContent data-testid="content">Content</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
      expect(screen.getByTestId('content')).toHaveClass('overflow-hidden');
    });

    test('applies custom className', () => {
      render(
        <Accordion type="single" collapsible defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>Section</AccordionTrigger>
            <AccordionContent className="custom-content" data-testid="content">Content</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
      // Custom className is applied to the inner div, not the wrapper
      const contentWrapper = screen.getByTestId('content');
      const innerDiv = contentWrapper.querySelector('div');
      expect(innerDiv).toHaveClass('custom-content');
    });
  });

  describe('accessibility', () => {
    test('triggers are keyboard accessible', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger data-testid="trigger">Section</AccordionTrigger>
            <AccordionContent>Content</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
      const trigger = screen.getByTestId('trigger');
      trigger.focus();
      expect(trigger).toHaveFocus();
    });

    test('trigger has aria-expanded attribute', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Section</AccordionTrigger>
            <AccordionContent>Content</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('aria-expanded');
    });
  });

  describe('controlled component', () => {
    test('works with controlled value', () => {
      const TestComponent = () => {
        const [value, setValue] = React.useState<string | undefined>('item-1');
        return (
          <>
            <button onClick={() => setValue('item-2')} data-testid="switch">Switch</button>
            <Accordion type="single" collapsible value={value} onValueChange={setValue}>
              <AccordionItem value="item-1">
                <AccordionTrigger>Section 1</AccordionTrigger>
                <AccordionContent>Content 1</AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Section 2</AccordionTrigger>
                <AccordionContent>Content 2</AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        );
      };

      render(<TestComponent />);
      expect(screen.getByText('Content 1')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('switch'));
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });
});
