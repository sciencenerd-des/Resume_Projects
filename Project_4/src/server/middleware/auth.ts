/**
 * Authentication Middleware
 * Validates Supabase JWT tokens and extracts user information
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

// Use anon key for token validation (works in both dev and production)
// Service key is only needed for admin operations, not auth validation
const supabase = createClient(
  SUPABASE_URL || "http://localhost:54321",
  SUPABASE_ANON_KEY || "placeholder-key"
);

export interface AuthUser {
  id: string;
  email: string;
  accessToken: string;  // JWT token for authenticated DB queries
}

/**
 * Validate authentication token from request
 */
export async function validateAuth(request: Request): Promise<AuthUser | null> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    console.log("[Auth] No Bearer token in Authorization header");
    return null;
  }

  const token = authHeader.slice(7);

  if (!token) {
    console.log("[Auth] Empty token after Bearer prefix");
    return null;
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error) {
      console.log("[Auth] Supabase getUser error:", error.message);
      return null;
    }

    if (!user) {
      console.log("[Auth] No user returned from getUser");
      return null;
    }

    console.log("[Auth] User authenticated:", user.email);
    return {
      id: user.id,
      email: user.email!,
      accessToken: token,
    };
  } catch (e) {
    console.log("[Auth] Exception during validation:", e);
    return null;
  }
}

/**
 * Type for auth-protected route handlers
 */
export type AuthenticatedHandler = (
  request: Request,
  user: AuthUser
) => Promise<Response>;

/**
 * Higher-order function to require authentication
 */
export function requireAuth(handler: AuthenticatedHandler) {
  return async (request: Request): Promise<Response> => {
    const user = await validateAuth(request);

    if (!user) {
      return Response.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or missing authentication token",
          },
        },
        { status: 401 }
      );
    }

    return handler(request, user);
  };
}

/**
 * Decode URL-safe base64 (used in JWTs)
 * Converts URL-safe characters back to standard base64 and adds padding
 */
function decodeBase64Url(str: string): string {
  // Replace URL-safe characters with standard base64 characters
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

/**
 * Extract user ID from token without full validation (for WebSocket)
 * Only use this when full validation is too expensive
 */
export function extractUserIdFromToken(token: string): string | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Use URL-safe base64 decoding for Supabase JWTs
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

export default {
  validateAuth,
  requireAuth,
  extractUserIdFromToken,
};
