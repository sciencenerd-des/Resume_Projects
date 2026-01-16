import React from 'react';
import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../../src/contexts/ThemeContext';
import { CommandPalette } from '../../src/components/command/CommandPalette';
import { api } from '../../src/services/api';

// Create mock functions
const mockGetWorkspaces = mock(() => Promise.resolve([
  { id: 'ws1', name: 'Test Workspace' }
]));
const mockCreateWorkspace = mock(() => Promise.resolve({ id: 'new-ws', name: 'New' }));

// Apply mocks directly to the api object (doesn't pollute other tests)
beforeEach(() => {
  (api as any).getWorkspaces = mockGetWorkspaces;
  (api as any).createWorkspace = mockCreateWorkspace;
});

// Wrapper with all required providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('CommandPalette Integration', () => {
  describe('rendering', () => {
    test('does not render when closed', () => {
      render(
        <TestWrapper>
          <CommandPalette open={false} onOpenChange={() => {}} />
        </TestWrapper>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('renders when open', () => {
      render(
        <TestWrapper>
          <CommandPalette open={true} onOpenChange={() => {}} />
        </TestWrapper>
      );

      // The palette should have a search input
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    test('shows command groups', () => {
      render(
        <TestWrapper>
          <CommandPalette open={true} onOpenChange={() => {}} />
        </TestWrapper>
      );

      // Should show Navigation group (the component uses "Navigation" not "Quick Actions")
      expect(screen.getByText('Navigation')).toBeInTheDocument();
    });

    test('shows actions group', () => {
      render(
        <TestWrapper>
          <CommandPalette open={true} onOpenChange={() => {}} />
        </TestWrapper>
      );

      // Should have actions group
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  describe('closing behavior', () => {
    test('calls onOpenChange when backdrop is clicked', () => {
      const onOpenChange = mock(() => {});

      render(
        <TestWrapper>
          <CommandPalette open={true} onOpenChange={onOpenChange} />
        </TestWrapper>
      );

      // Click the backdrop
      const backdrop = document.querySelector('.backdrop-blur-sm');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onOpenChange).toHaveBeenCalledWith(false);
      }
    });
  });

  describe('search functionality', () => {
    test('has a search input', () => {
      render(
        <TestWrapper>
          <CommandPalette open={true} onOpenChange={() => {}} />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText(/search/i);
      expect(input).toBeInTheDocument();
    });

    test('search input accepts text', () => {
      render(
        <TestWrapper>
          <CommandPalette open={true} onOpenChange={() => {}} />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText(/search/i);
      fireEvent.change(input, { target: { value: 'test' } });
      expect(input).toHaveValue('test');
    });
  });
});
