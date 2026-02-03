import { Citation, Verdict } from '../types';

export function generateCitationId(chunkId: string, index: number): string {
  return `cite-${chunkId}-${index}`;
}

export function parseCitationRef(ref: string): { chunkId: string; index: number } | null {
  const match = ref.match(/^cite-([a-zA-Z0-9-]+)-(\d+)$/);
  if (match) {
    return {
      chunkId: match[1],
      index: parseInt(match[2], 10),
    };
  }
  return null;
}

export function getVerdictColor(verdict: Verdict): string {
  const colors: Record<Verdict, string> = {
    supported: 'bg-green-500',
    weak: 'bg-amber-500',
    contradicted: 'bg-red-500',
    not_found: 'bg-gray-400',
    expert_verified: 'bg-teal-500',
    conflict_flagged: 'bg-orange-500',
  };
  return colors[verdict];
}

export function getVerdictLabel(verdict: Verdict): string {
  const labels: Record<Verdict, string> = {
    supported: 'Supported',
    weak: 'Weak',
    contradicted: 'Contradicted',
    not_found: 'Not Found',
    expert_verified: 'Expert Verified',
    conflict_flagged: 'Conflict Flagged',
  };
  return labels[verdict];
}

export function highlightText(text: string, query: string): string {
  if (!query) return text;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
}

export function sortCitationsByVerdict(citations: Citation[]): Citation[] {
  const order: Record<Verdict, number> = {
    supported: 0,
    expert_verified: 1,
    weak: 2,
    conflict_flagged: 3,
    contradicted: 4,
    not_found: 5,
  };
  return [...citations].sort((a, b) => {
    const verdictA = a.verdict || 'not_found';
    const verdictB = b.verdict || 'not_found';
    return order[verdictA] - order[verdictB];
  });
}

export function groupCitationsByDocument(citations: Citation[]): Map<string, Citation[]> {
  const grouped = new Map<string, Citation[]>();
  for (const citation of citations) {
    const existing = grouped.get(citation.document_id) || [];
    existing.push(citation);
    grouped.set(citation.document_id, existing);
  }
  return grouped;
}
