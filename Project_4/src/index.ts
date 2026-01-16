/**
 * VerityDraft Backend Server
 * Bun.serve() with API routes and WebSocket support
 */
import { handleApiRequest } from "./server/api";
import { handleWebSocket, type WSData } from "./server/websocket/handler";

// Import HTML file - Bun automatically bundles referenced JS/TS files
import indexHtml from "./index.html";

const PORT = parseInt(process.env.PORT || "8000");

// Create config object with values from environment
const appConfig = {
  convexUrl: process.env.VITE_CONVEX_URL || "",
  clerkPublishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY || "",
  wsUrl: process.env.VITE_WS_URL || `ws://localhost:${PORT}/ws`,
};

// Log config at startup for debugging
console.log("App config loaded:", {
  convexUrl: appConfig.convexUrl ? "✓ set" : "✗ missing",
  clerkPublishableKey: appConfig.clerkPublishableKey ? "✓ set" : "✗ missing",
  wsUrl: appConfig.wsUrl ? "✓ set" : "✗ missing",
});

Bun.serve({
  port: PORT,

  routes: {
    // Serve bundled frontend for all SPA routes
    "/": indexHtml,
    "/login": indexHtml,
    "/login/*": indexHtml,  // Clerk callback routes (sso-callback, factor-one, etc.)
    "/signup": indexHtml,
    "/signup/*": indexHtml, // Clerk callback routes (verify-email, etc.)
    "/workspaces": indexHtml,
    "/workspaces/*": indexHtml,
    "/sessions/*": indexHtml,

    // Health check
    "/health": () =>
      new Response(
        JSON.stringify({
          status: "healthy",
          timestamp: new Date().toISOString(),
          version: "1.0.0",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      ),

    // Public config endpoint (no auth required)
    "/api/config": () =>
      new Response(
        JSON.stringify({
          supabaseUrl: process.env.SUPABASE_URL || "",
          supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600",
          },
        }
      ),

    // App config for frontend (Convex + Clerk)
    "/api/app-config": () =>
      new Response(JSON.stringify(appConfig), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      }),

    // API routes (auth required)
    "/api/*": (request: Request) => handleApiRequest(request),
  },

  async fetch(request, server) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle WebSocket upgrade
    if (path === "/ws") {
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response("Unauthorized", { status: 401 });
      }

      const upgraded = server.upgrade(request, {
        data: { token } as WSData,
      });

      if (upgraded) {
        return undefined as unknown as Response;
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // Fallback - return 404 for unmatched routes
    return new Response("Not Found", { status: 404 });
  },

  websocket: {
    open: handleWebSocket.open,
    message: handleWebSocket.message,
    close: handleWebSocket.close,
  },
});

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                     VerityDraft Server                      ║
╠═══════════════════════════════════════════════════════════╣
║  🚀 Server running on http://localhost:${PORT}                ║
║  🔌 WebSocket on ws://localhost:${PORT}/ws                    ║
║  📊 Health check at /health                                 ║
╚═══════════════════════════════════════════════════════════╝
`);
