import React from 'react';
import { FileText, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Document } from '@/types';

interface DocumentCardProps {
  document: Document;
  onView?: () => void;
  onDelete?: () => void;
}

const fileTypeIcons = {
  pdf: FileText,
  docx: FileText,
};

const statusConfig = {
  uploading: { label: 'Uploading', color: 'text-primary' },
  processing: { label: 'Processing', color: 'text-status-warning' },
  ready: { label: 'Ready', color: 'text-verdict-supported' },
  error: { label: 'Error', color: 'text-destructive' },
};

export function DocumentCard({
  document,
  onView,
  onDelete,
}: DocumentCardProps) {
  const Icon = fileTypeIcons[document.file_type] || FileText;
  const status = statusConfig[document.status];

  return (
    <div
      className="
        flex items-center gap-4 p-4
        bg-card rounded-lg border border-border
        hover:border-border/80 transition-colors
      "
    >
      <div className="flex-shrink-0 w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground truncate">
          {document.filename}
        </h3>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className={status.color}>{status.label}</span>
          {document.status === 'ready' && (
            <span>{document.chunk_count} chunks</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onView && (
          <Button variant="ghost" size="sm" onClick={onView}>
            <Eye className="w-4 h-4" />
          </Button>
        )}
        {onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
