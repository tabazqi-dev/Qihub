import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_URL?.trim() ||
    (process.env.SQL_HOST?.trim() && process.env.SQL_DB_NAME?.trim())
  );
}

function shouldUseSsl(connectionString?: string): boolean | { rejectUnauthorized: false } {
  if (process.env.PGSSLMODE === 'disable') return false;
  if (!connectionString) return false;
  if (connectionString.includes('localhost') || connectionString.includes('127.0.0.1')) {
    return false;
  }
  if (connectionString.includes('sslmode=disable')) {
    return false;
  }
  return { rejectUnauthorized: false };
}

export const getPool = (): Pool | null => {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!global._postgresPool) {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (databaseUrl) {
      global._postgresPool = new Pool({
        connectionString: databaseUrl,
        ssl: shouldUseSsl(databaseUrl),
        max: 5,
        idleTimeoutMillis: 20000,
        connectionTimeoutMillis: 15000,
      });
    } else {
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 5,
        idleTimeoutMillis: 20000,
        connectionTimeoutMillis: 15000,
      });
    }

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL pool client:', err.message);
    });
  }

  return global._postgresPool;
};

export const getDb = (): NodePgDatabase<typeof schema> => {
  const pool = getPool();
  if (!pool) {
    throw new Error('DATABASE_NOT_CONFIGURED');
  }
  return drizzle(pool, { schema });
};

// Backwards-compatible lazy export for queries.ts
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop) {
    const instance = getDb();
    const val = (instance as unknown as Record<PropertyKey, unknown>)[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  }
});
