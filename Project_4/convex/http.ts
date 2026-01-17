/**
 * Convex HTTP Router
 *
 * Note: Most functionality is now handled via Convex mutations/queries directly
 * from the frontend. This file is retained for any future HTTP endpoints.
 */
import { httpRouter } from "convex/server";

const http = httpRouter();

// All routes have been migrated to Convex mutations/queries:
// - Sessions: use api.pipeline.orchestrator.startQuery mutation
// - Progress: use api.sessions.getProgress query
// - Ledger: use api.sessions.getLedger query
// - Claims: stored via internal mutations during pipeline execution

export default http;
