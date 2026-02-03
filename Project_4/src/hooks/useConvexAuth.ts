/**
 * useConvexAuth Hook
 * Provides authentication state from Clerk via Convex
 */

import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/clerk-react";
import { useConvexAuth } from "convex/react";
import { useCallback } from "react";

export function useConvexAuthState() {
  const { isLoaded: isClerkLoaded, isSignedIn } = useClerkAuth();
  const { isLoading: isConvexLoading, isAuthenticated: isConvexAuthenticated } =
    useConvexAuth();
  const { user } = useUser();
  const clerk = useClerk();

  const signOut = useCallback(async () => {
    await clerk.signOut();
  }, [clerk]);

  return {
    // User data
    user: user
      ? {
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress ?? "",
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
        }
      : null,

    // Auth state
    isLoading: !isClerkLoaded || isConvexLoading,
    isAuthenticated: isSignedIn && isConvexAuthenticated,

    // Actions
    signOut,
  };
}

// Re-export for convenience
export { SignIn, SignUp, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
