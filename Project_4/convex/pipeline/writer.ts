import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const WRITER_MODEL = "openai/gpt-4o-mini";

export const generate = internalAction({
  args: {
    sessionId: v.id("sessions"),
    context: v.string(),
    query: v.string(),
    mode: v.union(v.literal("answer"), v.literal("draft")),
  },
  handler: async (ctx, args) => {
    const systemPrompt = getWriterPrompt(args.context, args.mode);

    // Stream response and update progress
    let fullResponse = "";

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
          model: WRITER_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: args.query },
          ],
          temperature: 0.7,
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let updateCounter = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content || "";
            fullResponse += content;
            updateCounter++;

            // Update streamed content periodically (every 10 chunks or ~200 chars)
            if (updateCounter % 10 === 0) {
              await ctx.runMutation(
                internal.pipeline.orchestrator.setProgress,
                {
                  sessionId: args.sessionId,
                  phase: "writer",
                  status: "in_progress",
                  streamedContent: fullResponse,
                }
              );
            }
          } catch {
            // Skip parse errors for incomplete JSON chunks
          }
        }
      }
    }

    // Final update with complete response
    await ctx.runMutation(internal.pipeline.orchestrator.setProgress, {
      sessionId: args.sessionId,
      phase: "writer",
      status: "in_progress",
      streamedContent: fullResponse,
    });

    return fullResponse;
  },
});

export const revise = internalAction({
  args: {
    sessionId: v.id("sessions"),
    context: v.string(),
    previousResponse: v.string(),
    judgeResult: v.string(),
  },
  handler: async (ctx, args) => {
    const systemPrompt = getRevisionPrompt(
      args.context,
      args.previousResponse,
      args.judgeResult
    );

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
          model: WRITER_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Please revise the response." },
          ],
          temperature: 0.7,
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

function getWriterPrompt(context: string, mode: "answer" | "draft"): string {
  const taskDescription =
    mode === "answer"
      ? "answer questions accurately and comprehensively"
      : "draft professional content";

  return `You are an expert research assistant. Your task is to ${taskDescription} based ONLY on the provided context documents.

CONTEXT (Source Documents):
${context}

CRITICAL INSTRUCTIONS:
1. Use ONLY information from the context above - never make up facts
2. Cite every factual claim using [cite:N] format where N is the source number (e.g., [cite:1], [cite:3])
3. If information is not available in the context, explicitly state: "The available documents do not contain information about..."
4. Be accurate, factual, and specific
5. Structure your response clearly with appropriate headings if the response is long
6. For numeric claims, quote the exact figures from the source
7. For policies or definitions, quote directly when possible

OUTPUT FORMAT:
- Write naturally but include citations for all factual claims
- Place citations immediately after the relevant claim
- You can cite multiple sources for a single claim if applicable [cite:1][cite:3]

Provide a comprehensive, well-cited response.`;
}

function getRevisionPrompt(
  context: string,
  previousResponse: string,
  judgeResult: string
): string {
  return `You are revising a response based on fact-checking feedback from our verification system.

CONTEXT (Source Documents):
${context}

PREVIOUS RESPONSE:
${previousResponse}

VERIFICATION FEEDBACK:
${judgeResult}

REVISION INSTRUCTIONS:
1. Address ALL issues identified in the verification feedback
2. For claims marked as "contradicted" - either remove them or correct them with proper evidence
3. For claims marked as "weak" - strengthen with additional citations or qualify the statement
4. For claims marked as "not_found" - either remove or explicitly note the limitation
5. Add citations [cite:N] where missing
6. Ensure all numeric values match the source documents exactly
7. Maintain the overall structure and readability

OUTPUT:
Provide the revised response with all corrections applied. Keep the same format and citation style [cite:N].`;
}
