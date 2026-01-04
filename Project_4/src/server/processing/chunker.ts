/**
 * Document Chunker
 * Splits document text into overlapping chunks for embedding
 */
import { createHash } from "crypto";

export interface PageContent {
  pageNumber: number;
  content: string;
}

export interface Chunk {
  content: string;
  chunkHash: string;
  chunkIndex: number;
  pageNumber?: number;
  headingPath: string[];
  startOffset: number;
  endOffset: number;
}

// Configuration
const CHUNK_SIZE = 1500; // Characters per chunk
const CHUNK_OVERLAP = 100; // Overlap between chunks
const MIN_CHUNK_SIZE = 100; // Minimum chunk size to keep

/**
 * Split document pages into overlapping chunks
 */
export function chunkDocument(pages: PageContent[]): Chunk[] {
  const chunks: Chunk[] = [];
  let globalOffset = 0;
  let chunkIndex = 0;

  for (const page of pages) {
    const text = page.content;
    let start = 0;

    while (start < text.length) {
      // Find optimal end position (try to break at sentence/paragraph)
      let end = Math.min(start + CHUNK_SIZE, text.length);
      end = findBreakPoint(text, start, end);

      const content = text.slice(start, end).trim();

      // Only add chunks that meet minimum size
      if (content.length >= MIN_CHUNK_SIZE) {
        chunks.push({
          content,
          chunkHash: generateChunkHash(content),
          chunkIndex: chunkIndex++,
          pageNumber: page.pageNumber,
          headingPath: extractHeadingPath(text, start),
          startOffset: globalOffset + start,
          endOffset: globalOffset + end,
        });
      }

      // Move to next chunk with overlap
      start = end - CHUNK_OVERLAP;

      // Prevent infinite loop if overlap is larger than remaining text
      if (start >= text.length - MIN_CHUNK_SIZE) break;
    }

    globalOffset += text.length;
  }

  return chunks;
}

/**
 * Find optimal break point (sentence or paragraph boundary)
 */
function findBreakPoint(text: string, start: number, idealEnd: number): number {
  // If we're at the end, use that
  if (idealEnd >= text.length) return text.length;

  // Look for break points within a small window
  const windowSize = 50;
  const searchEnd = Math.min(idealEnd + windowSize, text.length);

  // Priority: paragraph > sentence > word > force break
  const breakPoints = [
    // Paragraph break (double newline)
    text.indexOf("\n\n", idealEnd - windowSize),
    // Sentence endings
    text.indexOf(". ", idealEnd - windowSize),
    text.indexOf("! ", idealEnd - windowSize),
    text.indexOf("? ", idealEnd - windowSize),
    // Single newline
    text.indexOf("\n", idealEnd - windowSize),
    // Word boundary (space)
    text.indexOf(" ", idealEnd - windowSize),
  ];

  // Find the best break point within our window
  for (const breakPoint of breakPoints) {
    if (breakPoint > start + MIN_CHUNK_SIZE && breakPoint <= searchEnd) {
      // Return position after the break character(s)
      if (text.substring(breakPoint, breakPoint + 2) === "\n\n") {
        return breakPoint + 2;
      }
      return breakPoint + 1;
    }
  }

  // Fallback to ideal end
  return idealEnd;
}

/**
 * Generate stable hash for chunk content
 * Used for citation references
 */
export function generateChunkHash(content: string): string {
  // Normalize content for consistent hashing
  const normalized = content
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return createHash("sha256").update(normalized).digest("hex").substring(0, 8);
}

/**
 * Extract heading context from text before chunk
 */
function extractHeadingPath(text: string, position: number): string[] {
  // Look for heading patterns in text before current position
  const beforeText = text.substring(0, position);
  const headings: string[] = [];

  // Simple heading detection (lines that look like titles)
  // In production, use more sophisticated heading detection
  const lines = beforeText.split("\n");

  for (let i = lines.length - 1; i >= 0 && headings.length < 3; i--) {
    const line = lines[i].trim();

    // Detect potential headings
    if (isLikelyHeading(line)) {
      headings.unshift(line);
    }
  }

  return headings;
}

/**
 * Check if a line is likely a heading
 */
function isLikelyHeading(line: string): boolean {
  // Empty or very long lines aren't headings
  if (line.length === 0 || line.length > 100) return false;

  // Check for common heading patterns
  const headingPatterns = [
    /^#{1,6}\s+/, // Markdown headings
    /^[\d.]+\s+[A-Z]/, // Numbered sections (1. Introduction)
    /^[A-Z][^.!?]*$/, // All caps or title case without end punctuation
    /^(Chapter|Section|Part)\s+/i, // Explicit section markers
  ];

  return headingPatterns.some((pattern) => pattern.test(line));
}

/**
 * Split into semantic chunks (preserving document structure)
 * For more advanced use cases
 */
export function chunkDocumentSemantic(
  pages: PageContent[],
  options: {
    maxChunkSize?: number;
    overlap?: number;
    splitOnHeaders?: boolean;
  } = {}
): Chunk[] {
  const {
    maxChunkSize = CHUNK_SIZE,
    overlap = CHUNK_OVERLAP,
    splitOnHeaders = true,
  } = options;

  // For now, delegate to basic chunking
  // In production, implement semantic chunking based on document structure
  return chunkDocument(pages);
}
