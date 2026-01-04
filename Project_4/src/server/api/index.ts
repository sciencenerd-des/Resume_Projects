/**
 * API Router
 * Handles all /api/* routes with authentication
 */
import { requireAuth, type AuthUser } from "../middleware/auth";
import * as workspaces from "./workspaces";
import * as documents from "./documents";
import * as sessions from "./sessions";
import * as query from "./query";

interface RouteParams {
  [key: string]: string;
}

type RouteHandler = (
  request: Request,
  user: AuthUser,
  params: RouteParams
) => Promise<Response>;

interface Route {
  pattern: RegExp;
  params: string[];
  handler: RouteHandler;
}

// Route definitions with parameter extraction
const routes: Record<string, Route[]> = {
  GET: [
    {
      pattern: /^\/api\/workspaces$/,
      params: [],
      handler: workspaces.list,
    },
    {
      pattern: /^\/api\/workspaces\/([^\/]+)$/,
      params: ["id"],
      handler: workspaces.get,
    },
    {
      pattern: /^\/api\/workspaces\/([^\/]+)\/documents$/,
      params: ["workspaceId"],
      handler: documents.list,
    },
    {
      pattern: /^\/api\/documents\/([^\/]+)$/,
      params: ["id"],
      handler: documents.get,
    },
    {
      pattern: /^\/api\/documents\/([^\/]+)\/chunks$/,
      params: ["id"],
      handler: documents.getChunks,
    },
    {
      pattern: /^\/api\/workspaces\/([^\/]+)\/sessions$/,
      params: ["workspaceId"],
      handler: sessions.list,
    },
    {
      pattern: /^\/api\/sessions\/([^\/]+)$/,
      params: ["id"],
      handler: sessions.get,
    },
    {
      pattern: /^\/api\/sessions\/([^\/]+)\/messages$/,
      params: ["id"],
      handler: sessions.getMessages,
    },
    {
      pattern: /^\/api\/sessions\/([^\/]+)\/ledger$/,
      params: ["id"],
      handler: sessions.getLedger,
    },
    {
      pattern: /^\/api\/sessions\/([^\/]+)\/export$/,
      params: ["id"],
      handler: sessions.exportSession,
    },
  ],
  POST: [
    {
      pattern: /^\/api\/workspaces$/,
      params: [],
      handler: workspaces.create,
    },
    {
      pattern: /^\/api\/workspaces\/([^\/]+)\/documents$/,
      params: ["workspaceId"],
      handler: documents.upload,
    },
    {
      pattern: /^\/api\/workspaces\/([^\/]+)\/query$/,
      params: ["workspaceId"],
      handler: query.submit,
    },
  ],
  PUT: [
    {
      pattern: /^\/api\/workspaces\/([^\/]+)$/,
      params: ["id"],
      handler: workspaces.update,
    },
  ],
  DELETE: [
    {
      pattern: /^\/api\/workspaces\/([^\/]+)$/,
      params: ["id"],
      handler: workspaces.remove,
    },
    {
      pattern: /^\/api\/documents\/([^\/]+)$/,
      params: ["id"],
      handler: documents.remove,
    },
    {
      pattern: /^\/api\/sessions\/([^\/]+)$/,
      params: ["id"],
      handler: sessions.remove,
    },
  ],
};

/**
 * Match route and extract parameters
 */
function matchRoute(
  method: string,
  path: string
): { handler: RouteHandler; params: RouteParams } | null {
  const methodRoutes = routes[method];
  if (!methodRoutes) return null;

  for (const route of methodRoutes) {
    const match = path.match(route.pattern);
    if (match) {
      const params: RouteParams = {};
      route.params.forEach((name, index) => {
        params[name] = match[index + 1];
      });
      return { handler: route.handler, params };
    }
  }

  return null;
}

/**
 * Main API request handler
 */
export async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const match = matchRoute(method, path);

  if (!match) {
    return Response.json(
      {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Endpoint not found: ${method} ${path}`,
        },
      },
      { status: 404 }
    );
  }

  // Wrap handler with authentication
  const authenticatedHandler = requireAuth(
    async (req: Request, user: AuthUser) => {
      return match.handler(req, user, match.params);
    }
  );

  const response = await authenticatedHandler(request);

  // Add CORS headers to response
  const corsHeaders = new Headers(response.headers);
  corsHeaders.set("Access-Control-Allow-Origin", "*");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: corsHeaders,
  });
}

export default handleApiRequest;
