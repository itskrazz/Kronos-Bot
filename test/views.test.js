import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import { BRANCHES } from '../src/config/branches.js';

const views = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/web/views');
const guild = { id: '123456789012345678', name: 'Test Command' };
const config = {
  guild_id: guild.id,
  branch: 'army',
  organization_name: 'United States Army',
  staff_role_ids: ['223456789012345678'],
  verified_role_id: '323456789012345678',
  log_channel_id: '423456789012345678',
  nickname_format: '[{rank}] {roblox}',
  roblox_enabled: true,
  roblox_group_id: '1234567',
  roblox_min_rank: 1,
  roblox_auto_sync: true
};
const record = {
  discord_user_id: '523456789012345678',
  discord_username: 'Arctic',
  branch: 'army',
  rank_code: 'SGT',
  rank_name: 'Sergeant',
  rank_paygrade: 'E-5',
  unit: '1st Infantry Division',
  specialty: '11B',
  status: 'active',
  joined_at: new Date(),
  updated_at: new Date(),
  roblox_username: 'ArcticRBLX',
  roblox_group_role: 'Sergeant',
  roblox_group_rank: 42
};
const history = [{
  id: 1,
  record_type: 'promotion',
  title: 'Promoted to Sergeant',
  details: 'Meritorious service',
  created_at: new Date(),
  created_by: '623456789012345678'
}];
const audit = [{
  action: 'personnel.promotion',
  actor_discord_id: '623456789012345678',
  target_type: 'discord_user',
  target_id: record.discord_user_id,
  details: { to: 'SGT' },
  created_at: new Date()
}];

const base = {
  title: 'Test',
  year: 2026,
  branch: BRANCHES.army,
  branches: Object.values(BRANCHES),
  user: { username: 'Commander', globalName: 'Commander' },
  guild,
  config,
  currentPath: `/dashboard/${guild.id}`,
  csrfToken: 'csrf',
  flash: null,
  botInviteUrl: 'https://discord.com/oauth2/authorize',
  formatDate: () => 'Aug 2, 2026',
  formatDateTime: () => 'Aug 2, 2026, 8:00 PM'
};

const pages = [
  ['landing.ejs', { authenticated: true }],
  ['guilds.ejs', { guilds: [{ ...guild, installed: true, config, branch: BRANCHES.army }] }],
  ['dashboard.ejs', { stats: { total: 1, active: 1, on_loa: 0, roblox_verified: 1 }, roster: [record], loas: [], audit }],
  ['roster.ejs', { roster: [record], search: '', status: '' }],
  ['personnel.ejs', { record, history, personnelBranch: BRANCHES.army }],
  ['loas.ejs', { loas: [{ id: 1, discord_user_id: record.discord_user_id, starts_on: new Date(), ends_on: new Date(), reason: 'Travel', status: 'pending', created_at: new Date() }], names: { [record.discord_user_id]: record.discord_username } }],
  ['audit.ejs', { audit }],
  ['settings.ejs', {
    roles: [{ id: '223456789012345678', name: 'Headquarters' }, { id: '323456789012345678', name: 'Verified' }],
    channels: [{ id: '423456789012345678', name: 'kronos-logs' }],
    binds: [{ roblox_group_rank: 42, branch_rank_code: 'SGT', discord_role_id: '223456789012345678' }]
  }],
  ['error.ejs', { message: 'Test error message' }]
];

for (const [file, locals] of pages) {
  test(`renders ${file} with complete fixture data`, async () => {
    const html = await ejs.renderFile(path.join(views, file), { ...base, ...locals });
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /Kronos/i);
    assert.doesNotMatch(html, /ReferenceError|SyntaxError/);
  });
}

