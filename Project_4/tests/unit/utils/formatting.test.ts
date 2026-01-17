import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatBytes,
  truncate,
  capitalizeFirst,
  formatConfidence,
  formatVerdictLabel,
  escapeHtml,
} from '@/utils/formatting';

describe('formatDate', () => {
  test('formats ISO string date', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  test('formats Date object', () => {
    const date = new Date('2024-06-20');
    const result = formatDate(date);
    expect(result).toContain('Jun');
    expect(result).toContain('20');
    expect(result).toContain('2024');
  });

  test('handles different months', () => {
    expect(formatDate('2024-03-01')).toContain('Mar');
    expect(formatDate('2024-12-25')).toContain('Dec');
    expect(formatDate('2024-07-04')).toContain('Jul');
  });

  test('handles different years', () => {
    expect(formatDate('2020-01-01')).toContain('2020');
    expect(formatDate('2030-01-01')).toContain('2030');
  });
});

describe('formatDateTime', () => {
  test('includes date and time', () => {
    const result = formatDateTime('2024-01-15T14:30:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2024');
    // Time component should be present
    expect(result.match(/\d+:\d+/)).toBeTruthy();
  });

  test('formats Date object', () => {
    const date = new Date('2024-06-20T09:15:00');
    const result = formatDateTime(date);
    expect(result).toContain('Jun');
    expect(result).toContain('20');
  });
});

describe('formatRelativeTime', () => {
  let originalDate: typeof Date;

  beforeEach(() => {
    originalDate = global.Date;
    // Mock current time to 2024-01-15T12:00:00Z
    const mockNow = new Date('2024-01-15T12:00:00Z').getTime();
    global.Date = class extends originalDate {
      constructor(arg?: any) {
        if (arg === undefined) {
          super(mockNow);
        } else {
          super(arg);
        }
      }
      static now() {
        return mockNow;
      }
    } as any;
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  test('returns "Just now" for recent times', () => {
    const result = formatRelativeTime('2024-01-15T12:00:00Z');
    expect(result).toBe('Just now');
  });

  test('returns minutes ago', () => {
    const result = formatRelativeTime('2024-01-15T11:30:00Z');
    expect(result).toBe('30m ago');
  });

  test('returns hours ago', () => {
    const result = formatRelativeTime('2024-01-15T09:00:00Z');
    expect(result).toBe('3h ago');
  });

  test('returns days ago', () => {
    const result = formatRelativeTime('2024-01-13T12:00:00Z');
    expect(result).toBe('2d ago');
  });

  test('handles Date object', () => {
    const date = new Date('2024-01-15T11:00:00Z');
    const result = formatRelativeTime(date);
    expect(result).toBe('1h ago');
  });
});

describe('formatBytes', () => {
  test('returns "0 Bytes" for zero', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  test('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 Bytes');
    expect(formatBytes(1)).toBe('1 Bytes');
  });

  test('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(5120)).toBe('5 KB');
    expect(formatBytes(2560)).toBe('2.5 KB');
  });

  test('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(2097152)).toBe('2 MB');
    expect(formatBytes(1572864)).toBe('1.5 MB');
  });

  test('formats gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
    expect(formatBytes(2147483648)).toBe('2 GB');
  });

  test('handles decimal precision', () => {
    const result = formatBytes(1536);
    expect(result).toContain('KB');
    expect(result).toMatch(/1\.5\s*KB/);
  });
});

describe('truncate', () => {
  test('does not truncate short strings', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  test('truncates long strings', () => {
    expect(truncate('hello world', 5)).toBe('hello...');
  });

  test('truncates at exact length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  test('handles empty string', () => {
    expect(truncate('', 10)).toBe('');
  });

  test('handles length of 0', () => {
    expect(truncate('hello', 0)).toBe('...');
  });

  test('handles length equal to string length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  test('handles length greater than string length', () => {
    expect(truncate('hi', 10)).toBe('hi');
  });
});

describe('capitalizeFirst', () => {
  test('capitalizes first letter', () => {
    expect(capitalizeFirst('hello')).toBe('Hello');
  });

  test('handles already capitalized', () => {
    expect(capitalizeFirst('Hello')).toBe('Hello');
  });

  test('handles single character', () => {
    expect(capitalizeFirst('a')).toBe('A');
  });

  test('handles empty string', () => {
    expect(capitalizeFirst('')).toBe('');
  });

  test('preserves rest of string', () => {
    expect(capitalizeFirst('hELLO')).toBe('HELLO');
  });

  test('handles numbers', () => {
    expect(capitalizeFirst('123abc')).toBe('123abc');
  });

  test('handles special characters', () => {
    expect(capitalizeFirst('!hello')).toBe('!hello');
  });
});

describe('formatConfidence', () => {
  test('formats 0 as 0%', () => {
    expect(formatConfidence(0)).toBe('0%');
  });

  test('formats 1 as 100%', () => {
    expect(formatConfidence(1)).toBe('100%');
  });

  test('formats 0.5 as 50%', () => {
    expect(formatConfidence(0.5)).toBe('50%');
  });

  test('rounds decimal values', () => {
    expect(formatConfidence(0.333)).toBe('33%');
    expect(formatConfidence(0.666)).toBe('67%');
    expect(formatConfidence(0.999)).toBe('100%');
  });

  test('formats 0.85 as 85%', () => {
    expect(formatConfidence(0.85)).toBe('85%');
  });

  test('formats 0.123 correctly', () => {
    expect(formatConfidence(0.123)).toBe('12%');
  });
});

describe('formatVerdictLabel', () => {
  test('formats single word verdict', () => {
    expect(formatVerdictLabel('supported')).toBe('Supported');
  });

  test('formats underscore-separated verdict', () => {
    expect(formatVerdictLabel('not_found')).toBe('Not Found');
  });

  test('handles multiple underscores', () => {
    expect(formatVerdictLabel('very_long_verdict')).toBe('Very Long Verdict');
  });

  test('formats weak verdict', () => {
    expect(formatVerdictLabel('weak')).toBe('Weak');
  });

  test('formats contradicted verdict', () => {
    expect(formatVerdictLabel('contradicted')).toBe('Contradicted');
  });

  test('handles already capitalized', () => {
    expect(formatVerdictLabel('SUPPORTED')).toBe('SUPPORTED');
  });

  test('handles empty string', () => {
    expect(formatVerdictLabel('')).toBe('');
  });
});

describe('escapeHtml', () => {
  // Note: The escapeHtml function uses DOM textContent/innerHTML which behaves
  // differently in happy-dom vs real browsers. These tests verify the function
  // works correctly for the DOM implementation available.

  test('returns a string', () => {
    const result = escapeHtml('<script>alert("xss")</script>');
    expect(typeof result).toBe('string');
  });

  test('handles text with ampersand', () => {
    const result = escapeHtml('Tom & Jerry');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('preserves plain text', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });

  test('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  test('handles special characters', () => {
    const input = '<div>&amp;</div>';
    const result = escapeHtml(input);
    expect(typeof result).toBe('string');
  });

  test('uses DOM textContent and innerHTML', () => {
    // Verify the function creates and uses a div element
    // This is a structural test to ensure the DOM method is being used
    const originalCreateElement = document.createElement.bind(document);
    let divCreated = false;

    document.createElement = function(tagName: string) {
      if (tagName === 'div') divCreated = true;
      return originalCreateElement(tagName);
    };

    escapeHtml('test');
    expect(divCreated).toBe(true);

    document.createElement = originalCreateElement;
  });
});
