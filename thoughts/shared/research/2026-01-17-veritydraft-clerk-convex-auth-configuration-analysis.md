---
date: 2026-01-17T21:47:11Z
researcher: biswajitmondal
git_commit: 09249e99292f5d969e8ad4d04413598b6f486731
branch: feature/veritydraft-convex-migration
repository: sciencenerd-des/Resume_Projects
topic: "Clerk-Convex Authentication Configuration Error Analysis"
tags: [research, codebase, authentication, clerk, convex, jwt]
status: complete
last_updated: 2026-01-17
last_updated_by: biswajitmondal
---

# Research: Clerk-Convex Authentication Configuration Error Analysis

**Date**: 2026-01-17T21:47:11Z
**Researcher**: biswajitmondal
**Git Commit**: 09249e99292f5d969e8ad4d04413598b6f486731
**Branch**: feature/veritydraft-convex-migration
**Repository**: sciencenerd-des/Resume_Projects

## Research Question

After logging in with Gmail account, the application shows "Authentication Configuration Error" even though all required configuration steps appear to have been completed. What codebase issues or configuration requirements could be causing this persistent error?

## Summary

The authentication error occurs when Clerk successfully authenticates the user (Gmail OAuth) but Convex fails to validate the JWT token. This is detected by the `AuthGuard` component at `src/components/auth/AuthGuard.tsx:23` which checks:

```typescript
if (isClerkLoaded && isSignedIn && !isConvexLoading && !isConvexAuthenticated)
```

The research found the following key requirements that must ALL be satisfied for successful authentication:

1. **Clerk JWT Template**: A JWT template named exactly `"convex"` must exist in Clerk Dashboard
2. **CLERK_ISSUER_URL**: Environment variable must be set in Convex Dashboard (not in `.env`)
3. **JWT Claims**: The template must include proper `iss` (issuer) and `azp` (authorized party) claims
4. **Convex auth.config.ts**: The `applicationID` must match the JWT template name (`"convex"`)

## Detailed Findings

### 1. Authentication Architecture Overview

The codebase uses a **dual-authentication** system:

```
User → Clerk OAuth → JWT Token → Convex Validation → Authenticated
```

**Key components:**
- `ClerkProvider` (`src/contexts/ConvexClerkProvider.tsx:34`): Handles OAuth/session management
- `ConvexProviderWithClerk` (`src/contexts/ConvexClerkProvider.tsx:35`): Bridges Clerk to Convex via JWT
- `useConvexAuthState` (`src/hooks/useConvexAuth.ts:10`): Combines both auth states

**Authentication state computation:**
- `isLoading` = `!isClerkLoaded || isConvexLoading` (loading if either system not ready)
- `isAuthenticated` = `isSignedIn && isConvexAuthenticated` (requires BOTH to succeed)

### 2. JWT Token Flow

The `ConvexProviderWithClerk` internally calls Clerk's `getToken()` with a hardcoded template name:

```typescript
// From convex library: node_modules/convex/src/react-clerk/ConvexProviderWithClerk.tsx:66-69
return await getToken({
  template: "convex",  // CRITICAL: Must match Clerk JWT template name
  skipCache: forceRefreshToken,
});
```

This means:
- The JWT template in Clerk Dashboard **MUST** be named exactly `"convex"` (case-sensitive)
- If no template with this name exists, `getToken()` returns `null`
- When token is `null`, Convex authentication fails

### 3. Convex Backend Validation

**Configuration file:** `convex/auth.config.ts`

```typescript
export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_URL,
      applicationID: "convex",
    },
  ],
};
```

The Convex backend validates the JWT by checking:

1. **Token signature**: Valid signature from Clerk's JWKS endpoint
2. **Issuer (`iss` claim)**: Must match `CLERK_ISSUER_URL` environment variable
3. **Audience (`azp` claim)**: Must include `"convex"` to match `applicationID`

### 4. Error Detection Logic in AuthGuard

**File:** `src/components/auth/AuthGuard.tsx:21-51`

The error screen is shown when this condition is true:
```typescript
isClerkLoaded && isSignedIn && !isConvexLoading && !isConvexAuthenticated
```

This means:
- Clerk SDK has finished loading ✓
- User is signed in with Clerk ✓
- Convex has finished attempting authentication ✓
- Convex authentication FAILED ✗

This specific condition indicates a **configuration mismatch** between Clerk and Convex, not a user credential issue.

### 5. Required Configuration Checklist

Based on the codebase analysis, the following must ALL be configured correctly:

#### 5.1 Clerk Dashboard Configuration

| Item | Requirement | Location |
|------|-------------|----------|
| JWT Template Name | Exactly `"convex"` (case-sensitive) | Clerk Dashboard → JWT Templates |
| Issuer URL | Copy the issuer URL from template | JWT Template settings |
| Claims | Include `sub`, `iss`, `aud`, `azp`, `exp`, `iat` | JWT Template claims |

#### 5.2 Convex Dashboard Configuration

| Item | Requirement | Location |
|------|-------------|----------|
| `CLERK_ISSUER_URL` | Must match Clerk issuer exactly | Convex Dashboard → Settings → Environment Variables |

**Important:** The `CLERK_ISSUER_URL` is read by **Convex server-side code**, NOT the frontend. It must be set in the Convex Dashboard, not in the local `.env` file.

#### 5.3 Local `.env` Configuration

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend Clerk initialization | `pk_test_xxx` |
| `VITE_CONVEX_URL` | Frontend Convex connection | `https://xxx.convex.cloud` |

These are **only for frontend** and are correctly documented in `.env.example:8-12`.

### 6. Potential Issue: Issuer URL Mismatch

The most common cause of this error is an **issuer URL mismatch**. The issuer URL from Clerk's JWT template must exactly match the `CLERK_ISSUER_URL` environment variable in Convex.

**Clerk issuer URL format:**
```
https://your-clerk-domain.clerk.accounts.dev
```

**Common mistakes:**
- Trailing slash (`https://xxx.clerk.accounts.dev/` vs `https://xxx.clerk.accounts.dev`)
- Protocol mismatch (`http://` vs `https://`)
- Typos in domain name
- Using frontend domain instead of Clerk domain

### 7. Potential Issue: JWT Template Not Named "convex"

The Convex library **hardcodes** the template name as `"convex"`:

```typescript
// This is FIXED in the library code - cannot be changed without forking
template: "convex"
```

If the JWT template in Clerk is named anything else (e.g., `"Convex"`, `"convex-template"`, `"default"`), authentication will fail.

### 8. Potential Issue: Environment Variable Location

The `.env.example` shows:
```
# ===========================================
# CONVEX SERVER ENVIRONMENT VARIABLES
# Set these in Convex Dashboard: Settings > Environment Variables
# ===========================================

# Clerk JWT Issuer URL (from Clerk Dashboard > JWT Templates)
# CLERK_ISSUER_URL=https://your-clerk-domain.clerk.accounts.dev
```

This comment indicates that `CLERK_ISSUER_URL` should be set in **Convex Dashboard**, not in the local `.env` file. The Convex backend runs on Convex's servers, so it reads environment variables from their dashboard, not from local files.

### 9. Verification Steps

To verify the configuration is correct:

#### Step 1: Check Clerk JWT Template
1. Go to Clerk Dashboard → Configure → JWT Templates
2. Verify a template named exactly `"convex"` exists
3. Copy the issuer URL from this template

#### Step 2: Check Convex Environment Variables
1. Go to Convex Dashboard → Settings → Environment Variables
2. Verify `CLERK_ISSUER_URL` is set
3. Ensure the value matches exactly what you copied from Clerk (no trailing slash)

#### Step 3: Verify JWT Claims (Optional)
The Clerk JWT template should include these claims:
- `sub` - Subject (user ID)
- `iss` - Issuer URL
- `aud` - Audience
- `azp` - Authorized party (should include `"convex"`)
- `exp` - Expiration time
- `iat` - Issued at time

#### Step 4: Check Browser Network Requests
When authentication fails, check the browser Network tab for:
```
https://your-clerk-domain.clerk.accounts.dev/v1/client/sessions/.../tokens/convex
```

If this returns a **404**, the JWT template named "convex" doesn't exist in Clerk.

### 10. Debugging Console Logs

The codebase has auth debugging logs in:

| Location | Log Message | Indicates |
|----------|-------------|-----------|
| `src/server/middleware/auth.ts:30` | `[Auth] No Bearer token` | Missing auth header |
| `src/server/middleware/auth.ts:36` | `[Auth] Empty token` | Empty token value |
| `src/server/middleware/auth.ts:47` | `[Auth] Supabase getUser error` | Token validation failed |
| `src/server/middleware/auth.ts:53` | `[Auth] No user returned` | User lookup failed |

Note: The app has **both** Supabase and Convex auth systems. The Supabase logs are from legacy code. For Clerk/Convex auth, check browser console for Convex client errors.

## Code References

- `src/components/auth/AuthGuard.tsx:23` - Error detection condition
- `src/components/auth/AuthGuard.tsx:28-47` - Error UI with fix instructions
- `src/hooks/useConvexAuth.ts:34-35` - Combined auth state computation
- `src/contexts/ConvexClerkProvider.tsx:34-36` - Provider setup
- `convex/auth.config.ts:1-8` - Convex authentication configuration
- `convex/lib/auth.ts:4-10` - Server-side auth validation
- `.env.example:19-20` - Documentation of CLERK_ISSUER_URL requirement

## Architecture Documentation

### Provider Hierarchy

```
ConvexClerkProvider (auth)
  └── ClerkProvider (Clerk OAuth)
      └── ConvexProviderWithClerk (Clerk-to-Convex JWT bridge)
          └── BrowserRouter (routing)
              └── ThemeProvider (theming)
                  └── WorkspaceProvider (workspace state)
                      └── CommandProvider (command palette)
                          └── App (routes)
                              └── AuthGuard (route protection)
```

### Authentication State Machine

```
State: NOT_LOADED
  isClerkLoaded=false, isConvexLoading=true
  → Shows: Loading spinner

State: CLERK_LOADED_CONVEX_LOADING
  isClerkLoaded=true, isSignedIn=true, isConvexLoading=true
  → Shows: Loading spinner

State: AUTH_CONFIG_ERROR
  isClerkLoaded=true, isSignedIn=true, isConvexLoading=false, isConvexAuthenticated=false
  → Shows: Authentication Configuration Error screen

State: AUTHENTICATED
  isClerkLoaded=true, isSignedIn=true, isConvexLoading=false, isConvexAuthenticated=true
  → Shows: Protected routes (workspace, chat, etc.)

State: NOT_AUTHENTICATED
  isClerkLoaded=true, isSignedIn=false
  → Shows: Redirect to /login
```

## Related Research

- `/Users/biswajitmondal/Developer/project_profile/thoughts/shared/research/2026-01-17-veritydraft-authentication-flow.md` - General authentication flow analysis
- `/Users/biswajitmondal/Developer/project_profile/thoughts/shared/research/2026-01-17-veritydraft-convex-migration-analysis.md` - Convex migration details

## Open Questions

1. **Is CLERK_ISSUER_URL set in Convex Dashboard?** The `.env.example` shows it commented out, indicating it should be set in Convex Dashboard instead. Verify this is configured correctly.

2. **What is the exact JWT template name in Clerk?** The template must be named exactly `"convex"` (lowercase, no spaces). Check Clerk Dashboard to confirm.

3. **Are there network errors on the tokens endpoint?** Check browser DevTools Network tab for requests to `/.../tokens/convex` and verify they return 200, not 404 or other errors.

4. **Was Convex redeployed after adding CLERK_ISSUER_URL?** Convex environment variables require a redeploy to take effect. Run `npx convex deploy` after changing environment variables.

## Recommendations for Verification

1. **Verify JWT template exists**: In Clerk Dashboard, confirm a template named `"convex"` (exactly) exists under JWT Templates.

2. **Copy exact issuer URL**: From the JWT template settings in Clerk, copy the issuer URL.

3. **Set in Convex Dashboard**: Go to Convex Dashboard → Settings → Environment Variables, add/update `CLERK_ISSUER_URL` with the exact value.

4. **Redeploy Convex**: Run `npx convex deploy` to ensure the new environment variable is picked up.

5. **Clear browser state**: Clear cookies/localStorage and try signing in again.

6. **Check network requests**: In browser DevTools, look for the `/tokens/convex` request and verify it returns a valid JWT (200 status).
