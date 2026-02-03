import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useConvexDocuments } from '@/hooks/useConvexDocuments';
import type { Id } from '../../../convex/_generated/dataModel';

interface DocumentUploadProps {
  onComplete?: () => void;
}

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

export function DocumentUpload({ onComplete }: DocumentUploadProps) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?._id as Id<"workspaces"> | undefined;
  const { uploadDocument } = useConvexDocuments(workspaceId);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const createUploadFile = (file: File): UploadFile => ({
    id: `${Date.now()}-${file.name}`,
    file,
    progress: 0,
    status: 'pending',
  });

  const handleFiles = useCallback((newFiles: File[]) => {
    const uploadFiles = newFiles
      .filter((file) => {
        const isValidType = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type);
        const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB
        return isValidType && isValidSize;
      })
      .map(createUploadFile);

    setFiles((prev) => [...prev, ...uploadFiles]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        (file) =>
          file.type === 'application/pdf' ||
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );

      handleFiles(droppedFiles);
    },
    [handleFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      handleFiles(selectedFiles);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [handleFiles]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const uploadFiles = useCallback(async () => {
    if (!workspaceId) {
      console.error('[Upload] No workspace selected');
      return;
    }

    for (const uploadFile of files) {
      if (uploadFile.status !== 'pending') continue;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f
        )
      );

      try {
        // Upload the file using Convex
        console.log('[Upload] Uploading file:', uploadFile.file.name);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, progress: 50 } : f
          )
        );

        await uploadDocument(uploadFile.file);

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'processing', progress: 100 } : f
          )
        );

        // Mark as complete after a brief delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'complete' } : f
          )
        );
        console.log('[Upload] File uploaded successfully:', uploadFile.file.name);
      } catch (error) {
        console.error('[Upload] Upload failed:', error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
              : f
          )
        );
      }
    }

    if (onComplete) {
      onComplete();
    }
  }, [files, onComplete, workspaceId, uploadDocument]);

  const handleUpload = async () => {
    await uploadFiles();
  };

  const allComplete = files.length > 0 && files.every((f) => f.status === 'complete');
  const hasErrors = files.some((f) => f.status === 'error');
  const canUpload = files.some((f) => f.status === 'pending');

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center
          p-8 border-2 border-dashed rounded-xl
          cursor-pointer transition-colors
          ${isDragging
            ? 'border-primary bg-primary/10'
            : 'border-border hover:border-primary/50'
          }
        `}
      >
        <Upload className="w-10 h-10 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground text-center">
          <span className="font-medium text-primary">Click to upload</span>
          {' '}or drag and drop
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF or DOCX up to 50MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          multiple
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((uploadFile) => (
            <div
              key={uploadFile.id}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
            >
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {uploadFile.file.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={uploadFile.progress} className="flex-1 h-1.5" />
                  <span className="text-xs text-muted-foreground">{uploadFile.progress}%</span>
                </div>
                {uploadFile.status === 'error' && (
                  <p className="text-xs text-destructive mt-1">{uploadFile.error}</p>
                )}
              </div>
              <button
                onClick={() => removeFile(uploadFile.id)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {files.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-sm">
            {hasErrors && (
              <span className="text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Some files failed
              </span>
            )}
            {allComplete && (
              <span className="text-verdict-supported">All files uploaded successfully</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setFiles([])}
            >
              Clear All
            </Button>
            <Button
              variant="primary"
              onClick={handleUpload}
              disabled={!canUpload || allComplete}
            >
              {allComplete ? 'Complete' : 'Upload Files'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
