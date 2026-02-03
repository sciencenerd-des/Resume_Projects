import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '@/components/ui/table';

describe('Table', () => {
  describe('Table component', () => {
    test('renders table element', () => {
      render(<Table data-testid="table"><tbody><tr><td>Cell</td></tr></tbody></Table>);
      const table = screen.getByTestId('table');
      expect(table.tagName).toBe('TABLE');
    });

    test('has correct base styles', () => {
      render(<Table data-testid="table"><tbody><tr><td>Cell</td></tr></tbody></Table>);
      const table = screen.getByTestId('table');
      expect(table).toHaveClass('w-full', 'caption-bottom', 'text-sm');
    });

    test('applies custom className', () => {
      render(<Table className="custom-table" data-testid="table"><tbody><tr><td>Cell</td></tr></tbody></Table>);
      expect(screen.getByTestId('table')).toHaveClass('custom-table');
    });

    test('forwards ref', () => {
      const ref = React.createRef<HTMLTableElement>();
      render(<Table ref={ref}><tbody><tr><td>Cell</td></tr></tbody></Table>);
      expect(ref.current).toBeInstanceOf(HTMLTableElement);
    });

    test('wraps in scrollable container', () => {
      render(<Table data-testid="table"><tbody><tr><td>Cell</td></tr></tbody></Table>);
      const table = screen.getByTestId('table');
      expect(table.parentElement).toHaveClass('relative', 'w-full', 'overflow-auto');
    });
  });

  describe('TableHeader component', () => {
    test('renders thead element', () => {
      render(
        <Table>
          <TableHeader data-testid="header">
            <TableRow><TableHead>Header</TableHead></TableRow>
          </TableHeader>
          <tbody><tr><td>Cell</td></tr></tbody>
        </Table>
      );
      const header = screen.getByTestId('header');
      expect(header.tagName).toBe('THEAD');
    });

    test('has border-b class', () => {
      render(
        <Table>
          <TableHeader data-testid="header">
            <TableRow><TableHead>Header</TableHead></TableRow>
          </TableHeader>
          <tbody><tr><td>Cell</td></tr></tbody>
        </Table>
      );
      expect(screen.getByTestId('header')).toHaveClass('[&_tr]:border-b');
    });

    test('applies custom className', () => {
      render(
        <Table>
          <TableHeader className="custom-header" data-testid="header">
            <TableRow><TableHead>Header</TableHead></TableRow>
          </TableHeader>
          <tbody><tr><td>Cell</td></tr></tbody>
        </Table>
      );
      expect(screen.getByTestId('header')).toHaveClass('custom-header');
    });
  });

  describe('TableBody component', () => {
    test('renders tbody element', () => {
      render(
        <Table>
          <TableBody data-testid="body">
            <TableRow><TableCell>Cell</TableCell></TableRow>
          </TableBody>
        </Table>
      );
      const body = screen.getByTestId('body');
      expect(body.tagName).toBe('TBODY');
    });

    test('has last row border removal class', () => {
      render(
        <Table>
          <TableBody data-testid="body">
            <TableRow><TableCell>Cell</TableCell></TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByTestId('body')).toHaveClass('[&_tr:last-child]:border-0');
    });

    test('applies custom className', () => {
      render(
        <Table>
          <TableBody className="custom-body" data-testid="body">
            <TableRow><TableCell>Cell</TableCell></TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByTestId('body')).toHaveClass('custom-body');
    });
  });

  describe('TableFooter component', () => {
    test('renders tfoot element', () => {
      render(
        <Table>
          <tbody><tr><td>Cell</td></tr></tbody>
          <TableFooter data-testid="footer">
            <TableRow><TableCell>Footer</TableCell></TableRow>
          </TableFooter>
        </Table>
      );
      const footer = screen.getByTestId('footer');
      expect(footer.tagName).toBe('TFOOT');
    });

    test('has muted background and font-medium', () => {
      render(
        <Table>
          <tbody><tr><td>Cell</td></tr></tbody>
          <TableFooter data-testid="footer">
            <TableRow><TableCell>Footer</TableCell></TableRow>
          </TableFooter>
        </Table>
      );
      expect(screen.getByTestId('footer')).toHaveClass('border-t', 'bg-muted/50', 'font-medium');
    });

    test('applies custom className', () => {
      render(
        <Table>
          <tbody><tr><td>Cell</td></tr></tbody>
          <TableFooter className="custom-footer" data-testid="footer">
            <TableRow><TableCell>Footer</TableCell></TableRow>
          </TableFooter>
        </Table>
      );
      expect(screen.getByTestId('footer')).toHaveClass('custom-footer');
    });
  });

  describe('TableHead component', () => {
    test('renders th element', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead data-testid="head">Header</TableHead>
            </TableRow>
          </TableHeader>
          <tbody><tr><td>Cell</td></tr></tbody>
        </Table>
      );
      const head = screen.getByTestId('head');
      expect(head.tagName).toBe('TH');
    });

    test('has correct styles', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead data-testid="head">Header</TableHead>
            </TableRow>
          </TableHeader>
          <tbody><tr><td>Cell</td></tr></tbody>
        </Table>
      );
      const head = screen.getByTestId('head');
      expect(head).toHaveClass('h-12', 'px-4', 'text-left', 'align-middle', 'font-medium', 'text-muted-foreground');
    });

    test('applies custom className', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="custom-head" data-testid="head">Header</TableHead>
            </TableRow>
          </TableHeader>
          <tbody><tr><td>Cell</td></tr></tbody>
        </Table>
      );
      expect(screen.getByTestId('head')).toHaveClass('custom-head');
    });
  });

  describe('TableRow component', () => {
    test('renders tr element', () => {
      render(
        <Table>
          <tbody>
            <TableRow data-testid="row">
              <TableCell>Cell</TableCell>
            </TableRow>
          </tbody>
        </Table>
      );
      const row = screen.getByTestId('row');
      expect(row.tagName).toBe('TR');
    });

    test('has hover and selected styles', () => {
      render(
        <Table>
          <tbody>
            <TableRow data-testid="row">
              <TableCell>Cell</TableCell>
            </TableRow>
          </tbody>
        </Table>
      );
      const row = screen.getByTestId('row');
      expect(row).toHaveClass('border-b', 'transition-colors', 'hover:bg-muted/50', 'data-[state=selected]:bg-muted');
    });

    test('applies custom className', () => {
      render(
        <Table>
          <tbody>
            <TableRow className="custom-row" data-testid="row">
              <TableCell>Cell</TableCell>
            </TableRow>
          </tbody>
        </Table>
      );
      expect(screen.getByTestId('row')).toHaveClass('custom-row');
    });
  });

  describe('TableCell component', () => {
    test('renders td element', () => {
      render(
        <Table>
          <tbody>
            <TableRow>
              <TableCell data-testid="cell">Content</TableCell>
            </TableRow>
          </tbody>
        </Table>
      );
      const cell = screen.getByTestId('cell');
      expect(cell.tagName).toBe('TD');
    });

    test('has correct padding and alignment', () => {
      render(
        <Table>
          <tbody>
            <TableRow>
              <TableCell data-testid="cell">Content</TableCell>
            </TableRow>
          </tbody>
        </Table>
      );
      const cell = screen.getByTestId('cell');
      expect(cell).toHaveClass('p-4', 'align-middle');
    });

    test('applies custom className', () => {
      render(
        <Table>
          <tbody>
            <TableRow>
              <TableCell className="custom-cell" data-testid="cell">Content</TableCell>
            </TableRow>
          </tbody>
        </Table>
      );
      expect(screen.getByTestId('cell')).toHaveClass('custom-cell');
    });
  });

  describe('TableCaption component', () => {
    test('renders caption element', () => {
      render(
        <Table>
          <TableCaption data-testid="caption">Table Caption</TableCaption>
          <tbody><tr><td>Cell</td></tr></tbody>
        </Table>
      );
      const caption = screen.getByTestId('caption');
      expect(caption.tagName).toBe('CAPTION');
    });

    test('has muted foreground text', () => {
      render(
        <Table>
          <TableCaption data-testid="caption">Caption</TableCaption>
          <tbody><tr><td>Cell</td></tr></tbody>
        </Table>
      );
      expect(screen.getByTestId('caption')).toHaveClass('mt-4', 'text-sm', 'text-muted-foreground');
    });

    test('applies custom className', () => {
      render(
        <Table>
          <TableCaption className="custom-caption" data-testid="caption">Caption</TableCaption>
          <tbody><tr><td>Cell</td></tr></tbody>
        </Table>
      );
      expect(screen.getByTestId('caption')).toHaveClass('custom-caption');
    });
  });

  describe('full table composition', () => {
    test('renders complete table with all elements', () => {
      render(
        <Table data-testid="full-table">
          <TableCaption>A list of users</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>John Doe</TableCell>
              <TableCell>john@example.com</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Jane Smith</TableCell>
              <TableCell>jane@example.com</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>Total: 2 users</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      expect(screen.getByTestId('full-table')).toBeInTheDocument();
      expect(screen.getByText('A list of users')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('Total: 2 users')).toBeInTheDocument();
    });
  });
});
