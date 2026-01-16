import { internalAction } from "../_generated/server";
import { v } from "convex/values";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SKEPTIC_MODEL = "anthropic/claude-3-haiku-20240307";

export const analyze = internalAction({
  args: {
    context: v.string(),
    writerResponse: v.string(),
  },
  handler: async (_ctx, args) => {
    const systemPrompt = getSkepticPrompt(args.context);

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
          model: SKEPTIC_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: args.writerResponse },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  },
});

function getSkepticPrompt(context: string): string {
  return `You are a critical fact-checker and skeptic analyzing a response against source documents. Your job is to find EVERY potential issue, error, or unverified claim.

CONTEXT (Source Documents):
${context}

YOUR TASK:
Analyze the response provided by the user and produce a detailed verification report.

FOR EACH FACTUAL CLAIM in the response:
1. Identify the claim clearly
2. Search the context for supporting evidence
3. Classify the claim as one of:
   - SUPPORTED: Clear, direct evidence in context (quote the evidence)
   - WEAK: Partial or indirect evidence only
   - CONTRADICTED: Context contains conflicting information
   - NOT_FOUND: No relevant evidence in context
4. Note the importance: CRITICAL (key to the answer), MATERIAL (significant), or MINOR

ALSO CHECK FOR:
- Missing citations (claims without [cite:N] tags)
- Incorrect citations (wrong source number referenced)
- Numeric inaccuracies (wrong values, wrong units, wrong percentages)
- Logical gaps or unsupported inferences
- Overgeneralizations beyond what sources state
- Claims that could be misleading

OUTPUT FORMAT:
Provide your analysis as a structured report:

## Claim Analysis

### Claim 1: "[exact claim text]"
- **Type:** [fact/policy/numeric/definition]
- **Importance:** [critical/material/minor]
- **Status:** [SUPPORTED/WEAK/CONTRADICTED/NOT_FOUND]
- **Evidence:** "[quote from context]" or "No evidence found"
- **Issues:** [any problems with citation or accuracy]

[Continue for all claims...]

## Summary
- Total claims: X
- Supported: X
- Weak: X
- Contradicted: X
- Not found: X

## Critical Issues
[List any major problems that must be addressed]

## Recommendations
[Specific suggestions for improvement]

Be thorough and skeptical. It's better to flag a potential issue than to miss one.`;
}
