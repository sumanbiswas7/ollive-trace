import OpenAI from "openai";
import { traceStream } from "../../../lib/trace";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CONTEXT_WINDOW = 20;
const PREVIEW_LEN = 200;

export async function POST(request: Request) {
  const { messages, sessionId = "anonymous" } = await request.json();

  const trimmed = messages.slice(-CONTEXT_WINDOW);
  const lastUserContent: string =
    [...trimmed].reverse().find(
      (m: { role: string; content: string }) => m.role === "user"
    )?.content ?? "";

  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const baseUrl = new URL(request.url).origin;

  const stream = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful, concise assistant. Keep responses clear and to the point.",
      },
      ...trimmed,
    ],
    stream: true,
    stream_options: { include_usage: true },
  });

  const traced = traceStream(stream, {
    requestId,
    sessionId,
    model: "gpt-4.1",
    provider: "openai",
    startedAt,
    inputMessages: trimmed.length,
    inputPreview: lastUserContent.slice(0, PREVIEW_LEN),
    lastUserContent,
    baseUrl,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const text of traced) {
          controller.enqueue(encoder.encode(text));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
