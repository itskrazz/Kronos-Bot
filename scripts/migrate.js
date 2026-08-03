import 'dotenv/config';
import pino from 'pino';
import { createPool } from '../src/db/pool.js';
import { runMigrations } from '../src/db/migrate.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_SSL: process.env.DATABASE_SSL === 'true',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info'
};
const logger = pino({ level: env.LOG_LEVEL });
const pool = createPool(env, logger);

try {
  await runMigrations(pool, logger);
  logger.info('Database is up to date');
} finally {
  await pool.end();
}
