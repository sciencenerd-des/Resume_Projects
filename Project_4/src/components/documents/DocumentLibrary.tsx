import React, { useState, useMemo } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useConvexDocuments } from '@/hooks/useConvexDocuments';
import { DocumentCard } from './DocumentCard';
import { DocumentUpload } from './DocumentUpload';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Spinner';
import { FileText, Filter, Search, SortAsc } from 'lucide-react';
import type { Id } from '../../../convex/_generated/dataModel';

export function DocumentLibrary() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?._id as Id<"workspaces"> | undefined;
  const { documents, isLoading, deleteDocument } = useConvexDocuments(workspaceId);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) => {
        const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          return b._creationTime - a._creationTime;
        }
        return a.filename.localeCompare(b.filename);
      });
  }, [documents, searchQuery, filterStatus, sortBy]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground mt-1">
            {documents.length} document{documents.length !== 1 ? 's' : ''} in workspace
          </p>
        </div>
        <Button
          variant="primary"
          icon={<FileText className="w-4 h-4" />}
          onClick={() => setShowUploadModal(true)}
        >
          Upload Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="ready">Ready</option>
            <option value="processing">Processing</option>
            <option value="error">Error</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <SortAsc className="w-4 h-4 text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Document Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No documents found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Upload your first document to get started'}
          </p>
          {!searchQuery && filterStatus === 'all' && (
            <Button variant="primary" onClick={() => setShowUploadModal(true)}>
              Upload Document
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc._id}
              document={{
                id: doc._id,
                workspace_id: doc.workspaceId,
                filename: doc.filename,
                status: doc.status,
                created_at: new Date(doc._creationTime).toISOString(),
                updated_at: new Date(doc._creationTime).toISOString(),
                file_type: doc.fileType,
                chunk_count: doc.chunkCount ?? 0,
              }}
              onDelete={() => deleteDocument(doc._id)}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Documents"
        size="lg"
      >
        <DocumentUpload
          onComplete={() => setShowUploadModal(false)}
        />
      </Modal>
    </div>
  );
}
