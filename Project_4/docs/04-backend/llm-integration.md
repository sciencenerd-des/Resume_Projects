# LLM Integration

> **Provider:** OpenRouter
> **Version:** 1.0
> **Last Updated:** 2026-01-03

---

## 1. Overview

VerityDraft uses OpenRouter as an LLM gateway for multi-model access, enabling optimal model selection for each pipeline role (Writer, Skeptic, Judge).

---

## 2. OpenRouter Configuration

### 2.1 Client Setup

```typescript
interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  defaultHeaders: Record<string, string>;
}

const config: OpenRouterConfig = {
  apiKey: process.env.OPENROUTER_API_KEY!,
  baseUrl: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://veritydraft.com",
    "X-Title": "VerityDraft"
  }
};

class OpenRouterClient {
  private config: OpenRouterConfig;

  constructor(config: OpenRouterConfig) {
    this.config = config;
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        ...this.config.defaultHeaders
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        stream: params.stream ?? false
      })
    });

    if (!response.ok) {
      throw new OpenRouterError(await response.json());
    }

    return response.json();
  }

  async *chatStream(params: ChatParams): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        ...this.config.defaultHeaders
      },
      body: JSON.stringify({
        ...params,
        stream: true
      })
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') return;

        yield JSON.parse(data);
      }
    }
  }
}
```

---

## 3. Model Configuration

### 3.1 Role-Based Models

```typescript
interface ModelSpec {
  id: string;
  maxTokens: number;
  temperature: number;
  costPerInputToken: number;
  costPerOutputToken: number;
}

const models: Record<string, ModelSpec> = {
  writer: {
    id: "openai/gpt-5-nano",
    maxTokens: 4096,
    temperature: 0.7,
    costPerInputToken: 0.000002,
    costPerOutputToken: 0.000010
  },

  skeptic: {
    id: "z-ai/glm-4.7",
    maxTokens: 8192,
    temperature: 0.3,
    costPerInputToken: 0.000001,
    costPerOutputToken: 0.000004
  },

  judge: {
    id: "deepseek/deepseek-v3.2-speciale",
    maxTokens: 4096,
    temperature: 0.2,
    costPerInputToken: 0.000002,
    costPerOutputToken: 0.000008
  }
};
```

### 3.2 Model Fallbacks

```typescript
const fallbackChain: Record<string, string[]> = {
  "openai/gpt-5-nano": [
    "openai/gpt-4o",
    "anthropic/claude-3-5-sonnet-20241022"
  ],
  "z-ai/glm-4.7": [
    "anthropic/claude-3-5-haiku-20241022",
    "openai/gpt-4o-mini"
  ],
  "deepseek/deepseek-v3.2-speciale": [
    "openai/gpt-4o",
    "anthropic/claude-3-5-sonnet-20241022"
  ]
};
```

---

## 4. Request Patterns

### 4.1 Standard Request

```typescript
async function callLLM(
  role: "writer" | "skeptic" | "judge",
  messages: Message[]
): Promise<LLMResponse> {
  const model = models[role];

  const response = await client.chat({
    model: model.id,
    messages,
    maxTokens: model.maxTokens,
    temperature: model.temperature
  });

  return {
    content: response.choices[0].message.content,
    usage: {
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
      cost: calculateCost(response.usage, model)
    }
  };
}
```

### 4.2 Streaming Request

```typescript
async function* streamLLM(
  role: "writer" | "skeptic" | "judge",
  messages: Message[]
): AsyncGenerator<StreamEvent> {
  const model = models[role];
  let fullContent = "";

  for await (const chunk of client.chatStream({
    model: model.id,
    messages,
    maxTokens: model.maxTokens,
    temperature: model.temperature
  })) {
    const delta = chunk.choices[0]?.delta?.content || "";
    fullContent += delta;

    yield {
      type: "content",
      delta,
      fullContent
    };
  }

  yield {
    type: "complete",
    content: fullContent
  };
}
```

---

## 5. Retry & Fallback Logic

```typescript
async function callWithRetry(
  role: string,
  messages: Message[],
  maxRetries: number = 3
): Promise<LLMResponse> {
  const primaryModel = models[role].id;
  const fallbacks = fallbackChain[primaryModel] || [];
  const allModels = [primaryModel, ...fallbacks];

  for (const model of allModels) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await client.chat({
          model,
          messages,
          maxTokens: models[role].maxTokens,
          temperature: models[role].temperature
        });
      } catch (error) {
        if (isRetryable(error) && attempt < maxRetries) {
          await delay(exponentialBackoff(attempt));
          continue;
        }
        if (isModelError(error)) break; // Try next model
        throw error;
      }
    }
  }

  throw new Error(`All models failed for ${role}`);
}

function isRetryable(error: any): boolean {
  return error.status === 429 || error.status >= 500;
}

function exponentialBackoff(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt - 1), 10000);
}
```

---

## 6. Token Counting

```typescript
import { encode } from "gpt-tokenizer";

function countTokens(text: string): number {
  return encode(text).length;
}

function estimateRequestTokens(messages: Message[]): number {
  let total = 0;
  for (const msg of messages) {
    total += countTokens(msg.content);
    total += 4; // Role tokens overhead
  }
  return total + 3; // Priming tokens
}
```

---

## 7. Cost Tracking

```typescript
interface CostRecord {
  sessionId: string;
  role: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  timestamp: Date;
}

function calculateCost(usage: TokenUsage, model: ModelSpec): number {
  return (
    usage.prompt_tokens * model.costPerInputToken +
    usage.completion_tokens * model.costPerOutputToken
  );
}

async function recordCost(record: CostRecord): Promise<void> {
  await db.insert('llm_costs', record);
}
```

---

## 8. Error Handling

```typescript
class LLMError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean,
    public model?: string
  ) {
    super(message);
  }
}

function handleOpenRouterError(error: any): never {
  if (error.error?.code === 'rate_limit_exceeded') {
    throw new LLMError(
      'Rate limit exceeded',
      'RATE_LIMITED',
      true,
      error.model
    );
  }

  if (error.error?.code === 'context_length_exceeded') {
    throw new LLMError(
      'Context too long',
      'CONTEXT_EXCEEDED',
      false,
      error.model
    );
  }

  throw new LLMError(
    error.error?.message || 'Unknown error',
    'UNKNOWN',
    false,
    error.model
  );
}
```

---

## 9. Structured Output

### 9.1 JSON Mode

```typescript
async function callWithJsonOutput<T>(
  role: string,
  messages: Message[],
  schema: JSONSchema
): Promise<T> {
  const response = await callLLM(role, [
    ...messages,
    {
      role: "system",
      content: `Respond with valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`
    }
  ]);

  try {
    return JSON.parse(response.content);
  } catch {
    // Retry with explicit instruction
    const retryResponse = await callLLM(role, [
      ...messages,
      { role: "assistant", content: response.content },
      { role: "user", content: "Please format your response as valid JSON only." }
    ]);

    return JSON.parse(retryResponse.content);
  }
}
```

---

## 10. Observability

```typescript
function logLLMCall(params: {
  role: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  error?: string;
}) {
  console.log(JSON.stringify({
    event: "llm_call",
    ...params,
    timestamp: new Date().toISOString()
  }));
}
```
