/**
 * VerityDraft Backend Server
 * Bun.serve() for static files and config only
 * All data operations handled by Convex real-time
 */

// Import HTML file - Bun automatically bundles referenced JS/TS files
import indexHtml from "./index.html";

const PORT = parseInt(process.env.PORT || "8000");

// Create config object with values from environment
const appConfig = {
  convexUrl: process.env.VITE_CONVEX_URL || "",
  clerkPublishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY || "",
};

// Log config at startup for debugging
console.log("App config loaded:", {
  convexUrl: appConfig.convexUrl ? "✓ set" : "✗ missing",
  clerkPublishableKey: appConfig.clerkPublishableKey ? "✓ set" : "✗ missing",
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

    // App config for frontend (Convex + Clerk)
    "/api/app-config": () =>
      new Response(JSON.stringify(appConfig), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      }),
  },
});

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                     VerityDraft Server                      ║
╠═══════════════════════════════════════════════════════════╣
║  🚀 Server running on http://localhost:${PORT}                ║
║  📊 Health check at /health                                 ║
║  🔄 Data via Convex real-time                               ║
╚═══════════════════════════════════════════════════════════╝
`);
