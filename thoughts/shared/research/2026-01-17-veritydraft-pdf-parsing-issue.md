---
date: 2026-01-17T03:34:21+05:00
researcher: claude
git_commit: 09249e99292f5d969e8ad4d04413598b6f486731
branch: feature/veritydraft-convex-migration
repository: project_profile/Project_4
topic: "PDF Parsing Issue in Convex Actions with unpdf"
tags: [research, pdf-parsing, convex, unpdf, serverless]
status: complete
last_updated: 2026-01-17
last_updated_by: claude
---

# Research: PDF Parsing Issue in Convex Actions with unpdf

**Date**: 2026-01-17T03:34:21+05:00
**Researcher**: Claude
**Git Commit**: 09249e99292f5d969e8ad4d04413598b6f486731
**Branch**: feature/veritydraft-convex-migration
**Repository**: project_profile/Project_4

## Research Question

The PDF parsing issue persists after switching from `pdf-parse` to `unpdf`. Files upload successfully but never get processed. What is the root cause and what are the known fixes?

## Summary

**ROOT CAUSE IDENTIFIED**: The `convex/documents.ts` file uses `internalAction` to run PDF parsing, but **lacks the `"use node"` directive**. Without this directive, the action runs in Convex's default runtime (V8 isolate-based, similar to Cloudflare Workers), which has severe constraints:

1. **64 MB memory limit** (vs 512 MB with Node.js runtime)
2. **No native module support** without external packages config
3. **Missing `"use node"` directive** in `convex/documents.ts` lines 77 and 146

Additionally, the `convex.json` is **missing the `node.externalPackages` configuration** required for libraries like `unpdf` that need to be installed server-side rather than bundled.

## Detailed Findings

### 1. Current Implementation Analysis

**File**: `convex/documents.ts:146-169`

```typescript
export const extractText = internalAction({
  args: {
    fileUrl: v.string(),
    fileType: v.union(v.literal("pdf"), v.literal("docx")),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(args.fileUrl);
    const buffer = await response.arrayBuffer();

    if (args.fileType === "pdf") {
      // Use unpdf (works in serverless environments unlike pdf-parse)
      const { extractText: extractPdfText } = await import("unpdf");
      const { text } = await extractPdfText(new Uint8Array(buffer));
      return text;
    } else {
      // Use mammoth for DOCX
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({
        buffer: Buffer.from(buffer),
      });
      return result.value;
    }
  },
});
```

**Critical Issue**: No `"use node"` directive at the top of the file.

### 2. Missing Configuration

**File**: `convex.json`

```json
{
  "functions": "convex/",
  "authConfig": ["convex/auth.config.ts"]
}
```

**Missing Configuration**:

```json
{
  "functions": "convex/",
  "authConfig": ["convex/auth.config.ts"],
  "node": {
    "externalPackages": ["unpdf", "mammoth"]
  }
}
```

### 3. Convex Runtime Constraints

| Constraint | Default Runtime | Node.js Runtime |
|------------|-----------------|-----------------|
| Memory Limit | 64 MB | 512 MB |
| Execution Timeout | 1 second | 10 minutes |
| Native Modules | Not supported | Supported with externalPackages |
| WebAssembly | Limited | Full support |

**Source**: [Convex Runtimes Documentation](https://docs.convex.dev/functions/runtimes)

### 4. unpdf Library Requirements

From Context7 and official documentation:

1. **Serverless PDF.js Build**: `unpdf` includes a serverless build of PDF.js (`unpdf/pdfjs`) that should be explicitly defined
2. **`definePDFJSModule()` Call**: Required for proper initialization in serverless environments
3. **Node.js Environment**: While unpdf works in serverless, it performs best in Node.js with full module support

**Correct Usage Pattern** (from Context7):

```typescript
import { definePDFJSModule, extractText, getDocumentProxy } from 'unpdf'

// Define serverless PDF.js build FIRST
await definePDFJSModule(() => import('unpdf/pdfjs'))

// Then extract text
const buffer = await fetch(url).then(res => res.arrayBuffer())
const pdf = await getDocumentProxy(new Uint8Array(buffer))
const { text } = await extractText(pdf, { mergePages: true })
```

### 5. Known Issues Identified

1. **Missing `definePDFJSModule()` call**: The current implementation does not initialize the serverless PDF.js build
2. **No `"use node"` directive**: Actions run in constrained V8 isolate
3. **No `externalPackages` config**: Libraries are bundled rather than installed server-side
4. **Memory constraints**: 64 MB may be insufficient for PDF processing

### 6. Alternative Solutions Researched

#### Option A: Fix Current Server-Side Approach

Add to `convex/documents.ts`:
```typescript
"use node";  // <-- At the very top of the file

import { definePDFJSModule, extractText, getDocumentProxy } from 'unpdf'
```

Update `convex.json`:
```json
{
  "node": {
    "externalPackages": ["unpdf", "mammoth"]
  }
}
```

#### Option B: Client-Side PDF Parsing (Recommended by Convex)

From [Convex RAG Documentation](https://docs.convex.dev/agents/rag):

> "Opening up the PDF can use hundreds of MB of memory... You're more limited on memory usage in serverless environments, and if the browser already has the file, it's a pretty good environment to do the heavy lifting in (and free!)."

**Benefits**:
- No memory constraints
- No bundling issues
- Free computation on user's device
- Better UX with real-time progress

#### Option C: Use LLM for PDF Processing

From Convex docs:
> "If you really want to do it server-side and don't worry about cost or latency, you can pass it to an LLM."

This would leverage existing OpenRouter integration but has latency/cost trade-offs.

## Code References

- `convex/documents.ts:146-169` - extractText action (missing "use node")
- `convex/documents.ts:77-143` - processDocument action (missing "use node")
- `convex.json:1-4` - Missing node.externalPackages config
- `package.json` - Has `unpdf: ^1.4.0` and `mammoth: ^1.11.0`

## Architecture Documentation

### Current Flow (Broken)

```
1. Client uploads PDF to Convex storage
   ↓
2. documents.create mutation runs
   ↓
3. ctx.scheduler.runAfter(0, processDocument)
   ↓
4. processDocument (internalAction, no "use node")
   ↓
5. extractText (internalAction, no "use node")
   ↓
6. FAILS: unpdf cannot load in default Convex runtime
```

### Required Flow (Fixed)

```
1. Client uploads PDF to Convex storage
   ↓
2. documents.create mutation runs
   ↓
3. ctx.scheduler.runAfter(0, processDocument)
   ↓
4. processDocument (internalAction WITH "use node")
   ↓
5. extractText (internalAction WITH "use node")
   ↓
6. unpdf loads via externalPackages config
   ↓
7. Text extracted, chunks created, embeddings generated
```

## Recommended Fix

### Minimum Viable Fix

1. Add `"use node";` directive to top of `convex/documents.ts`
2. Add `definePDFJSModule()` initialization before text extraction
3. Update `convex.json` with `node.externalPackages`

### Complete Fix (Updated Code)

**convex/documents.ts** (top of file):
```typescript
"use node";

import {
  query,
  mutation,
  action,
  internalMutation,
  internalAction,
  internalQuery,
} from "./_generated/server";
// ... rest of imports
```

**convex/documents.ts** (extractText action):
```typescript
export const extractText = internalAction({
  args: {
    fileUrl: v.string(),
    fileType: v.union(v.literal("pdf"), v.literal("docx")),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(args.fileUrl);
    const buffer = await response.arrayBuffer();

    if (args.fileType === "pdf") {
      const { definePDFJSModule, extractText: extractPdfText, getDocumentProxy } = await import("unpdf");

      // Initialize serverless PDF.js build
      await definePDFJSModule(() => import("unpdf/pdfjs"));

      // Get document proxy and extract text
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractPdfText(pdf, { mergePages: true });
      return text;
    } else {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({
        buffer: Buffer.from(buffer),
      });
      return result.value;
    }
  },
});
```

**convex.json**:
```json
{
  "functions": "convex/",
  "authConfig": ["convex/auth.config.ts"],
  "node": {
    "externalPackages": ["unpdf", "mammoth"]
  }
}
```

## Related Research

- `thoughts/shared/research/2026-01-17-veritydraft-chatbot-conversion-research.md` - Related conversion plan
- `thoughts/shared/plans/2026-01-17-veritydraft-chatbot-conversion-plan.md` - Full conversion plan

## Open Questions

1. If user decides to proceed with chatbot conversion, do we even need PDF parsing anymore?
2. Should we implement client-side parsing as a backup for large files?
3. What is the actual memory footprint of unpdf for typical PDF sizes (1-10 MB)?

## Sources

- [Convex Runtimes Documentation](https://docs.convex.dev/functions/runtimes)
- [Convex Bundling Documentation](https://docs.convex.dev/functions/bundling)
- [Convex RAG Documentation](https://docs.convex.dev/agents/rag)
- [unpdf GitHub Repository](https://github.com/unjs/unpdf)
- [unpdf Context7 Documentation](https://context7.com/unjs/unpdf/llms.txt)
- [pdfjs-serverless GitHub](https://github.com/johannschopplich/pdfjs-serverless)
- [Cloudflare PDF Summarization Tutorial](https://developers.cloudflare.com/r2/tutorials/summarize-pdf/)
