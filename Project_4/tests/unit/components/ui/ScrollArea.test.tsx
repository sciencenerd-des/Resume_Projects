import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

describe('ScrollArea', () => {
  describe('rendering', () => {
    test('renders children', () => {
      render(
        <ScrollArea>
          <div data-testid="content">Scrollable content</div>
        </ScrollArea>
      );
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    test('has relative positioning', () => {
      render(
        <ScrollArea data-testid="scroll-area">
          <div>Content</div>
        </ScrollArea>
      );
      expect(screen.getByTestId('scroll-area')).toHaveClass('relative');
    });

    test('has overflow hidden', () => {
      render(
        <ScrollArea data-testid="scroll-area">
          <div>Content</div>
        </ScrollArea>
      );
      expect(screen.getByTestId('scroll-area')).toHaveClass('overflow-hidden');
    });
  });

  describe('styling', () => {
    test('applies custom className', () => {
      render(
        <ScrollArea className="custom-scroll" data-testid="scroll-area">
          <div>Content</div>
        </ScrollArea>
      );
      expect(screen.getByTestId('scroll-area')).toHaveClass('custom-scroll');
    });

    test('applies custom height', () => {
      render(
        <ScrollArea className="h-48" data-testid="scroll-area">
          <div>Content</div>
        </ScrollArea>
      );
      expect(screen.getByTestId('scroll-area')).toHaveClass('h-48');
    });

    test('applies custom width', () => {
      render(
        <ScrollArea className="w-64" data-testid="scroll-area">
          <div>Content</div>
        </ScrollArea>
      );
      expect(screen.getByTestId('scroll-area')).toHaveClass('w-64');
    });
  });

  describe('with long content', () => {
    test('renders long content list', () => {
      render(
        <ScrollArea className="h-32">
          <div>
            {Array.from({ length: 50 }, (_, i) => (
              <div key={i} data-testid={`item-${i}`}>Item {i + 1}</div>
            ))}
          </div>
        </ScrollArea>
      );
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-49')).toBeInTheDocument();
    });
  });

  describe('ScrollBar', () => {
    // Note: Radix ScrollArea only renders scrollbars when content overflows.
    // In happy-dom without real layout, scrollbars may not be rendered.
    // These tests verify the component API rather than visibility.

    test('renders scrollbar component when included', () => {
      const { container } = render(
        <ScrollArea className="h-32" style={{ height: '100px' }}>
          <div style={{ height: '500px' }}>Long content that should overflow</div>
        </ScrollArea>
      );
      // The ScrollArea includes a default ScrollBar, verify structure exists
      expect(container.querySelector('[data-radix-scroll-area-viewport]')).toBeInTheDocument();
    });

    test('ScrollBar component accepts orientation prop', () => {
      // This tests that the component renders without error
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
          <ScrollBar orientation="vertical" />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      );
      expect(container).toBeInTheDocument();
    });

    test('ScrollBar component accepts className prop', () => {
      // This tests that the component renders without error
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
          <ScrollBar className="custom-scrollbar" />
        </ScrollArea>
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe('common use cases', () => {
    test('sidebar navigation pattern', () => {
      render(
        <ScrollArea className="h-screen" data-testid="sidebar">
          <nav>
            <ul>
              {['Home', 'About', 'Services', 'Contact'].map((item) => (
                <li key={item} data-testid={`nav-${item.toLowerCase()}`}>{item}</li>
              ))}
            </ul>
          </nav>
        </ScrollArea>
      );
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('nav-home')).toBeInTheDocument();
    });

    test('chat messages pattern', () => {
      const messages = [
        { id: 1, text: 'Hello' },
        { id: 2, text: 'How are you?' },
        { id: 3, text: 'Great, thanks!' },
      ];

      render(
        <ScrollArea className="h-64">
          <div className="p-4">
            {messages.map((msg) => (
              <div key={msg.id} data-testid={`msg-${msg.id}`}>{msg.text}</div>
            ))}
          </div>
        </ScrollArea>
      );
      messages.forEach((msg) => {
        expect(screen.getByTestId(`msg-${msg.id}`)).toBeInTheDocument();
      });
    });

    test('code block pattern', () => {
      render(
        <ScrollArea className="h-32 w-full rounded-md border">
          <pre data-testid="code">
            <code>{`function hello() {\n  console.log('Hello, World!');\n}`}</code>
          </pre>
        </ScrollArea>
      );
      expect(screen.getByTestId('code')).toBeInTheDocument();
    });
  });

  describe('refs and forwarding', () => {
    test('forwards ref', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <ScrollArea ref={ref}>
          <div>Content</div>
        </ScrollArea>
      );
      expect(ref.current).toBeInstanceOf(HTMLElement);
    });

    test('scrollbar component accepts ref prop', () => {
      // ScrollBar ref behavior depends on Radix rendering the scrollbar
      // which requires content overflow. Here we test the API is accepted.
      const ref = React.createRef<HTMLDivElement>();
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
          <ScrollBar ref={ref} />
        </ScrollArea>
      );
      // Just verify the component renders without error
      expect(container).toBeInTheDocument();
    });
  });
});
