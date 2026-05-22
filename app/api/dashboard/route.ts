import db from "../../../lib/db";

export async function GET() {
  try {
    const [summary, timeseries, recent] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*)::int                                                              AS total_requests,
          COUNT(*) FILTER (WHERE status = 'error')::int                            AS total_errors,
          ROUND(AVG(latency_ms))::int                                              AS avg_latency_ms,
          ROUND(
            COUNT(*) FILTER (WHERE status = 'error') * 100.0 /
            NULLIF(COUNT(*), 0), 1
          )::float                                                                  AS error_rate_pct,
          ROUND(COALESCE(SUM(estimated_cost_usd), 0), 6)::float                   AS total_cost_usd,
          COALESCE(SUM(total_tokens), 0)::int                                       AS total_tokens,
          COUNT(DISTINCT session_id)::int                                           AS total_sessions
        FROM inference_logs
        WHERE started_at > NOW() - INTERVAL '24 hours'
      `),

      db.query(`
        SELECT
          date_trunc('hour', started_at)                                           AS bucket,
          COUNT(*)::int                                                             AS requests,
          COUNT(*) FILTER (WHERE status = 'error')::int                           AS errors,
          ROUND(AVG(latency_ms))::int                                             AS avg_latency_ms,
          ROUND(
            percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)
          )::int                                                                   AS p95_latency_ms
        FROM inference_logs
        WHERE started_at > NOW() - INTERVAL '24 hours'
        GROUP BY bucket
        ORDER BY bucket ASC
      `),

      db.query(`
        SELECT
          request_id, session_id, model, provider,
          latency_ms, status, error_message,
          total_tokens, estimated_cost_usd::float,
          input_preview, output_preview,
          started_at
        FROM inference_logs
        ORDER BY started_at DESC
        LIMIT 20
      `),
    ]);

    return Response.json({
      summary: summary.rows[0],
      timeseries: timeseries.rows,
      recent: recent.rows,
    });
  } catch (err) {
    console.error("[dashboard] GET failed:", err);
    return Response.json({ error: "DB error" }, { status: 500 });
  }
}
