import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LedgerTable } from '@/components/evidence/LedgerTable';
import type { LedgerEntry } from '@/types';

const mockEntries: LedgerEntry[] = [
  {
    id: '1',
    claim_text: 'Revenue increased by 15%',
    claim_type: 'numeric',
    source_tag: 'cite:1',
    importance: 'critical',
    verdict: 'supported',
    confidence: 0.95,
    chunk_ids: ['abc123'],
  },
  {
    id: '2',
    claim_text: 'Policy requires approval',
    claim_type: 'policy',
    source_tag: 'llm:writer',
    importance: 'material',
    verdict: 'expert_verified',
    confidence: 0.65,
    chunk_ids: ['def456'],
  },
  {
    id: '3',
    claim_text: 'No refunds available',
    claim_type: 'fact',
    source_tag: 'llm:skeptic',
    importance: 'minor',
    verdict: 'contradicted',
    confidence: 0.88,
    chunk_ids: ['ghi789'],
  },
  {
    id: '4',
    claim_text: 'Document states different terms',
    claim_type: 'legal',
    source_tag: 'llm:judge',
    importance: 'critical',
    verdict: 'conflict_flagged',
    confidence: 0.92,
    chunk_ids: ['jkl012'],
    expert_assessment: 'Verified by Judge expertise',
  },
];

describe('LedgerTable', () => {
  describe('rendering', () => {
    test('renders table with all entries', () => {
      render(<LedgerTable entries={mockEntries} />);
      expect(screen.getByText('Revenue increased by 15%')).toBeInTheDocument();
      expect(screen.getByText('Policy requires approval')).toBeInTheDocument();
      expect(screen.getByText('No refunds available')).toBeInTheDocument();
      expect(screen.getByText('Document states different terms')).toBeInTheDocument();
    });

    test('renders table headers', () => {
      render(<LedgerTable entries={mockEntries} />);
      expect(screen.getByText('Claim')).toBeInTheDocument();
      expect(screen.getByText('Source')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Verdict')).toBeInTheDocument();
      expect(screen.getByText('Confidence')).toBeInTheDocument();
    });

    test('renders empty state when no entries', () => {
      render(<LedgerTable entries={[]} />);
      expect(screen.getByText('No claims to display')).toBeInTheDocument();
    });

    test('applies custom className', () => {
      const { container } = render(
        <LedgerTable entries={mockEntries} className="custom-table" />
      );
      expect(container.querySelector('.custom-table')).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    test('sorts entries by verdict order', () => {
      const { container } = render(<LedgerTable entries={mockEntries} />);
      const rows = container.querySelectorAll('tbody tr');
      // Order: supported (0) > expert_verified (1) > conflict_flagged (3) > contradicted (4)
      expect(rows[0]).toHaveTextContent('Revenue increased by 15%'); // supported
      expect(rows[1]).toHaveTextContent('Policy requires approval'); // expert_verified
      expect(rows[2]).toHaveTextContent('Document states different terms'); // conflict_flagged
      expect(rows[3]).toHaveTextContent('No refunds available'); // contradicted
    });

    test('not_found verdicts appear last', () => {
      const entriesWithNotFound: LedgerEntry[] = [
        { ...mockEntries[0], verdict: 'not_found' },
        { ...mockEntries[1], verdict: 'supported' },
      ];
      const { container } = render(<LedgerTable entries={entriesWithNotFound} />);
      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0]).toHaveTextContent('Policy requires approval'); // supported
      expect(rows[1]).toHaveTextContent('Revenue increased by 15%'); // not_found
    });

    test('expert_verified comes after supported', () => {
      const entries: LedgerEntry[] = [
        { ...mockEntries[0], verdict: 'expert_verified' },
        { ...mockEntries[1], verdict: 'supported' },
      ];
      const { container } = render(<LedgerTable entries={entries} />);
      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0]).toHaveTextContent('Policy requires approval'); // supported
      expect(rows[1]).toHaveTextContent('Revenue increased by 15%'); // expert_verified
    });

    test('conflict_flagged comes before contradicted', () => {
      const entries: LedgerEntry[] = [
        { ...mockEntries[0], verdict: 'contradicted' },
        { ...mockEntries[1], verdict: 'conflict_flagged' },
      ];
      const { container } = render(<LedgerTable entries={entries} />);
      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0]).toHaveTextContent('Policy requires approval'); // conflict_flagged
      expect(rows[1]).toHaveTextContent('Revenue increased by 15%'); // contradicted
    });
  });

  describe('interactions', () => {
    test('calls onRowClick when row is clicked', () => {
      let clickedEntry: LedgerEntry | undefined;
      render(
        <LedgerTable
          entries={mockEntries}
          onRowClick={(entry) => { clickedEntry = entry; }}
        />
      );
      fireEvent.click(screen.getByText('Revenue increased by 15%'));
      expect(clickedEntry).toBeDefined();
      expect(clickedEntry!.id).toBe('1');
    });

    test('highlights row when highlightedId matches', () => {
      render(<LedgerTable entries={mockEntries} highlightedId="1" />);
      const row = screen.getByText('Revenue increased by 15%').closest('tr');
      // The component uses bg-primary/5 for highlighted rows
      expect(row).toHaveClass('bg-primary/5');
    });

    test('non-highlighted rows have hover effect', () => {
      render(<LedgerTable entries={mockEntries} highlightedId="1" />);
      const row = screen.getByText('Policy requires approval').closest('tr');
      // Non-highlighted rows have hover:bg-accent/5
      expect(row).toHaveClass('hover:bg-accent/5');
    });

    test('rows have cursor-pointer for clickability', () => {
      render(<LedgerTable entries={mockEntries} />);
      const row = screen.getByText('Revenue increased by 15%').closest('tr');
      expect(row).toHaveClass('cursor-pointer');
    });
  });

  describe('subcomponents', () => {
    test('renders importance dots with correct titles', () => {
      render(<LedgerTable entries={mockEntries} />);
      // Two entries have 'critical' importance
      expect(screen.getAllByTitle('Critical').length).toBe(2);
      expect(screen.getByTitle('Material')).toBeInTheDocument();
      expect(screen.getByTitle('Minor')).toBeInTheDocument();
    });

    test('renders source tag badges', () => {
      render(<LedgerTable entries={mockEntries} />);
      // Document source (cite:1)
      expect(screen.getByText('Doc 1')).toBeInTheDocument();
      // LLM sources
      expect(screen.getByText('Writer')).toBeInTheDocument();
      expect(screen.getByText('Skeptic')).toBeInTheDocument();
      expect(screen.getByText('Judge')).toBeInTheDocument();
    });

    test('renders Unknown source tag when source_tag is undefined', () => {
      const entriesWithNoSource: LedgerEntry[] = [
        { ...mockEntries[0], source_tag: undefined },
      ];
      render(<LedgerTable entries={entriesWithNoSource} />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    test('renders claim type badges', () => {
      render(<LedgerTable entries={mockEntries} />);
      expect(screen.getByText('Numeric')).toBeInTheDocument();
      expect(screen.getByText('Policy')).toBeInTheDocument();
      expect(screen.getByText('Fact')).toBeInTheDocument();
      expect(screen.getByText('Legal')).toBeInTheDocument();
    });

    test('renders verdict badges', () => {
      render(<LedgerTable entries={mockEntries} />);
      expect(screen.getByText('Supported')).toBeInTheDocument();
      expect(screen.getByText('Expert Verified')).toBeInTheDocument();
      expect(screen.getByText('Contradicted')).toBeInTheDocument();
      expect(screen.getByText('Conflict Flagged')).toBeInTheDocument();
    });

    test('renders confidence percentages', () => {
      render(<LedgerTable entries={mockEntries} />);
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
      expect(screen.getByText('88%')).toBeInTheDocument();
      expect(screen.getByText('92%')).toBeInTheDocument();
    });

    test('renders progress bars for confidence', () => {
      const { container } = render(<LedgerTable entries={mockEntries} />);
      // Progress component renders with role="progressbar"
      const progressBars = container.querySelectorAll('[role="progressbar"]');
      expect(progressBars.length).toBe(4);
    });
  });

  describe('table structure', () => {
    test('has table element', () => {
      const { container } = render(<LedgerTable entries={mockEntries} />);
      expect(container.querySelector('table')).toBeInTheDocument();
    });

    test('has thead with headers', () => {
      const { container } = render(<LedgerTable entries={mockEntries} />);
      expect(container.querySelector('thead')).toBeInTheDocument();
    });

    test('has tbody with rows', () => {
      const { container } = render(<LedgerTable entries={mockEntries} />);
      const tbody = container.querySelector('tbody');
      expect(tbody).toBeInTheDocument();
      expect(tbody?.querySelectorAll('tr').length).toBe(4);
    });
  });

  describe('styling', () => {
    test('table has scrollable container', () => {
      const { container } = render(<LedgerTable entries={mockEntries} />);
      expect(container.querySelector('.overflow-x-auto')).toBeInTheDocument();
    });

    test('claim text has line clamp for long content', () => {
      const { container } = render(<LedgerTable entries={mockEntries} />);
      const claimSpan = container.querySelector('.line-clamp-2');
      expect(claimSpan).toBeInTheDocument();
    });
  });
});
