import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '@/hooks/useWorkspace';
import { api } from '@/services/api';
import { DocumentCard } from './DocumentCard';
import { DocumentUpload } from './DocumentUpload';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Spinner';
import { FileText, Filter, Search, SortAsc } from 'lucide-react';
import type { Document } from '@/types';

export function DocumentLibrary() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', currentWorkspace?.id],
    queryFn: () => api.getDocuments(currentWorkspace!.id),
    enabled: !!currentWorkspace?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => api.deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', currentWorkspace?.id] });
    },
  });

  const filteredDocuments = (documents as Document[])
    .filter((doc: Document) => {
      const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a: Document, b: Document) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return a.filename.localeCompare(b.filename);
    });

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
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-500 mt-1">
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
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="ready">Ready</option>
            <option value="processing">Processing</option>
            <option value="error">Error</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <SortAsc className="w-4 h-4 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Document Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-500 mb-4">
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
          {filteredDocuments.map((doc: Document) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onDelete={() => deleteMutation.mutate(doc.id)}
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
          onComplete={() => {
            setShowUploadModal(false);
            queryClient.invalidateQueries({ queryKey: ['documents', currentWorkspace?.id] });
          }}
        />
      </Modal>
    </div>
  );
}
