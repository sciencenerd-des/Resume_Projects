---
date: 2026-01-17T02:17:10+0530
researcher: Claude Code
git_commit: 656868236287c6c510ed71acb05e0d0f82f1d60f
branch: feature/veritydraft-dark-theme-frontend
repository: project_profile
topic: "VerityDraft Authentication Flow Documentation"
tags: [research, codebase, authentication, clerk, convex, login, routing]
status: complete
last_updated: 2026-01-17
last_updated_by: Claude Code
last_updated_note: "Added root cause analysis for OAuth callback failure and fix"
---

# Research: VerityDraft Authentication Flow Documentation

**Date**: 2026-01-17T02:17:10+0530
**Researcher**: Claude Code
**Git Commit**: 656868236287c6c510ed71acb05e0d0f82f1d60f
**Branch**: feature/veritydraft-dark-theme-frontend
**Repository**: project_profile

## Research Question
Document how the login/authentication flow works in VerityDraft to understand why login might fail.

## Summary

VerityDraft uses **Clerk** for frontend authentication integrated with **Convex** for backend data access. The authentication flow involves:

1. Server injects runtime configuration via `/api/app-config` endpoint
2. Frontend waits for config before loading React modules
3. ClerkProvider initializes with publishable key from config
4. ConvexProviderWithClerk syncs Clerk auth state with Convex
5. Login page renders Clerk's SignIn component at `/login`
6. After authentication, user redirects to `/workspaces`
7. AuthGuard protects routes and redirects unauthenticated users to login

## Detailed Findings

### 1. Configuration Injection Flow

#### Server-Side (`src/index.ts:14-79`)
The server creates an `appConfig` object from environment variables:
```typescript
const appConfig = {
  convexUrl: process.env.VITE_CONVEX_URL || "",
  clerkPublishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY || "",
  wsUrl: process.env.VITE_WS_URL || `ws://localhost:${PORT}/ws`,
};
```

Exposes config via public endpoint at `/api/app-config` (no authentication required).

#### Client-Side (`src/index.html:20-33`)
HTML page starts config fetch immediately:
```javascript
window.__configPromise = fetch('/api/app-config')
  .then(function(r) { return r.json(); })
  .then(function(config) {
    window.__APP_CONFIG__ = config;
    return config;
  });
```

#### Bootstrap Synchronization (`src/frontend.tsx:16-42`)
Frontend waits for config before importing React modules:
```typescript
async function bootstrap() {
  const configPromise = window.__configPromise;
  if (configPromise) {
    await configPromise;
  }
  // Now import React and app modules
}
```

### 2. Clerk Integration

#### ConvexClerkProvider (`src/contexts/ConvexClerkProvider.tsx:32-40`)
Wraps app with Clerk and Convex providers:
```typescript
<ClerkProvider publishableKey={clerkPublishableKey}>
  <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
    {children}
  </ConvexProviderWithClerk>
</ClerkProvider>
```

Key reads `window.__APP_CONFIG__.clerkPublishableKey` at module load time (line 26).

### 3. Server Routes for Authentication

#### SPA Routes (`src/index.ts:31-39`)
```typescript
routes: {
  "/": indexHtml,
  "/login": indexHtml,
  "/login/*": indexHtml,  // Clerk callback routes
  "/signup": indexHtml,
  "/signup/*": indexHtml, // Clerk callback routes
  "/workspaces": indexHtml,
  "/workspaces/*": indexHtml,
  "/sessions/*": indexHtml,
}
```

The `/login/*` and `/signup/*` wildcards handle Clerk's callback URLs like:
- `/login/sso-callback`
- `/login/factor-one`
- `/login/factor-two`
- `/signup/verify-email-address`

### 4. Login Page Implementation

#### LoginPage Component (`src/pages/auth/LoginPage.tsx:6-50`)

**Authentication State Check:**
```typescript
const { isAuthenticated, isLoading } = useConvexAuthState();

useEffect(() => {
  if (!isLoading && isAuthenticated) {
    navigate('/workspaces', { replace: true });
  }
}, [isAuthenticated, isLoading, navigate]);
```

**Clerk SignIn Component:**
```typescript
<SignIn
  routing="path"
  path="/login"
  signUpUrl="/signup"
  afterSignInUrl="/workspaces"
  appearance={{ /* dark theme styling */ }}
/>
```

### 5. Authentication State Hook

#### useConvexAuthState (`src/hooks/useConvexAuth.ts:10-40`)

Combines Clerk AND Convex authentication states:
```typescript
const { isLoaded: isClerkLoaded, isSignedIn } = useClerkAuth();
const { isLoading: isConvexLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth();

return {
  isLoading: !isClerkLoaded || isConvexLoading,
  isAuthenticated: isSignedIn && isConvexAuthenticated,  // BOTH must be true
};
```

### 6. Protected Route Guard

#### AuthGuard Component (`src/components/auth/AuthGuard.tsx:5-22`)

```typescript
const { user, isLoading, isAuthenticated } = useConvexAuthState();

if (isLoading) {
  return <Spinner />;
}

if (!isAuthenticated || !user) {
  return <Navigate to="/login" state={{ from: location }} replace />;
}

return <Outlet />;
```

### 7. Route Configuration

#### App.tsx Routes (`src/App.tsx:23-42`)
```typescript
<Routes>
  {/* Public Routes */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/signup" element={<SignupPage />} />

  {/* Protected Routes */}
  <Route element={<AuthGuard />}>
    <Route element={<AppLayout />}>
      <Route path="/" element={<Navigate to="/workspaces" replace />} />
      <Route path="/workspaces" element={<WorkspaceListPage />} />
      {/* ... more routes */}
    </Route>
  </Route>

  {/* Catch all */}
  <Route path="*" element={<Navigate to="/workspaces" replace />} />
</Routes>
```

## Code References

### Core Authentication Files
- `src/contexts/ConvexClerkProvider.tsx:32-40` - Clerk + Convex provider wrapper
- `src/hooks/useConvexAuth.ts:10-40` - Combined auth state hook
- `src/components/auth/AuthGuard.tsx:5-22` - Route protection component
- `src/pages/auth/LoginPage.tsx:6-50` - Login page with Clerk SignIn

### Configuration Files
- `src/index.ts:14-18` - Server-side config object
- `src/index.ts:72-79` - `/api/app-config` endpoint
- `src/index.html:20-33` - Client-side config fetch
- `src/frontend.tsx:16-42` - Bootstrap with config await

### Routing Files
- `src/index.ts:31-39` - Server SPA routes
- `src/App.tsx:23-42` - React Router routes

### Type Definitions
- `src/services/convex.ts:9-17` - Window.__APP_CONFIG__ type
- `src/frontend.tsx:4-13` - Extended Window type for configPromise

## Architecture Documentation

### Authentication Flow Sequence

```
1. Browser loads /login
2. Server serves index.html (src/index.ts:33)
3. HTML fetches /api/app-config (src/index.html:22)
4. Config stored in window.__APP_CONFIG__ (src/index.html:25)
5. frontend.tsx bootstrap() awaits config (src/frontend.tsx:18-20)
6. React modules imported dynamically (src/frontend.tsx:24-42)
7. ConvexClerkProvider reads clerkPublishableKey (src/contexts/ConvexClerkProvider.tsx:26)
8. ClerkProvider initializes (src/contexts/ConvexClerkProvider.tsx:34)
9. LoginPage renders SignIn component (src/pages/auth/LoginPage.tsx:26)
10. User authenticates via Clerk
11. Clerk updates auth state
12. useConvexAuthState detects isAuthenticated (src/hooks/useConvexAuth.ts:35)
13. LoginPage useEffect navigates to /workspaces (src/pages/auth/LoginPage.tsx:13)
```

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `@clerk/clerk-react` | ClerkProvider, SignIn, useAuth hooks |
| `convex/react-clerk` | ConvexProviderWithClerk integration |
| `convex/react` | useConvexAuth, ConvexReactClient |
| `react-router-dom` | BrowserRouter, Routes, Navigate |

### Environment Variables Required

| Variable | Purpose | Used In |
|----------|---------|---------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk frontend auth key | ConvexClerkProvider |
| `VITE_CONVEX_URL` | Convex backend URL | services/convex.ts |
| `VITE_WS_URL` | WebSocket URL (optional) | useWebSocket |

## Related Research
- `thoughts/shared/research/2026-01-17-veritydraft-white-screen-analysis.md` - Previous white screen investigation

## Critical Finding: OAuth Callback Route Mismatch

### Problem Identified
The React Router configuration does NOT handle Clerk's OAuth callback routes, causing authentication to fail.

### Current Configuration (`src/App.tsx:25-26`)
```typescript
<Route path="/login" element={<LoginPage />} />   // Exact match only
<Route path="/signup" element={<SignupPage />} /> // Exact match only
```

### What Happens During OAuth Flow
1. User clicks "Sign in with Google"
2. Clerk redirects to Google OAuth
3. Google redirects back to `/login/sso-callback`
4. Server serves `indexHtml` (wildcard `/login/*` works) ✓
5. React Router tries to match `/login/sso-callback`
6. **No match** - `/login` is exact, not wildcard
7. Catch-all `<Route path="*">` matches → redirects to `/workspaces`
8. AuthGuard checks auth → user not authenticated (callback never processed)
9. AuthGuard redirects to `/login`
10. Clerk shows "External account not found" error

### Server vs Client Route Mismatch
| Route | Server (`index.ts`) | Client (`App.tsx`) |
|-------|---------------------|-------------------|
| `/login` | ✓ Serves HTML | ✓ Renders LoginPage |
| `/login/*` | ✓ Serves HTML | ✗ No route (catch-all takes over) |
| `/signup` | ✓ Serves HTML | ✓ Renders SignupPage |
| `/signup/*` | ✓ Serves HTML | ✗ No route (catch-all takes over) |

### Required Fix
React Router routes must use wildcards to let Clerk components handle callback routes:
```typescript
<Route path="/login/*" element={<LoginPage />} />
<Route path="/signup/*" element={<SignupPage />} />
```

This allows the Clerk `<SignIn routing="path" path="/login">` component to internally handle:
- `/login/sso-callback`
- `/login/factor-one`
- `/login/factor-two`
- etc.

## Open Questions

1. ~~What specific error or behavior occurs when login fails?~~ **Resolved**: OAuth callback not processed due to missing React Router wildcards
2. ~~Are Clerk callback routes being reached?~~ **Resolved**: Server serves them correctly; React Router wildcards added to handle `/login/*` and `/signup/*`
3. ~~Is `window.__APP_CONFIG__` populated with valid values?~~ **Resolved**: Server logs confirm all values set (convexUrl ✓, clerkPublishableKey ✓, wsUrl ✓)
4. ~~Does the browser console show any Clerk-specific errors?~~ **Resolved**: No errors - only deprecation warning for `afterSignInUrl` prop (now fixed with `fallbackRedirectUrl`)
