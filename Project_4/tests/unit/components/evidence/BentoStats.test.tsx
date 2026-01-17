import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BentoStats } from '@/components/evidence/BentoStats';

const mockLedger = {
  id: '1',
  session_id: 'session-1',
  summary: {
    total_claims: 20,
    supported: 10,
    weak: 5,
    contradicted: 2,
    not_found: 3,
  },
  entries: [],
  risk_flags: [],
  created_at: new Date().toISOString(),
};

describe('BentoStats', () => {
  describe('rendering', () => {
    test('renders all stat cards', () => {
      render(<BentoStats ledger={mockLedger} />);
      expect(screen.getByText('Supported')).toBeInTheDocument();
      expect(screen.getByText('Weak')).toBeInTheDocument();
      expect(screen.getByText('Contradicted')).toBeInTheDocument();
      expect(screen.getByText('Not Found')).toBeInTheDocument();
    });

    test('displays correct supported count', () => {
      render(<BentoStats ledger={mockLedger} />);
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    test('displays correct weak count', () => {
      const { container } = render(<BentoStats ledger={mockLedger} />);
      // Find the weak stat tile (has text-verdict-weak class)
      const weakValue = container.querySelector('.text-verdict-weak');
      expect(weakValue).toHaveTextContent('5');
    });

    test('displays correct contradicted count', () => {
      render(<BentoStats ledger={mockLedger} />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    test('displays correct not found count', () => {
      render(<BentoStats ledger={mockLedger} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    test('handles null ledger', () => {
      render(<BentoStats ledger={null} />);
      // Should show zeros for all stats
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('styling', () => {
    test('has grid layout', () => {
      const { container } = render(<BentoStats ledger={mockLedger} />);
      expect(container.querySelector('.grid')).toBeInTheDocument();
    });

    test('applies custom className', () => {
      const { container } = render(<BentoStats ledger={mockLedger} className="custom-stats" />);
      expect(container.querySelector('.custom-stats')).toBeInTheDocument();
    });

    test('supported card has correct color class', () => {
      const { container } = render(<BentoStats ledger={mockLedger} />);
      expect(container.querySelector('.text-verdict-supported')).toBeInTheDocument();
    });

    test('weak card has correct color class', () => {
      const { container } = render(<BentoStats ledger={mockLedger} />);
      expect(container.querySelector('.text-verdict-weak')).toBeInTheDocument();
    });

    test('contradicted card has correct color class', () => {
      const { container } = render(<BentoStats ledger={mockLedger} />);
      expect(container.querySelector('.text-verdict-contradicted')).toBeInTheDocument();
    });

    test('not found card has correct color class', () => {
      const { container } = render(<BentoStats ledger={mockLedger} />);
      expect(container.querySelector('.text-verdict-missing')).toBeInTheDocument();
    });
  });

  describe('icons', () => {
    test('renders SVG icons in cards', () => {
      const { container } = render(<BentoStats ledger={mockLedger} />);
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(4);
    });
  });

  describe('coverage section', () => {
    test('shows evidence coverage percentage', () => {
      render(<BentoStats ledger={mockLedger} />);
      expect(screen.getByText('Evidence Coverage')).toBeInTheDocument();
    });

    test('calculates correct coverage percentage', () => {
      render(<BentoStats ledger={mockLedger} />);
      // (10 supported + 5 weak) / 20 total = 75%
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    test('shows verified claims count', () => {
      render(<BentoStats ledger={mockLedger} />);
      expect(screen.getByText(/15 of 20 claims verified/)).toBeInTheDocument();
    });
  });

  describe('document count', () => {
    test('displays document count', () => {
      render(<BentoStats ledger={mockLedger} documentCount={7} />);
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('Documents indexed')).toBeInTheDocument();
    });

    test('defaults to 0 documents', () => {
      const { container } = render(<BentoStats ledger={mockLedger} />);
      expect(screen.getByText('Documents indexed')).toBeInTheDocument();
      // Check the document count is 0 (shown near "Documents indexed")
      const docCard = screen.getByText('Documents indexed').closest('div');
      expect(docCard?.parentElement?.textContent).toContain('0');
    });
  });

  describe('total claims', () => {
    test('shows total claims count', () => {
      render(<BentoStats ledger={mockLedger} />);
      expect(screen.getByText('Total claims analyzed')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  describe('target badge', () => {
    test('shows Target Met badge when coverage >= 85%', () => {
      const highCoverageLedger = {
        id: '2',
        session_id: 'session-2',
        summary: {
          total_claims: 20,
          supported: 15,
          weak: 3,
          contradicted: 1,
          not_found: 1,
        },
        entries: [],
        risk_flags: [],
        created_at: new Date().toISOString(),
      };
      render(<BentoStats ledger={highCoverageLedger} />);
      expect(screen.getByText('Target Met')).toBeInTheDocument();
    });

    test('does not show Target Met badge when coverage < 85%', () => {
      render(<BentoStats ledger={mockLedger} />);
      expect(screen.queryByText('Target Met')).not.toBeInTheDocument();
    });
  });
});
