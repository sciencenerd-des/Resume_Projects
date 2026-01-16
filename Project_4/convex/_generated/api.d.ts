/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as documents from "../documents.js";
import type * as lib_auth from "../lib/auth.js";
import type * as pipeline_judge from "../pipeline/judge.js";
import type * as pipeline_orchestrator from "../pipeline/orchestrator.js";
import type * as pipeline_skeptic from "../pipeline/skeptic.js";
import type * as pipeline_writer from "../pipeline/writer.js";
import type * as rag from "../rag.js";
import type * as sessions from "../sessions.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  documents: typeof documents;
  "lib/auth": typeof lib_auth;
  "pipeline/judge": typeof pipeline_judge;
  "pipeline/orchestrator": typeof pipeline_orchestrator;
  "pipeline/skeptic": typeof pipeline_skeptic;
  "pipeline/writer": typeof pipeline_writer;
  rag: typeof rag;
  sessions: typeof sessions;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
