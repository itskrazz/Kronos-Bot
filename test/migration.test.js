import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('initial PostgreSQL migration creates the full Kronos schema', async () => {
  const database = new PGlite();
  const sql = await fs.readFile(new URL('../src/db/migrations/001_initial.sql', import.meta.url), 'utf8');
  await database.exec(sql);

  const tablesResult = await database.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  const tables = tablesResult.rows.map((row) => row.table_name);
  for (const expected of [
    'audit_logs',
    'guild_configs',
    'loa_requests',
    'personnel',
    'rank_binds',
    'roblox_links',
    'service_records',
    'user_sessions',
    'verification_challenges'
  ]) {
    assert.ok(tables.includes(expected), `missing table: ${expected}`);
  }

  await database.query(
    `INSERT INTO guild_configs (guild_id, branch, organization_name)
     VALUES ($1, $2, $3)`,
    ['123456789012345678', 'army', 'Test Army']
  );

  await assert.rejects(
    () => database.query(
      `INSERT INTO guild_configs (guild_id, branch, organization_name)
       VALUES ($1, $2, $3)`,
      ['223456789012345678', 'invalid_branch', 'Invalid']
    ),
    /violates check constraint/i
  );

  await database.close();
});

