# VerityDraft Authentication Cleanup Implementation Plan

## Overview

Address deprecation warnings and potential bugs identified in the authentication flow after the OAuth callback fix was successfully applied.

## Current State Analysis

The OAuth callback issue has been resolved (React Router wildcards added). Console output shows:
- HMR connected and working
- Clerk development keys loaded (expected)
- **Deprecation warnings** requiring attention:
  - `afterSignInUrl` prop deprecated in Clerk
  - React Router v7 future flags not enabled

### Key Discoveries:
- `afterSignInUrl`/`afterSignUpUrl` deprecated - use `fallbackRedirectUrl` instead (`LoginPage.tsx:30`, `SignupPage.tsx:38`)
- React Router v7 warnings for `v7_startTransition` and `v7_relativeSplatPath` (`frontend.tsx:49`)
- `WorkspaceContext.tsx:64-67` missing `isAuthenticated` check on workspace details query

## Desired End State

- No deprecation warnings in console
- Authentication queries properly guarded against unauthenticated execution
- Codebase prepared for React Router v7 migration

### Verification:
- Console shows no Clerk deprecation warnings
- Console shows no React Router future flag warnings
- Workspace queries don't execute when user is logged out

## What We're NOT Doing

- Full React Router v7 migration (only enabling future flags)
- Changing authentication providers
- Modifying Clerk Dashboard configuration
- Adding new authentication methods

## Implementation Approach

Small, targeted changes to fix warnings and add defensive auth checks.

## Phase 1: Fix Clerk Deprecated Props

### Overview
Replace deprecated `afterSignInUrl`/`afterSignUpUrl` with new `fallbackRedirectUrl` prop.

### Changes Required:

#### 1. LoginPage.tsx
**File**: `src/pages/auth/LoginPage.tsx`
**Line**: 30

```tsx
// Before:
afterSignInUrl="/workspaces"

// After:
fallbackRedirectUrl="/workspaces"
```

#### 2. SignupPage.tsx
**File**: `src/pages/auth/SignupPage.tsx`
**Line**: 38

```tsx
// Before:
afterSignUpUrl="/workspaces"

// After:
fallbackRedirectUrl="/workspaces"
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles without errors: `bun run typecheck`
- [x] Server starts without errors: `bun --hot src/index.ts`

#### Manual Verification:
- [ ] Console no longer shows "afterSignInUrl is deprecated" warning
- [ ] Sign in with Google still redirects to `/workspaces`
- [ ] Sign up still redirects to `/workspaces`

---

## Phase 2: Add React Router v7 Future Flags

### Overview
Enable future flags to suppress deprecation warnings and prepare for v7 migration.

### Changes Required:

#### 1. frontend.tsx
**File**: `src/frontend.tsx`
**Line**: 49

```tsx
// Before:
<BrowserRouter>

// After:
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles without errors: `bun run typecheck`
- [x] Server starts without errors: `bun --hot src/index.ts`

#### Manual Verification:
- [ ] Console no longer shows React Router future flag warnings
- [ ] Navigation between routes works correctly
- [ ] OAuth callback routes still work (`/login/sso-callback`)

---

## Phase 3: Fix WorkspaceContext Auth Guard

### Overview
Add `isAuthenticated` check to the workspace details query to prevent execution before authentication completes.

### Changes Required:

#### 1. WorkspaceContext.tsx
**File**: `src/contexts/WorkspaceContext.tsx`
**Lines**: 64-67

```tsx
// Before:
const rawCurrentWorkspace = useQuery(
  api.workspaces.get,
  currentWorkspaceId ? { workspaceId: currentWorkspaceId as Id<"workspaces"> } : "skip"
);

// After:
const rawCurrentWorkspace = useQuery(
  api.workspaces.get,
  isAuthenticated && currentWorkspaceId ? { workspaceId: currentWorkspaceId as Id<"workspaces"> } : "skip"
);
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles without errors: `bun run typecheck`
- [x] Server starts without errors: `bun --hot src/index.ts`
- [ ] No "Not authenticated" errors in server logs on login page

#### Manual Verification:
- [ ] Login page loads without Convex authentication errors
- [ ] After login, workspace loads correctly
- [ ] Switching workspaces still works

---

## Phase 4: Update Research Document

### Overview
Close out open questions in the authentication flow research document.

### Changes Required:

#### 1. Research Document
**File**: `thoughts/shared/research/2026-01-17-veritydraft-authentication-flow.md`
**Section**: Open Questions

Update open questions with verified answers:

```markdown
## Open Questions

1. ~~What specific error or behavior occurs when login fails?~~ **Resolved**: OAuth callback not processed
2. ~~Are Clerk callback routes being reached?~~ **Resolved**: Server serves them, but React Router redirects away
3. ~~Is `window.__APP_CONFIG__` populated with valid values?~~ **Resolved**: Server logs confirm all values set (✓ set)
4. ~~Does the browser console show any Clerk-specific errors?~~ **Resolved**: No errors - only deprecation warnings for `afterSignInUrl` prop
```

### Success Criteria:

#### Manual Verification:
- [x] All open questions marked as resolved
- [x] Research document accurately reflects current state

---

## Testing Strategy

### Manual Testing Steps:
1. Start server with `bun --hot src/index.ts`
2. Open browser to `http://localhost:8000/login`
3. Verify console has no deprecation warnings
4. Sign in with Google
5. Verify redirect to `/workspaces`
6. Sign out
7. Verify redirect back to `/login`
8. Verify no Convex "Not authenticated" errors during sign out/sign in cycle

## References

- Original research: `thoughts/shared/research/2026-01-17-veritydraft-authentication-flow.md`
- Clerk migration guide: https://clerk.com/docs/guides/custom-redirects#redirect-url-props
- React Router v7 flags: https://reactrouter.com/v6/upgrading/future
