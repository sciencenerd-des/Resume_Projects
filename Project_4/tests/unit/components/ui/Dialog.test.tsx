import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';

describe('Dialog', () => {
  describe('Dialog component', () => {
    test('renders trigger', () => {
      render(
        <Dialog>
          <DialogTrigger data-testid="trigger">Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );
      expect(screen.getByTestId('trigger')).toBeInTheDocument();
    });

    test('opens on trigger click', () => {
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      fireEvent.click(screen.getByText('Open'));
      expect(screen.getByText('Dialog Title')).toBeInTheDocument();
    });

    test('controlled open state works', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogTitle>Always Open</DialogTitle>
          </DialogContent>
        </Dialog>
      );
      expect(screen.getByText('Always Open')).toBeInTheDocument();
    });

    test('controlled closed state works', () => {
      render(
        <Dialog open={false}>
          <DialogContent>
            <DialogTitle>Never Visible</DialogTitle>
          </DialogContent>
        </Dialog>
      );
      expect(screen.queryByText('Never Visible')).not.toBeInTheDocument();
    });
  });

  describe('DialogTrigger', () => {
    test('renders children', () => {
      render(
        <Dialog>
          <DialogTrigger>Click Me</DialogTrigger>
          <DialogContent><DialogTitle>Title</DialogTitle></DialogContent>
        </Dialog>
      );
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    test('supports asChild prop', () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button data-testid="custom-trigger">Custom Button</button>
          </DialogTrigger>
          <DialogContent><DialogTitle>Title</DialogTitle></DialogContent>
        </Dialog>
      );
      expect(screen.getByTestId('custom-trigger').tagName).toBe('BUTTON');
    });
  });

  describe('DialogContent', () => {
    test('renders with correct styles', () => {
      render(
        <Dialog open>
          <DialogContent data-testid="content">
            <DialogTitle>Title</DialogTitle>
            <p>Content here</p>
          </DialogContent>
        </Dialog>
      );
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('fixed', 'z-50', 'bg-background', 'shadow-lg');
    });

    test('applies custom className', () => {
      render(
        <Dialog open>
          <DialogContent className="custom-dialog" data-testid="content">
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );
      expect(screen.getByTestId('content')).toHaveClass('custom-dialog');
    });

    test('has role dialog', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('has close button', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );
      // Close button has sr-only "Close" text
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  describe('DialogHeader', () => {
    test('renders with flex column layout', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogHeader data-testid="header">
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );
      expect(screen.getByTestId('header')).toHaveClass('flex', 'flex-col', 'space-y-1.5');
    });

    test('applies custom className', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogHeader className="custom-header" data-testid="header">
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );
      expect(screen.getByTestId('header')).toHaveClass('custom-header');
    });
  });

  describe('DialogFooter', () => {
    test('renders with flex layout', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogFooter data-testid="footer">
              <button>Cancel</button>
              <button>Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
      expect(screen.getByTestId('footer')).toHaveClass('flex', 'flex-col-reverse');
    });

    test('applies custom className', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogFooter className="custom-footer" data-testid="footer">
              <button>Action</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
      expect(screen.getByTestId('footer')).toHaveClass('custom-footer');
    });
  });

  describe('DialogTitle', () => {
    test('renders with correct styles', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle data-testid="title">My Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('text-lg', 'font-semibold', 'leading-none', 'tracking-tight');
    });

    test('renders text content', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Dialog Title Text</DialogTitle>
          </DialogContent>
        </Dialog>
      );
      expect(screen.getByText('Dialog Title Text')).toBeInTheDocument();
    });

    test('applies custom className', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle className="custom-title" data-testid="title">Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );
      expect(screen.getByTestId('title')).toHaveClass('custom-title');
    });
  });

  describe('DialogDescription', () => {
    test('renders with muted text', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription data-testid="desc">Description text</DialogDescription>
          </DialogContent>
        </Dialog>
      );
      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-sm', 'text-muted-foreground');
    });

    test('renders text content', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>This is the description</DialogDescription>
          </DialogContent>
        </Dialog>
      );
      expect(screen.getByText('This is the description')).toBeInTheDocument();
    });

    test('applies custom className', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription className="custom-desc" data-testid="desc">Desc</DialogDescription>
          </DialogContent>
        </Dialog>
      );
      expect(screen.getByTestId('desc')).toHaveClass('custom-desc');
    });
  });

  describe('full dialog composition', () => {
    test('renders complete dialog with all parts', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Action</DialogTitle>
              <DialogDescription>Are you sure you want to proceed?</DialogDescription>
            </DialogHeader>
            <p data-testid="body">Additional content here</p>
            <DialogFooter>
              <DialogClose asChild>
                <button data-testid="cancel">Cancel</button>
              </DialogClose>
              <button data-testid="confirm">Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
      expect(screen.getByTestId('body')).toBeInTheDocument();
      expect(screen.getByTestId('cancel')).toBeInTheDocument();
      expect(screen.getByTestId('confirm')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    test('dialog has aria-labelledby for title', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Accessible Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    test('dialog has aria-describedby for description', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description for screen readers</DialogDescription>
          </DialogContent>
        </Dialog>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby');
    });
  });
});
