import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LedgerTable } from '@/components/evidence/LedgerTable';

const mockEntries = [
  {
    id: '1',
    claim_text: 'Revenue increased by 15%',
    claim_type: 'numeric' as const,
    importance: 'critical' as const,
    verdict: 'supported' as const,
    confidence: 0.95,
    chunk_ids: ['abc123'],
  },
  {
    id: '2',
    claim_text: 'Policy requires approval',
    claim_type: 'policy' as const,
    importance: 'material' as const,
    verdict: 'weak' as const,
    confidence: 0.65,
    chunk_ids: ['def456'],
  },
  {
    id: '3',
    claim_text: 'No refunds available',
    claim_type: 'fact' as const,
    importance: 'minor' as const,
    verdict: 'contradicted' as const,
    confidence: 0.88,
    chunk_ids: ['ghi789'],
  },
];

describe('LedgerTable', () => {
  describe('rendering', () => {
    test('renders table with all entries', () => {
      render(<LedgerTable entries={mockEntries} />);
      expect(screen.getByText('Revenue increased by 15%')).toBeInTheDocument();
      expect(screen.getByText('Policy requires approval')).toBeInTheDocument();
      expect(screen.getByText('No refunds available')).toBeInTheDocument();
    });

    test('renders table headers', () => {
      render(<LedgerTable entries={mockEntries} />);
      expect(screen.getByText('Claim')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Verdict')).toBeInTheDocument();
      expect(screen.getByText('Confidence')).toBeInTheDocument();
    });

    test('renders empty state when no entries', () => {
      const { container } = render(<LedgerTable entries={[]} />);
      // Empty table has no rows in tbody
      const tbody = container.querySelector('tbody');
      expect(tbody?.children.length).toBe(0);
    });
  });

  describe('sorting', () => {
    test('sorts entries by verdict order', () => {
      const { container } = render(<LedgerTable entries={mockEntries} />);
      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0]).toHaveTextContent('Revenue increased by 15%'); // supported
      expect(rows[1]).toHaveTextContent('Policy requires approval'); // weak
      expect(rows[2]).toHaveTextContent('No refunds available'); // contradicted
    });
  });

  describe('interactions', () => {
    test('calls onRowClick when row is clicked', () => {
      const handleRowClick = () => { mockCalls++; };
      let mockCalls = 0;
      render(<LedgerTable entries={mockEntries} onRowClick={handleRowClick} />);
      fireEvent.click(screen.getByText('Revenue increased by 15%'));
      expect(mockCalls).toBe(1);
    });

    test('highlights row when highlightedId matches', () => {
      render(<LedgerTable entries={mockEntries} highlightedId="1" />);
      const row = screen.getByText('Revenue increased by 15%').closest('tr');
      expect(row).toHaveClass('bg-blue-50');
    });
  });

  describe('subcomponents', () => {
    test('renders importance dots correctly', () => {
      render(<LedgerTable entries={mockEntries} />);
      expect(screen.getByTitle('critical claim')).toHaveClass('bg-red-500');
      expect(screen.getByTitle('material claim')).toHaveClass('bg-amber-500');
      expect(screen.getByTitle('minor claim')).toHaveClass('bg-gray-400');
    });

    test('renders claim type badges', () => {
      render(<LedgerTable entries={mockEntries} />);
      expect(screen.getByText('Numeric')).toBeInTheDocument();
      expect(screen.getByText('Policy')).toBeInTheDocument();
      expect(screen.getByText('Fact')).toBeInTheDocument();
    });

    test('renders verdict badges', () => {
      render(<LedgerTable entries={mockEntries} />);
      expect(screen.getByText('Supported')).toBeInTheDocument();
      expect(screen.getByText('Weak')).toBeInTheDocument();
      expect(screen.getByText('Contradicted')).toBeInTheDocument();
    });

    test('renders confidence bars with correct colors', () => {
      const { container } = render(<LedgerTable entries={mockEntries} />);
      // Confidence bars: >= 0.8 = green, >= 0.5 = amber, < 0.5 = red
      // Entry 1: confidence=0.95 -> green bar
      // Entry 2: confidence=0.65 -> amber bar
      // Entry 3: confidence=0.88 -> green bar
      //
      // Note: bg-amber-500 is also used for 'material' importance dots
      // so we check specifically within confidence bar containers
      const rows = container.querySelectorAll('tbody tr');

      // Row 1 (supported, 95%) should have green confidence bar
      const row1ConfBar = rows[0].querySelector('.bg-green-500');
      expect(row1ConfBar).toBeInTheDocument();

      // Row 2 (weak, 65%) should have amber confidence bar
      // Get the confidence cell (4th td) and check for amber
      const row2Cells = rows[1].querySelectorAll('td');
      const row2ConfCell = row2Cells[3];
      const row2ConfBar = row2ConfCell?.querySelector('.bg-amber-500');
      expect(row2ConfBar).toBeInTheDocument();
    });
  });
});
