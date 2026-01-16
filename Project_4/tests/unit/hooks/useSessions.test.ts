import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '@/services/api';
import {
  useSessions,
  useSession,
  useSessionMessages,
  useSessionLedger,
  useExportSession,
} from '@/hooks/useSessions';

// Create mock functions - we'll assign them to the api object before each test
const mockGetWorkspaceSessions = mock(() => Promise.resolve({ data: [] }));
const mockGetSession = mock(() => Promise.resolve({ data: null }));
const mockGetSessionMessages = mock(() => Promise.resolve({ data: [] }));
const mockGetSessionLedger = mock(() => Promise.resolve({ data: [] }));
const mockExportSession = mock(() => Promise.resolve({ data: {} }));

// Mock api methods directly on the imported object (doesn't pollute other tests)
beforeEach(() => {
  (api as any).getWorkspaceSessions = mockGetWorkspaceSessions;
  (api as any).getSession = mockGetSession;
  (api as any).getSessionMessages = mockGetSessionMessages;
  (api as any).getSessionLedger = mockGetSessionLedger;
  (api as any).exportSession = mockExportSession;
});

describe('useSessions', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockGetWorkspaceSessions.mockClear();
  });

  test('fetches sessions for workspace', async () => {
    mockGetWorkspaceSessions.mockResolvedValueOnce({
      data: [{ id: 'session1' }, { id: 'session2' }],
    });

    const { result } = renderHook(() => useSessions('ws1'), { wrapper });

    await waitFor(() => {
      expect(mockGetWorkspaceSessions).toHaveBeenCalledWith('ws1');
    });
  });

  test('returns sessions data', async () => {
    const sessions = [
      { id: 'session1', title: 'Session 1' },
      { id: 'session2', title: 'Session 2' },
    ];
    mockGetWorkspaceSessions.mockResolvedValueOnce({ data: sessions });

    const { result } = renderHook(() => useSessions('ws1'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(sessions);
    });
  });

  test('does not fetch with empty workspaceId', () => {
    renderHook(() => useSessions(''), { wrapper });
    expect(mockGetWorkspaceSessions).not.toHaveBeenCalled();
  });

  test('is loading while fetching', () => {
    mockGetWorkspaceSessions.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useSessions('ws1'), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  test('handles fetch error', async () => {
    mockGetWorkspaceSessions.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useSessions('ws1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useSession', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockGetSession.mockClear();
  });

  test('fetches session by ID', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { id: 'session1', title: 'Test Session' },
    });

    renderHook(() => useSession('session1'), { wrapper });

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalledWith('session1');
    });
  });

  test('returns session data', async () => {
    const session = { id: 'session1', title: 'Test Session' };
    mockGetSession.mockResolvedValueOnce({ data: session });

    const { result } = renderHook(() => useSession('session1'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(session);
    });
  });

  test('does not fetch with empty sessionId', () => {
    renderHook(() => useSession(''), { wrapper });
    expect(mockGetSession).not.toHaveBeenCalled();
  });
});

describe('useSessionMessages', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockGetSessionMessages.mockClear();
  });

  test('fetches messages for session', async () => {
    mockGetSessionMessages.mockResolvedValueOnce({
      data: [{ id: 'msg1' }, { id: 'msg2' }],
    });

    renderHook(() => useSessionMessages('session1'), { wrapper });

    await waitFor(() => {
      expect(mockGetSessionMessages).toHaveBeenCalledWith('session1');
    });
  });

  test('returns messages data', async () => {
    const messages = [
      { id: 'msg1', content: 'Hello' },
      { id: 'msg2', content: 'World' },
    ];
    mockGetSessionMessages.mockResolvedValueOnce({ data: messages });

    const { result } = renderHook(() => useSessionMessages('session1'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(messages);
    });
  });

  test('does not fetch with empty sessionId', () => {
    renderHook(() => useSessionMessages(''), { wrapper });
    expect(mockGetSessionMessages).not.toHaveBeenCalled();
  });
});

describe('useSessionLedger', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockGetSessionLedger.mockClear();
  });

  test('fetches ledger for session', async () => {
    mockGetSessionLedger.mockResolvedValueOnce({
      data: [{ claim: 'claim1', verdict: 'supported' }],
    });

    renderHook(() => useSessionLedger('session1'), { wrapper });

    await waitFor(() => {
      expect(mockGetSessionLedger).toHaveBeenCalledWith('session1');
    });
  });

  test('returns ledger data', async () => {
    const ledger = [
      { claim: 'claim1', verdict: 'supported' },
      { claim: 'claim2', verdict: 'weak' },
    ];
    mockGetSessionLedger.mockResolvedValueOnce({ data: ledger });

    const { result } = renderHook(() => useSessionLedger('session1'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(ledger);
    });
  });

  test('returns empty array when data is null', async () => {
    mockGetSessionLedger.mockResolvedValueOnce({ data: null });

    const { result } = renderHook(() => useSessionLedger('session1'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });

  test('does not fetch with empty sessionId', () => {
    renderHook(() => useSessionLedger(''), { wrapper });
    expect(mockGetSessionLedger).not.toHaveBeenCalled();
  });
});

describe('useExportSession', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockExportSession.mockClear();
  });

  test('provides mutate function', () => {
    const { result } = renderHook(() => useExportSession(), { wrapper });
    expect(typeof result.current.mutate).toBe('function');
  });

  test('exports session as PDF', async () => {
    mockExportSession.mockResolvedValueOnce({ data: { url: 'export.pdf' } });

    const { result } = renderHook(() => useExportSession(), { wrapper });

    act(() => {
      result.current.mutate({ sessionId: 'session1', format: 'pdf' });
    });

    await waitFor(() => {
      expect(mockExportSession).toHaveBeenCalledWith('session1', 'pdf');
    });
  });

  test('exports session as markdown', async () => {
    mockExportSession.mockResolvedValueOnce({ data: { url: 'export.md' } });

    const { result } = renderHook(() => useExportSession(), { wrapper });

    act(() => {
      result.current.mutate({ sessionId: 'session1', format: 'markdown' });
    });

    await waitFor(() => {
      expect(mockExportSession).toHaveBeenCalledWith('session1', 'markdown');
    });
  });

  test('exports session as JSON', async () => {
    mockExportSession.mockResolvedValueOnce({ data: { url: 'export.json' } });

    const { result } = renderHook(() => useExportSession(), { wrapper });

    act(() => {
      result.current.mutate({ sessionId: 'session1', format: 'json' });
    });

    await waitFor(() => {
      expect(mockExportSession).toHaveBeenCalledWith('session1', 'json');
    });
  });

  test('tracks pending state', async () => {
    mockExportSession.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useExportSession(), { wrapper });

    act(() => {
      result.current.mutate({ sessionId: 'session1', format: 'pdf' });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });
  });

  test('handles export error', async () => {
    mockExportSession.mockRejectedValueOnce(new Error('Export failed'));

    const { result } = renderHook(() => useExportSession(), { wrapper });

    act(() => {
      result.current.mutate({ sessionId: 'session1', format: 'pdf' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
