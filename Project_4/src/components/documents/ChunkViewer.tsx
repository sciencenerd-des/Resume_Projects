import React, { useRef, useEffect, useMemo } from 'react';

interface Chunk {
  id: string;
  content: string;
  pageNumber?: number;
  headingPath: string[];
  startOffset: number;
  endOffset: number;
}

interface ChunkViewerProps {
  chunks: Chunk[];
  highlightedChunkId?: string;
  searchQuery?: string;
  onChunkSelect?: (chunk: Chunk) => void;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightedText({ text, query }: { text: string; query?: string }) {
  if (!query) return <>{text}</>;

  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function ChunkViewer({
  chunks,
  highlightedChunkId,
  searchQuery,
  onChunkSelect,
}: ChunkViewerProps) {
  const chunkRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (highlightedChunkId) {
      chunkRefs.current.get(highlightedChunkId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [highlightedChunkId]);

  return (
    <div className="h-full overflow-y-auto">
      {chunks.map((chunk) => (
        <div
          key={chunk.id}
          ref={(el) => el && chunkRefs.current.set(chunk.id, el)}
          onClick={() => onChunkSelect?.(chunk)}
          className={`
            p-4 border-b cursor-pointer transition-colors
            ${highlightedChunkId === chunk.id
              ? 'bg-yellow-50 border-l-4 border-l-yellow-400'
              : 'hover:bg-gray-50'
            }
          `}
        >
          {chunk.headingPath.length > 0 && (
            <div className="text-xs text-gray-500 mb-2">
              {chunk.headingPath.join(' › ')}
            </div>
          )}

          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            <HighlightedText text={chunk.content} query={searchQuery} />
          </p>

          {chunk.pageNumber && (
            <div className="text-xs text-gray-400 mt-2">
              Page {chunk.pageNumber}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
