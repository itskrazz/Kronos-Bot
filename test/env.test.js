import test from 'node:test';
import assert from 'node:assert/strict';
import { loadEnv } from '../src/config/env.js';

const valid = {
  NODE_ENV: 'development',
  PORT: '3000',
  PUBLIC_BASE_URL: 'http://localhost:3000/',
  DATABASE_URL: 'postgresql://localhost/kronos',
  DATABASE_SSL: 'false',
  DISCORD_TOKEN: 'token',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'secret',
  SESSION_SECRET: 'a'.repeat(32),
  LOG_LEVEL: 'info'
};

test('normalizes environment configuration', () => {
  const env = loadEnv(valid);
  assert.equal(env.PORT, 3000);
  assert.equal(env.DATABASE_SSL, false);
  assert.equal(env.PUBLIC_BASE_URL, 'http://localhost:3000');
  assert.equal(env.DISCORD_GUILD_ID, null);
});

test('requires HTTPS for production dashboard URLs', () => {
  assert.throws(() => loadEnv({ ...valid, NODE_ENV: 'production' }), /HTTPS/i);
});

test('requires a strong session secret', () => {
  assert.throws(() => loadEnv({ ...valid, SESSION_SECRET: 'short' }), /SESSION_SECRET/);
});

