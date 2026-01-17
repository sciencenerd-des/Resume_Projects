import { internalAction } from "../_generated/server";
import { v } from "convex/values";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const JUDGE_MODEL = "deepseek/deepseek-v3.2-speciale";

interface LedgerEntry {
  claimText: string;
  claimType: "fact" | "policy" | "numeric" | "definition" | "scientific" | "historical" | "legal";
  sourceTag?: string;
  importance: "critical" | "material" | "minor";
  verdict: "supported" | "weak" | "contradicted" | "not_found" | "expert_verified" | "conflict_flagged";
  confidenceScore: number;
  chunkIds: string[];
  evidenceSnippet?: string;
  expertAssessment?: string;
  notes?: string;
}

interface Conflict {
  documentClaim: string;
  establishedFact: string;
  domain: string;
  resolution: string;
}

interface ExpertAddition {
  knowledge: string;
  tag: string;
  reason: string;
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
    expertVerified: number;
    conflictFlagged: number;
  };
  conflicts?: Conflict[];
  expertAdditions?: ExpertAddition[];
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
  return `You are the final Judge and domain expert in a verification pipeline. Your role is to:
1. Produce the definitive Evidence Ledger
2. Verify ALL claims against documents AND your expert knowledge
3. Add any critical missing knowledge using [llm:judge]
4. Flag conflicts between documents and established facts

CONTEXT (Source Documents):
${context}

YOUR EXPERTISE DOMAINS:
You are an expert in: Physics, Mathematics, Chemistry, Biology, Statistics, Medicine, Engineering, Computer Science, Economics, Law, History, Geography, and Astronomy.

UNDERSTANDING CITATION TYPES:
- [cite:N] = Claims sourced from documents
- [llm:writer] = Claims from Writer's expert knowledge
- [llm:skeptic] = Claims/additions from Skeptic's expert knowledge
- [llm:judge] = Your own expert knowledge (you can add this)

YOUR TASK:
1. Review claims from Writer and Skeptic's analysis
2. Verify ALL claims against documents AND your expert knowledge
3. Produce final verdicts for each claim
4. ADD any critical missing knowledge as [llm:judge] in verified_response
5. Flag conflicts between documents and established facts
6. Determine if revision is needed

QUALITY GATES (revision required if any fail):
- Evidence coverage >= 85% of critical/material claims (excluding expert_knowledge)
- No "contradicted" claims with importance = "critical"
- Unsupported claim rate <= 5%
- All conflict_flagged items must present both views
- If revision cycle 2, accept if coverage >= 70%

OUTPUT FORMAT (strict JSON):
{
  "verified_response": "The corrected/enhanced response with proper citations. Include [llm:judge] for any knowledge you add. MUST include inline comparisons for all conflicts.",
  "ledger": [
    {
      "claimText": "The exact claim being verified",
      "claimType": "fact|policy|numeric|definition|scientific|historical|legal",
      "sourceTag": "cite:N|llm:writer|llm:skeptic|llm:judge|missing",
      "importance": "critical|material|minor",
      "verdict": "supported|weak|contradicted|not_found|expert_verified|conflict_flagged",
      "confidenceScore": 0.0-1.0,
      "chunkIds": ["1", "3"],
      "evidenceSnippet": "Quote from documents or 'Expert knowledge'",
      "expertAssessment": "Your expert verification of factual accuracy",
      "notes": "Explanation of the verdict"
    }
  ],
  "summary": {
    "evidenceCoverage": 0.0-1.0,
    "totalClaims": 5,
    "supported": 3,
    "weak": 1,
    "contradicted": 0,
    "notFound": 1,
    "expertVerified": 0,
    "conflictFlagged": 0
  },
  "conflicts": [
    {
      "documentClaim": "What the document states [cite:N]",
      "establishedFact": "The correct/established fact [llm:judge]",
      "domain": "physics|math|chemistry|biology|medicine|law|history|etc",
      "resolution": "Both views presented inline"
    }
  ],
  "expertAdditions": [
    {
      "knowledge": "Expert knowledge added by Judge",
      "tag": "[llm:judge]",
      "reason": "Why this was necessary"
    }
  ],
  "riskFlags": [
    {
      "type": "factual_error|citation_mismatch|logical_gap|document_contradiction|missing_expert_context",
      "description": "Specific issue description",
      "severity": "low|medium|high"
    }
  ],
  "revisionNeeded": true|false,
  "revisionInstructions": "Specific instructions for revision (only if revisionNeeded is true)"
}

VERDICT DEFINITIONS:
- "supported" = Clear evidence in documents, verified by your expertise
- "weak" = Partial document evidence
- "contradicted" = Conflicts with documents OR your expert knowledge (factually wrong)
- "not_found" = Not in documents (problematic for [cite:N] claims)
- "expert_verified" = LLM knowledge ([llm:writer/skeptic/judge]) verified correct by your expertise
- "conflict_flagged" = Document contradicts established facts - BOTH views must be presented

EXPERT VERIFICATION RULES:
1. ALL claims must be checked against your expert knowledge
2. If [cite:N] claim is factually wrong, verdict = "conflict_flagged" (not just contradicted)
3. If [llm:*] claim is correct per your expertise, verdict = "expert_verified"
4. You can ADD knowledge with [llm:judge] in verified_response
5. Conflicts require inline comparison format: "Document states X [cite:N], however established [field] indicates Y [llm:judge]"

TRUTH HIERARCHY:
- Documents and established facts have EQUAL weight
- Conflicts are flagged for user decision (not auto-resolved)
- Your expert assessment determines if something is factually correct

Calculate evidenceCoverage as: (supported + weak + expert_verified) / (totalClaims - conflictFlagged) for critical/material claims

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
        sourceTag: entry.sourceTag ? String(entry.sourceTag) : undefined,
        importance: validateImportance(entry.importance),
        verdict: validateVerdict(entry.verdict),
        confidenceScore: Number(entry.confidenceScore) || 0,
        chunkIds: Array.isArray(entry.chunkIds)
          ? entry.chunkIds.map(String)
          : [],
        evidenceSnippet: entry.evidenceSnippet
          ? String(entry.evidenceSnippet)
          : undefined,
        expertAssessment: entry.expertAssessment
          ? String(entry.expertAssessment)
          : undefined,
        notes: entry.notes ? String(entry.notes) : undefined,
      })
    );

    // Parse conflicts
    const conflicts: Conflict[] = (parsed.conflicts || []).map(
      (conflict: Record<string, unknown>) => ({
        documentClaim: String(conflict.documentClaim || conflict.document_claim || ""),
        establishedFact: String(conflict.establishedFact || conflict.established_fact || ""),
        domain: String(conflict.domain || "unknown"),
        resolution: String(conflict.resolution || ""),
      })
    );

    // Parse expert additions
    const expertAdditions: ExpertAddition[] = (parsed.expertAdditions || parsed.expert_additions || []).map(
      (addition: Record<string, unknown>) => ({
        knowledge: String(addition.knowledge || ""),
        tag: String(addition.tag || "[llm:judge]"),
        reason: String(addition.reason || ""),
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
        expertVerified:
          Number(parsed.summary?.expertVerified || parsed.summary?.expert_verified) || 0,
        conflictFlagged:
          Number(parsed.summary?.conflictFlagged || parsed.summary?.conflict_flagged) || 0,
      },
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      expertAdditions: expertAdditions.length > 0 ? expertAdditions : undefined,
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
        expertVerified: 0,
        conflictFlagged: 0,
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
): "fact" | "policy" | "numeric" | "definition" | "scientific" | "historical" | "legal" {
  const valid = ["fact", "policy", "numeric", "definition", "scientific", "historical", "legal"];
  const value = String(type || "fact").toLowerCase();
  return valid.includes(value)
    ? (value as "fact" | "policy" | "numeric" | "definition" | "scientific" | "historical" | "legal")
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
): "supported" | "weak" | "contradicted" | "not_found" | "expert_verified" | "conflict_flagged" {
  const valid = ["supported", "weak", "contradicted", "not_found", "expert_verified", "conflict_flagged"];
  const value = String(verdict || "not_found").toLowerCase().replace(/ /g, "_");
  return valid.includes(value)
    ? (value as "supported" | "weak" | "contradicted" | "not_found" | "expert_verified" | "conflict_flagged")
    : "not_found";
}
