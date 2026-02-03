# VerityDraft Tailwind CSS & Documentation Alignment Implementation Plan

## Overview

This plan addresses the gaps identified in the research report `2026-01-04-veritydraft-tailwind-frontend-deviations.md`. The implementation will create the missing `tailwind.config.js`, extract inline components to standalone files, add dark mode CSS support, and optimize the production CSS build pipeline.

## Current State Analysis

### What Works
- Tailwind CSS v3.4.1 is installed and functional
- PostCSS configured with tailwindcss and autoprefixer plugins
- CSS directives present in `src/styles/main.css`
- Components actively use Tailwind utility classes
- ThemeContext supports light/dark/system modes

### What's Missing
1. **`tailwind.config.js`** - Running with defaults, no content paths for CSS purging
2. **ClaimTypeBadge** - Exists as inline function in LedgerTable.tsx, not standalone
3. **ImportanceDot** - Exists as inline function in LedgerTable.tsx, not standalone
4. **Dark mode CSS variables** - ThemeContext toggles `.dark` class but no CSS overrides
5. **Production CSS optimization** - No minification, no tree-shaking

### Key Discoveries
- Config object pattern is the established styling approach (`variantStyles`, `sizeStyles`)
- CSS variables use HSL format: `--background: 0 0% 100%;`
- `clsx` utility is used for combining class names
- Inline ternary in template literals is common for simple conditionals
- Production CSS would be ~3.5-4MB without purging vs ~10-15KB optimized

## Desired End State

After implementation:
1. ✅ `tailwind.config.js` exists with content paths for CSS purging
2. ✅ Production CSS reduced from ~4MB to ~15KB (266x smaller)
3. ✅ ClaimTypeBadge and ImportanceDot are reusable standalone components
4. ✅ Dark mode CSS variables respond to `.dark` class on `<html>`
5. ✅ Build script produces minified, optimized CSS
6. ✅ Documentation and implementation are aligned

### Verification
- `bun build src/frontend.tsx --outdir dist --minify` produces minified bundle
- Dark mode toggles work visually when clicking theme toggle
- ClaimTypeBadge and ImportanceDot can be imported from `@/components/ui/`
- Production CSS bundle size < 50KB (measured via `ls -lh dist/*.css`)

## What We're NOT Doing

- Refactoring existing components to use `@apply` component classes (current config object pattern works well)
- Adding Tailwind plugins (not needed for current feature set)
- Changing CSS variable naming from HSL to hex (HSL is more flexible)
- Creating a full design token system (existing variables are sufficient)
- Adding CSS-in-JS libraries (Tailwind utilities are sufficient)

## Implementation Approach

The implementation follows a bottom-up approach: configuration first, then components, then documentation sync. Each phase is independently testable.

---

## Phase 1: Create Tailwind Configuration

### Overview
Create `tailwind.config.js` with content paths for CSS purging and class-based dark mode support.

### Changes Required:

#### 1. Create Tailwind Config
**File**: `tailwind.config.js` (new file at project root)
**Changes**: Create configuration with content scanning, dark mode, and theme extensions

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{ts,tsx,js,jsx}',
    './src/index.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic colors mapped to CSS variables
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};
```

### Success Criteria:

#### Automated Verification:
- [ ] File exists: `ls tailwind.config.js`
- [ ] Tailwind processes config: `bun build src/frontend.tsx --outdir dist --target browser` completes without errors
- [ ] Build output size reduced: `ls -lh dist/` shows CSS < 100KB

#### Manual Verification:
- [ ] Hot reload still works: `bun --hot src/index.ts`
- [ ] All existing component styles render correctly

---

## Phase 2: Add Dark Mode CSS Variables

### Overview
Add `.dark` class CSS variable overrides to `main.css` to enable theme switching.

### Changes Required:

#### 1. Add Dark Mode Variables
**File**: `src/styles/main.css`
**Changes**: Add dark theme CSS variables after the `:root` block

```css
/* Add after line 27 (after :root closing brace) */
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 48%;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] CSS syntax valid: `bun build src/frontend.tsx --outdir dist` succeeds
- [ ] Dark mode classes present in output: `grep -l ".dark" dist/*.css`

#### Manual Verification:
- [ ] Toggle theme to dark mode in browser
- [ ] Background changes to dark color
- [ ] Text changes to light color
- [ ] All UI elements remain readable and visually correct

---

## Phase 3: Extract ClaimTypeBadge Component

### Overview
Extract the inline ClaimTypeBadge function from LedgerTable.tsx to a standalone, reusable component.

### Changes Required:

#### 1. Create ClaimTypeBadge Component
**File**: `src/components/ui/ClaimTypeBadge.tsx` (new file)
**Changes**: Create standalone component following established patterns

```tsx
import { type ClaimType } from '../../types';

interface ClaimTypeBadgeProps {
  type: ClaimType;
  size?: 'sm' | 'md';
  className?: string;
}

const typeConfig: Record<ClaimType, { label: string; styles: string }> = {
  fact: { label: 'Fact', styles: 'bg-blue-100 text-blue-800' },
  policy: { label: 'Policy', styles: 'bg-purple-100 text-purple-800' },
  numeric: { label: 'Numeric', styles: 'bg-green-100 text-green-800' },
  definition: { label: 'Definition', styles: 'bg-gray-100 text-gray-800' },
};

export function ClaimTypeBadge({ type, size = 'md', className = '' }: ClaimTypeBadgeProps) {
  const config = typeConfig[type];

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs'}
        ${config.styles}
        ${className}
      `.trim()}
    >
      {config.label}
    </span>
  );
}
```

#### 2. Update LedgerTable.tsx
**File**: `src/components/evidence/LedgerTable.tsx`
**Changes**: Import and use standalone ClaimTypeBadge, remove inline function

```tsx
// Add import at top of file
import { ClaimTypeBadge } from '../ui/ClaimTypeBadge';

// Remove lines 99-119 (inline ClaimTypeBadge function)
// Replace usage with imported component
```

#### 3. Export from UI index
**File**: `src/components/ui/index.ts` (create if doesn't exist)
**Changes**: Add export for ClaimTypeBadge

```tsx
export { ClaimTypeBadge } from './ClaimTypeBadge';
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `bun run typecheck` passes
- [ ] File exists: `ls src/components/ui/ClaimTypeBadge.tsx`
- [ ] Import works: Component can be imported from `../ui/ClaimTypeBadge`

#### Manual Verification:
- [ ] LedgerTable renders claim type badges correctly
- [ ] All claim types display with correct colors (blue, purple, green, gray)

---

## Phase 4: Extract ImportanceDot Component

### Overview
Extract the inline ImportanceDot function from LedgerTable.tsx to a standalone, reusable component.

### Changes Required:

#### 1. Create ImportanceDot Component
**File**: `src/components/ui/ImportanceDot.tsx` (new file)
**Changes**: Create standalone component following established patterns

```tsx
import { type Importance } from '../../types';

interface ImportanceDotProps {
  importance: Importance;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

const importanceConfig: Record<Importance, { label: string; color: string }> = {
  critical: { label: 'Critical', color: 'bg-red-500' },
  material: { label: 'Material', color: 'bg-amber-500' },
  minor: { label: 'Minor', color: 'bg-gray-400' },
};

export function ImportanceDot({
  importance,
  size = 'md',
  showLabel = false,
  className = ''
}: ImportanceDotProps) {
  const config = importanceConfig[importance];
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={config.label}
    >
      <span className={`${dotSize} rounded-full flex-shrink-0 ${config.color}`} />
      {showLabel && (
        <span className="text-xs text-gray-600">{config.label}</span>
      )}
    </span>
  );
}
```

#### 2. Update LedgerTable.tsx
**File**: `src/components/evidence/LedgerTable.tsx`
**Changes**: Import and use standalone ImportanceDot, remove inline function

```tsx
// Add import at top of file
import { ImportanceDot } from '../ui/ImportanceDot';

// Remove lines 84-97 (inline ImportanceDot function)
// Replace usage with imported component
```

#### 3. Update EvidenceLedgerPanel.tsx
**File**: `src/components/evidence/EvidenceLedgerPanel.tsx`
**Changes**: Import and use standalone ImportanceDot, remove inline importanceColors

```tsx
// Add import at top of file
import { ImportanceDot } from '../ui/ImportanceDot';

// Replace importanceColors usage in ClaimRow (lines 313-332) with ImportanceDot component
```

#### 4. Export from UI index
**File**: `src/components/ui/index.ts`
**Changes**: Add export for ImportanceDot

```tsx
export { ImportanceDot } from './ImportanceDot';
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `bun run typecheck` passes
- [ ] File exists: `ls src/components/ui/ImportanceDot.tsx`
- [ ] No duplicate implementations: `grep -r "importanceColors" src/components/` returns only type definitions

#### Manual Verification:
- [ ] LedgerTable renders importance dots correctly
- [ ] EvidenceLedgerPanel renders importance dots correctly
- [ ] Colors match: critical=red, material=amber, minor=gray

---

## Phase 5: Optimize Production Build

### Overview
Add CSS minification to PostCSS config and update build scripts for production optimization.

### Changes Required:

#### 1. Install cssnano
**Command**: `bun add -D cssnano`

#### 2. Update PostCSS Config
**File**: `postcss.config.js`
**Changes**: Add cssnano for production builds

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' ? { cssnano: { preset: 'default' } } : {}),
  },
};
```

#### 3. Update Build Script
**File**: `package.json`
**Changes**: Add production environment variable and minify flag

```json
{
  "scripts": {
    "dev": "bun --hot src/index.ts",
    "start": "bun run src/index.ts",
    "build": "NODE_ENV=production bun build src/frontend.tsx --outdir dist --target browser --minify",
    "build:analyze": "NODE_ENV=production bun build src/frontend.tsx --outdir dist --target browser --minify && ls -lh dist/"
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] cssnano installed: `grep cssnano package.json`
- [ ] Production build succeeds: `bun run build`
- [ ] CSS size reduced: `ls -lh dist/*.css` shows < 50KB
- [ ] PostCSS config valid: `bun build src/frontend.tsx --outdir dist` succeeds

#### Manual Verification:
- [ ] Production build runs without errors
- [ ] Application loads correctly with production bundle
- [ ] All styles render correctly after optimization

---

## Testing Strategy

### Unit Tests
- ClaimTypeBadge renders all type variants correctly
- ImportanceDot renders all importance levels correctly
- Components accept and apply className prop

### Integration Tests
- LedgerTable uses imported ClaimTypeBadge and ImportanceDot
- EvidenceLedgerPanel uses imported ImportanceDot
- Dark mode toggle changes theme CSS variables

### Manual Testing Steps
1. Run `bun --hot src/index.ts` and verify hot reload works
2. Toggle theme between light/dark/system modes
3. Upload a document and verify LedgerTable renders correctly
4. Check Evidence Ledger panel shows importance indicators
5. Run `bun run build` and verify bundle sizes
6. Serve production build and verify all features work

## Performance Considerations

- **CSS Bundle Size**: Reduced from ~4MB to ~15-50KB with purging enabled
- **Build Time**: May increase slightly due to content scanning, but negligible (~100ms)
- **Runtime Performance**: No impact, same Tailwind classes
- **Cache Efficiency**: Smaller bundles cache more efficiently

## Migration Notes

- No database changes required
- No API changes required
- No breaking changes to existing components
- Dark mode is opt-in and defaults to light theme
- ClaimTypeBadge and ImportanceDot maintain same visual appearance

## References

- Research report: `thoughts/shared/research/2026-01-04-veritydraft-tailwind-frontend-deviations.md`
- Tailwind CSS v3.4 documentation: https://tailwindcss.com/docs
- Existing styling patterns: `src/components/ui/Button.tsx`, `src/components/evidence/VerdictBadge.tsx`
- ThemeContext implementation: `src/contexts/ThemeContext.tsx`
- PostCSS documentation: https://postcss.org/
