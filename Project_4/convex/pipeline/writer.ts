import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const WRITER_MODEL = "openai/gpt-5-nano";

// Conversation message type
interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export const generate = internalAction({
  args: {
    sessionId: v.id("sessions"),
    context: v.string(),
    query: v.string(),
    mode: v.union(v.literal("answer"), v.literal("draft")),
    conversationHistory: v.optional(
      v.array(
        v.object({
          role: v.union(v.literal("user"), v.literal("assistant")),
          content: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const systemPrompt = getWriterPrompt(args.context, args.mode, args.conversationHistory || []);

    // Build messages array with conversation history
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add previous conversation turns (limit to last 6 exchanges to manage context)
    const history = args.conversationHistory || [];
    const recentHistory = history.slice(-12); // Last 6 exchanges (12 messages)
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    // Add current query
    messages.push({ role: "user", content: args.query });

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
          messages,
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

function getWriterPrompt(
  context: string,
  mode: "answer" | "draft",
  conversationHistory: ConversationMessage[]
): string {
  const taskDescription =
    mode === "answer"
      ? "answer questions accurately and comprehensively"
      : "draft professional content";

  const hasHistory = conversationHistory.length > 0;
  const conversationNote = hasHistory
    ? `

CONVERSATION CONTEXT:
This is a follow-up question in an ongoing conversation. You have access to the previous exchanges.
- Reference previous answers when the user asks follow-up questions
- Maintain consistency with information you've already provided
- If the user refers to "it", "that", "the above", etc., use conversation history to understand the reference
- Build upon previous responses rather than repeating the same information`
    : "";

  return `You are an expert research assistant and domain specialist. Your task is to ${taskDescription} using the provided context documents as your PRIMARY source, supplemented by your broad expert knowledge when necessary.

CONTEXT (Source Documents):
${context}
${conversationNote}

YOUR EXPERTISE DOMAINS:
You are an expert in: Physics, Mathematics, Chemistry, Biology, Statistics, Medicine, Engineering, Computer Science, Economics, Law, History, Geography, and Astronomy. Use this expertise to provide accurate, comprehensive answers.

KNOWLEDGE HIERARCHY:
1. **Document-grounded claims** - Use information from the context documents, cite with [cite:N]
2. **Expert knowledge** - When documents don't cover something, use your expertise, cite with [llm:writer]
3. **Conflict resolution** - When documents contradict established facts, present BOTH views inline

CRITICAL INSTRUCTIONS:
1. Use document information where available, cite with [cite:N] format
2. Use your expert knowledge for missing information, cite with [llm:writer] tag
3. **CONFLICT HANDLING**: If a document contains factually incorrect information that contradicts established science/facts:
   - Present BOTH views using inline comparison format
   - Example: "The document states X [cite:1], however established [field] indicates Y [llm:writer]"
4. Be accurate, factual, and leverage your domain expertise
5. Structure your response clearly with appropriate headings if the response is long
6. For numeric claims from documents, quote the exact figures from the source
7. For established scientific facts, constants, or formulas, use your expertise with [llm:writer]
8. For follow-up questions, consider the conversation history

CITATION FORMAT:
- Document-based claims: "The revenue was $5M [cite:1]"
- Expert knowledge claims: "The speed of light is approximately 299,792 km/s [llm:writer]"
- Multiple document sources: "This is supported by evidence [cite:1][cite:3]"
- **Conflict inline comparison**: "The document claims water boils at 50°C [cite:2], however established physics indicates water boils at 100°C at standard atmospheric pressure [llm:writer]"

WHEN TO USE [llm:writer]:
- Scientific laws, formulas, constants (e.g., E=mc², π≈3.14159, gravitational constant)
- Established medical/biological facts
- Mathematical theorems and proofs
- Historical dates and verified events
- Legal principles and established precedents
- Engineering standards and best practices
- Economic theories and established models
- Correcting factual errors in documents

IMPORTANT:
- When documents contain correct information, ALWAYS cite them with [cite:N]
- Use [llm:writer] for expert knowledge not in documents
- ALWAYS flag conflicts between documents and established facts using inline comparison
- Never silently ignore document errors - present both views

Provide a comprehensive, expert-level response that combines document evidence with your broad domain expertise.`;
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
