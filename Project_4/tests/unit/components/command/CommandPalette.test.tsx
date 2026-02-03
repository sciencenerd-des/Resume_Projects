import React from 'react';
import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommandPalette } from '@/components/command/CommandPalette';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Mock the hooks
const mockNavigate = mock(() => {});
const mockSignOutMutate = mock(() => {});

mock.module('react-router-dom', () => ({
  ...require('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

mock.module('@/hooks/useConvexWorkspace', () => ({
  useConvexWorkspace: () => ({
    currentWorkspace: { _id: 'ws-123', name: 'Test Workspace' },
    workspaces: [
      { _id: 'ws-123', name: 'Test Workspace' },
      { _id: 'ws-456', name: 'Another Workspace' },
    ],
    isLoading: false,
    createWorkspace: mock(() => {}),
    switchWorkspace: mock(() => {}),
  }),
}));

mock.module('@/hooks/useConvexAuth', () => ({
  useConvexAuthState: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false,
    signOut: mockSignOutMutate,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
};

describe('CommandPalette', () => {
  const defaultProps = {
    open: true,
    onOpenChange: () => {},
  };

  beforeEach(() => {
    mockNavigate.mockClear();
    mockSignOutMutate.mockClear();
  });

  describe('rendering', () => {
    test('renders when open', () => {
      const Wrapper = createWrapper();
      const { container } = render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(container.querySelector('.fixed.inset-0')).toBeInTheDocument();
    });

    test('does not render when closed', () => {
      const Wrapper = createWrapper();
      const { container } = render(
        <Wrapper>
          <CommandPalette open={false} onOpenChange={() => {}} />
        </Wrapper>
      );
      expect(container.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
    });

    test('renders search input', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(screen.getByPlaceholderText(/search commands/i)).toBeInTheDocument();
    });

    test('renders navigation commands', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(screen.getByText('New Query')).toBeInTheDocument();
      expect(screen.getByText('Upload Documents')).toBeInTheDocument();
      expect(screen.getByText('Toggle Evidence Ledger')).toBeInTheDocument();
      expect(screen.getByText('Switch Workspace')).toBeInTheDocument();
    });

    test('renders action commands', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(screen.getByText('Toggle Theme')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    test('renders command groups', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(screen.getByText('Navigation')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    test('renders keyboard shortcuts', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(screen.getByText('⌘N')).toBeInTheDocument();
      expect(screen.getByText('⌘U')).toBeInTheDocument();
      expect(screen.getByText('⌘L')).toBeInTheDocument();
    });

    test('renders workspaces when available', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(screen.getByText('Workspaces')).toBeInTheDocument();
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
      expect(screen.getByText('Another Workspace')).toBeInTheDocument();
    });

    test('shows current workspace indicator', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(screen.getByText('Current')).toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    test('has search input with placeholder', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      const input = screen.getByPlaceholderText(/search commands, documents/i);
      expect(input).toBeInTheDocument();
    });

    test('can type in search input', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      const input = screen.getByPlaceholderText(/search commands/i);
      fireEvent.change(input, { target: { value: 'query' } });
      expect(input).toHaveValue('query');
    });

    test('shows no results message when search has no matches', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      const input = screen.getByPlaceholderText(/search commands/i);
      fireEvent.change(input, { target: { value: 'zzzzzznonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('No results found.')).toBeInTheDocument();
      });
    });
  });

  describe('interactions', () => {
    test('calls onOpenChange(false) when backdrop is clicked', () => {
      const Wrapper = createWrapper();
      let opened = true;
      const { container } = render(
        <Wrapper>
          <CommandPalette
            open={true}
            onOpenChange={(open) => { opened = open; }}
          />
        </Wrapper>
      );

      const backdrop = container.querySelector('.bg-background\\/80');
      fireEvent.click(backdrop!);
      expect(opened).toBe(false);
    });

    test('closes and navigates when command is selected', async () => {
      const Wrapper = createWrapper();
      let closed = false;
      render(
        <Wrapper>
          <CommandPalette
            open={true}
            onOpenChange={(open) => { closed = !open; }}
          />
        </Wrapper>
      );

      // Click on Switch Workspace command
      fireEvent.click(screen.getByText('Switch Workspace'));

      expect(closed).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('/workspaces');
    });
  });

  describe('keyboard shortcuts', () => {
    test('renders ESC hint', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(screen.getByText('ESC')).toBeInTheDocument();
    });

    test('renders footer with navigation hints', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(screen.getByText('↑↓ Navigate')).toBeInTheDocument();
      expect(screen.getByText('↵ Select')).toBeInTheDocument();
      expect(screen.getByText('ESC Close')).toBeInTheDocument();
    });

    test('shows ⌘K hint', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(screen.getByText('⌘K to search')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    test('has backdrop blur effect', () => {
      const Wrapper = createWrapper();
      const { container } = render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(container.querySelector('.backdrop-blur-sm')).toBeInTheDocument();
    });

    test('has rounded dialog', () => {
      const Wrapper = createWrapper();
      const { container } = render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(container.querySelector('.rounded-xl')).toBeInTheDocument();
    });

    test('has shadow on dialog', () => {
      const Wrapper = createWrapper();
      const { container } = render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(container.querySelector('.shadow-2xl')).toBeInTheDocument();
    });

    test('has max width constraint', () => {
      const Wrapper = createWrapper();
      const { container } = render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(container.querySelector('.max-w-\\[640px\\]')).toBeInTheDocument();
    });

    test('dialog is centered horizontally', () => {
      const Wrapper = createWrapper();
      const { container } = render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(container.querySelector('.left-1\\/2')).toBeInTheDocument();
      expect(container.querySelector('.-translate-x-1\\/2')).toBeInTheDocument();
    });
  });

  describe('icons', () => {
    test('renders search icon', () => {
      const Wrapper = createWrapper();
      const { container } = render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    test('renders command icons', () => {
      const Wrapper = createWrapper();
      const { container } = render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      // Should have many icons for all the commands
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(5);
    });
  });

  describe('theme toggle', () => {
    test('shows theme toggle command', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(screen.getByText('Toggle Theme')).toBeInTheDocument();
    });
  });

  describe('sign out', () => {
    test('shows sign out command', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    test('sign out has destructive styling', () => {
      const Wrapper = createWrapper();
      const { container } = render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      // Sign out item has text-destructive class
      const signOutItems = container.querySelectorAll('.text-destructive');
      expect(signOutItems.length).toBeGreaterThan(0);
    });
  });

  describe('command list', () => {
    test('has scrollable command list', () => {
      const Wrapper = createWrapper();
      const { container } = render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(container.querySelector('.overflow-y-auto')).toBeInTheDocument();
    });

    test('has max height on list', () => {
      const Wrapper = createWrapper();
      const { container } = render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(container.querySelector('.max-h-\\[400px\\]')).toBeInTheDocument();
    });
  });

  describe('input area', () => {
    test('has search icon before input', () => {
      const Wrapper = createWrapper();
      const { container } = render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      const inputArea = container.querySelector('.border-b');
      expect(inputArea).toBeInTheDocument();
      expect(inputArea?.querySelector('svg')).toBeInTheDocument();
    });

    test('input has full height styling', () => {
      const Wrapper = createWrapper();
      const { container } = render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      expect(container.querySelector('.h-14')).toBeInTheDocument();
    });
  });

  describe('footer', () => {
    test('has footer with keyboard hints', () => {
      const Wrapper = createWrapper();
      const { container } = render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      const footer = container.querySelector('.border-t.border-border');
      expect(footer).toBeInTheDocument();
    });

    test('footer has muted text styling', () => {
      const Wrapper = createWrapper();
      const { container } = render(
        <Wrapper>
          <CommandPalette {...defaultProps} />
        </Wrapper>
      );
      const mutedText = container.querySelectorAll('.text-muted-foreground');
      expect(mutedText.length).toBeGreaterThan(0);
    });
  });
});
