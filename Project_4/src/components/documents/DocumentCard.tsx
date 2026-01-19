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
  uploading: { label: 'Uploading', color: 'text-blue-600' },
  processing: { label: 'Processing', color: 'text-amber-600' },
  ready: { label: 'Ready', color: 'text-green-600' },
  error: { label: 'Error', color: 'text-red-600' },
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
        bg-white rounded-lg border border-gray-200
        hover:border-gray-300 transition-colors
      "
    >
      <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
        <Icon className="w-5 h-5 text-gray-600" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 truncate">
          {document.filename}
        </h3>
        <div className="flex items-center gap-3 text-sm text-gray-500">
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
