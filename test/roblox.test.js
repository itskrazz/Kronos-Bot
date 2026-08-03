import test from 'node:test';
import assert from 'node:assert/strict';
import { RobloxService, RobloxServiceError } from '../src/services/roblox.js';

test('resolves a Roblox username with the official user lookup shape', async () => {
  let captured;
  const service = new RobloxService({
    fetchJson: async (url, options) => {
      captured = { url, body: JSON.parse(options.body) };
      return { data: [{ id: 123, name: 'Arctic', displayName: 'Arctic Display' }] };
    }
  });
  const user = await service.resolveUsername('Arctic');
  assert.equal(user.id, 123);
  assert.equal(user.username, 'Arctic');
  assert.equal(captured.url, 'https://users.roblox.com/v1/usernames/users');
  assert.deepEqual(captured.body.usernames, ['Arctic']);
});

test('rejects malformed or missing Roblox usernames', async () => {
  const service = new RobloxService({ fetchJson: async () => ({ data: [] }) });
  await assert.rejects(() => service.resolveUsername('x!'), RobloxServiceError);
  await assert.rejects(() => service.resolveUsername('Valid_Name'), /not found/i);
});

test('verifies profile challenge without case sensitivity', async () => {
  const service = new RobloxService({
    fetchJson: async () => ({ id: 123, name: 'Arctic', displayName: 'Arctic', description: 'processing krn-a1b2c3d4 now' })
  });
  const result = await service.verifyProfileChallenge(123, 'KRN-A1B2C3D4');
  assert.equal(result.verified, true);
});

test('finds the configured membership from current Roblox group-role response', async () => {
  const service = new RobloxService({
    fetchJson: async () => ({
      data: [
        { group: { id: 100, name: 'Other' }, role: { rank: 1, name: 'Member' } },
        { group: { id: 200, name: 'Army' }, role: { rank: 42, name: 'Sergeant' } }
      ]
    })
  });
  const membership = await service.getGroupMembership(123, 200);
  assert.equal(membership.role.rank, 42);
  assert.equal(await service.getGroupMembership(123, 999), null);
});

test('challenge codes are prefixed, uppercase, and unpredictable-length safe', () => {
  const service = new RobloxService();
  const first = service.createChallengeCode();
  const second = service.createChallengeCode();
  assert.match(first, /^KRN-[A-F0-9]{8}$/);
  assert.notEqual(first, second);
});

