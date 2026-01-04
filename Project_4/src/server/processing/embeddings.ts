/**
 * Embedding Generator
 * Uses OpenAI text-embedding-3-small for vector embeddings
 */
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Initialize OpenAI client
const openai = OPENAI_API_KEY
  ? new OpenAI({ apiKey: OPENAI_API_KEY })
  : null;

// Configuration
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 100; // Max texts per API call

export interface EmbeddingResult {
  embedding: number[];
  index: number;
  tokenCount: number;
}

/**
 * Generate embeddings for multiple texts
 * Handles batching for large inputs
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  if (!openai) {
    console.warn("[Embeddings] OpenAI not configured, using placeholder embeddings");
    return texts.map(() => generatePlaceholderEmbedding());
  }

  const allEmbeddings: number[][] = [];

  // Process in batches
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchEmbeddings = await generateBatchEmbeddings(batch);
    allEmbeddings.push(...batchEmbeddings);
  }

  return allEmbeddings;
}

/**
 * Generate embeddings for a single batch
 */
async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  if (!openai) {
    return texts.map(() => generatePlaceholderEmbedding());
  }

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    // Sort by index to maintain order
    const sorted = response.data.sort((a, b) => a.index - b.index);
    return sorted.map((item) => item.embedding);
  } catch (error) {
    console.error("[Embeddings] API error:", error);
    throw new Error(
      `Embedding generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  console.log(`[Embeddings] Generating embedding for text of length ${text.length}`);
  const [embedding] = await generateEmbeddings([text]);
  console.log(`[Embeddings] Done, embedding dimension: ${embedding.length}`);
  return embedding;
}

/**
 * Generate placeholder embedding (for testing without API key)
 */
function generatePlaceholderEmbedding(): number[] {
  // Create a deterministic-ish embedding based on random values
  // This is NOT suitable for production - only for testing
  const embedding = new Array(EMBEDDING_DIMENSIONS);
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    embedding[i] = Math.random() * 2 - 1; // Random between -1 and 1
  }

  // Normalize to unit length
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  );
  return embedding.map((val) => val / magnitude);
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have same dimensions");
  }

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
 * Get embedding model configuration
 */
export function getEmbeddingConfig() {
  return {
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    batchSize: BATCH_SIZE,
    isConfigured: !!openai,
  };
}
