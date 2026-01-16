/**
 * Convex Client Configuration
 * Sets up Convex React client with Clerk authentication
 */

import { ConvexReactClient } from "convex/react";

// Type for injected app config
declare global {
  interface Window {
    __APP_CONFIG__?: {
      convexUrl?: string;
      clerkPublishableKey?: string;
      wsUrl?: string;
    };
  }
}

// Get Convex URL from injected config (set by server in index.html)
function getConvexUrl(): string {
  // Read from window.__APP_CONFIG__ which is injected by the server
  const config = typeof window !== "undefined" ? window.__APP_CONFIG__ : undefined;

  if (config?.convexUrl) {
    return config.convexUrl;
  }

  throw new Error(
    "Missing convexUrl in window.__APP_CONFIG__. " +
    "Make sure VITE_CONVEX_URL is set in .env and the server is running."
  );
}

// Initialize Convex client
export const convex = new ConvexReactClient(getConvexUrl());
