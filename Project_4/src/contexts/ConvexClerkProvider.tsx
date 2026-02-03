/**
 * ConvexClerkProvider
 * Wraps the app with Clerk authentication and Convex providers
 */

import { ReactNode } from "react";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { convex } from "../services/convex";

// Get Clerk publishable key from injected config (set by server in index.html)
function getClerkPublishableKey(): string {
  // Read from window.__APP_CONFIG__ which is injected by the server
  const config = typeof window !== "undefined" ? window.__APP_CONFIG__ : undefined;

  if (config?.clerkPublishableKey) {
    return config.clerkPublishableKey;
  }

  throw new Error(
    "Missing clerkPublishableKey in window.__APP_CONFIG__. " +
    "Make sure VITE_CLERK_PUBLISHABLE_KEY is set in .env and the server is running."
  );
}

const clerkPublishableKey = getClerkPublishableKey();

interface Props {
  children: ReactNode;
}

export function ConvexClerkProvider({ children }: Props) {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
