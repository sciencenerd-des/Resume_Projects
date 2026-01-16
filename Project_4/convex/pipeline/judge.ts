import { internalAction } from "../_generated/server";
import { v } from "convex/values";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const JUDGE_MODEL = "openai/gpt-4o-mini";

interface LedgerEntry {
  claimText: string;
  claimType: "fact" | "policy" | "numeric" | "definition";
  importance: "critical" | "material" | "minor";
  verdict: "supported" | "weak" | "contradicted" | "not_found";
  confidenceScore: number;
  chunkIds: string[];
  evidenceSnippet?: string;
  notes?: string;
}

interface JudgeResult {
  verifiedResponse?: string;
  ledger: LedgerEntry[];
  summary: {
    evidenceCoverage: number;
    totalClaims: number;
    supported: number;
    weak: number;
    contradicted: number;
    notFound: number;
  };
  riskFlags: Array<{ type: string; description: string; severity: string }>;
  revisionNeeded: boolean;
  revisionInstructions?: string;
}

export const verify = internalAction({
  args: {
    context: v.string(),
    writerResponse: v.string(),
    skepticReport: v.string(),
    revisionCycle: v.optional(v.number()),
  },
  handler: async (_ctx, args): Promise<JudgeResult> => {
    const systemPrompt = getJudgePrompt(args.context);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://veritydraft.app",
          "X-Title": "VerityDraft",
        },
        body: JSON.stringify({
          model: JUDGE_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: JSON.stringify({
                writer_response: args.writerResponse,
                skeptic_report: args.skepticReport,
                revision_cycle: args.revisionCycle || 0,
              }),
            },
          ],
          temperature: 0.2,
          max_tokens: 8192,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const output = data.choices[0].message.content;

    return parseJudgeOutput(output);
  },
});

function getJudgePrompt(context: string): string {
  return `You are the final Judge in a verification pipeline. Your role is to produce the definitive Evidence Ledger that maps every claim to its verification status.

CONTEXT (Source Documents):
${context}

YOUR TASK:
Analyze the writer's response and the skeptic's report to produce a final Evidence Ledger in JSON format.

PROCESS:
1. Review each claim identified by the skeptic
2. Make your own independent verification against the context
3. Produce a final verdict for each claim
4. Calculate overall evidence coverage
5. Determine if revision is needed based on quality gates

QUALITY GATES (revision required if any fail):
- Evidence coverage must be >= 85% of critical and material claims
- No contradicted claims with importance = "critical"
- Unsupported claim rate must be <= 5%
- If this is revision cycle 2, be more lenient - accept if coverage >= 70%

OUTPUT FORMAT (strict JSON):
{
  "verified_response": "Optional: if you need to make minor corrections, provide the corrected response here. Otherwise omit.",
  "ledger": [
    {
      "claimText": "The exact claim being verified",
      "claimType": "fact|policy|numeric|definition",
      "importance": "critical|material|minor",
      "verdict": "supported|weak|contradicted|not_found",
      "confidenceScore": 0.0-1.0,
      "chunkIds": ["1", "3"],
      "evidenceSnippet": "Brief quote from source supporting/contradicting claim",
      "notes": "Explanation of the verdict"
    }
  ],
  "summary": {
    "evidenceCoverage": 0.0-1.0,
    "totalClaims": 5,
    "supported": 3,
    "weak": 1,
    "contradicted": 0,
    "notFound": 1
  },
  "riskFlags": [
    {
      "type": "missing_critical_evidence|factual_error|citation_mismatch|logical_gap",
      "description": "Specific issue description",
      "severity": "low|medium|high"
    }
  ],
  "revisionNeeded": true|false,
  "revisionInstructions": "Specific instructions for what needs to be fixed (only if revisionNeeded is true)"
}

IMPORTANT:
- Be precise with verdicts - "supported" means clear, direct evidence exists
- "weak" means partial or indirect evidence
- "contradicted" means evidence explicitly conflicts
- "not_found" means no relevant evidence in context
- Calculate evidenceCoverage as: (supported + weak) / totalClaims for claims with importance critical or material

Respond ONLY with valid JSON.`;
}

function parseJudgeOutput(output: string): JudgeResult {
  try {
    // Try to extract JSON from the response
    let jsonStr = output;

    // Handle markdown code blocks
    const jsonMatch = output.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr);

    // Validate and normalize the response
    const ledger: LedgerEntry[] = (parsed.ledger || []).map(
      (entry: Record<string, unknown>) => ({
        claimText: String(entry.claimText || ""),
        claimType: validateClaimType(entry.claimType),
        importance: validateImportance(entry.importance),
        verdict: validateVerdict(entry.verdict),
        confidenceScore: Number(entry.confidenceScore) || 0,
        chunkIds: Array.isArray(entry.chunkIds)
          ? entry.chunkIds.map(String)
          : [],
        evidenceSnippet: entry.evidenceSnippet
          ? String(entry.evidenceSnippet)
          : undefined,
        notes: entry.notes ? String(entry.notes) : undefined,
      })
    );

    return {
      verifiedResponse: parsed.verified_response || parsed.verifiedResponse,
      ledger,
      summary: {
        evidenceCoverage:
          Number(
            parsed.summary?.evidenceCoverage || parsed.summary?.evidence_coverage
          ) || 0,
        totalClaims:
          Number(
            parsed.summary?.totalClaims || parsed.summary?.total_claims
          ) || ledger.length,
        supported: Number(parsed.summary?.supported) || 0,
        weak: Number(parsed.summary?.weak) || 0,
        contradicted: Number(parsed.summary?.contradicted) || 0,
        notFound:
          Number(parsed.summary?.notFound || parsed.summary?.not_found) || 0,
      },
      riskFlags: (parsed.riskFlags || parsed.risk_flags || []).map(
        (flag: Record<string, unknown>) => ({
          type: String(flag.type || "unknown"),
          description: String(flag.description || ""),
          severity: String(flag.severity || "low"),
        })
      ),
      revisionNeeded: Boolean(
        parsed.revisionNeeded || parsed.revision_needed
      ),
      revisionInstructions:
        parsed.revisionInstructions || parsed.revision_instructions,
    };
  } catch (error) {
    console.error("Failed to parse judge output:", error, "Output:", output);

    // Return a safe default that allows the pipeline to continue
    return {
      ledger: [],
      summary: {
        evidenceCoverage: 0,
        totalClaims: 0,
        supported: 0,
        weak: 0,
        contradicted: 0,
        notFound: 0,
      },
      riskFlags: [
        {
          type: "parse_error",
          description: "Failed to parse judge output",
          severity: "high",
        },
      ],
      revisionNeeded: false,
    };
  }
}

function validateClaimType(
  type: unknown
): "fact" | "policy" | "numeric" | "definition" {
  const valid = ["fact", "policy", "numeric", "definition"];
  const value = String(type || "fact").toLowerCase();
  return valid.includes(value)
    ? (value as "fact" | "policy" | "numeric" | "definition")
    : "fact";
}

function validateImportance(imp: unknown): "critical" | "material" | "minor" {
  const valid = ["critical", "material", "minor"];
  const value = String(imp || "material").toLowerCase();
  return valid.includes(value)
    ? (value as "critical" | "material" | "minor")
    : "material";
}

function validateVerdict(
  verdict: unknown
): "supported" | "weak" | "contradicted" | "not_found" {
  const valid = ["supported", "weak", "contradicted", "not_found"];
  const value = String(verdict || "not_found").toLowerCase();
  return valid.includes(value)
    ? (value as "supported" | "weak" | "contradicted" | "not_found")
    : "not_found";
}
