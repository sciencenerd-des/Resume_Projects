/**
 * useDocuments Hook
 * @version 1.0.0
 * Manages document data fetching, uploads, and operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Document } from '../types';

export function useDocuments(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  const documentsQuery = useQuery({
    queryKey: ['documents', workspaceId],
    queryFn: () => api.getDocuments(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      if (!workspaceId) throw new Error('No workspace selected');
      return api.uploadDocument(workspaceId, file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', workspaceId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => api.deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', workspaceId] });
    },
  });

  const refreshDocuments = () => {
    queryClient.invalidateQueries({ queryKey: ['documents', workspaceId] });
  };

  // Computed values
  const documents = documentsQuery.data || [];
  const readyDocuments = documents.filter((d: Document) => d.status === 'ready');
  const processingDocuments = documents.filter((d: Document) => d.status === 'processing');
  const errorDocuments = documents.filter((d: Document) => d.status === 'error');

  return {
    // Query state
    documents,
    isLoading: documentsQuery.isLoading,
    isError: documentsQuery.isError,
    error: documentsQuery.error,

    // Computed
    readyDocuments,
    processingDocuments,
    errorDocuments,
    totalChunks: documents.reduce((sum: number, d: Document) => sum + (d.chunk_count || 0), 0),
    hasDocuments: documents.length > 0,
    hasReadyDocuments: readyDocuments.length > 0,

    // Mutations
    uploadDocument: uploadMutation.mutate,
    uploadDocumentAsync: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,

    deleteDocument: deleteMutation.mutate,
    deleteDocumentAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,

    // Actions
    refreshDocuments,
  };
}

export function useDocument(documentId: string | undefined) {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      // Assuming there's a getDocument endpoint
      const response = await fetch(`/api/documents/${documentId}`);
      if (!response.ok) throw new Error('Failed to fetch document');
      return response.json();
    },
    enabled: !!documentId,
  });
}

export function useDocumentChunks(documentId: string | undefined) {
  return useQuery({
    queryKey: ['document-chunks', documentId],
    queryFn: async () => {
      // Assuming there's a getDocumentChunks endpoint
      const response = await fetch(`/api/documents/${documentId}/chunks`);
      if (!response.ok) throw new Error('Failed to fetch chunks');
      return response.json();
    },
    enabled: !!documentId,
  });
}

export default useDocuments;
