import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UploadZone } from '@/components/documents/UploadZone';

describe('UploadZone', () => {
  const mockOnUpload = () => {};

  describe('rendering', () => {
    test('renders upload zone container', () => {
      const { container } = render(<UploadZone onUpload={mockOnUpload} />);
      expect(container.querySelector('.border-dashed')).toBeInTheDocument();
    });

    test('displays upload icon', () => {
      const { container } = render(<UploadZone onUpload={mockOnUpload} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    test('displays instruction text', () => {
      render(<UploadZone onUpload={mockOnUpload} />);
      expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
    });

    test('displays click to upload link', () => {
      render(<UploadZone onUpload={mockOnUpload} />);
      expect(screen.getByText(/Click to upload/i)).toBeInTheDocument();
    });

    test('shows supported file types', () => {
      render(<UploadZone onUpload={mockOnUpload} />);
      expect(screen.getByText(/PDF or DOCX/i)).toBeInTheDocument();
    });
  });

  describe('file input', () => {
    test('renders hidden file input', () => {
      const { container } = render(<UploadZone onUpload={mockOnUpload} />);
      const input = container.querySelector('input[type="file"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('hidden');
    });

    test('accepts multiple files by default', () => {
      const { container } = render(<UploadZone onUpload={mockOnUpload} />);
      const input = container.querySelector('input[type="file"]');
      expect(input).toHaveAttribute('multiple');
    });

    test('restricts to specified file types', () => {
      const { container } = render(<UploadZone onUpload={mockOnUpload} accept=".pdf,.docx" />);
      const input = container.querySelector('input[type="file"]');
      expect(input).toHaveAttribute('accept', '.pdf,.docx');
    });

    test('calls onUpload when files are selected', () => {
      let uploadedFiles: File[] = [];
      const handleUpload = (files: File[]) => { uploadedFiles = files; };

      const { container } = render(<UploadZone onUpload={handleUpload} />);
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      Object.defineProperty(input, 'files', { value: [file] });
      fireEvent.change(input);

      expect(uploadedFiles).toHaveLength(1);
      expect(uploadedFiles[0].name).toBe('test.pdf');
    });
  });

  describe('drag and drop', () => {
    test('highlights zone on drag over', () => {
      const { container } = render(<UploadZone onUpload={mockOnUpload} />);
      const zone = container.querySelector('.border-dashed')!;

      fireEvent.dragOver(zone);
      expect(zone).toHaveClass('border-primary', 'bg-primary/10');
    });

    test('removes highlight on drag leave', () => {
      const { container } = render(<UploadZone onUpload={mockOnUpload} />);
      const zone = container.querySelector('.border-dashed')!;

      fireEvent.dragOver(zone);
      fireEvent.dragLeave(zone);
      expect(zone).not.toHaveClass('bg-primary/10');
    });

    test('handles file drop', () => {
      let uploadedFiles: File[] = [];
      const handleUpload = (files: File[]) => { uploadedFiles = files; };

      const { container } = render(<UploadZone onUpload={handleUpload} />);
      const zone = container.querySelector('.border-dashed')!;

      const file = new File(['content'], 'dropped.pdf', { type: 'application/pdf' });
      fireEvent.drop(zone, { dataTransfer: { files: [file] } });

      expect(uploadedFiles).toHaveLength(1);
      expect(uploadedFiles[0].name).toBe('dropped.pdf');
    });
  });

  describe('disabled state', () => {
    test('shows disabled styling when disabled', () => {
      const { container } = render(<UploadZone onUpload={mockOnUpload} disabled />);
      const zone = container.querySelector('.border-dashed');
      expect(zone).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    test('does not accept drops when disabled', () => {
      let called = false;
      const { container } = render(<UploadZone onUpload={() => { called = true; }} disabled />);
      const zone = container.querySelector('.border-dashed')!;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.drop(zone, { dataTransfer: { files: [file] } });

      expect(called).toBe(false);
    });

    test('disables file input when disabled', () => {
      const { container } = render(<UploadZone onUpload={mockOnUpload} disabled />);
      const input = container.querySelector('input[type="file"]');
      expect(input).toBeDisabled();
    });
  });

  describe('styling', () => {
    test('has dashed border', () => {
      const { container } = render(<UploadZone onUpload={mockOnUpload} />);
      const zone = container.querySelector('.border-dashed');
      expect(zone).toBeInTheDocument();
    });

    test('has rounded corners', () => {
      const { container } = render(<UploadZone onUpload={mockOnUpload} />);
      const zone = container.querySelector('.border-dashed');
      expect(zone).toHaveClass('rounded-xl');
    });

    test('has cursor-pointer styling', () => {
      const { container } = render(<UploadZone onUpload={mockOnUpload} />);
      const zone = container.querySelector('.border-dashed');
      expect(zone).toHaveClass('cursor-pointer');
    });
  });

  describe('file size validation', () => {
    test('filters files exceeding max size', () => {
      let uploadedFiles: File[] = [];
      const handleUpload = (files: File[]) => { uploadedFiles = files; };

      const { container } = render(
        <UploadZone onUpload={handleUpload} maxSize={1024} />
      );
      const zone = container.querySelector('.border-dashed')!;

      const largeFile = new File(['x'.repeat(2048)], 'large.pdf', { type: 'application/pdf' });
      Object.defineProperty(largeFile, 'size', { value: 2048 });
      fireEvent.drop(zone, { dataTransfer: { files: [largeFile] } });

      expect(uploadedFiles).toHaveLength(0);
    });

    test('accepts files within max size', () => {
      let uploadedFiles: File[] = [];
      const handleUpload = (files: File[]) => { uploadedFiles = files; };

      const { container } = render(
        <UploadZone onUpload={handleUpload} maxSize={1024} />
      );
      const zone = container.querySelector('.border-dashed')!;

      const smallFile = new File(['x'], 'small.pdf', { type: 'application/pdf' });
      Object.defineProperty(smallFile, 'size', { value: 512 });
      fireEvent.drop(zone, { dataTransfer: { files: [smallFile] } });

      expect(uploadedFiles).toHaveLength(1);
    });
  });
});
