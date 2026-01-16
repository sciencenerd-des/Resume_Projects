import React from 'react';
import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '../../src/services/api';
import { useDocuments } from '../../src/hooks/useDocuments';

// Create mock functions
const mockGetDocuments = mock(() => Promise.resolve([]));
const mockUploadDocument = mock(() => Promise.resolve({ id: 'doc1', filename: 'test.pdf' }));
const mockDeleteDocument = mock(() => Promise.resolve());

// Apply mocks directly to the api object (doesn't pollute other tests)
beforeEach(() => {
  (api as any).getDocuments = mockGetDocuments;
  (api as any).uploadDocument = mockUploadDocument;
  (api as any).deleteDocument = mockDeleteDocument;
});

// Simplified test component that doesn't rely on UploadZone's internal structure
function DocumentUploadIntegration({ workspaceId }: { workspaceId: string }) {
  const {
    documents,
    isLoading,
    uploadDocument,
    isUploading,
    uploadError,
    deleteDocument,
    isDeleting,
  } = useDocuments(workspaceId);

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="uploading">{isUploading ? 'uploading' : 'idle'}</div>
      <div data-testid="deleting">{isDeleting ? 'deleting' : 'idle'}</div>
      <div data-testid="documents-count">{documents.length}</div>
      {uploadError && <div data-testid="upload-error">{uploadError.message}</div>}

      <input
        type="file"
        data-testid="file-input"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          files.forEach((file) => uploadDocument({ file }));
        }}
      />

      <ul data-testid="document-list">
        {documents.map((doc: any) => (
          <li key={doc.id}>
            <span>{doc.filename}</span>
            <button onClick={() => deleteDocument(doc.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

describe('Document Upload Integration', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockGetDocuments.mockClear();
    mockUploadDocument.mockClear();
    mockDeleteDocument.mockClear();
  });

  describe('initial document loading', () => {
    test('shows loading state while fetching documents', () => {
      mockGetDocuments.mockImplementation(() => new Promise(() => {}));

      render(<DocumentUploadIntegration workspaceId="ws1" />, { wrapper });

      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
    });

    test('displays documents after loading', async () => {
      mockGetDocuments.mockResolvedValue([
        { id: 'doc1', filename: 'test1.pdf', status: 'ready' },
        { id: 'doc2', filename: 'test2.pdf', status: 'ready' },
      ]);

      render(<DocumentUploadIntegration workspaceId="ws1" />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('documents-count')).toHaveTextContent('2');
      });
    });

    test('shows empty list when no documents', async () => {
      mockGetDocuments.mockResolvedValue([]);

      render(<DocumentUploadIntegration workspaceId="ws1" />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('documents-count')).toHaveTextContent('0');
      });
    });
  });

  describe('file upload flow', () => {
    test('uploads file when selected', async () => {
      mockGetDocuments.mockResolvedValue([]);
      mockUploadDocument.mockResolvedValueOnce({ id: 'doc1', filename: 'test.pdf' });

      render(<DocumentUploadIntegration workspaceId="ws1" />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      const input = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(input, 'files', { value: [file] });

      fireEvent.change(input);

      await waitFor(() => {
        expect(mockUploadDocument).toHaveBeenCalled();
      });
    });
  });

  describe('document deletion', () => {
    test('deletes document when delete button clicked', async () => {
      mockGetDocuments.mockResolvedValue([
        { id: 'doc1', filename: 'test.pdf', status: 'ready' },
      ]);
      mockDeleteDocument.mockResolvedValueOnce({});

      render(<DocumentUploadIntegration workspaceId="ws1" />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(mockDeleteDocument).toHaveBeenCalledWith('doc1');
      });
    });
  });
});
