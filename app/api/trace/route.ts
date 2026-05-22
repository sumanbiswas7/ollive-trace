import db from "../../../lib/db";
import type { InferenceRecord } from "../../../lib/trace";

function isValidRecord(r: unknown): r is InferenceRecord {
  if (!r || typeof r !== "object") return false;
  const o = r as Record<string, unknown>;
  return (
    typeof o.requestId === "string" &&
    typeof o.sessionId === "string" &&
    typeof o.provider === "string" &&
    typeof o.model === "string" &&
    typeof o.startedAt === "number" &&
    typeof o.endedAt === "number" &&
    typeof o.latencyMs === "number" &&
    (o.status === "success" || o.status === "error") &&
    typeof o.inputMessages === "number"
  );
}

export async function POST(request: Request) {
  let record: unknown;
  try {
    record = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!isValidRecord(record)) {
    return Response.json({ ok: false, error: "Missing required fields" }, { status: 422 });
  }

  try {
    await db.query(
      `INSERT INTO sessions (id) VALUES ($1)
       ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
      [record.sessionId]
    );

    await db.query(
      `INSERT INTO inference_logs (
        request_id, session_id, provider, model,
        started_at, ended_at, latency_ms, status, error_message,
        input_messages, input_preview, output_preview,
        prompt_tokens, completion_tokens, total_tokens,
        estimated_cost_usd, words_per_second
      ) VALUES (
        $1,$2,$3,$4,
        to_timestamp($5 / 1000.0), to_timestamp($6 / 1000.0), $7, $8, $9,
        $10,$11,$12,
        $13,$14,$15,
        $16,$17
      )
      ON CONFLICT (request_id) DO NOTHING`,
      [
        record.requestId,
        record.sessionId,
        record.provider,
        record.model,
        record.startedAt,
        record.endedAt,
        record.latencyMs,
        record.status,
        record.error ?? null,
        record.inputMessages,
        record.inputPreview ?? null,
        record.outputPreview ?? null,
        record.promptTokens ?? null,
        record.completionTokens ?? null,
        record.totalTokens ?? null,
        record.estimatedCostUsd ?? null,
        record.wordsPerSecond ?? null,
      ]
    );

    if (record.turnMessages && record.turnMessages.length > 0) {
      for (const msg of record.turnMessages) {
        await db.query(
          `INSERT INTO messages (request_id, session_id, role, content)
           VALUES ($1, $2, $3, $4)`,
          [record.requestId, record.sessionId, msg.role, msg.content]
        );
      }
    }

    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[trace] DB write failed:", err);
    return Response.json({ ok: false, error: "DB error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { rows } = await db.query(
      `SELECT
        l.*,
        json_agg(
          json_build_object('role', m.role, 'content', m.content)
          ORDER BY m.created_at
        ) FILTER (WHERE m.id IS NOT NULL) AS messages
       FROM inference_logs l
       LEFT JOIN messages m ON m.request_id = l.request_id
       GROUP BY l.id
       ORDER BY l.started_at DESC
       LIMIT 200`
    );
    return Response.json(rows);
  } catch (err) {
    console.error("[trace] DB read failed:", err);
    return Response.json({ error: "DB error" }, { status: 500 });
  }
}
