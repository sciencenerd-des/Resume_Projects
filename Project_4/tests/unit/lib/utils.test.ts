import { describe, test, expect } from 'bun:test';
import { cn } from '@/lib/utils';

describe('cn (className utility)', () => {
  describe('basic functionality', () => {
    test('returns single class name', () => {
      expect(cn('bg-red-500')).toBe('bg-red-500');
    });

    test('joins multiple class names', () => {
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
    });

    test('handles empty inputs', () => {
      expect(cn()).toBe('');
      expect(cn('')).toBe('');
    });
  });

  describe('conditional classes', () => {
    test('filters out falsy values', () => {
      expect(cn('class1', false, 'class2')).toBe('class1 class2');
      expect(cn('class1', null, 'class2')).toBe('class1 class2');
      expect(cn('class1', undefined, 'class2')).toBe('class1 class2');
    });

    test('handles conditional expressions', () => {
      const isActive = true;
      const isDisabled = false;

      expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active');
    });

    test('handles object syntax', () => {
      expect(cn({ 'bg-red-500': true, 'text-white': false })).toBe('bg-red-500');
    });

    test('handles nested conditionals', () => {
      const condition = true;
      expect(cn('base', condition ? 'yes' : 'no')).toBe('base yes');
    });
  });

  describe('tailwind merge behavior', () => {
    test('merges conflicting background colors', () => {
      const result = cn('bg-red-500', 'bg-blue-500');
      expect(result).toBe('bg-blue-500');
    });

    test('merges conflicting text colors', () => {
      const result = cn('text-red-500', 'text-blue-500');
      expect(result).toBe('text-blue-500');
    });

    test('merges conflicting padding', () => {
      const result = cn('p-2', 'p-4');
      expect(result).toBe('p-4');
    });

    test('merges conflicting margin', () => {
      const result = cn('m-2', 'm-4');
      expect(result).toBe('m-4');
    });

    test('merges conflicting width', () => {
      const result = cn('w-full', 'w-1/2');
      expect(result).toBe('w-1/2');
    });

    test('merges conflicting height', () => {
      const result = cn('h-10', 'h-20');
      expect(result).toBe('h-20');
    });

    test('keeps non-conflicting classes', () => {
      const result = cn('bg-red-500', 'text-white', 'p-4');
      expect(result).toBe('bg-red-500 text-white p-4');
    });

    test('merges padding directions correctly', () => {
      const result = cn('p-4', 'px-2');
      expect(result).toContain('px-2');
    });
  });

  describe('responsive prefixes', () => {
    test('handles responsive classes', () => {
      const result = cn('md:bg-red-500', 'lg:bg-blue-500');
      expect(result).toContain('md:bg-red-500');
      expect(result).toContain('lg:bg-blue-500');
    });

    test('merges same breakpoint classes', () => {
      const result = cn('md:bg-red-500', 'md:bg-blue-500');
      expect(result).toBe('md:bg-blue-500');
    });
  });

  describe('state variants', () => {
    test('handles hover classes', () => {
      const result = cn('hover:bg-red-500', 'hover:bg-blue-500');
      expect(result).toBe('hover:bg-blue-500');
    });

    test('handles focus classes', () => {
      const result = cn('focus:ring-2', 'focus:ring-4');
      expect(result).toBe('focus:ring-4');
    });

    test('handles active classes', () => {
      const result = cn('active:scale-95', 'active:scale-90');
      expect(result).toBe('active:scale-90');
    });
  });

  describe('array inputs', () => {
    test('handles array of class names', () => {
      expect(cn(['class1', 'class2'])).toBe('class1 class2');
    });

    test('handles nested arrays', () => {
      expect(cn(['class1', ['class2', 'class3']])).toBe('class1 class2 class3');
    });

    test('handles mixed array and string inputs', () => {
      expect(cn('class1', ['class2', 'class3'], 'class4')).toBe('class1 class2 class3 class4');
    });
  });

  describe('edge cases', () => {
    test('handles duplicate classes across arguments', () => {
      // tailwind-merge deduplicates conflicting tailwind classes, not arbitrary class names
      // Separate class1 arguments are merged into one by clsx
      const result = cn('class1', 'class1');
      // clsx/twMerge keeps both if not conflicting tailwind classes
      expect(result).toBe('class1 class1');
    });

    test('handles extra whitespace', () => {
      const result = cn('class1  class2');
      // Should normalize whitespace
      expect(result).not.toContain('  ');
    });

    test('handles complex tailwind classes', () => {
      const result = cn(
        'flex items-center justify-between',
        'px-4 py-2',
        'rounded-lg border',
        'hover:bg-accent'
      );
      expect(result).toContain('flex');
      expect(result).toContain('items-center');
      expect(result).toContain('justify-between');
      expect(result).toContain('px-4');
      expect(result).toContain('py-2');
      expect(result).toContain('rounded-lg');
      expect(result).toContain('border');
      expect(result).toContain('hover:bg-accent');
    });

    test('handles arbitrary values', () => {
      const result = cn('w-[100px]', 'h-[200px]');
      expect(result).toContain('w-[100px]');
      expect(result).toContain('h-[200px]');
    });

    test('handles negative values', () => {
      const result = cn('-mt-4', '-ml-2');
      expect(result).toContain('-mt-4');
      expect(result).toContain('-ml-2');
    });
  });

  describe('real-world usage patterns', () => {
    test('button component pattern', () => {
      const variant: string = 'primary';
      const size: string = 'md';
      const isDisabled = false;

      const result = cn(
        'inline-flex items-center justify-center rounded-md font-medium',
        variant === 'primary' && 'bg-primary text-primary-foreground',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground',
        size === 'sm' && 'h-8 px-3 text-sm',
        size === 'md' && 'h-10 px-4',
        size === 'lg' && 'h-12 px-6 text-lg',
        isDisabled && 'opacity-50 cursor-not-allowed'
      );

      expect(result).toContain('bg-primary');
      expect(result).toContain('h-10');
      expect(result).not.toContain('opacity-50');
    });

    test('card component pattern', () => {
      const isHoverable = true;
      const isSelected = false;

      const result = cn(
        'bg-card rounded-lg border p-4',
        isHoverable && 'hover:border-primary transition-colors',
        isSelected && 'ring-2 ring-primary'
      );

      expect(result).toContain('bg-card');
      expect(result).toContain('hover:border-primary');
      expect(result).not.toContain('ring-2');
    });

    test('input component pattern', () => {
      const hasError = true;

      const result = cn(
        'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
        hasError && 'border-destructive focus:ring-destructive'
      );

      expect(result).toContain('border-destructive');
    });
  });
});
