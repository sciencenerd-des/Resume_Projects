/**
 * Document Processing Orchestrator
 * Coordinates extraction, chunking, and embedding generation
 */
import { extractPdfText, type ExtractedText } from "./extractors/pdf";
import { extractDocxText } from "./extractors/docx";
import { chunkDocument, type Chunk } from "./chunker";
import { generateEmbeddings } from "./embeddings";
import { supabaseAdmin } from "../db";

interface ProcessingResult {
  documentId: string;
  chunkCount: number;
  processingTimeMs: number;
  error?: string;
}

/**
 * Process a document: extract text, chunk, generate embeddings, store
 */
export async function processDocument(
  documentId: string,
  file: File
): Promise<ProcessingResult> {
  const startTime = Date.now();

  console.log(`[Document] Starting processing for ${documentId}: ${file.name}`);

  try {
    // Update status to processing
    await updateDocumentStatus(documentId, "processing");

    // Step 1: Extract text based on file type
    console.log(`[Document] Extracting text from ${file.name}`);
    const extracted = await extractText(file);
    console.log(
      `[Document] Extracted ${extracted.totalPages} pages, ${extracted.pages.reduce((sum, p) => sum + p.content.length, 0)} chars`
    );

    // Step 2: Chunk the document
    console.log(`[Document] Chunking document...`);
    const chunks = chunkDocument(extracted.pages);
    console.log(`[Document] Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      throw new Error("No content could be extracted from document");
    }

    // Step 3: Generate embeddings in batches
    console.log(`[Document] Generating embeddings...`);
    const embeddings = await generateEmbeddings(chunks.map((c) => c.content));
    console.log(`[Document] Generated ${embeddings.length} embeddings`);

    // Step 4: Store chunks with embeddings
    console.log(`[Document] Storing chunks in database...`);
    await storeChunks(documentId, chunks, embeddings);

    // Step 5: Update document status to ready
    await updateDocumentStatus(documentId, "ready", chunks.length);

    const processingTimeMs = Date.now() - startTime;
    console.log(
      `[Document] Processing complete for ${documentId} in ${processingTimeMs}ms`
    );

    return {
      documentId,
      chunkCount: chunks.length,
      processingTimeMs,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`[Document] Processing failed for ${documentId}:`, error);

    await updateDocumentStatus(documentId, "error", 0, errorMessage);

    return {
      documentId,
      chunkCount: 0,
      processingTimeMs: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

/**
 * Extract text from file based on type
 */
async function extractText(file: File): Promise<ExtractedText> {
  const filename = file.name.toLowerCase();

  if (filename.endsWith(".pdf")) {
    return extractPdfText(file);
  }

  if (filename.endsWith(".docx")) {
    return extractDocxText(file);
  }

  throw new Error(`Unsupported file type: ${filename}`);
}

/**
 * Store chunks with embeddings in database using SECURITY DEFINER function
 * This bypasses RLS for async document processing
 */
async function storeChunks(
  documentId: string,
  chunks: Chunk[],
  embeddings: number[][]
): Promise<void> {
  // Insert chunks in batches to avoid overwhelming the database
  const BATCH_SIZE = 50;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchEmbeddings = embeddings.slice(i, i + BATCH_SIZE);

    // Format chunks for the SECURITY DEFINER function
    const records = batch.map((chunk, index) => ({
      document_id: documentId,
      chunk_hash: chunk.chunkHash,
      content: chunk.content,
      chunk_index: chunk.chunkIndex,
      page_number: chunk.pageNumber,
      heading_path: chunk.headingPath || null, // Send as array, SQL function handles conversion
      start_offset: chunk.startOffset,
      end_offset: chunk.endOffset,
      embedding: JSON.stringify(batchEmbeddings[index]),
    }));

    // Use SECURITY DEFINER function to bypass RLS
    const { data, error } = await supabaseAdmin.rpc("insert_document_chunks", {
      p_chunks: records,
    });

    if (error) {
      throw new Error(`Failed to store chunks: ${error.message}`);
    }

    console.log(
      `[Document] Stored batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (${data} chunks)`
    );
  }
}

/**
 * Update document status using SECURITY DEFINER function
 * This bypasses RLS for async processing updates
 */
async function updateDocumentStatus(
  documentId: string,
  status: "uploading" | "processing" | "ready" | "error",
  chunkCount?: number,
  errorMessage?: string
): Promise<void> {
  const { error } = await supabaseAdmin.rpc("update_document_status", {
    p_document_id: documentId,
    p_status: status,
    p_chunk_count: chunkCount ?? null,
    p_error_message: errorMessage ?? null,
  });

  if (error) {
    console.error(`[Document] Failed to update status:`, error);
  }
}

/**
 * Reprocess a document (for updates or error recovery)
 */
export async function reprocessDocument(documentId: string): Promise<ProcessingResult> {
  // Get document info
  const { data: document, error } = await supabaseAdmin
    .from("documents")
    .select("filename, storage_path")
    .eq("id", documentId)
    .single();

  if (error || !document) {
    throw new Error("Document not found");
  }

  // Delete existing chunks
  await supabaseAdmin
    .from("document_chunks")
    .delete()
    .eq("document_id", documentId);

  // Note: In a real implementation, you'd fetch the file from storage
  // For now, this requires the file to be re-uploaded
  throw new Error("Reprocessing requires file re-upload");
}

/**
 * Get processing status
 */
export async function getProcessingStatus(documentId: string): Promise<{
  status: string;
  chunkCount: number;
  error?: string;
}> {
  const { data, error } = await supabaseAdmin
    .from("documents")
    .select("status, chunk_count, error_message")
    .eq("id", documentId)
    .single();

  if (error || !data) {
    throw new Error("Document not found");
  }

  return {
    status: data.status,
    chunkCount: data.chunk_count || 0,
    error: data.error_message || undefined,
  };
}
