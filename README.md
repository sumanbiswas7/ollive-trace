# Ollive Trace

AI chatbot with built-in inference observability — every LLM call is traced, stored in Postgres, and surfaced in a live dashboard.

## Quick start

```bash
cp .env.example .env
# add your OPENAI_API_KEY to .env

docker compose up --build
```

| | URL |
|---|---|
| Chat | http://localhost:3000 |
| Dashboard | http://localhost:3000/dashboard |
| DB UI (CloudBeaver) | http://localhost:8080 |

> CloudBeaver first run: complete the setup wizard quickly (it times out). Connect with host `db`, user/password/database `ollive`.

## Architecture

```
POST /api/chat
  └─ traceStream()          wraps OpenAI stream, yields chunks to browser
        └─ (on close)
              sendTrace()   fire-and-forget POST /api/trace
                    └─ Postgres: sessions / inference_logs / messages
```

Traces are written asynchronously — a slow or failed trace write never affects the chat response.

## Schema

| Table | One row per |
|---|---|
| `sessions` | conversation |
| `inference_logs` | LLM request — latency, tokens, cost, status |
| `messages` | new turn (user + assistant) per request |

Messages store only the new turn per request, not the full re-sent context, keeping storage growth linear.

## Key tradeoffs

- **Fire-and-forget traces** — chat latency is never impacted, but dropped traces are silently lost (no retry)
- **Client-generated session IDs** — server stays stateless, but no server-side ownership of IDs
- **Derived conversation titles** — no extra column, but requires a subquery per session on list load
- **In-process pg pool** — zero extra infra, but needs PgBouncer before running multiple replicas

## If I had more time

- Buffered trace writes with a retry queue (Redis stream or a `pending_traces` table)
- Time-to-first-token metric alongside total latency
- Auth on `/api/trace` and `/api/dashboard`
- Data retention / pruning job
- Full-text search across message history (one `tsvector` index away)
