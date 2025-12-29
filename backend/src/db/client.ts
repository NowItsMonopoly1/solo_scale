import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

export const db = new Pool({
  connectionString: config.database.url,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

db.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

// Type-safe query parameter types to prevent SQL injection
type QueryParam = string | number | boolean | null | Date | Buffer;

// Helper function to execute queries with type-safe parameters
export async function query(text: string, params?: QueryParam[]) {
  // Validate parameters are safe types
  if (params) {
    for (const param of params) {
      if (
        param !== null &&
        typeof param !== 'string' &&
        typeof param !== 'number' &&
        typeof param !== 'boolean' &&
        !(param instanceof Date) &&
        !(param instanceof Buffer)
      ) {
        throw new Error(
          `Invalid query parameter type: ${typeof param}. ` +
          `Only string, number, boolean, null, Date, and Buffer are allowed.`
        );
      }
    }
  }

  const start = Date.now();
  const res = await db.query(text, params);
  const duration = Date.now() - start;

  if (duration > 1000) {
    console.warn('Slow query detected:', { text, duration, rows: res.rowCount });
  }

  return res;
}

// Transaction helper
export async function transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
