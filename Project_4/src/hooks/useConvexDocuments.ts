/**
 * useConvexDocuments Hook
 * Manages document data with Convex real-time subscriptions and file uploads
 */

import { useCallback, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useConvexDocuments(workspaceId: Id<"workspaces"> | undefined) {
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Real-time document list
  const documents = useQuery(
    api.documents.list,
    workspaceId ? { workspaceId } : "skip"
  );

  // Mutations
  const generateUploadUrlMutation = useMutation(api.documents.generateUploadUrl);
  const createDocumentMutation = useMutation(api.documents.create);
  const deleteDocumentMutation = useMutation(api.documents.remove);

  const uploadDocument = useCallback(
    async (file: File) => {
      if (!workspaceId) throw new Error("No workspace selected");

      setUploadProgress(0);

      // Determine file type from mime type
      const fileType = file.type === "application/pdf" ? "pdf" as const : "docx" as const;

      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrlMutation({ workspaceId });
      setUploadProgress(20);

      // Step 2: Upload file to Convex storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const { storageId } = await response.json();
      setUploadProgress(60);

      // Step 3: Create document record and trigger processing
      const documentId = await createDocumentMutation({
        workspaceId,
        storageId,
        filename: file.name,
        fileType,
        fileSize: file.size,
      });

      setUploadProgress(100);

      return documentId;
    },
    [workspaceId, generateUploadUrlMutation, createDocumentMutation]
  );

  const deleteDocument = useCallback(
    async (documentId: Id<"documents">) => {
      await deleteDocumentMutation({ documentId });
    },
    [deleteDocumentMutation]
  );

  // Computed values
  const documentList = documents ?? [];
  const readyDocuments = documentList.filter((d: { status: string }) => d.status === "ready");
  const processingDocuments = documentList.filter(
    (d: { status: string }) => d.status === "processing"
  );
  const errorDocuments = documentList.filter((d: { status: string }) => d.status === "error");
  const totalChunks = documentList.reduce(
    (sum: number, d: { chunkCount?: number }) => sum + (d.chunkCount ?? 0),
    0
  );

  return {
    // Data (real-time updated)
    documents: documentList,
    readyDocuments,
    processingDocuments,
    errorDocuments,

    // Computed
    totalChunks,
    hasDocuments: documentList.length > 0,
    hasReadyDocuments: readyDocuments.length > 0,

    // Loading states
    isLoading: documents === undefined,

    // Upload state
    uploadProgress,
    isUploading: uploadProgress > 0 && uploadProgress < 100,

    // Mutations
    uploadDocument,
    deleteDocument,
  };
}

export function useDocumentDetails(documentId: Id<"documents"> | undefined) {
  const document = useQuery(
    api.documents.get,
    documentId ? { documentId } : "skip"
  );

  const chunks = useQuery(
    api.documents.getChunks,
    documentId ? { documentId } : "skip"
  );

  return {
    document: document ?? null,
    chunks: chunks ?? [],
    isLoading: document === undefined,
    isLoadingChunks: chunks === undefined,
  };
}
