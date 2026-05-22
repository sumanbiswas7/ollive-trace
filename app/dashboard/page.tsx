"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import styles from "./dashboard.module.css";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface Summary {
  total_requests: number;
  total_errors: number;
  avg_latency_ms: number;
  error_rate_pct: number;
  total_cost_usd: number;
  total_tokens: number;
  total_sessions: number;
}

interface Bucket {
  bucket: string;
  requests: number;
  errors: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
}

interface LogRow {
  request_id: string;
  session_id: string;
  model: string;
  latency_ms: number;
  status: string;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
  input_preview: string | null;
  started_at: string;
}

interface DashboardData {
  summary: Summary;
  timeseries: Bucket[];
  recent: LogRow[];
}

/* ─── Chart helpers ──────────────────────────────────────────────────── */

const W = 560;
const H = 140;
const PAD = { top: 8, right: 8, bottom: 28, left: 44 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

function xLabel(iso: string) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:00`;
}

function BarChart({
  data,
  getValue,
  color,
  emptyMsg,
}: {
  data: Bucket[];
  getValue: (b: Bucket) => number;
  color: string;
  emptyMsg: string;
}) {
  if (data.length === 0) {
    return <p className={styles.chartEmpty}>{emptyMsg}</p>;
  }
  const vals = data.map(getValue);
  const max = Math.max(...vals, 1);
  const bw = CW / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className={styles.svg}>
      {/* Y gridlines */}
      {[0, 0.5, 1].map((f) => {
        const y = PAD.top + CH * (1 - f);
        return (
          <g key={f}>
            <line x1={PAD.left} x2={PAD.left + CW} y1={y} y2={y} stroke="rgba(245,245,240,0.06)" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" className={styles.axisLabel}>
              {Math.round(max * f)}
            </text>
          </g>
        );
      })}
      {/* Bars */}
      {data.map((b, i) => {
        const val = getValue(b);
        const bh = (val / max) * CH;
        return (
          <g key={i}>
            <rect
              x={PAD.left + i * bw + 2}
              y={PAD.top + CH - bh}
              width={bw - 4}
              height={bh}
              fill={color}
              rx={2}
            />
            {i % Math.ceil(data.length / 6) === 0 && (
              <text
                x={PAD.left + i * bw + bw / 2}
                y={H - 6}
                textAnchor="middle"
                className={styles.axisLabel}
              >
                {xLabel(b.bucket)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({
  data,
  getValue,
  color,
  unit,
  emptyMsg,
}: {
  data: Bucket[];
  getValue: (b: Bucket) => number;
  color: string;
  unit: string;
  emptyMsg: string;
}) {
  if (data.length === 0) {
    return <p className={styles.chartEmpty}>{emptyMsg}</p>;
  }
  const vals = data.map(getValue);
  const max = Math.max(...vals, 1);

  const points = data
    .map((b, i) => {
      const x = PAD.left + (i / (data.length - 1 || 1)) * CW;
      const y = PAD.top + CH * (1 - getValue(b) / max);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className={styles.svg}>
      {[0, 0.5, 1].map((f) => {
        const y = PAD.top + CH * (1 - f);
        return (
          <g key={f}>
            <line x1={PAD.left} x2={PAD.left + CW} y1={y} y2={y} stroke="rgba(245,245,240,0.06)" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" className={styles.axisLabel}>
              {Math.round(max * f)}{unit}
            </text>
          </g>
        );
      })}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((b, i) => {
        const x = PAD.left + (i / (data.length - 1 || 1)) * CW;
        const y = PAD.top + CH * (1 - getValue(b) / max);
        return <circle key={i} cx={x} cy={y} r={3} fill={color} />;
      })}
      {data
        .filter((_, i) => i % Math.ceil(data.length / 6) === 0)
        .map((b, i) => {
          const origIdx = data.indexOf(b);
          const x = PAD.left + (origIdx / (data.length - 1 || 1)) * CW;
          return (
            <text key={i} x={x} y={H - 6} textAnchor="middle" className={styles.axisLabel}>
              {xLabel(b.bucket)}
            </text>
          );
        })}
    </svg>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error();
      setData(await res.json());
      setLastRefreshed(new Date());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const s = data?.summary;
  const ts = data?.timeseries ?? [];

  return (
    <div className={styles.page}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.backLink}>← Chat</Link>
          <h1 className={styles.title}>Trace Dashboard</h1>
          <span className={styles.windowLabel}>Last 24 hours</span>
        </div>
        <div className={styles.headerRight}>
          {lastRefreshed && (
            <span className={styles.refreshed}>
              Updated {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button className={styles.refreshBtn} onClick={load}>Refresh</button>
        </div>
      </header>

      {error && (
        <div className={styles.errorBanner}>
          Could not reach the database. Make sure Postgres is running.
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────────────────── */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Requests</span>
          <span className={styles.cardValue}>{s?.total_requests ?? "—"}</span>
          <span className={styles.cardSub}>{s?.total_sessions ?? 0} sessions</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Avg Latency</span>
          <span className={styles.cardValue}>
            {s ? `${s.avg_latency_ms.toLocaleString()} ms` : "—"}
          </span>
          <span className={styles.cardSub}>per request</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Error Rate</span>
          <span className={`${styles.cardValue} ${s && s.error_rate_pct > 5 ? styles.cardValueDanger : ""}`}>
            {s != null ? `${s.error_rate_pct ?? 0}%` : "—"}
          </span>
          <span className={styles.cardSub}>{s?.total_errors ?? 0} errors</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Est. Cost</span>
          <span className={styles.cardValue}>
            {s ? `$${(s.total_cost_usd ?? 0).toFixed(4)}` : "—"}
          </span>
          <span className={styles.cardSub}>{(s?.total_tokens ?? 0).toLocaleString()} tokens</span>
        </div>
      </div>

      {/* ── Charts ───────────────────────────────────────────────── */}
      <div className={styles.charts}>
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Throughput</h2>
          <p className={styles.chartDesc}>Requests / hour</p>
          <BarChart
            data={ts}
            getValue={(b) => b.requests}
            color="rgba(125,212,131,0.75)"
            emptyMsg="No requests in the last 24 hours"
          />
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Latency</h2>
          <p className={styles.chartDesc}>Avg ms / hour</p>
          <LineChart
            data={ts}
            getValue={(b) => b.avg_latency_ms}
            color="#7dd483"
            unit="ms"
            emptyMsg="No data yet"
          />
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Errors</h2>
          <p className={styles.chartDesc}>Error count / hour</p>
          <BarChart
            data={ts}
            getValue={(b) => b.errors}
            color="rgba(239,100,100,0.75)"
            emptyMsg="No errors — nice"
          />
        </div>
      </div>

      {/* ── Recent logs table ────────────────────────────────────── */}
      <div className={styles.tableCard}>
        <h2 className={styles.chartTitle}>Recent Requests</h2>
        {(data?.recent ?? []).length === 0 ? (
          <p className={styles.chartEmpty}>No requests yet</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Model</th>
                  <th>Status</th>
                  <th>Latency</th>
                  <th>Tokens</th>
                  <th>Cost</th>
                  <th>Input preview</th>
                </tr>
              </thead>
              <tbody>
                {data?.recent.map((row) => (
                  <tr key={row.request_id}>
                    <td className={styles.tdMono}>
                      {new Date(row.started_at).toLocaleTimeString()}
                    </td>
                    <td>{row.model}</td>
                    <td>
                      <span className={row.status === "error" ? styles.badgeErr : styles.badgeOk}>
                        {row.status}
                      </span>
                    </td>
                    <td className={styles.tdMono}>{row.latency_ms.toLocaleString()} ms</td>
                    <td className={styles.tdMono}>{row.total_tokens ?? "—"}</td>
                    <td className={styles.tdMono}>
                      {row.estimated_cost_usd != null
                        ? `$${row.estimated_cost_usd.toFixed(5)}`
                        : "—"}
                    </td>
                    <td className={styles.tdPreview}>{row.input_preview ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
