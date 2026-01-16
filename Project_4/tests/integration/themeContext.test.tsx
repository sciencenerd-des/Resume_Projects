import React from 'react';
import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Use the globally defined localStorage from happy-dom
// Don't try to redefine it

import { ThemeProvider, useTheme } from '../../src/contexts/ThemeContext';

// Test component - use resolvedTheme as per actual ThemeContext
function ThemeTestComponent() {
  const { theme, setTheme, resolvedTheme, toggleTheme } = useTheme();

  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="resolved-theme">{resolvedTheme}</div>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('system')}>System</button>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

describe('ThemeContext Integration', () => {
  beforeEach(() => {
    // Clear localStorage using the existing global
    localStorage.clear();
    document.documentElement.classList.remove('dark', 'light');
  });

  describe('ThemeProvider', () => {
    test('provides theme context to children', async () => {
      render(
        <ThemeProvider>
          <ThemeTestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toBeInTheDocument();
    });

    test('defaults to dark theme when no stored preference', async () => {
      render(
        <ThemeProvider>
          <ThemeTestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      });
    });

    test('restores theme from localStorage', async () => {
      localStorage.setItem('theme', 'light');

      render(
        <ThemeProvider>
          <ThemeTestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      });
    });
  });

  describe('setTheme', () => {
    test('changes theme to light', async () => {
      render(
        <ThemeProvider>
          <ThemeTestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText('Light'));

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      });
    });

    test('changes theme to dark', async () => {
      localStorage.setItem('theme', 'light');

      render(
        <ThemeProvider>
          <ThemeTestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText('Dark'));

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      });
    });

    test('changes theme to system', async () => {
      render(
        <ThemeProvider>
          <ThemeTestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText('System'));

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
      });
    });

    test('persists theme to localStorage', async () => {
      render(
        <ThemeProvider>
          <ThemeTestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText('Light'));

      await waitFor(() => {
        expect(localStorage.getItem('theme')).toBe('light');
      });
    });
  });

  describe('resolvedTheme', () => {
    test('returns dark when theme is dark', async () => {
      render(
        <ThemeProvider>
          <ThemeTestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
      });
    });

    test('returns light when theme is light', async () => {
      localStorage.setItem('theme', 'light');

      render(
        <ThemeProvider>
          <ThemeTestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
      });
    });
  });

  describe('toggleTheme', () => {
    test('toggles from dark to light', async () => {
      render(
        <ThemeProvider>
          <ThemeTestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText('Toggle'));

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      });
    });

    test('toggles from light to dark', async () => {
      localStorage.setItem('theme', 'light');

      render(
        <ThemeProvider>
          <ThemeTestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText('Toggle'));

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      });
    });
  });

  describe('useTheme hook', () => {
    test('throws error when used outside provider', () => {
      const consoleError = console.error;
      console.error = () => {};

      expect(() => {
        render(<ThemeTestComponent />);
      }).toThrow('useTheme must be used within a ThemeProvider');

      console.error = consoleError;
    });
  });

  describe('DOM class management', () => {
    test('adds dark class to document element', async () => {
      render(
        <ThemeProvider>
          <ThemeTestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    test('switches to light class when theme changes', async () => {
      render(
        <ThemeProvider>
          <ThemeTestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText('Light'));

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });
    });
  });
});
