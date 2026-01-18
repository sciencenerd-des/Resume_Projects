# VerityDraft White Screen Issue Analysis

**Date:** 2026-01-17
**Project:** Project_4 (VerityDraft)
**Branch:** feature/veritydraft-dark-theme-frontend
**Commit:** 6568682
**Status:** Critical Bug - App fails to render

## Research Question

Why does the VerityDraft frontend display a white/blank screen after the recent Convex migration and config loading changes?

## Summary

The white screen is caused by **multiple cascading failures** during app initialization:

1. **Module-level synchronous config read** - Code tries to read `window.__APP_CONFIG__` before the async config fetch completes
2. **Missing QueryClientProvider** - React-query hooks fail because the provider was removed
3. **Mixed hook usage** - Old Supabase/react-query hooks coexist with new Convex/Clerk hooks
4. **No error boundary** - Errors crash silently without visible feedback

## Detailed Findings

### Issue 1: Module-Level Synchronous Config Read (PRIMARY CAUSE)

**Location:** `src/contexts/ConvexClerkProvider.tsx:26`

```typescript
// This runs at MODULE IMPORT time, not at component render time
const clerkPublishableKey = getClerkPublishableKey();
```

The `getClerkPublishableKey()` function (lines 12-24) reads from `window.__APP_CONFIG__`:

```typescript
function getClerkPublishableKey(): string {
  const config = typeof window !== "undefined" ? window.__APP_CONFIG__ : undefined;
  if (config?.clerkPublishableKey) {
    return config.clerkPublishableKey;
  }
  throw new Error("Missing clerkPublishableKey in window.__APP_CONFIG__...");
}
```

**Problem:** The new `index.html` fetches config asynchronously:

```html
<script>
  fetch('/api/app-config')
    .then(function(r) { return r.json(); })
    .then(function(config) {
      window.__APP_CONFIG__ = config;
      // Then dynamically load frontend.tsx
    })
</script>
```

**Timeline:**
1. Browser parses HTML, runs inline script
2. Fetch for `/api/app-config` starts (async)
3. After fetch completes, `window.__APP_CONFIG__` is set
4. Dynamic script element loads `frontend.tsx`
5. **BUT:** When `frontend.tsx` loads, it imports `ConvexClerkProvider.tsx`
6. The module-level `const clerkPublishableKey = getClerkPublishableKey();` executes
7. **If config fetch was slow or the module cached before config was set** → throws error

Same issue exists in `src/services/convex.ts:34`:

```typescript
export const convex = new ConvexReactClient(getConvexUrl());
```

### Issue 2: Missing QueryClientProvider

**Location:** `src/frontend.tsx`

The provider hierarchy is:

```tsx
<ConvexClerkProvider>
  <BrowserRouter>
    <ThemeProvider>
      <WorkspaceProvider>
        <CommandProvider>
          <App />
```

**Missing:** `QueryClientProvider` from `@tanstack/react-query`

**Impact:** The following hooks fail immediately:

| Hook | File | Lines | Uses |
|------|------|-------|------|
| `useAuth()` | `src/hooks/useAuth.ts` | 8, 17, 26, 37, 48 | `useQuery`, `useMutation`, `useQueryClient` |
| `useWorkspace()` | `src/hooks/useWorkspace.ts` | 2, 6, 8, 13, 31 | `useQuery`, `useMutation`, `useQueryClient` |

**Error produced:** "No QueryClient set, use QueryClientProvider to set one"

### Issue 3: Mixed Hook Usage

The codebase has TWO sets of auth/workspace hooks:

**Old (Supabase + react-query):**
- `src/hooks/useAuth.ts` - Uses `@tanstack/react-query` + Supabase
- `src/hooks/useWorkspace.ts` - Uses `@tanstack/react-query` + REST API

**New (Convex + Clerk):**
- `src/hooks/useConvexAuth.ts` - Uses `@clerk/clerk-react` + `convex/react`
- `src/hooks/useConvexWorkspace.ts` - Uses Convex queries/mutations

**Current usage in components:**

| Component | Hook Used | Hook Type |
|-----------|-----------|-----------|
| `AuthGuard.tsx:6` | `useConvexAuthState()` | NEW (Convex/Clerk) |
| `App.tsx:3` | `import { useAuth }` | OLD (imported but unused directly) |
| `AppLayout.tsx:14` | `useAuth()` | OLD (react-query) |
| `AppLayout.tsx:16` | `useWorkspace()` | OLD (react-query) |

### Issue 4: No Error Boundary

**Impact:** When any of the above errors occur:
- React crashes during render
- No error UI is shown
- User sees blank white screen
- Errors only visible in browser console

## Code References

| File | Line | Issue |
|------|------|-------|
| `src/contexts/ConvexClerkProvider.tsx` | 26 | Module-level sync config read |
| `src/services/convex.ts` | 34 | Module-level sync config read |
| `src/frontend.tsx` | 15-29 | Missing QueryClientProvider |
| `src/hooks/useAuth.ts` | 1, 6-8 | Uses react-query without provider |
| `src/hooks/useWorkspace.ts` | 2, 6-8 | Uses react-query without provider |
| `src/components/layout/AppLayout.tsx` | 14, 16 | Uses old hooks |
| `src/index.html` | 16-32 | Async config loading |

## Initialization Flow Diagram

```
index.html loads
    │
    ▼
<script> runs
    │
    ▼
fetch('/api/app-config') starts ─────────────────────┐
    │                                                  │
    ▼                                                  │ (async)
.then() callback waits...                             │
    │                                                  │
    │ ◄────────────────────────────────────────────────┘
    ▼                                               response
window.__APP_CONFIG__ = config
    │
    ▼
Create <script> for frontend.tsx
    │
    ▼
Browser fetches & executes frontend.tsx
    │
    ▼
import { ConvexClerkProvider } ─────┐
    │                               │
    │                               ▼
    │              Module-level code runs:
    │              const clerkKey = getClerkPublishableKey()
    │                               │
    │                               ▼
    │              Reads window.__APP_CONFIG__
    │              (should work if fetch completed)
    │                               │
    ▼                               ▼
root.render(<ConvexClerkProvider>...)
    │
    ▼
<App /> renders
    │
    ▼
<AppLayout /> renders
    │
    ▼
useAuth() called ──────────────────► useQueryClient()
    │                                      │
    │                                      ▼
    │                               No QueryClientProvider!
    │                                      │
    ▼                                      ▼
WHITE SCREEN ◄──────────────────────── ERROR THROWN
```

## Root Cause Summary

**Primary:** `AppLayout.tsx` calls `useAuth()` and `useWorkspace()` which require `QueryClientProvider`, but the provider was removed from `frontend.tsx` during the Convex migration.

**Secondary:** Module-level code in `ConvexClerkProvider.tsx` and `convex.ts` reads config synchronously, which could fail if there's a race condition with the async config fetch.

## What Needs to Change

To fix the white screen, the app needs:

1. Either restore `QueryClientProvider` OR migrate all components to use Convex hooks
2. Move config reading from module-level to inside component/function scope
3. Add error boundaries for graceful error handling

## Related Files

### Files using OLD hooks (need migration or provider):
- `src/hooks/useAuth.ts`
- `src/hooks/useWorkspace.ts`
- `src/components/layout/AppLayout.tsx`

### Files using NEW hooks (correct):
- `src/hooks/useConvexAuth.ts`
- `src/hooks/useConvexWorkspace.ts`
- `src/components/auth/AuthGuard.tsx`

### Config loading files:
- `src/index.html` - Async config fetch
- `src/index.ts` - Serves `/api/app-config`
- `src/services/convex.ts` - Reads config (module-level)
- `src/contexts/ConvexClerkProvider.tsx` - Reads config (module-level)
