# VerityDraft Dark Theme Migration Implementation Plan

## Overview

Migrate 25+ VerityDraft frontend components from hardcoded Tailwind color classes (e.g., `bg-white`, `text-gray-900`, `bg-blue-50`) to semantic theme tokens that support automatic dark/light mode switching. The existing theme infrastructure (CSS variables, Tailwind config, ThemeContext) is already in place and working correctly.

## Current State Analysis

### Theme Infrastructure (Already Complete)

**CSS Variables** (`src/styles/main.css:6-72`):
- 13 semantic token groups defined: `background`, `foreground`, `card`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `popover`, `radius`
- 4 verdict colors: `verdict-supported`, `verdict-weak`, `verdict-contradicted`, `verdict-missing`
- Dark mode values in `:root`, light mode overrides in `.light` class
- HSL format without wrapper enables opacity modifiers

**Tailwind Config** (`tailwind.config.js:17-58`):
- All semantic tokens mapped to Tailwind classes
- `darkMode: ["class"]` configured for class-based theme switching

**ThemeContext** (`src/contexts/ThemeContext.tsx`):
- Manages theme state: `'light' | 'dark' | 'system'`
- Applies `.light` or `.dark` class to `<html>` element
- Persists preference to localStorage
- Default theme: dark

### Components Using Theme Tokens Correctly (Reference Patterns)

| Component | Location | Pattern |
|-----------|----------|---------|
| Button | `src/components/ui/button.tsx:7-39` | `bg-primary text-primary-foreground` |
| Card | `src/components/ui/card.tsx:5-56` | `bg-card text-card-foreground border` |
| Input | `src/components/ui/input.tsx:13-66` | `bg-background border-input text-foreground` |
| VerdictBadge | `src/components/evidence/VerdictBadge.tsx` | `bg-verdict-supported/10 text-verdict-supported` |
| QueryInput | `src/components/chat/QueryInput.tsx:49-77` | `bg-card border-border text-foreground` |
| AppLayout | `src/components/layout/AppLayout.tsx:25-99` | `bg-background border-border` |

### Key Discoveries

1. **Existing pattern**: Semantic colors pair with foreground variants (e.g., `bg-primary text-primary-foreground`)
2. **Opacity modifiers work**: `bg-primary/90`, `border-border/30`, `bg-verdict-supported/10`
3. **Focus pattern**: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
4. **Hover pattern**: `hover:bg-accent hover:text-accent-foreground` or `hover:bg-{color}/90`
5. **Disabled pattern**: `disabled:opacity-50 disabled:bg-muted`

## Desired End State

All frontend components use semantic theme tokens instead of hardcoded Tailwind color classes. The application automatically adapts to light/dark mode based on user preference or system settings.

**Verification**:
1. Toggle theme via ThemeContext - all components update correctly
2. No hardcoded color classes remain (no `bg-white`, `text-gray-*`, `bg-blue-*`, etc.)
3. Visual consistency maintained across all UI areas
4. Existing tests pass

## What We're NOT Doing

- Creating new components (only modifying existing ones)
- Changing component functionality or layout
- Adding new theme tokens beyond status/semantic colors
- Modifying backend code
- Changing the ThemeContext implementation
- Adding dark mode variants for verdict colors (they remain theme-invariant by design)

## Implementation Approach

Replace hardcoded Tailwind color classes with semantic theme tokens using a systematic find-and-replace approach. Group changes by functional area to minimize risk and enable incremental testing.

**Color Mapping Reference**:

| Hardcoded Class | Semantic Replacement |
|-----------------|---------------------|
| `bg-white` | `bg-card` or `bg-background` |
| `bg-gray-50` | `bg-muted` or `bg-background` |
| `bg-gray-100` | `bg-muted` |
| `text-gray-900` | `text-foreground` |
| `text-gray-600`, `text-gray-500`, `text-gray-400` | `text-muted-foreground` |
| `border-gray-200`, `border-gray-300` | `border-border` or `border-input` |
| `bg-blue-50`, `bg-blue-100` | `bg-accent/10` or `bg-primary/10` |
| `text-blue-600`, `text-blue-800` | `text-primary` |
| `bg-red-50` | `bg-destructive/10` |
| `text-red-600`, `text-red-500` | `text-destructive` |
| `border-red-200` | `border-destructive/30` |
| `bg-green-100`, `text-green-600` | `bg-verdict-supported/10`, `text-verdict-supported` |
| `bg-amber-100`, `text-amber-600` | `bg-verdict-weak/10`, `text-verdict-weak` |
| `hover:bg-gray-100`, `hover:bg-gray-50` | `hover:bg-accent` |

---

## Phase 1: Extend Theme Token System

### Overview
Add missing semantic tokens for status colors and claim types to support consistent theming across all UI elements.

### Changes Required:

#### 1. CSS Variables
**File**: `src/styles/main.css`
**Changes**: Add status semantic tokens after verdict colors

```css
/* Add after line 41 (verdict colors) in :root */

/* Status semantics (use verdict colors for consistency) */
--status-info: var(--primary);
--status-success: var(--verdict-supported);
--status-warning: var(--verdict-weak);
--status-error: var(--destructive);

/* Claim type colors */
--claim-factual: 217 91% 60%;
--claim-opinion: 270 67% 58%;
--claim-statistical: 142 76% 36%;
```

```css
/* Add in .light class section */

/* Claim types (same in light mode for now) */
--claim-factual: 217 91% 60%;
--claim-opinion: 270 67% 58%;
--claim-statistical: 142 76% 36%;
```

#### 2. Tailwind Config
**File**: `tailwind.config.js`
**Changes**: Add status and claim color mappings

```javascript
// Add after verdict colors (line 57)
status: {
  info: "hsl(var(--status-info))",
  success: "hsl(var(--status-success))",
  warning: "hsl(var(--status-warning))",
  error: "hsl(var(--status-error))",
},
claim: {
  factual: "hsl(var(--claim-factual))",
  opinion: "hsl(var(--claim-opinion))",
  statistical: "hsl(var(--claim-statistical))",
},
```

### Success Criteria:

#### Automated Verification:
- [ ] CSS compiles without errors: `bun run build`
- [ ] Type checking passes: `bun run typecheck`
- [ ] New utility classes generated in `output.css`

#### Manual Verification:
- [ ] Theme toggle still works correctly
- [ ] No visual regressions in existing components

---

## Phase 2: UI Foundation Components

### Overview
Migrate shared UI components that are used throughout the application. Fixing these first ensures consistent theming in all areas.

### Changes Required:

#### 1. Modal Component
**File**: `src/components/ui/Modal.tsx:43-55`
**Changes**: Replace fixed white/gray palette

| Current | Replacement |
|---------|-------------|
| `bg-white` | `bg-card` |
| `text-gray-500` | `text-muted-foreground` |
| `hover:text-gray-700` | `hover:text-foreground` |

#### 2. ConfirmModal Component
**File**: `src/components/ui/ConfirmModal.tsx:26-81`
**Changes**: Replace variant-specific hardcoded colors with semantic tokens

| Current | Replacement |
|---------|-------------|
| `bg-red-100 text-red-600` (danger) | `bg-destructive/10 text-destructive` |
| `bg-amber-100 text-amber-600` (warning) | `bg-status-warning/10 text-status-warning` |
| `bg-blue-100 text-blue-600` (info) | `bg-primary/10 text-primary` |
| `text-gray-900` | `text-foreground` |
| `text-gray-500` | `text-muted-foreground` |

#### 3. InlineError Component
**File**: `src/components/ui/InlineError.tsx:18-30`
**Changes**: Replace red palette

| Current | Replacement |
|---------|-------------|
| `bg-red-50` | `bg-destructive/10` |
| `border-red-200` | `border-destructive/30` |
| `text-red-600` | `text-destructive` |

#### 4. ErrorWithRetry Component
**File**: `src/components/ui/ErrorWithRetry.tsx:27-33`
**Changes**: Replace red/gray palette

| Current | Replacement |
|---------|-------------|
| `bg-red-50` | `bg-destructive/10` |
| `text-red-500` | `text-destructive` |
| `text-gray-600` | `text-muted-foreground` |

#### 5. EmptyState Component
**File**: `src/components/ui/EmptyState.tsx:36-47`
**Changes**: Replace gray palette

| Current | Replacement |
|---------|-------------|
| `bg-gray-100` | `bg-muted` |
| `text-gray-500` | `text-muted-foreground` |
| `text-gray-400` | `text-muted-foreground` |

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `bun run typecheck`
- [ ] Unit tests pass: `bun test tests/unit/components/ui/`
- [ ] Lint passes: `bun run lint`

#### Manual Verification:
- [ ] Modal appears correctly in both themes
- [ ] ConfirmModal variants (danger, warning, info) display correctly
- [ ] Error states are visible and readable in both themes
- [ ] Empty states have appropriate contrast

---

## Phase 3: Auth Components

### Overview
Migrate authentication flow components. These are self-contained and low-risk to modify.

### Changes Required:

#### 1. LoginForm Component
**File**: `src/components/auth/LoginForm.tsx:35-90`
**Changes**: Replace error banner and link colors

| Current | Replacement |
|---------|-------------|
| `bg-red-50` | `bg-destructive/10` |
| `text-red-600` | `text-destructive` |
| `border-red-200` | `border-destructive/30` |
| `text-blue-600` | `text-primary` |
| `hover:text-blue-800` | `hover:text-primary/80` |

#### 2. SignupForm Component
**File**: `src/components/auth/SignupForm.tsx:63-165`
**Changes**: Replace error banner and requirement indicator colors

| Current | Replacement |
|---------|-------------|
| `bg-red-50`, `text-red-600`, `border-red-200` | `bg-destructive/10`, `text-destructive`, `border-destructive/30` |
| `text-green-600` (requirement met) | `text-verdict-supported` |
| `text-gray-400` (requirement unmet) | `text-muted-foreground` |
| `text-blue-600` | `text-primary` |

#### 3. LoginPage Component
**File**: `src/pages/auth/LoginPage.tsx:23-35`
**Changes**: Replace background and text colors

| Current | Replacement |
|---------|-------------|
| `bg-gray-50` | `bg-background` |
| `text-gray-900` | `text-foreground` |
| `text-gray-600` | `text-muted-foreground` |

#### 4. SignupPage Component
**File**: `src/pages/auth/SignupPage.tsx:24-40`
**Changes**: Replace background, border, and button colors

| Current | Replacement |
|---------|-------------|
| `bg-gray-50` | `bg-background` |
| `bg-white` | `bg-card` |
| `border-gray-200` | `border-border` |
| `bg-blue-600` | `bg-primary` |

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `bun run typecheck`
- [ ] Lint passes: `bun run lint`

#### Manual Verification:
- [ ] Login page renders correctly in both themes
- [ ] Signup page renders correctly in both themes
- [ ] Error states visible and readable
- [ ] Password requirement indicators change color appropriately
- [ ] Links are visible and clickable in both themes

---

## Phase 4: Layout Components

### Overview
Migrate layout and navigation components that provide the application shell.

### Changes Required:

#### 1. Header Component
**File**: `src/components/layout/Header.tsx:18-23`
**Changes**: Replace white/gray palette

| Current | Replacement |
|---------|-------------|
| `bg-white` | `bg-background` |
| `border-gray-200` | `border-border` |
| `text-gray-900` | `text-foreground` |
| `hover:bg-gray-100` | `hover:bg-accent` |

#### 2. Sidebar Component
**File**: `src/components/layout/Sidebar.tsx:32-71`
**Changes**: Convert hardcoded dark grays to theme tokens

**Note**: Sidebar should only display workspace chat history. Current hardcoded dark styling needs to use theme tokens.

| Current | Replacement |
|---------|-------------|
| `bg-gray-900` | `bg-card` |
| `bg-gray-800` | `bg-muted` |
| `text-gray-400` | `text-muted-foreground` |
| `hover:bg-gray-800` | `hover:bg-accent` |
| `text-gray-300` | `text-foreground` |

#### 3. WorkspaceSwitcher Component
**File**: `src/components/workspace/WorkspaceSwitcher.tsx:36-78, 131-140`
**Changes**: Replace dropdown and form field colors

| Current | Replacement |
|---------|-------------|
| `bg-white` | `bg-popover` |
| `border-gray-200` | `border-border` |
| `hover:bg-gray-50` | `hover:bg-accent` |
| `border-gray-300` | `border-input` |
| `focus:border-blue-500` | `focus:border-primary` |

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `bun run typecheck`
- [ ] Lint passes: `bun run lint`

#### Manual Verification:
- [ ] Header appears correctly in both themes
- [ ] Sidebar displays workspace chat history correctly in both themes
- [ ] Workspace switcher dropdown is readable in both themes
- [ ] Hover states visible and appropriate

---

## Phase 5: Documents UI

### Overview
Migrate document management components.

### Changes Required:

#### 1. DocumentUpload Component
**File**: `src/components/documents/DocumentUpload.tsx:153-206, 217-224`
**Changes**: Replace drop zone and file list colors

| Current | Replacement |
|---------|-------------|
| `bg-gray-50` | `bg-muted` |
| `border-gray-300` | `border-border` |
| `hover:border-blue-500` | `hover:border-primary` |
| `bg-white` | `bg-card` |
| `border-gray-200` | `border-border` |
| `text-gray-600` | `text-muted-foreground` |
| `text-red-600` | `text-destructive` |
| `bg-blue-50` (drag active) | `bg-primary/10` |
| `border-blue-300` | `border-primary/50` |

#### 2. UploadZone Component
**File**: `src/components/documents/UploadZone.tsx:58-77`
**Changes**: Replace drag state and label colors

| Current | Replacement |
|---------|-------------|
| `bg-blue-50` | `bg-primary/10` |
| `border-blue-300` | `border-primary/50` |
| `text-gray-600` | `text-muted-foreground` |

#### 3. DocumentCard Status Colors
**File**: `src/components/documents/DocumentCard.tsx:17-21`
**Changes**: Replace status-specific text colors

| Current | Replacement |
|---------|-------------|
| `text-blue-600` (processing) | `text-primary` |
| `text-green-600` (ready) | `text-verdict-supported` |
| `text-red-600` (error) | `text-destructive` |

#### 4. ChunkViewer Component
**File**: `src/components/documents/ChunkViewer.tsx:67-82`
**Changes**: Replace highlight and text colors

| Current | Replacement |
|---------|-------------|
| `bg-yellow-50` | `bg-status-warning/10` |
| `hover:bg-gray-50` | `hover:bg-accent` |
| `text-gray-800` | `text-foreground` |

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `bun run typecheck`
- [ ] Unit tests pass: `bun test tests/unit/components/documents/`
- [ ] Lint passes: `bun run lint`

#### Manual Verification:
- [ ] Upload drop zone visible in both themes
- [ ] Drag-active state clearly distinguishable
- [ ] Document cards readable with correct status colors
- [ ] Chunk viewer highlights visible in both themes

---

## Phase 6: Chat UI

### Overview
Migrate chat interface components.

### Changes Required:

#### 1. MessageBubble Component
**File**: `src/components/chat/MessageBubble.tsx:25-71`
**Changes**: Replace bubble background and text colors

| Current | Replacement |
|---------|-------------|
| `bg-white` (assistant) | `bg-card` |
| `border-gray-200` | `border-border` |
| `text-gray-900` | `text-foreground` |
| `text-gray-400` | `text-muted-foreground` |
| `bg-blue-600` (user) | `bg-primary` |

#### 2. MessageList Component
**File**: `src/components/chat/MessageList.tsx:101-123`
**Changes**: Replace status indicator colors

| Current | Replacement |
|---------|-------------|
| `border-amber-500/30` | `border-status-warning/30` |
| `text-amber-500` | `text-status-warning` |
| `text-green-500` | `text-verdict-supported` |

#### 3. ModeToggle Component
**File**: `src/components/chat/ModeToggle.tsx:17-46`
**Changes**: Replace border and background colors

| Current | Replacement |
|---------|-------------|
| `border-gray-300` | `border-border` |
| `bg-blue-600` | `bg-primary` |
| `text-gray-700` | `text-foreground` |
| `hover:bg-gray-100` | `hover:bg-accent` |

#### 4. StreamingIndicator Component
**File**: `src/components/chat/StreamingIndicator.tsx:15-64`
**Changes**: Replace gray palette and status dot colors

| Current | Replacement |
|---------|-------------|
| `bg-gray-100` | `bg-muted` |
| `text-gray-600` | `text-muted-foreground` |
| `text-gray-500` | `text-muted-foreground` |
| `bg-gray-400` | `bg-muted-foreground` |

#### 5. ResponseContent Component
**File**: `src/components/chat/ResponseContent.tsx:42-46`
**Changes**: Replace verdict indicator colors

| Current | Replacement |
|---------|-------------|
| `bg-green-500` | `bg-verdict-supported` |
| `bg-amber-500` | `bg-verdict-weak` |
| `bg-red-500` | `bg-verdict-contradicted` |
| `bg-gray-400` | `bg-verdict-missing` |

#### 6. ChatPage Reconnect Indicator
**File**: `src/pages/chat/ChatPage.tsx:248-251`
**Changes**: Replace warning colors

| Current | Replacement |
|---------|-------------|
| `text-amber-600` | `text-status-warning` |
| `bg-amber-500` | `bg-status-warning` |

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `bun run typecheck`
- [ ] Unit tests pass: `bun test tests/unit/components/chat/`
- [ ] Lint passes: `bun run lint`

#### Manual Verification:
- [ ] Assistant messages readable in both themes
- [ ] User messages have appropriate contrast
- [ ] Status indicators visible
- [ ] Mode toggle clearly shows active state
- [ ] Streaming indicator visible during response generation
- [ ] Reconnect warning visible and appropriate

---

## Phase 7: Evidence UI & Page Components

### Overview
Migrate remaining evidence-related components and page-level status badges.

### Changes Required:

#### 1. CitationPopover Component
**File**: `src/components/evidence/CitationPopover.tsx:85-125`
**Changes**: Replace popover surface and text colors

| Current | Replacement |
|---------|-------------|
| `bg-white` | `bg-popover` |
| `border-gray-200` | `border-border` |
| `text-gray-900` | `text-popover-foreground` |
| `text-gray-600` | `text-muted-foreground` |

#### 2. ClaimTypeBadge Component
**File**: `src/components/ui/ClaimTypeBadge.tsx:16-36`
**Changes**: Replace claim type colors with semantic tokens

| Current | Replacement |
|---------|-------------|
| `bg-blue-100 text-blue-800` (factual) | `bg-claim-factual/10 text-claim-factual` |
| `bg-purple-100 text-purple-800` (opinion) | `bg-claim-opinion/10 text-claim-opinion` |
| `bg-green-100 text-green-800` (statistical) | `bg-claim-statistical/10 text-claim-statistical` |

#### 3. WorkspaceHomePage Component
**File**: `src/pages/workspace/WorkspaceHomePage.tsx:81-99, 167-183, 256-259`
**Changes**: Replace stat icons and status badge colors

| Current | Replacement |
|---------|-------------|
| `bg-blue-100 text-blue-600` | `bg-primary/10 text-primary` |
| `bg-green-100 text-green-600` | `bg-verdict-supported/10 text-verdict-supported` |
| `text-*-600 bg-*-50` patterns | Semantic equivalents |

#### 4. SessionViewPage Component
**File**: `src/pages/sessions/SessionViewPage.tsx:180-194`
**Changes**: Replace status badge colors

| Current | Replacement |
|---------|-------------|
| `text-*-600 bg-*-50` patterns | Semantic equivalents based on status meaning |

#### 5. SupabaseContext Loading/Error States
**File**: `src/contexts/SupabaseContext.tsx:37-55`
**Changes**: Replace loading and error colors

| Current | Replacement |
|---------|-------------|
| `bg-gray-100` | `bg-muted` |
| `text-gray-600` | `text-muted-foreground` |
| `bg-red-50` | `bg-destructive/10` |
| `text-red-600` | `text-destructive` |

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `bun run typecheck`
- [ ] Unit tests pass: `bun test tests/unit/components/evidence/`
- [ ] Lint passes: `bun run lint`

#### Manual Verification:
- [ ] Citation popovers readable in both themes
- [ ] Claim type badges clearly distinguishable
- [ ] Workspace home stats visible
- [ ] Session status badges visible and meaningful
- [ ] Loading and error states appropriate

---

## Testing Strategy

### Unit Tests
- Existing component tests should continue to pass
- No new tests required (visual changes only)

### Integration Tests
- Theme toggle should update all components
- No functional changes to test

### Manual Testing Steps
1. Start dev server: `bun --hot src/index.ts`
2. Navigate through all application areas
3. Toggle theme using theme button
4. Verify each area:
   - Auth pages (login, signup)
   - Main layout (header, sidebar)
   - Document upload and listing
   - Chat interface
   - Evidence ledger
   - Empty states and error states
5. Test in system light/dark mode with "system" theme setting

---

## Performance Considerations

- No performance impact expected (CSS class changes only)
- Tailwind purges unused classes, so final bundle size unchanged
- CSS variable resolution is negligible overhead

---

## Migration Notes

- Changes are purely visual (CSS classes)
- No data migrations required
- No API changes
- Rollback: revert git changes

---

## References

- Research document: `thoughts/shared/research/2026-01-16-veritydraft-frontend-comprehensive-analysis.md`
- Critical analysis: `Project_4/CRITICAL_ANALYSIS_VERITYDRAFT.md`
- Theme token reference: `src/styles/main.css:6-72`
- Tailwind config: `tailwind.config.js:17-58`
- ThemeContext: `src/contexts/ThemeContext.tsx`
