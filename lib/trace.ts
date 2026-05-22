const PREVIEW_LEN = 200;

// USD per 1 million tokens
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4.1":       { input: 2.00,  output: 8.00 },
  "gpt-4o":        { input: 2.50,  output: 10.00 },
  "gpt-4o-mini":   { input: 0.15,  output: 0.60 },
  "gpt-3.5-turbo": { input: 0.50,  output: 1.50 },
};

function estimateCost(
  model: string,
  promptTokens: number | null,
  completionTokens: number | null
): number | null {
  const p = PRICING[model];
  if (!p || (promptTokens === null && completionTokens === null)) return null;
  return (
    ((promptTokens ?? 0) * p.input + (completionTokens ?? 0) * p.output) /
    1_000_000
  );
}

export interface TurnMessage {
  role: "user" | "assistant";
  content: string;
}

export interface InferenceRecord {
  requestId: string;
  sessionId: string;
  provider: string;
  model: string;
  startedAt: number;
  endedAt: number;
  latencyMs: number;
  status: "success" | "error";
  error?: string;
  inputMessages: number;
  inputPreview: string;
  outputPreview: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  wordsPerSecond: number | null;
  // The new user message + assistant response for this turn
  turnMessages?: TurnMessage[];
}

export function sendTrace(baseUrl: string, record: InferenceRecord): void {
  fetch(`${baseUrl}/api/trace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  }).catch(() => {});
}

export async function* traceStream(
  stream: AsyncIterable<{
    choices: { delta: { content?: string | null } }[];
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    } | null;
  }>,
  meta: {
    requestId: string;
    sessionId: string;
    model: string;
    provider: string;
    startedAt: number;
    inputMessages: number;
    inputPreview: string;
    lastUserContent: string;
    baseUrl: string;
  }
): AsyncGenerator<string> {
  let outputText = "";
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;
  let totalTokens: number | null = null;
  let status: "success" | "error" = "success";
  let error: string | undefined;

  try {
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (text) {
        outputText += text;
        yield text;
      }
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens ?? null;
        completionTokens = chunk.usage.completion_tokens ?? null;
        totalTokens = chunk.usage.total_tokens ?? null;
      }
    }
  } catch (err) {
    status = "error";
    error = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    const endedAt = Date.now();
    const latencyMs = endedAt - meta.startedAt;
    const outputWords = outputText.trim().split(/\s+/).filter(Boolean).length;

    sendTrace(meta.baseUrl, {
      requestId: meta.requestId,
      sessionId: meta.sessionId,
      provider: meta.provider,
      model: meta.model,
      startedAt: meta.startedAt,
      endedAt,
      latencyMs,
      status,
      error,
      inputMessages: meta.inputMessages,
      inputPreview: meta.inputPreview,
      outputPreview: outputText.slice(0, PREVIEW_LEN),
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUsd: estimateCost(meta.model, promptTokens, completionTokens),
      wordsPerSecond:
        latencyMs > 0 ? Math.round((outputWords / latencyMs) * 1000 * 100) / 100 : null,
      turnMessages: [
        { role: "user",      content: meta.lastUserContent },
        { role: "assistant", content: outputText },
      ],
    });
  }
}
