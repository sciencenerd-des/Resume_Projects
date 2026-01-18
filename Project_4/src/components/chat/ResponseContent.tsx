import React, { useMemo } from 'react';
import type { Citation, Verdict } from '../../types';

interface ResponseContentProps {
  content: string;
  citations?: Citation[];
  onCitationClick?: (chunkId: string) => void;
}

type CitationTag = {
  type: 'cite' | 'llm';
  source: string; // For cite: the number, for llm: writer/skeptic/judge
  index: number;
  fullMatch: string;
};

/**
 * Parses content and extracts inline citations in multiple formats:
 * - [cite:N] - Document citations (N is a number)
 * - [llm:writer] - Writer LLM knowledge
 * - [llm:skeptic] - Skeptic LLM knowledge
 * - [llm:judge] - Judge LLM knowledge
 * - [cite:8_hex_chars] - Legacy chunk hash format
 */
function parseContentWithCitations(content: string): (string | CitationTag)[] {
  const result: (string | CitationTag)[] = [];
  let lastIndex = 0;
  let citationIndex = 1;

  // Match multiple citation patterns:
  // [cite:N] where N is a number
  // [cite:hash] where hash is 8 hex characters (legacy)
  // [llm:writer], [llm:skeptic], [llm:judge]
  const citationRegex = /\[(cite):(\d+|[a-f0-9]{8})\]|\[(llm):(writer|skeptic|judge)\]/gi;
  let match;

  while ((match = citationRegex.exec(content)) !== null) {
    // Add text before the citation
    if (match.index > lastIndex) {
      result.push(content.substring(lastIndex, match.index));
    }

    const type = (match[1] || match[3]).toLowerCase() as 'cite' | 'llm';
    const source = match[2] || match[4];

    result.push({
      type,
      source: source.toLowerCase(),
      index: citationIndex++,
      fullMatch: match[0]
    });
    lastIndex = citationRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    result.push(content.substring(lastIndex));
  }

  return result;
}

// Colors for different citation types
const citationColors: Record<string, string> = {
  // Document citations - green shades based on verdict
  'cite-supported': 'bg-emerald-500',
  'cite-weak': 'bg-amber-500',
  'cite-contradicted': 'bg-red-500',
  'cite-not_found': 'bg-gray-500',
  'cite-default': 'bg-emerald-600',
  // LLM knowledge tags - distinct colors
  'llm-writer': 'bg-blue-500',
  'llm-skeptic': 'bg-purple-500',
  'llm-judge': 'bg-indigo-600',
  'llm-expert_verified': 'bg-teal-500',
  'llm-conflict_flagged': 'bg-orange-500',
};

const verdictColors: Record<Verdict, string> = {
  supported: 'bg-emerald-500',
  weak: 'bg-amber-500',
  contradicted: 'bg-red-500',
  not_found: 'bg-gray-500',
  expert_verified: 'bg-teal-500',
  conflict_flagged: 'bg-orange-500',
};

export function ResponseContent({
  content,
  citations = [],
  onCitationClick,
}: ResponseContentProps) {
  const parsedContent = useMemo(() => parseContentWithCitations(content), [content]);

  // Get color for citation based on type and source
  const getCitationColor = (tag: CitationTag): string => {
    if (tag.type === 'llm') {
      return citationColors[`llm-${tag.source}`] || citationColors['llm-writer'];
    }
    // For document citations, could lookup verdict if available
    return citationColors['cite-default'];
  };

  // Get label for citation tag
  const getCitationLabel = (tag: CitationTag): string => {
    if (tag.type === 'cite') {
      return tag.source; // Just the number
    }
    // For LLM tags, show abbreviated source
    const labels: Record<string, string> = {
      writer: 'W',
      skeptic: 'S',
      judge: 'J',
    };
    return labels[tag.source] || tag.source[0].toUpperCase();
  };

  // Get tooltip for citation tag
  const getCitationTooltip = (tag: CitationTag): string => {
    if (tag.type === 'cite') {
      return `Document source [${tag.source}]`;
    }
    const tooltips: Record<string, string> = {
      writer: 'Expert knowledge from Writer',
      skeptic: 'Expert knowledge from Skeptic',
      judge: 'Expert knowledge from Judge',
    };
    return tooltips[tag.source] || `LLM: ${tag.source}`;
  };

  return (
    <div className="leading-relaxed">
      {parsedContent.map((segment, i) => {
        if (typeof segment === 'string') {
          // Handle markdown-style formatting
          const formattedText = segment
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
            .replace(/\n\n/g, '</p><p class="mt-3">')
            .replace(/\n/g, '<br />');

          return <span key={i} dangerouslySetInnerHTML={{ __html: formattedText }} />;
        }

        const color = getCitationColor(segment);
        const label = getCitationLabel(segment);
        const tooltip = getCitationTooltip(segment);

        return (
          <button
            key={i}
            onClick={() => onCitationClick?.(segment.source)}
            className={`
              inline-flex items-center justify-center
              min-w-5 h-5 px-1.5 rounded text-[10px] font-semibold text-white
              ${color}
              hover:opacity-80 hover:scale-105
              transition-all cursor-pointer mx-0.5
              align-middle shadow-sm
            `}
            title={tooltip}
            aria-label={tooltip}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
