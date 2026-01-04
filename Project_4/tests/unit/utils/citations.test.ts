import { describe, test, expect } from 'bun:test';

function generateCitationId(chunkId: string, index: number): string {
  return `cite-${chunkId}-${index}`;
}

function parseCitationRef(ref: string): { chunkId: string; index: number } | null {
  const match = ref.match(/^cite-(.+)-(\d+)$/);
  if (!match) return null;
  return { chunkId: match[1], index: parseInt(match[2], 10) };
}

function getVerdictColor(verdict: string): string {
  const colors: Record<string, string> = {
    supported: 'bg-green-500',
    weak: 'bg-amber-500',
    contradicted: 'bg-red-500',
    not_found: 'bg-gray-400',
  };
  return colors[verdict] || 'bg-gray-400';
}

function getVerdictLabel(verdict: string): string {
  const labels: Record<string, string> = {
    supported: 'Supported',
    weak: 'Weak',
    contradicted: 'Contradicted',
    not_found: 'Not Found',
  };
  return labels[verdict] || 'Unknown';
}

function highlightText(text: string, query: string): string {
  if (!query) return text;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
}

function sortCitationsByVerdict(citations: any[]): any[] {
  const verdictOrder = ['supported', 'weak', 'contradicted', 'not_found'];
  return [...citations].sort((a, b) => {
    const aIndex = verdictOrder.indexOf(a.verdict || 'not_found');
    const bIndex = verdictOrder.indexOf(b.verdict || 'not_found');
    return aIndex - bIndex;
  });
}

function groupCitationsByDocument(citations: any[]): Map<string, any[]> {
  const grouped = new Map<string, any[]>();
  citations.forEach(citation => {
    const existing = grouped.get(citation.document_id) || [];
    existing.push(citation);
    grouped.set(citation.document_id, existing);
  });
  return grouped;
}

describe('citations utilities', () => {
  describe('generateCitationId', () => {
    test('generates citation ID with chunk ID and index', () => {
      const id = generateCitationId('abc123', 1);
      expect(id).toBe('cite-abc123-1');
    });

    test('handles different chunk IDs', () => {
      const id1 = generateCitationId('xyz789', 2);
      const id2 = generateCitationId('def456', 3);
      expect(id1).toBe('cite-xyz789-2');
      expect(id2).toBe('cite-def456-3');
    });
  });

  describe('parseCitationRef', () => {
    test('parses valid citation reference', () => {
      const result = parseCitationRef('cite-abc123-1');
      expect(result).toEqual({ chunkId: 'abc123', index: 1 });
    });

    test('returns null for invalid format', () => {
      expect(parseCitationRef('invalid')).toBeNull();
      expect(parseCitationRef('cite-abc')).toBeNull();
      expect(parseCitationRef('cite-123')).toBeNull();
    });

    test('handles chunk IDs with hyphens', () => {
      const result = parseCitationRef('cite-abc-def-123-1');
      expect(result).toEqual({ chunkId: 'abc-def-123', index: 1 });
    });
  });

  describe('getVerdictColor', () => {
    test('returns correct color for each verdict', () => {
      expect(getVerdictColor('supported')).toBe('bg-green-500');
      expect(getVerdictColor('weak')).toBe('bg-amber-500');
      expect(getVerdictColor('contradicted')).toBe('bg-red-500');
      expect(getVerdictColor('not_found')).toBe('bg-gray-400');
    });
  });

  describe('getVerdictLabel', () => {
    test('returns correct label for each verdict', () => {
      expect(getVerdictLabel('supported')).toBe('Supported');
      expect(getVerdictLabel('weak')).toBe('Weak');
      expect(getVerdictLabel('contradicted')).toBe('Contradicted');
      expect(getVerdictLabel('not_found')).toBe('Not Found');
    });
  });

  describe('highlightText', () => {
    test('highlights matching text', () => {
      const result = highlightText('Hello world', 'world');
      expect(result).toBe('Hello <mark class="bg-yellow-200">world</mark>');
    });

    test('highlights all occurrences', () => {
      const result = highlightText('test test test', 'test');
      expect(result).toContain('<mark class="bg-yellow-200">test</mark>');
    });

    test('is case insensitive', () => {
      const result = highlightText('Hello World', 'world');
      expect(result).toContain('<mark class="bg-yellow-200">World</mark>');
    });

    test('handles special regex characters', () => {
      const result = highlightText('Price: $100', '$100');
      expect(result).toContain('<mark class="bg-yellow-200">$100</mark>');
    });

    test('returns original text when query is empty', () => {
      const result = highlightText('Hello world', '');
      expect(result).toBe('Hello world');
    });
  });

  describe('sortCitationsByVerdict', () => {
    test('sorts citations by verdict order', () => {
      const citations = [
        { index: 1, chunk_id: 'a', document_id: 'doc1', verdict: 'not_found' },
        { index: 2, chunk_id: 'b', document_id: 'doc1', verdict: 'supported' },
        { index: 3, chunk_id: 'c', document_id: 'doc1', verdict: 'weak' },
        { index: 4, chunk_id: 'd', document_id: 'doc1', verdict: 'contradicted' },
      ];
      const sorted = sortCitationsByVerdict(citations);
      expect(sorted[0].verdict).toBe('supported');
      expect(sorted[1].verdict).toBe('weak');
      expect(sorted[2].verdict).toBe('contradicted');
      expect(sorted[3].verdict).toBe('not_found');
    });

    test('handles citations without verdict', () => {
      const citations = [
        { index: 1, chunk_id: 'a', document_id: 'doc1' },
        { index: 2, chunk_id: 'b', document_id: 'doc1', verdict: 'supported' },
      ];
      const sorted = sortCitationsByVerdict(citations);
      expect(sorted[0].verdict).toBe('supported');
      // Citation without verdict stays undefined but is sorted as if it were 'not_found'
      expect(sorted[1].verdict).toBeUndefined();
    });
  });

  describe('groupCitationsByDocument', () => {
    test('groups citations by document ID', () => {
      const citations = [
        { index: 1, chunk_id: 'a', document_id: 'doc1', verdict: 'supported' },
        { index: 2, chunk_id: 'b', document_id: 'doc2', verdict: 'supported' },
        { index: 3, chunk_id: 'c', document_id: 'doc1', verdict: 'weak' },
      ];
      const grouped = groupCitationsByDocument(citations);
      expect(grouped.get('doc1')).toHaveLength(2);
      expect(grouped.get('doc2')).toHaveLength(1);
    });

    test('handles empty array', () => {
      const grouped = groupCitationsByDocument([]);
      expect(grouped.size).toBe(0);
    });
  });
});
