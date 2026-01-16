import React, { useMemo } from 'react';
import type { Citation, Verdict } from '../../types';

interface ResponseContentProps {
  content: string;
  citations?: Citation[];
  onCitationClick?: (chunkId: string) => void;
}

/**
 * Parses content and extracts inline citations in [cite:CHUNK_HASH] format.
 * Returns an array of text segments and citation references.
 */
function parseContentWithCitations(content: string): (string | { chunkId: string; index: number })[] {
  const result: (string | { chunkId: string; index: number })[] = [];
  let lastIndex = 0;
  let citationIndex = 1;

  // Match [cite:hash] pattern where hash is 8 hex characters
  const citationRegex = /\[cite:([a-f0-9]{8})\]/g;
  let match;

  while ((match = citationRegex.exec(content)) !== null) {
    // Add text before the citation
    if (match.index > lastIndex) {
      result.push(content.substring(lastIndex, match.index));
    }

    const chunkId = match[1];
    result.push({ chunkId, index: citationIndex++ });
    lastIndex = citationRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    result.push(content.substring(lastIndex));
  }

  return result;
}

const verdictColors: Record<Verdict, string> = {
  supported: 'bg-verdict-supported',
  weak: 'bg-status-warning',
  contradicted: 'bg-destructive',
  not_found: 'bg-verdict-missing',
};

export function ResponseContent({
  content,
  citations = [],
  onCitationClick,
}: ResponseContentProps) {
  const parsedContent = useMemo(() => parseContentWithCitations(content), [content]);

  // Find citation metadata by chunk ID
  const getCitationByChunkId = (chunkId: string): Citation | undefined => {
    return citations.find((c) => c.chunk_id === chunkId);
  };

  return (
    <div className="leading-relaxed">
      {parsedContent.map((segment, i) => {
        if (typeof segment === 'string') {
          // Handle markdown-style formatting
          const formattedText = segment
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code class="bg-muted px-1 rounded text-sm">$1</code>')
            .replace(/\n/g, '<br />');

          return <span key={i} dangerouslySetInnerHTML={{ __html: formattedText }} />;
        }

        const citation = getCitationByChunkId(segment.chunkId);
        const verdict = citation?.verdict || 'supported';

        return (
          <button
            key={i}
            onClick={() => onCitationClick?.(segment.chunkId)}
            className={`
              inline-flex items-center justify-center
              w-5 h-5 rounded-full text-xs font-medium text-white
              ${verdictColors[verdict]}
              hover:ring-2 hover:ring-offset-1 hover:ring-primary
              transition-all cursor-pointer mx-0.5
              align-middle
            `}
            title={`View source [${segment.index}]`}
          >
            {segment.index}
          </button>
        );
      })}
    </div>
  );
}
