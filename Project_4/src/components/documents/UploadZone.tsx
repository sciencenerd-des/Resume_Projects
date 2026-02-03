import React, { useCallback, useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadZoneProps {
  onUpload: (files: File[]) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
}

export function UploadZone({
  onUpload,
  accept = '.pdf,.docx',
  maxSize = 50 * 1024 * 1024, // 50MB
  multiple = true,
  disabled,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files).filter(
        (file) => file.size <= maxSize
      );

      if (files.length > 0) {
        onUpload(files);
      }
    },
    [disabled, maxSize, onUpload]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onUpload(files);
    }
  };

  return (
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
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
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
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
    </div>
  );
}
