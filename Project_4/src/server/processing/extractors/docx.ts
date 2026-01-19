/**
 * DOCX Text Extraction
 * Uses mammoth to extract text content from Word documents
 */
import mammoth from "mammoth";

export interface PageContent {
  pageNumber: number;
  content: string;
}

export interface ExtractedText {
  pages: PageContent[];
  totalPages: number;
  metadata?: {
    title?: string;
    author?: string;
  };
}

/**
 * Extract text content from a DOCX file
 * Note: DOCX doesn't have page numbers, so we return as single "page"
 */
export async function extractDocxText(file: File): Promise<ExtractedText> {
  const buffer = await file.arrayBuffer();

  // Extract raw text (preserves paragraph structure)
  const result = await mammoth.extractRawText({
    arrayBuffer: buffer,
  });

  const content = result.value;

  // If there are messages/warnings, log them
  if (result.messages.length > 0) {
    console.log("[DOCX] Extraction messages:", result.messages);
  }

  // DOCX doesn't have true page numbers
  // We could estimate based on character count or paragraph count
  // For now, treat as single "page"
  return {
    pages: [
      {
        pageNumber: 1,
        content: content.trim(),
      },
    ],
    totalPages: 1,
  };
}

/**
 * Extract text with HTML structure (for potential future use)
 * Preserves more formatting information
 */
export async function extractDocxAsHtml(
  file: File
): Promise<{ html: string; text: string }> {
  const buffer = await file.arrayBuffer();

  const [htmlResult, textResult] = await Promise.all([
    mammoth.convertToHtml({ arrayBuffer: buffer }),
    mammoth.extractRawText({ arrayBuffer: buffer }),
  ]);

  return {
    html: htmlResult.value,
    text: textResult.value,
  };
}
