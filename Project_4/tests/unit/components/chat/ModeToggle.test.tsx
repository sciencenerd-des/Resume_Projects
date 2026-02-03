import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModeToggle, type QueryMode } from '@/components/chat/ModeToggle';

describe('ModeToggle', () => {
  describe('rendering', () => {
    test('renders answer mode option', () => {
      render(<ModeToggle mode="answer" onChange={() => {}} />);
      expect(screen.getByText('Answer')).toBeInTheDocument();
    });

    test('renders draft mode option', () => {
      render(<ModeToggle mode="answer" onChange={() => {}} />);
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    test('displays current mode with aria-pressed true', () => {
      render(<ModeToggle mode="answer" onChange={() => {}} />);
      const answerBtn = screen.getByRole('button', { name: /answer/i });
      expect(answerBtn).toHaveAttribute('aria-pressed', 'true');
    });

    test('displays non-selected mode with aria-pressed false', () => {
      render(<ModeToggle mode="answer" onChange={() => {}} />);
      const draftBtn = screen.getByRole('button', { name: /draft/i });
      expect(draftBtn).toHaveAttribute('aria-pressed', 'false');
    });

    test('draft mode shows as active when selected', () => {
      render(<ModeToggle mode="draft" onChange={() => {}} />);
      const draftBtn = screen.getByRole('button', { name: /draft/i });
      expect(draftBtn).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('interactions', () => {
    test('calls onChange with "draft" when draft is clicked', () => {
      let selectedMode: string = 'answer';
      render(
        <ModeToggle
          mode="answer"
          onChange={(mode) => { selectedMode = mode; }}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /draft/i }));
      expect(selectedMode).toBe('draft');
    });

    test('calls onChange with "answer" when answer is clicked', () => {
      let selectedMode: string = 'draft';
      render(
        <ModeToggle
          mode="draft"
          onChange={(mode) => { selectedMode = mode; }}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /answer/i }));
      expect(selectedMode).toBe('answer');
    });

    test('calls onChange when clicking already active mode', () => {
      let callCount = 0;
      render(
        <ModeToggle
          mode="answer"
          onChange={() => { callCount++; }}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /answer/i }));
      // Component always calls onChange
      expect(callCount).toBe(1);
    });
  });

  describe('styling', () => {
    test('has toggle container with border and padding', () => {
      const { container } = render(<ModeToggle mode="answer" onChange={() => {}} />);
      const toggle = container.querySelector('.inline-flex.rounded-lg');
      expect(toggle).toBeInTheDocument();
    });

    test('active mode has background and foreground styling', () => {
      render(<ModeToggle mode="answer" onChange={() => {}} />);
      const answerBtn = screen.getByRole('button', { name: /answer/i });
      expect(answerBtn).toHaveClass('bg-background', 'text-foreground');
    });

    test('inactive mode has muted foreground styling', () => {
      render(<ModeToggle mode="answer" onChange={() => {}} />);
      const draftBtn = screen.getByRole('button', { name: /draft/i });
      expect(draftBtn).toHaveClass('text-muted-foreground');
    });

    test('applies custom className', () => {
      const { container } = render(<ModeToggle mode="answer" onChange={() => {}} className="custom-toggle" />);
      const toggle = container.querySelector('.custom-toggle');
      expect(toggle).toBeInTheDocument();
    });
  });

  describe('icons', () => {
    test('answer mode has MessageSquare icon', () => {
      render(<ModeToggle mode="answer" onChange={() => {}} />);
      const answerBtn = screen.getByRole('button', { name: /answer/i });
      expect(answerBtn.querySelector('svg')).toBeInTheDocument();
    });

    test('draft mode has FileText icon', () => {
      render(<ModeToggle mode="draft" onChange={() => {}} />);
      const draftBtn = screen.getByRole('button', { name: /draft/i });
      expect(draftBtn.querySelector('svg')).toBeInTheDocument();
    });

    test('icons have correct size classes', () => {
      render(<ModeToggle mode="answer" onChange={() => {}} />);
      const answerBtn = screen.getByRole('button', { name: /answer/i });
      const svg = answerBtn.querySelector('svg');
      expect(svg).toHaveClass('w-3.5', 'h-3.5');
    });
  });

  describe('accessibility', () => {
    test('buttons are focusable', () => {
      render(<ModeToggle mode="answer" onChange={() => {}} />);
      const answerBtn = screen.getByRole('button', { name: /answer/i });
      answerBtn.focus();
      expect(answerBtn).toHaveFocus();
    });

    test('has group role', () => {
      render(<ModeToggle mode="answer" onChange={() => {}} />);
      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    test('has aria-label for the toggle group', () => {
      render(<ModeToggle mode="answer" onChange={() => {}} />);
      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('aria-label', 'Query mode selection');
    });

    test('both buttons have aria-pressed attributes', () => {
      render(<ModeToggle mode="answer" onChange={() => {}} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
      buttons.forEach(btn => {
        expect(btn).toHaveAttribute('aria-pressed');
      });
    });

    test('buttons have transition styling', () => {
      render(<ModeToggle mode="answer" onChange={() => {}} />);
      const answerBtn = screen.getByRole('button', { name: /answer/i });
      expect(answerBtn).toHaveClass('transition-all');
    });
  });

  describe('controlled component', () => {
    test('reflects external mode changes', () => {
      const { rerender } = render(<ModeToggle mode="answer" onChange={() => {}} />);

      expect(screen.getByRole('button', { name: /answer/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /draft/i })).toHaveAttribute('aria-pressed', 'false');

      rerender(<ModeToggle mode="draft" onChange={() => {}} />);

      expect(screen.getByRole('button', { name: /answer/i })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: /draft/i })).toHaveAttribute('aria-pressed', 'true');
    });

    test('mode state is purely controlled', () => {
      let mode: string = 'answer';
      const { rerender } = render(
        <ModeToggle mode={mode as QueryMode} onChange={(m) => { mode = m; }} />
      );

      fireEvent.click(screen.getByRole('button', { name: /draft/i }));
      expect(mode).toBe('draft');

      // Without re-rendering, visual state stays the same
      expect(screen.getByRole('button', { name: /answer/i })).toHaveAttribute('aria-pressed', 'true');

      // After re-render with new state, visual updates
      rerender(<ModeToggle mode={mode as QueryMode} onChange={() => {}} />);
      expect(screen.getByRole('button', { name: /draft/i })).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
