/**
 * Verification Pipeline Orchestrator
 * Coordinates the Writer → Skeptic → Judge flow with revision loop
 */
import { retrieveChunks } from "../rag/retrieval";
import { assembleContext, extractCitations } from "../rag/context";
import { chat, chatStream } from "../llm/openrouter";
import { writerPrompt, skepticPrompt, judgePrompt, revisionPrompt } from "../llm/prompts";
import { supabaseAdmin } from "../db";

// Pipeline event types
export type PipelineEvent =
  | { type: "retrieval_started" }
  | { type: "retrieval_complete"; chunksRetrieved: number }
  | { type: "generation_started"; phase: "writer" | "skeptic" | "judge" | "revision" }
  | { type: "content_chunk"; delta: string; citations?: string[] }
  | { type: "claim_verified"; claim: LedgerEntry }
  | { type: "ledger_updated"; ledger: EvidenceLedger }
  | { type: "revision_started"; cycle: number }
  | {
      type: "generation_complete";
      sessionId: string;
      response: string;
      ledger: EvidenceLedger;
      metrics: PipelineMetrics;
    }
  | { type: "error"; message: string };

export interface LedgerEntry {
  claim_text: string;
  claim_type: "fact" | "policy" | "numeric" | "definition";
  importance: "critical" | "material" | "minor";
  verdict: "supported" | "weak" | "contradicted" | "not_found";
  confidence_score: number;
  chunk_ids: string[];
  evidence_snippet?: string;
  notes?: string;
}

export interface EvidenceLedger {
  session_id: string;
  summary: {
    total_claims: number;
    supported: number;
    weak: number;
    contradicted: number;
    not_found: number;
    evidence_coverage: number;
  };
  entries: LedgerEntry[];
  risk_flags: Array<{
    type: string;
    description: string;
    severity: "low" | "medium" | "high";
  }>;
}

export interface PipelineMetrics {
  processingTimeMs: number;
  evidenceCoverage: number;
  retrievedChunks: number;
  totalClaims: number;
  revisionCycles: number;
}

const MAX_REVISION_CYCLES = 2;

/**
 * Execute the full verification pipeline
 */
export async function* executePipeline(
  sessionId: string,
  query: string,
  workspaceId: string,
  mode: "answer" | "draft"
): AsyncGenerator<PipelineEvent> {
  const startTime = Date.now();
  let revisionCycles = 0;

  try {
    // ==================
    // Phase 1: Retrieval
    // ==================
    console.log("[Pipeline] Phase 1: Retrieval starting...");
    yield { type: "retrieval_started" };

    const chunks = await retrieveChunks(query, workspaceId, {
      threshold: 0.3,  // Lower threshold to capture more semantic matches
      limit: 15,
    });
    console.log(`[Pipeline] Retrieved ${chunks.length} chunks`);

    const context = assembleContext(chunks, 50000);
    console.log(`[Pipeline] Context assembled, length: ${context.formatted.length}`);

    yield { type: "retrieval_complete", chunksRetrieved: chunks.length };

    if (chunks.length === 0) {
      // No documents - return appropriate response
      const noDocsResponse =
        "I couldn't find any relevant documents in your knowledge base to answer this query. Please upload relevant documents first.";

      await updateSession(sessionId, {
        status: "completed",
        response: noDocsResponse,
        evidence_coverage: 0,
        completed_at: new Date().toISOString(),
      });

      yield {
        type: "generation_complete",
        sessionId,
        response: noDocsResponse,
        ledger: createEmptyLedger(sessionId),
        metrics: {
          processingTimeMs: Date.now() - startTime,
          evidenceCoverage: 0,
          retrievedChunks: 0,
          totalClaims: 0,
          revisionCycles: 0,
        },
      };
      return;
    }

    // ==============
    // Phase 2: Writer
    // ==============
    console.log("[Pipeline] Phase 2: Writer starting...");
    yield { type: "generation_started", phase: "writer" };

    let writerResponse = "";
    const writerMessages = [
      { role: "system" as const, content: writerPrompt(context.formatted, mode) },
      { role: "user" as const, content: query },
    ];

    console.log("[Pipeline] Calling Writer LLM...");
    for await (const delta of chatStream("writer", writerMessages)) {
      writerResponse += delta;
      const citations = extractCitations(delta);
      yield { type: "content_chunk", delta, citations: citations.length > 0 ? citations : undefined };
    }
    console.log(`[Pipeline] Writer complete, response length: ${writerResponse.length}`);

    // ================
    // Phase 3: Skeptic
    // ================
    yield { type: "generation_started", phase: "skeptic" };

    const skepticMessages = [
      { role: "system" as const, content: skepticPrompt(context.formatted) },
      { role: "user" as const, content: writerResponse },
    ];

    const skepticReport = await chat("skeptic", skepticMessages);

    // ==============
    // Phase 4: Judge
    // ==============
    yield { type: "generation_started", phase: "judge" };

    const judgeMessages = [
      { role: "system" as const, content: judgePrompt(context.formatted) },
      {
        role: "user" as const,
        content: JSON.stringify({
          writer_response: writerResponse,
          skeptic_report: skepticReport,
        }),
      },
    ];

    const judgeOutput = await chat("judge", judgeMessages);
    let judgeResult = parseJudgeOutput(judgeOutput);

    // Stream ledger entries as they're verified
    for (const entry of judgeResult.ledger) {
      yield { type: "claim_verified", claim: entry };
    }

    // ================
    // Phase 5: Revision (if needed)
    // ================
    let finalResponse = judgeResult.verified_response || writerResponse;

    while (judgeResult.revision_needed && revisionCycles < MAX_REVISION_CYCLES) {
      revisionCycles++;
      yield { type: "revision_started", cycle: revisionCycles };
      yield { type: "generation_started", phase: "revision" };

      // Revise the response
      const revisionMessages = [
        {
          role: "system" as const,
          content: revisionPrompt(
            context.formatted,
            finalResponse,
            JSON.stringify(judgeResult)
          ),
        },
        { role: "user" as const, content: "Please revise the response." },
      ];

      finalResponse = "";
      for await (const delta of chatStream("writer", revisionMessages)) {
        finalResponse += delta;
        yield { type: "content_chunk", delta };
      }

      // Re-verify
      yield { type: "generation_started", phase: "judge" };

      const reJudgeMessages = [
        { role: "system" as const, content: judgePrompt(context.formatted) },
        {
          role: "user" as const,
          content: JSON.stringify({
            writer_response: finalResponse,
            skeptic_report: skepticReport,
            revision_cycle: revisionCycles,
          }),
        },
      ];

      const reJudgeOutput = await chat("judge", reJudgeMessages);
      judgeResult = parseJudgeOutput(reJudgeOutput);

      // Stream updated ledger
      for (const entry of judgeResult.ledger) {
        yield { type: "claim_verified", claim: entry };
      }
    }

    // =================
    // Phase 6: Finalize
    // =================
    const ledger = buildEvidenceLedger(sessionId, judgeResult);

    // Store results in database
    await storeResults(sessionId, finalResponse, judgeResult, revisionCycles);

    yield { type: "ledger_updated", ledger };

    yield {
      type: "generation_complete",
      sessionId,
      response: finalResponse,
      ledger,
      metrics: {
        processingTimeMs: Date.now() - startTime,
        evidenceCoverage: judgeResult.summary?.evidence_coverage || 0,
        retrievedChunks: chunks.length,
        totalClaims: judgeResult.ledger?.length || 0,
        revisionCycles,
      },
    };
  } catch (error) {
    console.error("[Pipeline] Error:", error);

    await updateSession(sessionId, {
      status: "error",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });

    yield {
      type: "error",
      message: error instanceof Error ? error.message : "Pipeline execution failed",
    };
  }
}

/**
 * Parse and validate judge output
 */
function parseJudgeOutput(output: string): {
  verified_response?: string;
  ledger: LedgerEntry[];
  summary: {
    evidence_coverage: number;
    total_claims: number;
    supported: number;
    weak: number;
    contradicted: number;
    not_found: number;
  };
  risk_flags: Array<{ type: string; description: string; severity: "low" | "medium" | "high" }>;
  revision_needed: boolean;
  revision_instructions?: string;
} {
  try {
    // Try to extract JSON from the response
    const jsonMatch = output.match(/```json\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : output;
    const parsed = JSON.parse(jsonStr);

    return {
      verified_response: parsed.verified_response,
      ledger: parsed.ledger || [],
      summary: parsed.summary || {
        evidence_coverage: 0,
        total_claims: 0,
        supported: 0,
        weak: 0,
        contradicted: 0,
        not_found: 0,
      },
      risk_flags: parsed.risk_flags || [],
      revision_needed: parsed.revision_needed || false,
      revision_instructions: parsed.revision_instructions,
    };
  } catch (error) {
    console.error("[Pipeline] Failed to parse judge output:", error);
    return {
      ledger: [],
      summary: {
        evidence_coverage: 0,
        total_claims: 0,
        supported: 0,
        weak: 0,
        contradicted: 0,
        not_found: 0,
      },
      risk_flags: [],
      revision_needed: false,
    };
  }
}

/**
 * Build evidence ledger structure
 */
function buildEvidenceLedger(
  sessionId: string,
  judgeResult: ReturnType<typeof parseJudgeOutput>
): EvidenceLedger {
  return {
    session_id: sessionId,
    summary: {
      ...judgeResult.summary,
      evidence_coverage: judgeResult.summary.evidence_coverage,
    },
    entries: judgeResult.ledger,
    risk_flags: judgeResult.risk_flags,
  };
}

/**
 * Create empty ledger for sessions with no documents
 */
function createEmptyLedger(sessionId: string): EvidenceLedger {
  return {
    session_id: sessionId,
    summary: {
      total_claims: 0,
      supported: 0,
      weak: 0,
      contradicted: 0,
      not_found: 0,
      evidence_coverage: 0,
    },
    entries: [],
    risk_flags: [
      {
        type: "no_documents",
        description: "No documents were found in the knowledge base",
        severity: "high",
      },
    ],
  };
}

/**
 * Store results in database
 */
async function storeResults(
  sessionId: string,
  response: string,
  judgeResult: ReturnType<typeof parseJudgeOutput>,
  revisionCycles: number
): Promise<void> {
  // Update session
  await updateSession(sessionId, {
    status: "completed",
    response,
    evidence_coverage: judgeResult.summary.evidence_coverage,
    unsupported_claim_count: judgeResult.summary.not_found,
    revision_cycles: revisionCycles,
    completed_at: new Date().toISOString(),
  });

  // Store claims and ledger entries
  for (const entry of judgeResult.ledger) {
    // Create claim record
    const { data: claim, error: claimError } = await supabaseAdmin
      .from("claims")
      .insert({
        session_id: sessionId,
        claim_text: entry.claim_text,
        claim_type: entry.claim_type,
        importance: entry.importance,
      })
      .select()
      .single();

    if (claimError || !claim) {
      console.error("[Pipeline] Failed to store claim:", claimError);
      continue;
    }

    // Create ledger entry
    await supabaseAdmin.from("evidence_ledger").insert({
      session_id: sessionId,
      claim_id: claim.id,
      verdict: entry.verdict,
      confidence_score: entry.confidence_score,
      chunk_ids: entry.chunk_ids,
      evidence_snippet: entry.evidence_snippet,
      notes: entry.notes,
    });
  }
}

/**
 * Update session record
 */
async function updateSession(
  sessionId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("sessions")
    .update(updates)
    .eq("id", sessionId);

  if (error) {
    console.error("[Pipeline] Failed to update session:", error);
  }
}
