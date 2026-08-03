import test from 'node:test';
import assert from 'node:assert/strict';
import pino from 'pino';
import request from 'supertest';
import { createWebApp } from '../src/web/app.js';

function fakePool() {
  return {
    query(...args) {
      const callback = typeof args.at(-1) === 'function' ? args.at(-1) : null;
      const result = { rows: [{ '?column?': 1 }] };
      if (callback) return callback(null, result);
      return Promise.resolve(result);
    }
  };
}

const guildId = '123456789012345678';
const env = {
  NODE_ENV: 'test',
  PUBLIC_BASE_URL: 'http://localhost:3000',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'secret',
  SESSION_SECRET: 's'.repeat(32),
  INTERNAL_API_KEY: 'k'.repeat(32)
};
const client = {
  isReady: () => true,
  guilds: { cache: new Map([[guildId, { id: guildId, name: 'Test Command' }]]) }
};
const repository = {
  getGuildConfig: async () => ({ guild_id: guildId, branch: 'army' }),
  getDashboardStats: async () => ({ total: 1, active: 1 }),
  listPersonnel: async () => [{ discord_user_id: '223456789012345678' }],
  getPersonnel: async () => null,
  listServiceRecords: async () => []
};
const app = createWebApp({
  env,
  pool: fakePool(),
  client,
  repository,
  personnel: {},
  logger: pino({ level: 'silent' })
});

test('health check confirms database and Discord readiness', async () => {
  const response = await request(app).get('/healthz').expect(200);
  assert.deepEqual(response.body, { status: 'ok', botReady: true });
});

test('read-only API rejects missing credentials', async () => {
  await request(app).get(`/api/v1/guilds/${guildId}/summary`).expect(401);
});

test('read-only API accepts the configured internal key', async () => {
  const response = await request(app)
    .get(`/api/v1/guilds/${guildId}/summary`)
    .set('x-kronos-key', env.INTERNAL_API_KEY)
    .expect(200);
  assert.equal(response.body.config.branch, 'army');
  assert.equal(response.body.stats.total, 1);
});

