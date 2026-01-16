import React from 'react';
import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '../../src/services/api';

// Mock API functions directly on the imported object (doesn't pollute other tests)
const mockGetWorkspaces = mock(() => Promise.resolve([]));
const mockCreateWorkspace = mock(() => Promise.resolve({ id: 'new-ws', name: 'New' }));

beforeEach(() => {
  (api as any).getWorkspaces = mockGetWorkspaces;
  (api as any).createWorkspace = mockCreateWorkspace;
});

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: (key: string) => localStorageMock.store[key] || null,
  setItem: (key: string, value: string) => {
    localStorageMock.store[key] = value;
  },
  removeItem: (key: string) => {
    delete localStorageMock.store[key];
  },
  clear: () => {
    localStorageMock.store = {};
  },
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

import { useWorkspace } from '../../src/hooks/useWorkspace';

// Test component
function WorkspaceTestComponent() {
  const { workspaces, currentWorkspace, isLoading, createWorkspace, switchWorkspace } = useWorkspace();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="workspaces-count">{workspaces.length}</div>
      <div data-testid="current-workspace">{currentWorkspace?.name || 'none'}</div>
      <ul data-testid="workspace-list">
        {workspaces.map((ws: any) => (
          <li key={ws.id} onClick={() => switchWorkspace(ws.id)}>
            {ws.name}
          </li>
        ))}
      </ul>
      <button onClick={() => createWorkspace.mutate('New Workspace')}>Create</button>
    </div>
  );
}

describe('WorkspaceContext Integration', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockGetWorkspaces.mockClear();
    mockCreateWorkspace.mockClear();
    localStorageMock.clear();
  });

  describe('initial state', () => {
    test('shows loading state initially', () => {
      mockGetWorkspaces.mockImplementation(() => new Promise(() => {}));

      render(<WorkspaceTestComponent />, { wrapper });

      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
    });

    test('loads workspaces on mount', async () => {
      mockGetWorkspaces.mockResolvedValue([
        { id: 'ws1', name: 'Workspace 1' },
        { id: 'ws2', name: 'Workspace 2' },
      ]);

      render(<WorkspaceTestComponent />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('workspaces-count')).toHaveTextContent('2');
      });
    });

    test('shows no workspaces when empty', async () => {
      mockGetWorkspaces.mockResolvedValue([]);

      render(<WorkspaceTestComponent />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('workspaces-count')).toHaveTextContent('0');
      });
    });
  });

  describe('current workspace', () => {
    test('selects first workspace by default', async () => {
      mockGetWorkspaces.mockResolvedValue([
        { id: 'ws1', name: 'First' },
        { id: 'ws2', name: 'Second' },
      ]);

      render(<WorkspaceTestComponent />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('current-workspace')).toHaveTextContent('First');
      });
    });

    test('restores workspace from localStorage', async () => {
      localStorageMock.setItem('verity_current_workspace', 'ws2');
      mockGetWorkspaces.mockResolvedValue([
        { id: 'ws1', name: 'First' },
        { id: 'ws2', name: 'Second' },
      ]);

      render(<WorkspaceTestComponent />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('current-workspace')).toHaveTextContent('Second');
      });
    });

    test('falls back to first workspace if stored ID not found', async () => {
      localStorageMock.setItem('verity_current_workspace', 'nonexistent');
      mockGetWorkspaces.mockResolvedValue([
        { id: 'ws1', name: 'First' },
        { id: 'ws2', name: 'Second' },
      ]);

      render(<WorkspaceTestComponent />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('current-workspace')).toHaveTextContent('First');
      });
    });
  });

  describe('switching workspaces', () => {
    test('updates localStorage when switching', async () => {
      mockGetWorkspaces.mockResolvedValue([
        { id: 'ws1', name: 'First' },
        { id: 'ws2', name: 'Second' },
      ]);

      render(<WorkspaceTestComponent />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      fireEvent.click(screen.getByText('Second'));

      await waitFor(() => {
        expect(localStorageMock.getItem('verity_current_workspace')).toBe('ws2');
      });
    });
  });

  describe('creating workspaces', () => {
    test('calls API to create workspace', async () => {
      mockGetWorkspaces.mockResolvedValue([]);
      mockCreateWorkspace.mockResolvedValueOnce({ id: 'new-ws', name: 'New Workspace' });

      render(<WorkspaceTestComponent />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(mockCreateWorkspace).toHaveBeenCalledWith('New Workspace');
      });
    });
  });

  describe('error handling', () => {
    test('handles API error gracefully', async () => {
      mockGetWorkspaces.mockRejectedValue(new Error('Network error'));

      render(<WorkspaceTestComponent />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('workspaces-count')).toHaveTextContent('0');
      });
    });
  });
});
