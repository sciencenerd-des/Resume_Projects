import React, { useMemo } from 'react';
import type { Citation, Verdict } from '../../types';

interface ResponseContentProps {
  content: string;
  citations?: Citation[];
  onCitationClick?: (chunkId: string) => void;
}

/**
 * Parses content and extracts inline citations like [1], [2], etc.
 * Returns an array of text segments and citation references.
 */
function parseContentWithCitations(content: string): (string | { index: number; citation: Citation })[] {
  const result: (string | { index: number; citation: Citation })[] = [];
  let lastIndex = 0;
  
  // Match [n] pattern where n is a number
  const citationRegex = /\[(\d+)\]/g;
  let match;
  
  while ((match = citationRegex.exec(content)) !== null) {
    // Add text before the citation
    if (match.index > lastIndex) {
      result.push(content.substring(lastIndex, match.index));
    }
    
    const index = parseInt(match[1], 10);
    result.push({ index, citation: { index } as Citation });
    lastIndex = citationRegex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    result.push(content.substring(lastIndex));
  }
  
  return result;
}

const verdictColors: Record<Verdict, string> = {
  supported: 'bg-green-500',
  weak: 'bg-amber-500',
  contradicted: 'bg-red-500',
  not_found: 'bg-gray-400',
};

export function ResponseContent({
  content,
  citations = [],
  onCitationClick,
}: ResponseContentProps) {
  const parsedContent = useMemo(() => parseContentWithCitations(content), [content]);
  
  const getCitationForIndex = (index: number): Citation | undefined => {
    return citations.find(c => c.index === index);
  };
  
  return (
    <div className="leading-relaxed">
      {parsedContent.map((segment, i) => {
        if (typeof segment === 'string') {
          // Handle markdown-style formatting
          const formattedText = segment
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code class="bg-gray-200 px-1 rounded text-sm">$1</code>')
            .replace(/\n/g, '<br />');
          
          return (
            <span
              key={i}
              dangerouslySetInnerHTML={{ __html: formattedText }}
            />
          );
        }
        
        const citation = getCitationForIndex(segment.index);
        const verdict = citation?.verdict || 'supported';
        
        return (
          <button
            key={i}
            onClick={() => onCitationClick?.(citation?.chunk_id || '')}
            className={`
              inline-flex items-center justify-center
              w-5 h-5 rounded-full text-xs font-medium text-white
              ${verdictColors[verdict]}
              hover:ring-2 hover:ring-offset-1 hover:ring-blue-500
              transition-all cursor-pointer mx-0.5
              align-middle
            `}
            title={citation ? `View source: ${citation.document_id}` : `View source [${segment.index}]`}
          >
            {segment.index}
          </button>
        );
      })}
    </div>
  );
}
