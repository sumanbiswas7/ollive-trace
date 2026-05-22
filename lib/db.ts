import { Pool } from "pg";

// Reuse the pool across hot-reloads in development
const g = globalThis as typeof globalThis & { __pgPool?: Pool };

const pool =
  g.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

if (process.env.NODE_ENV !== "production") {
  g.__pgPool = pool;
}

export default pool;
