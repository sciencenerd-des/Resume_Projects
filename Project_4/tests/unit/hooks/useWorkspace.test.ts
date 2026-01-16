import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '@/services/api';

// Create mock functions
const mockGetWorkspaces = mock(() => Promise.resolve([]));
const mockCreateWorkspace = mock(() => Promise.resolve({ id: 'new-ws', name: 'New Workspace' }));

// Apply mocks directly to the api object (doesn't pollute other tests)
beforeEach(() => {
  (api as any).getWorkspaces = mockGetWorkspaces;
  (api as any).createWorkspace = mockCreateWorkspace;
});

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: mock((key: string) => localStorageMock.store[key] || null),
  setItem: mock((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: mock((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: mock(() => {
    localStorageMock.store = {};
  }),
};

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

import { useWorkspace } from '@/hooks/useWorkspace';

describe('useWorkspace', () => {
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

  describe('workspaces fetching', () => {
    test('fetches workspaces on mount', async () => {
      mockGetWorkspaces.mockResolvedValueOnce([]);
      mockGetWorkspaces.mockResolvedValueOnce([]);

      renderHook(() => useWorkspace(), { wrapper });

      await waitFor(() => {
        expect(mockGetWorkspaces).toHaveBeenCalled();
      });
    });

    test('returns workspaces list', async () => {
      const workspaces = [
        { id: 'ws1', name: 'Workspace 1' },
        { id: 'ws2', name: 'Workspace 2' },
      ];
      mockGetWorkspaces.mockResolvedValue(workspaces);

      const { result } = renderHook(() => useWorkspace(), { wrapper });

      await waitFor(() => {
        expect(result.current.workspaces).toEqual(workspaces);
      });
    });

    test('returns empty array initially', () => {
      mockGetWorkspaces.mockImplementation(() => new Promise(() => {}));
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      expect(result.current.workspaces).toEqual([]);
    });
  });

  describe('current workspace', () => {
    test('returns null when no workspace selected and none exist', async () => {
      mockGetWorkspaces.mockResolvedValue([]);

      const { result } = renderHook(() => useWorkspace(), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWorkspace).toBeNull();
      });
    });

    test('falls back to first workspace when none selected', async () => {
      const workspaces = [
        { id: 'ws1', name: 'Workspace 1' },
        { id: 'ws2', name: 'Workspace 2' },
      ];
      mockGetWorkspaces.mockResolvedValue(workspaces);

      const { result } = renderHook(() => useWorkspace(), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWorkspace?.id).toBe('ws1');
      });
    });

    test('uses workspace from localStorage when available', async () => {
      localStorageMock.store['verity_current_workspace'] = 'ws2';
      const workspaces = [
        { id: 'ws1', name: 'Workspace 1' },
        { id: 'ws2', name: 'Workspace 2' },
      ];
      mockGetWorkspaces.mockResolvedValue(workspaces);

      const { result } = renderHook(() => useWorkspace(), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWorkspace?.id).toBe('ws2');
      });
    });

    test('falls back to first workspace if stored ID not found', async () => {
      localStorageMock.store['verity_current_workspace'] = 'nonexistent';
      const workspaces = [
        { id: 'ws1', name: 'Workspace 1' },
        { id: 'ws2', name: 'Workspace 2' },
      ];
      mockGetWorkspaces.mockResolvedValue(workspaces);

      const { result } = renderHook(() => useWorkspace(), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWorkspace?.id).toBe('ws1');
      });
    });
  });

  describe('createWorkspace mutation', () => {
    test('provides createWorkspace mutation', async () => {
      mockGetWorkspaces.mockResolvedValue([]);

      const { result } = renderHook(() => useWorkspace(), { wrapper });

      await waitFor(() => {
        expect(result.current.createWorkspace).toBeDefined();
      });
    });

    test('calls API with workspace name', async () => {
      mockGetWorkspaces.mockResolvedValue([]);
      mockCreateWorkspace.mockResolvedValueOnce({ id: 'new-ws', name: 'New Workspace' });

      const { result } = renderHook(() => useWorkspace(), { wrapper });

      await waitFor(() => !result.current.isLoading);

      act(() => {
        result.current.createWorkspace.mutate('New Workspace');
      });

      await waitFor(() => {
        expect(mockCreateWorkspace).toHaveBeenCalledWith('New Workspace');
      });
    });

    test('invalidates workspaces query on success', async () => {
      mockGetWorkspaces.mockResolvedValue([]);
      mockCreateWorkspace.mockResolvedValueOnce({ id: 'new-ws', name: 'New Workspace' });

      const invalidateSpy = mock(() => Promise.resolve());
      queryClient.invalidateQueries = invalidateSpy as any;

      const { result } = renderHook(() => useWorkspace(), { wrapper });

      await waitFor(() => !result.current.isLoading);

      act(() => {
        result.current.createWorkspace.mutate('New Workspace');
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalled();
      });
    });
  });

  describe('switchWorkspace', () => {
    test('provides switchWorkspace function', async () => {
      mockGetWorkspaces.mockResolvedValue([]);

      const { result } = renderHook(() => useWorkspace(), { wrapper });

      await waitFor(() => {
        expect(typeof result.current.switchWorkspace).toBe('function');
      });
    });

    test('stores selected workspace ID in localStorage', async () => {
      mockGetWorkspaces.mockResolvedValue([{ id: 'ws1', name: 'Workspace 1' }]);

      const { result } = renderHook(() => useWorkspace(), { wrapper });

      await waitFor(() => !result.current.isLoading);

      act(() => {
        result.current.switchWorkspace('ws2');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('verity_current_workspace', 'ws2');
    });

    test('invalidates related queries', async () => {
      mockGetWorkspaces.mockResolvedValue([{ id: 'ws1', name: 'Workspace 1' }]);

      const invalidateSpy = mock(() => Promise.resolve());
      queryClient.invalidateQueries = invalidateSpy as any;

      const { result } = renderHook(() => useWorkspace(), { wrapper });

      await waitFor(() => !result.current.isLoading);

      act(() => {
        result.current.switchWorkspace('ws2');
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    test('isLoading is true while fetching', () => {
      mockGetWorkspaces.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useWorkspace(), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });

    test('isLoading is false after fetch completes', async () => {
      mockGetWorkspaces.mockResolvedValue([]);

      const { result } = renderHook(() => useWorkspace(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('edge cases', () => {
    test('handles empty workspace name', async () => {
      mockGetWorkspaces.mockResolvedValue([]);
      mockCreateWorkspace.mockResolvedValueOnce({ id: 'ws', name: '' });

      const { result } = renderHook(() => useWorkspace(), { wrapper });

      await waitFor(() => !result.current.isLoading);

      act(() => {
        result.current.createWorkspace.mutate('');
      });

      await waitFor(() => {
        expect(mockCreateWorkspace).toHaveBeenCalledWith('');
      });
    });

    test('handles API error', async () => {
      mockGetWorkspaces.mockRejectedValueOnce(new Error('Network error'));
      mockGetWorkspaces.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useWorkspace(), { wrapper });

      await waitFor(() => {
        expect(result.current.workspaces).toEqual([]);
      });
    });
  });
});
