/**
 * PDF Text Extraction
 * Uses unpdf for robust server-side PDF text extraction
 */
import { extractText } from "unpdf";

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
    subject?: string;
    keywords?: string;
    creationDate?: Date;
  };
}

/**
 * Extract text content from a PDF file using unpdf
 * By default, extractText returns text as string[] (one per page)
 */
export async function extractPdfText(file: File): Promise<ExtractedText> {
  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);

  try {
    // extractText returns { text: string[], totalPages: number } by default
    const { text: pageTexts, totalPages } = await extractText(uint8Array);

    // Check if we got any text
    const hasContent = Array.isArray(pageTexts) && pageTexts.some(p => p && p.trim().length > 0);

    if (!hasContent) {
      console.warn(`[PDF] No text extracted from ${file.name}`);
      return {
        pages: [
          {
            pageNumber: 1,
            content: `[PDF: ${file.name}]`,
          },
        ],
        totalPages: 1,
        metadata: { title: file.name },
      };
    }

    // Calculate total chars for logging
    const totalChars = pageTexts.reduce((sum, p) => sum + (p?.length || 0), 0);
    console.log(`[PDF] Extracted ${totalChars} chars from ${file.name} (${totalPages} pages)`);

    // Convert array of page texts to PageContent objects
    const pages: PageContent[] = pageTexts
      .map((content: string, idx: number) => ({
        pageNumber: idx + 1,
        content: (content || "").trim(),
      }))
      .filter(p => p.content.length > 0);

    // If all pages were empty, return placeholder
    if (pages.length === 0) {
      return {
        pages: [{ pageNumber: 1, content: `[PDF: ${file.name}]` }],
        totalPages: 1,
        metadata: { title: file.name },
      };
    }

    return {
      pages,
      totalPages: totalPages || pages.length,
      metadata: {
        title: file.name.replace(/\.pdf$/i, ""),
      },
    };
  } catch (error) {
    console.error(`[PDF] Error parsing ${file.name}:`, error);

    // Return minimal content on error
    return {
      pages: [
        {
          pageNumber: 1,
          content: `[PDF parsing error: ${file.name}]`,
        },
      ],
      totalPages: 1,
      metadata: { title: file.name },
    };
  }
}
