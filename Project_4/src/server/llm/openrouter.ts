/**
 * OpenRouter LLM Client
 * Handles API calls to OpenRouter for the 3-LLM pipeline
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = "https://openrouter.ai/api/v1";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

// Model configurations for each role in the pipeline
export const models: Record<string, ModelConfig> = {
  writer: {
    model: "openai/gpt-4o-mini", // Fast, capable for initial generation
    maxTokens: 4096,
    temperature: 0.7,
  },
  skeptic: {
    model: "anthropic/claude-3-haiku", // Good at critical analysis
    maxTokens: 8192,
    temperature: 0.3,
  },
  judge: {
    model: "openai/gpt-4o-mini", // Balanced for verification
    maxTokens: 4096,
    temperature: 0.2,
  },
};

export type LLMRole = keyof typeof models;

/**
 * Send a chat completion request (non-streaming)
 */
export async function chat(
  role: LLMRole,
  messages: ChatMessage[]
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    console.warn("[LLM] OpenRouter not configured, returning mock response");
    return getMockResponse(role);
  }

  const config = models[role];

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://veritydraft.com",
      "X-Title": "VerityDraft",
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[LLM] OpenRouter error: ${response.status}`, errorBody);
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

/**
 * Send a streaming chat completion request
 */
export async function* chatStream(
  role: LLMRole,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  if (!OPENROUTER_API_KEY) {
    console.warn("[LLM] OpenRouter not configured, returning mock stream");
    const mockResponse = getMockResponse(role);
    for (const word of mockResponse.split(" ")) {
      yield word + " ";
      await new Promise((r) => setTimeout(r, 50));
    }
    return;
  }

  const config = models[role];

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://veritydraft.com",
      "X-Title": "VerityDraft",
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter streaming error: ${response.status} ${errorBody}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete lines
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;

      const data = line.slice(6).trim();
      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          yield content;
        }
      } catch {
        // Ignore parse errors on incomplete JSON
      }
    }
  }
}

/**
 * Get mock response for testing without API key
 */
function getMockResponse(role: LLMRole): string {
  switch (role) {
    case "writer":
      return `Based on the provided documents, here is my analysis:

The policy document states that refunds are available within 30 days of purchase [cite:abc12345].
Additionally, the financial report shows revenue increased by 15% in Q4 [cite:def67890].

The key findings are:
1. Customer satisfaction improved significantly
2. New product launches were successful
3. Market expansion is planned for next quarter`;

    case "skeptic":
      return JSON.stringify({
        claims: [
          {
            claim_text: "refunds are available within 30 days",
            claim_type: "policy",
            importance: "critical",
            concerns: [],
          },
          {
            claim_text: "revenue increased by 15%",
            claim_type: "numeric",
            importance: "material",
            concerns: ["Verify exact percentage against source"],
          },
        ],
        overall_assessment: "Generally well-supported with minor verification needed",
      });

    case "judge":
      return JSON.stringify({
        verified_response:
          "Based on the provided documents, refunds are available within 30 days [cite:abc12345].",
        ledger: [
          {
            claim_text: "refunds are available within 30 days",
            claim_type: "policy",
            importance: "critical",
            verdict: "supported",
            confidence_score: 0.95,
            evidence_snippet: "Refunds may be requested within 30 days",
            chunk_ids: ["abc12345"],
          },
        ],
        summary: {
          evidence_coverage: 0.9,
          total_claims: 1,
          supported: 1,
          weak: 0,
          contradicted: 0,
          not_found: 0,
        },
        revision_needed: false,
      });

    default:
      return "Mock response";
  }
}

/**
 * Get token usage for a request (estimate)
 */
export function estimateTokenUsage(messages: ChatMessage[]): number {
  const text = messages.map((m) => m.content).join(" ");
  return Math.ceil(text.length / 4);
}

/**
 * Check if OpenRouter is configured
 */
export function isConfigured(): boolean {
  return !!OPENROUTER_API_KEY;
}
