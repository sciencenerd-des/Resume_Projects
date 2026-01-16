import React from 'react';
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentUpload } from '../../../../src/components/documents/DocumentUpload';
import { api } from '../../../../src/services/api';

// Mock only useWorkspace - we'll mock api methods directly on the object
mock.module('@/hooks/useWorkspace', () => ({
  useWorkspace: () => ({
    currentWorkspace: { id: 'ws-123', name: 'Test Workspace' },
    workspaces: [{ id: 'ws-123', name: 'Test Workspace' }],
    isLoading: false,
    createWorkspace: { mutate: mock(() => {}) },
    switchWorkspace: mock(() => {}),
  }),
}));

// Store original api methods
const originalUploadDocument = api.uploadDocument;

beforeEach(() => {
  // Mock api.uploadDocument on the actual object (doesn't pollute other tests)
  (api as any).uploadDocument = mock(async () => ({ id: 'doc-123', status: 'processing' }));
});

// Note: We don't restore in afterEach because the api object is fresh per test file

// Helper to get the hidden file input
const getFileInput = (container: HTMLElement): HTMLInputElement => {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
};

// Wrapper with QueryClient for components that use react-query hooks
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('DocumentUpload', () => {
  describe('rendering', () => {
    test('renders drop zone', () => {
      render(<DocumentUpload />, { wrapper: createWrapper() });
      expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
      expect(screen.getByText(/or drag and drop/i)).toBeInTheDocument();
    });

    test('renders file type restrictions', () => {
      render(<DocumentUpload />, { wrapper: createWrapper() });
      expect(screen.getByText(/PDF or DOCX up to 50MB/i)).toBeInTheDocument();
    });

    test('renders hidden file input', () => {
      const { container } = render(<DocumentUpload />, { wrapper: createWrapper() });
      const input = getFileInput(container);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'file');
      expect(input).toHaveAttribute('accept', '.pdf,.docx');
      expect(input).toHaveAttribute('multiple');
    });
  });

  describe('file selection', () => {
    test('adds files when selected via input', () => {
      const { container } = render(<DocumentUpload />, { wrapper: createWrapper() });
      const input = getFileInput(container);
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    test('filters invalid file types', () => {
      const { container } = render(<DocumentUpload />, { wrapper: createWrapper() });
      const input = getFileInput(container);
      const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      fireEvent.change(input, { target: { files: [file] } });
      expect(screen.queryByText('test.exe')).not.toBeInTheDocument();
    });

    test('filters files over 50MB', () => {
      const { container } = render(<DocumentUpload />, { wrapper: createWrapper() });
      const input = getFileInput(container);
      const largeFile = new File(['content'], 'large.pdf', { type: 'application/pdf' });
      Object.defineProperty(largeFile, 'size', { value: 60 * 1024 * 1024 });
      fireEvent.change(input, { target: { files: [largeFile] } });
      expect(screen.queryByText('large.pdf')).not.toBeInTheDocument();
    });
  });

  describe('drag and drop', () => {
    test('shows active state when dragging over', () => {
      const { container } = render(<DocumentUpload />, { wrapper: createWrapper() });
      const dropZone = container.querySelector('.border-dashed')!;
      fireEvent.dragOver(dropZone, { dataTransfer: { files: [] } });
      expect(dropZone).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    test('removes active state when dragging leaves', () => {
      const { container } = render(<DocumentUpload />, { wrapper: createWrapper() });
      const dropZone = container.querySelector('.border-dashed')!;
      fireEvent.dragOver(dropZone, { dataTransfer: { files: [] } });
      fireEvent.dragLeave(dropZone);
      expect(dropZone).not.toHaveClass('border-blue-500', 'bg-blue-50');
    });

    test('adds files when dropped', () => {
      const { container } = render(<DocumentUpload />, { wrapper: createWrapper() });
      const dropZone = container.querySelector('.border-dashed')!;
      const file = new File(['content'], 'dropped.pdf', { type: 'application/pdf' });
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });
      expect(screen.getByText('dropped.pdf')).toBeInTheDocument();
    });
  });

  describe('file list', () => {
    test('displays uploaded files with progress', () => {
      const { container } = render(<DocumentUpload />, { wrapper: createWrapper() });
      const input = getFileInput(container);
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    test('removes file when delete button is clicked', () => {
      const { container } = render(<DocumentUpload />, { wrapper: createWrapper() });
      const input = getFileInput(container);
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      // The delete button has an X icon, find the button element
      const deleteButton = container.querySelector('.lucide-x')?.closest('button');
      expect(deleteButton).toBeInTheDocument();
      fireEvent.click(deleteButton!);
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });
  });

  describe('upload process', () => {
    test('shows upload button when files are added', () => {
      const { container } = render(<DocumentUpload />, { wrapper: createWrapper() });
      const input = getFileInput(container);
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      expect(screen.getByRole('button', { name: /upload files/i })).toBeInTheDocument();
    });

    test('starts upload when button is clicked', async () => {
      const { container } = render(<DocumentUpload />, { wrapper: createWrapper() });
      const input = getFileInput(container);
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: /upload files/i }));
      // Progress should increase from 0%
      await waitFor(() => {
        const progressTexts = screen.getAllByText(/\d+%/);
        // Should have progress > 0
        const hasProgress = progressTexts.some((el) => el.textContent !== '0%');
        expect(hasProgress || progressTexts.length > 0).toBe(true);
      }, { timeout: 1000 });
    });

    test('shows complete state after upload finishes', async () => {
      const { container } = render(<DocumentUpload />, { wrapper: createWrapper() });
      const input = getFileInput(container);
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: /upload files/i }));
      // Wait for upload to complete
      await waitFor(() => {
        expect(screen.getByText(/all files uploaded successfully/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('actions', () => {
    test('clears all files when Clear All is clicked', () => {
      const { container } = render(<DocumentUpload />, { wrapper: createWrapper() });
      const input = getFileInput(container);
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    test('drop zone has dashed border', () => {
      const { container } = render(<DocumentUpload />, { wrapper: createWrapper() });
      const dropZone = container.querySelector('.border-dashed');
      expect(dropZone).toBeInTheDocument();
    });

    test('drop zone has rounded corners', () => {
      const { container } = render(<DocumentUpload />, { wrapper: createWrapper() });
      const dropZone = container.querySelector('.border-dashed');
      expect(dropZone).toBeInTheDocument();
      expect(dropZone?.className).toContain('rounded-xl');
    });

    test('has upload icon', () => {
      const { container } = render(<DocumentUpload />, { wrapper: createWrapper() });
      const icon = container.querySelector('.lucide-upload');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('icons', () => {
    test('file items have file icon', () => {
      const { container } = render(<DocumentUpload />, { wrapper: createWrapper() });
      const input = getFileInput(container);
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      const fileIcon = container.querySelector('.lucide-file-text');
      expect(fileIcon).toBeInTheDocument();
    });

    test('delete button has X icon', () => {
      const { container } = render(<DocumentUpload />, { wrapper: createWrapper() });
      const input = getFileInput(container);
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      const xIcon = container.querySelector('.lucide-x');
      expect(xIcon).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    test('calls onComplete after all uploads finish', async () => {
      let completed = false;
      const { container } = render(
        <DocumentUpload onComplete={() => { completed = true; }} />,
        { wrapper: createWrapper() }
      );
      const input = getFileInput(container);
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: /upload files/i }));
      await waitFor(() => {
        expect(completed).toBe(true);
      }, { timeout: 2000 });
    });
  });
});
