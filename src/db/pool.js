import pg from 'pg';

const { Pool } = pg;

export function createPool(env, logger) {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
    max: env.NODE_ENV === 'production' ? 15 : 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000
  });

  pool.on('error', (error) => {
    logger.error({ err: error }, 'Unexpected PostgreSQL pool error');
  });

  return pool;
}

