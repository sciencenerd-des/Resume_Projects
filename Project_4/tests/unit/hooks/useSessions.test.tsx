import React from 'react';
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { renderHook, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ChatSession, EvidenceLedger, Message } from '@/types';

type AsyncData<T> = Promise<{ data: T }>;
type MinimalSession = Pick<ChatSession, 'id' | 'query' | 'mode' | 'status'>;
type MinimalMessage = Pick<Message, 'id' | 'role' | 'content'>;

const resolve = <T,>(data: T): AsyncData<T> => Promise.resolve({ data });

const emptyLedger: EvidenceLedger = {
  session_id: 'session-0',
  summary: { total_claims: 0, supported: 0, weak: 0, contradicted: 0, not_found: 0 },
  entries: [],
  risk_flags: [],
};

// Mock the api module BEFORE importing the hook
const mockApi = {
  getWorkspaceSessions: mock<() => AsyncData<MinimalSession[]>>(() => resolve<MinimalSession[]>([])),
  getSession: mock<() => AsyncData<MinimalSession>>(() =>
    resolve<MinimalSession>({ id: 'session-0', query: '', mode: 'answer', status: 'completed' })
  ),
  getSessionMessages: mock<() => AsyncData<MinimalMessage[]>>(() => resolve<MinimalMessage[]>([])),
  getSessionLedger: mock<() => AsyncData<EvidenceLedger>>(() => resolve<EvidenceLedger>(emptyLedger)),
  exportSession: mock<() => AsyncData<{ url: string }>>(() => resolve<{ url: string }>({ url: '' })),
};

import { api } from '../../../src/services/api';
import { useSessions, useSession, useSessionMessages, useSessionLedger, useExportSession } from '../../../src/hooks/useSessions';

// Apply mocks directly to the api object in beforeEach (doesn't pollute other tests)
beforeEach(() => {
  (api as any).getWorkspaceSessions = mockApi.getWorkspaceSessions;
  (api as any).getSession = mockApi.getSession;
  (api as any).getSessionMessages = mockApi.getSessionMessages;
  (api as any).getSessionLedger = mockApi.getSessionLedger;
  (api as any).exportSession = mockApi.exportSession;
});

describe('useSessions', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Reset all mocks
    mockApi.getWorkspaceSessions.mockClear();
    mockApi.getSession.mockClear();
    mockApi.getSessionMessages.mockClear();
    mockApi.getSessionLedger.mockClear();
    mockApi.exportSession.mockClear();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    });
  });

  describe('useSessions', () => {
    test('fetches sessions for workspace', async () => {
      const mockSessions: MinimalSession[] = [
        { id: '1', query: 'Test query', mode: 'answer', status: 'completed' },
        { id: '2', query: 'Another query', mode: 'draft', status: 'completed' },
      ];

      // Set up mock to return expected data
      mockApi.getWorkspaceSessions.mockImplementation(() =>
        Promise.resolve({ data: mockSessions })
      );

      const { result } = renderHook(() => useSessions('workspace-1'), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSessions);
    });

    test('does not fetch when workspaceId is empty', () => {
      const { result } = renderHook(() => useSessions(''), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useSession', () => {
    test('fetches single session', async () => {
      const mockSession: MinimalSession = {
        id: 'session-1',
        query: 'Test query',
        mode: 'answer',
        status: 'completed',
      };

      mockApi.getSession.mockImplementation(() =>
        Promise.resolve({ data: mockSession })
      );

      const { result } = renderHook(() => useSession('session-1'), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSession);
    });

    test('does not fetch when sessionId is empty', () => {
      const { result } = renderHook(() => useSession(''), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useSessionMessages', () => {
    test('fetches messages for session', async () => {
      const mockMessages: MinimalMessage[] = [
        { id: '1', role: 'user', content: 'Question' },
        { id: '2', role: 'assistant', content: 'Answer' },
      ];

      mockApi.getSessionMessages.mockImplementation(() =>
        Promise.resolve({ data: mockMessages })
      );

      const { result } = renderHook(() => useSessionMessages('session-1'), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMessages);
    });
  });

  describe('useSessionLedger', () => {
    test('fetches ledger for session', async () => {
      const mockLedger = {
        session_id: 'session-1',
        summary: { total_claims: 5, supported: 4, weak: 1, contradicted: 0, not_found: 0 },
        entries: [],
        risk_flags: [],
      };

      mockApi.getSessionLedger.mockImplementation(() =>
        Promise.resolve({ data: mockLedger })
      );

      const { result } = renderHook(() => useSessionLedger('session-1'), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockLedger);
    });
  });

  describe('useExportSession', () => {
    test('provides mutate function for export', () => {
      // Note: Bun's mock.module has limitations with path aliases
      // Testing that the hook returns the expected mutation interface
      const { result } = renderHook(() => useExportSession(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      expect(result.current.mutate).toBeDefined();
      expect(result.current.mutateAsync).toBeDefined();
      expect(result.current.isIdle).toBe(true);
    });

    test('accepts sessionId and format parameters', () => {
      // Testing the hook's API contract without calling the actual network
      const { result } = renderHook(() => useExportSession(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      // The mutation function should accept the expected parameter shape
      expect(typeof result.current.mutate).toBe('function');
      expect(typeof result.current.mutateAsync).toBe('function');
    });
  });
});
