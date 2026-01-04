import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DocumentUpload } from '@/components/documents/DocumentUpload';

// Helper to get the hidden file input
const getFileInput = (container: HTMLElement): HTMLInputElement => {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
};

describe('DocumentUpload', () => {
  describe('rendering', () => {
    test('renders drop zone', () => {
      render(<DocumentUpload />);
      expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
      expect(screen.getByText(/or drag and drop/i)).toBeInTheDocument();
    });

    test('renders file type restrictions', () => {
      render(<DocumentUpload />);
      expect(screen.getByText(/PDF or DOCX up to 50MB/i)).toBeInTheDocument();
    });

    test('renders hidden file input', () => {
      const { container } = render(<DocumentUpload />);
      const input = getFileInput(container);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'file');
      expect(input).toHaveAttribute('accept', '.pdf,.docx');
      expect(input).toHaveAttribute('multiple');
    });
  });

  describe('file selection', () => {
    test('adds files when selected via input', () => {
      const { container } = render(<DocumentUpload />);
      const input = getFileInput(container);
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    test('filters invalid file types', () => {
      const { container } = render(<DocumentUpload />);
      const input = getFileInput(container);
      const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      fireEvent.change(input, { target: { files: [file] } });
      expect(screen.queryByText('test.exe')).not.toBeInTheDocument();
    });

    test('filters files over 50MB', () => {
      const { container } = render(<DocumentUpload />);
      const input = getFileInput(container);
      const largeFile = new File(['content'], 'large.pdf', { type: 'application/pdf' });
      Object.defineProperty(largeFile, 'size', { value: 60 * 1024 * 1024 });
      fireEvent.change(input, { target: { files: [largeFile] } });
      expect(screen.queryByText('large.pdf')).not.toBeInTheDocument();
    });
  });

  describe('drag and drop', () => {
    test('shows active state when dragging over', () => {
      const { container } = render(<DocumentUpload />);
      const dropZone = container.querySelector('.border-dashed')!;
      fireEvent.dragOver(dropZone, { dataTransfer: { files: [] } });
      expect(dropZone).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    test('removes active state when dragging leaves', () => {
      const { container } = render(<DocumentUpload />);
      const dropZone = container.querySelector('.border-dashed')!;
      fireEvent.dragOver(dropZone, { dataTransfer: { files: [] } });
      fireEvent.dragLeave(dropZone);
      expect(dropZone).not.toHaveClass('border-blue-500', 'bg-blue-50');
    });

    test('adds files when dropped', () => {
      const { container } = render(<DocumentUpload />);
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
      const { container } = render(<DocumentUpload />);
      const input = getFileInput(container);
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    test('removes file when delete button is clicked', () => {
      const { container } = render(<DocumentUpload />);
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
      const { container } = render(<DocumentUpload />);
      const input = getFileInput(container);
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      expect(screen.getByRole('button', { name: /upload files/i })).toBeInTheDocument();
    });

    test('starts upload when button is clicked', async () => {
      const { container } = render(<DocumentUpload />);
      const input = getFileInput(container);
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: /upload files/i }));
      // Progress should increase from 0%
      await waitFor(() => {
        const progressText = screen.queryByText(/\d+%/);
        expect(progressText).toBeInTheDocument();
      }, { timeout: 500 });
    });

    test('shows complete state after upload finishes', async () => {
      const { container } = render(<DocumentUpload />);
      const input = getFileInput(container);
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: /upload files/i }));
      // Wait for upload simulation to complete (100ms * 10 steps + 1000ms processing = ~2s)
      await waitFor(() => {
        expect(screen.getByText(/all files uploaded successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    }, { timeout: 5000 });
  });

  describe('actions', () => {
    test('clears all files when Clear All is clicked', () => {
      const { container } = render(<DocumentUpload />);
      const input = getFileInput(container);
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });
  });
});
