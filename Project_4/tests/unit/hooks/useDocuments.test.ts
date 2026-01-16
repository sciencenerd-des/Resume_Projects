import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useDocuments, useDocument, useDocumentChunks } from '@/hooks/useDocuments';

// Create mock functions
const mockGetDocuments = mock(() => Promise.resolve([]));
const mockUploadDocument = mock(() => Promise.resolve({ id: 'new-doc' }));
const mockDeleteDocument = mock(() => Promise.resolve());

// Apply mocks directly to the api object (doesn't pollute other tests)
beforeEach(() => {
  (api as any).getDocuments = mockGetDocuments;
  (api as any).uploadDocument = mockUploadDocument;
  (api as any).deleteDocument = mockDeleteDocument;
});

describe('useDocuments', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    mockGetDocuments.mockClear();
    mockUploadDocument.mockClear();
    mockDeleteDocument.mockClear();
  });

  describe('document fetching', () => {
    test('does not fetch when workspaceId is undefined', () => {
      renderHook(() => useDocuments(undefined), { wrapper });
      expect(mockGetDocuments).not.toHaveBeenCalled();
    });

    test('fetches documents when workspaceId is provided', async () => {
      mockGetDocuments.mockResolvedValueOnce([]);
      renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => {
        expect(mockGetDocuments).toHaveBeenCalledWith('ws1');
      });
    });

    test('returns empty array when no documents', async () => {
      mockGetDocuments.mockResolvedValueOnce([]);
      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => {
        expect(result.current.documents).toEqual([]);
      });
    });

    test('returns fetched documents', async () => {
      const docs = [
        { id: 'doc1', status: 'ready', chunk_count: 10 },
        { id: 'doc2', status: 'processing', chunk_count: 0 },
      ];
      mockGetDocuments.mockResolvedValueOnce(docs);

      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => {
        expect(result.current.documents).toEqual(docs);
      });
    });
  });

  describe('computed values', () => {
    test('computes readyDocuments correctly', async () => {
      const docs = [
        { id: 'doc1', status: 'ready', chunk_count: 10 },
        { id: 'doc2', status: 'processing', chunk_count: 0 },
        { id: 'doc3', status: 'ready', chunk_count: 5 },
      ];
      mockGetDocuments.mockResolvedValueOnce(docs);

      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => {
        expect(result.current.readyDocuments).toHaveLength(2);
        expect(result.current.readyDocuments[0].id).toBe('doc1');
        expect(result.current.readyDocuments[1].id).toBe('doc3');
      });
    });

    test('computes processingDocuments correctly', async () => {
      const docs = [
        { id: 'doc1', status: 'ready', chunk_count: 10 },
        { id: 'doc2', status: 'processing', chunk_count: 0 },
      ];
      mockGetDocuments.mockResolvedValueOnce(docs);

      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => {
        expect(result.current.processingDocuments).toHaveLength(1);
        expect(result.current.processingDocuments[0].id).toBe('doc2');
      });
    });

    test('computes errorDocuments correctly', async () => {
      const docs = [
        { id: 'doc1', status: 'ready', chunk_count: 10 },
        { id: 'doc2', status: 'error', chunk_count: 0 },
      ];
      mockGetDocuments.mockResolvedValueOnce(docs);

      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => {
        expect(result.current.errorDocuments).toHaveLength(1);
        expect(result.current.errorDocuments[0].id).toBe('doc2');
      });
    });

    test('computes totalChunks correctly', async () => {
      const docs = [
        { id: 'doc1', status: 'ready', chunk_count: 10 },
        { id: 'doc2', status: 'ready', chunk_count: 15 },
        { id: 'doc3', status: 'ready', chunk_count: 25 },
      ];
      mockGetDocuments.mockResolvedValueOnce(docs);

      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => {
        expect(result.current.totalChunks).toBe(50);
      });
    });

    test('handles missing chunk_count', async () => {
      const docs = [
        { id: 'doc1', status: 'ready' },
        { id: 'doc2', status: 'ready', chunk_count: 10 },
      ];
      mockGetDocuments.mockResolvedValueOnce(docs);

      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => {
        expect(result.current.totalChunks).toBe(10);
      });
    });

    test('hasDocuments is true when documents exist', async () => {
      mockGetDocuments.mockResolvedValueOnce([{ id: 'doc1', status: 'ready' }]);
      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => {
        expect(result.current.hasDocuments).toBe(true);
      });
    });

    test('hasDocuments is false when no documents', async () => {
      mockGetDocuments.mockResolvedValueOnce([]);
      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => {
        expect(result.current.hasDocuments).toBe(false);
      });
    });

    test('hasReadyDocuments is true when ready documents exist', async () => {
      mockGetDocuments.mockResolvedValueOnce([{ id: 'doc1', status: 'ready' }]);
      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => {
        expect(result.current.hasReadyDocuments).toBe(true);
      });
    });

    test('hasReadyDocuments is false when no ready documents', async () => {
      mockGetDocuments.mockResolvedValueOnce([{ id: 'doc1', status: 'processing' }]);
      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => {
        expect(result.current.hasReadyDocuments).toBe(false);
      });
    });
  });

  describe('upload mutation', () => {
    test('provides uploadDocument function', async () => {
      mockGetDocuments.mockResolvedValueOnce([]);
      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => {
        expect(typeof result.current.uploadDocument).toBe('function');
      });
    });

    test('calls API with file and workspaceId', async () => {
      mockGetDocuments.mockResolvedValueOnce([]);
      mockUploadDocument.mockResolvedValueOnce({ id: 'new-doc' });

      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => !result.current.isLoading);

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      act(() => {
        result.current.uploadDocument({ file });
      });

      await waitFor(() => {
        expect(mockUploadDocument).toHaveBeenCalledWith('ws1', file);
      });
    });

    test('throws error when no workspace selected', async () => {
      const { result } = renderHook(() => useDocuments(undefined), { wrapper });

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      act(() => {
        result.current.uploadDocument({ file });
      });

      await waitFor(() => {
        expect(result.current.uploadError).toBeTruthy();
      });
    });

    test('tracks uploading state', async () => {
      mockGetDocuments.mockResolvedValueOnce([]);
      mockUploadDocument.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => !result.current.isLoading);

      const file = new File(['content'], 'test.pdf');
      act(() => {
        result.current.uploadDocument({ file });
      });

      await waitFor(() => {
        expect(result.current.isUploading).toBe(true);
      });
    });
  });

  describe('delete mutation', () => {
    test('provides deleteDocument function', async () => {
      mockGetDocuments.mockResolvedValueOnce([]);
      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => {
        expect(typeof result.current.deleteDocument).toBe('function');
      });
    });

    test('calls API with document ID', async () => {
      mockGetDocuments.mockResolvedValueOnce([]);
      mockDeleteDocument.mockResolvedValueOnce({});

      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => !result.current.isLoading);

      act(() => {
        result.current.deleteDocument('doc1');
      });

      await waitFor(() => {
        expect(mockDeleteDocument).toHaveBeenCalledWith('doc1');
      });
    });

    test('tracks deleting state', async () => {
      mockGetDocuments.mockResolvedValueOnce([]);
      mockDeleteDocument.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => !result.current.isLoading);

      act(() => {
        result.current.deleteDocument('doc1');
      });

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(true);
      });
    });
  });

  describe('refresh', () => {
    test('provides refreshDocuments function', async () => {
      mockGetDocuments.mockResolvedValueOnce([]);
      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => {
        expect(typeof result.current.refreshDocuments).toBe('function');
      });
    });
  });

  describe('loading and error states', () => {
    test('isLoading is true while fetching', () => {
      mockGetDocuments.mockImplementation(() => new Promise(() => {}));
      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });

    test('isError is true on fetch failure', async () => {
      mockGetDocuments.mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    test('error contains error message on failure', async () => {
      mockGetDocuments.mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => useDocuments('ws1'), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });
});

describe('useDocument', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    global.fetch = mock(() => Promise.resolve(new Response())) as any;
  });

  test('does not fetch when documentId is undefined', () => {
    renderHook(() => useDocument(undefined), { wrapper });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('fetches document when documentId is provided', async () => {
    global.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ id: 'doc1' }), { status: 200 }))
    ) as any;

    renderHook(() => useDocument('doc1'), { wrapper });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/documents/doc1');
    });
  });
});

describe('useDocumentChunks', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  test('does not fetch when documentId is undefined', () => {
    global.fetch = mock(() => Promise.resolve(new Response())) as any;
    renderHook(() => useDocumentChunks(undefined), { wrapper });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('fetches chunks when documentId is provided', async () => {
    global.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
    ) as any;

    renderHook(() => useDocumentChunks('doc1'), { wrapper });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/documents/doc1/chunks');
    });
  });
});
