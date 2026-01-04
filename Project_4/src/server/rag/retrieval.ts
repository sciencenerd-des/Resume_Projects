/**
 * Vector Search / Retrieval Service
 * Retrieves relevant chunks using pgvector similarity search
 */
import { generateEmbedding } from "../processing/embeddings";
import { supabaseAdmin } from "../db";

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  chunkHash: string;
  content: string;
  headingPath: string[];
  pageNumber: number | null;
  similarity: number;
  filename?: string;
}

export interface RetrievalOptions {
  threshold?: number;
  limit?: number;
  documentIds?: string[]; // Filter to specific documents
}

/**
 * Retrieve relevant chunks for a query using vector similarity
 */
export async function retrieveChunks(
  query: string,
  workspaceId: string,
  options: RetrievalOptions = {}
): Promise<RetrievedChunk[]> {
  const { threshold = 0.3, limit = 10, documentIds } = options;

  console.log(
    `[Retrieval] Searching for "${query.substring(0, 50)}..." in workspace ${workspaceId}`
  );

  // Generate query embedding
  console.log("[Retrieval] Generating embedding...");
  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(query);
    console.log(`[Retrieval] Embedding generated, length: ${queryEmbedding.length}`);
  } catch (embError) {
    console.error("[Retrieval] Embedding generation failed:", embError);
    throw embError;
  }

  // The match_chunks RPC function may not exist - use direct query as primary method
  // This is more reliable and works without requiring a custom PostgreSQL function
  console.log("[Retrieval] Using direct similarity search...");
  return retrieveChunksDirect(workspaceId, queryEmbedding, options);
}

/**
 * Direct retrieval without stored function (fallback)
 */
async function retrieveChunksDirect(
  workspaceId: string,
  queryEmbedding: number[],
  options: RetrievalOptions
): Promise<RetrievedChunk[]> {
  const { threshold = 0.3, limit = 10, documentIds } = options;

  console.log(`[Retrieval] Direct query for workspace ${workspaceId}, threshold ${threshold}`);

  // Get documents in workspace
  let documentQuery = supabaseAdmin
    .from("documents")
    .select("id, filename")
    .eq("workspace_id", workspaceId)
    .eq("status", "ready");

  if (documentIds && documentIds.length > 0) {
    documentQuery = documentQuery.in("id", documentIds);
  }

  const { data: docs, error: docsError } = await documentQuery;

  if (docsError || !docs || docs.length === 0) {
    console.log("[Retrieval] No documents found in workspace", docsError);
    return [];
  }

  console.log(`[Retrieval] Found ${docs.length} documents`);
  const docIds = docs.map((d) => d.id);
  const docMap = new Map(docs.map((d) => [d.id, d.filename]));

  // Get all chunks for these documents
  const { data: allChunks, error: chunksError } = await supabaseAdmin
    .from("document_chunks")
    .select("id, document_id, chunk_hash, content, heading_path, page_number, embedding")
    .in("document_id", docIds);

  if (chunksError || !allChunks) {
    console.error("[Retrieval] Error fetching chunks:", chunksError);
    return [];
  }

  console.log(`[Retrieval] Fetched ${allChunks.length} chunks`);

  // Calculate similarities in memory (less efficient than pgvector)
  let parseErrors = 0;
  let similarities: number[] = [];

  const chunksWithSimilarity = allChunks
    .map((chunk) => {
      // Parse embedding if it's stored as JSON string
      let embedding: number[];
      try {
        embedding =
          typeof chunk.embedding === "string"
            ? JSON.parse(chunk.embedding)
            : chunk.embedding;
      } catch (e) {
        parseErrors++;
        return null;
      }

      if (!embedding || embedding.length === 0) {
        console.log(`[Retrieval] Chunk ${chunk.id} has no embedding`);
        return null;
      }

      const similarity = cosineSimilarity(queryEmbedding, embedding);
      similarities.push(similarity);

      return {
        chunkId: chunk.id,
        documentId: chunk.document_id,
        chunkHash: chunk.chunk_hash,
        content: chunk.content,
        headingPath: chunk.heading_path || [],
        pageNumber: chunk.page_number,
        similarity,
        filename: docMap.get(chunk.document_id),
      };
    })
    .filter((c) => c !== null && c.similarity >= threshold) as RetrievedChunk[];

  console.log(`[Retrieval] Parse errors: ${parseErrors}, Similarities: min=${Math.min(...similarities).toFixed(3)}, max=${Math.max(...similarities).toFixed(3)}, threshold=${threshold}`);
  console.log(`[Retrieval] Chunks passing threshold: ${chunksWithSimilarity.length}`);

  // Sort by similarity and limit
  return chunksWithSimilarity
    .sort((a, b) => b!.similarity - a!.similarity)
    .slice(0, limit);
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Retrieve chunks by hash (for citation lookup)
 */
export async function getChunksByHash(
  chunkHashes: string[],
  workspaceId: string
): Promise<RetrievedChunk[]> {
  if (chunkHashes.length === 0) return [];

  // Get chunks
  const { data: chunks, error } = await supabaseAdmin
    .from("document_chunks")
    .select(
      `
      id,
      document_id,
      chunk_hash,
      content,
      heading_path,
      page_number,
      documents!inner (
        id,
        filename,
        workspace_id
      )
    `
    )
    .in("chunk_hash", chunkHashes);

  if (error || !chunks) {
    console.error("[Retrieval] Error fetching by hash:", error);
    return [];
  }

  // Filter by workspace and transform
  return chunks
    .filter(
      (c) =>
        (c.documents as unknown as { workspace_id: string })?.workspace_id ===
        workspaceId
    )
    .map((c) => ({
      chunkId: c.id,
      documentId: c.document_id,
      chunkHash: c.chunk_hash,
      content: c.content,
      headingPath: c.heading_path || [],
      pageNumber: c.page_number,
      similarity: 1, // Exact match
      filename: (c.documents as unknown as { filename: string })?.filename,
    }));
}
