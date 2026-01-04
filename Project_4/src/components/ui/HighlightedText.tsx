/**
 * HighlightedText Component
 * @version 1.0.0
 * Text with highlighted search matches
 */

import React, { useMemo } from 'react';

interface HighlightedTextProps {
  text: string;
  highlight?: string;
  highlightClassName?: string;
  className?: string;
}

export function HighlightedText({
  text,
  highlight,
  highlightClassName = 'bg-yellow-200 text-yellow-900 rounded px-0.5',
  className = '',
}: HighlightedTextProps) {
  const parts = useMemo(() => {
    if (!highlight || !highlight.trim()) {
      return [{ text, highlighted: false }];
    }

    const regex = new RegExp(`(${escapeRegex(highlight)})`, 'gi');
    const segments = text.split(regex);

    return segments.map((segment) => ({
      text: segment,
      highlighted: segment.toLowerCase() === highlight.toLowerCase(),
    }));
  }, [text, highlight]);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.highlighted ? (
          <mark key={index} className={highlightClassName}>
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </span>
  );
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default HighlightedText;
