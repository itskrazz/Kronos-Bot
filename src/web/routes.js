import { Router } from 'express';
import { BRANCHES, getBranch, getRank } from '../config/branches.js';
import {
  canManageGuild,
  createGuildAccessMiddleware,
  requireAuth,
  setFlash
} from './middleware.js';

const SNOWFLAKE = /^\d{16,22}$/;

function inputError(message) {
  const error = new Error(message);
  error.status = 400;
  error.expose = true;
  return error;
}

function arrayValue(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function nullableSnowflake(value, fieldName) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  if (!SNOWFLAKE.test(normalized)) throw inputError(`${fieldName} must be a valid Discord ID.`);
  return normalized;
}

export function createWebRouter({ client, repository, personnel }) {
  const router = Router();
  const guildAccess = createGuildAccessMiddleware({ client, repository });

  router.get('/', (request, response) => {
    response.render('landing', {
      title: 'Kronos Military Management',
      branches: Object.values(BRANCHES),
      authenticated: Boolean(request.session.user)
    });
  });

  router.get('/dashboard', requireAuth, async (request, response, next) => {
    try {
      const manageable = (request.session.guilds ?? []).filter(canManageGuild);
      const guilds = await Promise.all(manageable.map(async (oauthGuild) => {
        const installedGuild = client.guilds.cache.get(oauthGuild.id) ?? null;
        const config = installedGuild ? await repository.getGuildConfig(oauthGuild.id) : null;
        return {
          ...oauthGuild,
          installed: Boolean(installedGuild),
          config,
          branch: config ? getBranch(config.branch) : null
        };
      }));
      response.render('guilds', { title: 'Select a Command', guilds });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', requireAuth, (request, response, next) => {
    request.session.destroy((error) => {
      if (error) return next(error);
      response.clearCookie('kronos.sid');
      response.redirect('/');
    });
  });

  router.get('/dashboard/:guildId', requireAuth, guildAccess, async (request, response, next) => {
    try {
      const [stats, roster, loas, audit] = await Promise.all([
        repository.getDashboardStats(request.params.guildId),
        repository.listPersonnel(request.params.guildId, { limit: 8 }),
        repository.listLoas(request.params.guildId, { status: 'pending', limit: 5 }),
        repository.listAudit(request.params.guildId, 8)
      ]);
      response.render('dashboard', {
        title: `${response.locals.config.organization_name} • Dashboard`,
        stats,
        roster,
        loas,
        audit
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/dashboard/:guildId/roster', requireAuth, guildAccess, async (request, response, next) => {
    try {
      const roster = await repository.listPersonnel(request.params.guildId, {
        search: String(request.query.search ?? '').slice(0, 100),
        status: String(request.query.status ?? '').slice(0, 20),
        limit: 250
      });
      response.render('roster', {
        title: 'Personnel Roster',
        roster,
        search: request.query.search ?? '',
        status: request.query.status ?? ''
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/dashboard/:guildId/roster', requireAuth, guildAccess, async (request, response, next) => {
    try {
      const discordUserId = nullableSnowflake(request.body.discord_user_id, 'Discord user ID');
      if (!discordUserId) throw inputError('Discord user ID is required.');
      const member = await response.locals.guild.members.fetch(discordUserId);
      await personnel.enlist({
        guildId: request.params.guildId,
        member,
        rankCode: request.body.rank_code,
        unit: String(request.body.unit ?? '').slice(0, 100),
        specialty: String(request.body.specialty ?? '').slice(0, 100),
        actorId: request.session.user.id
      });
      setFlash(request, 'success', `${member.user.username} was added to the personnel roster.`);
      response.redirect(`/dashboard/${request.params.guildId}/personnel/${discordUserId}`);
    } catch (error) {
      next(error);
    }
  });

  router.get('/dashboard/:guildId/personnel/:discordUserId', requireAuth, guildAccess, async (request, response, next) => {
    try {
      const record = await repository.getPersonnel(request.params.guildId, request.params.discordUserId);
      if (!record) {
        return response.status(404).render('error', {
          title: 'Personnel not found',
          message: 'No personnel record exists for that Discord user.'
        });
      }
      const history = await repository.listServiceRecords(request.params.guildId, request.params.discordUserId, 100);
      response.render('personnel', {
        title: `${record.rank_code} ${record.discord_username}`,
        record,
        history,
        personnelBranch: getBranch(record.branch)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/dashboard/:guildId/personnel/:discordUserId/rank', requireAuth, guildAccess, async (request, response, next) => {
    try {
      const result = await personnel.changeRank({
        guildId: request.params.guildId,
        discordUserId: request.params.discordUserId,
        rankCode: request.body.rank_code,
        reason: String(request.body.reason ?? '').slice(0, 500),
        actorId: request.session.user.id
      });
      setFlash(request, 'success', `Rank updated to ${result.next.name} (${result.next.paygrade}).`);
      response.redirect(`/dashboard/${request.params.guildId}/personnel/${request.params.discordUserId}`);
    } catch (error) {
      next(error);
    }
  });

  router.post('/dashboard/:guildId/personnel/:discordUserId/status', requireAuth, guildAccess, async (request, response, next) => {
    try {
      const record = await personnel.changeStatus({
        guildId: request.params.guildId,
        discordUserId: request.params.discordUserId,
        status: request.body.status,
        reason: String(request.body.reason ?? '').slice(0, 500),
        actorId: request.session.user.id
      });
      setFlash(request, 'success', `Duty status updated to ${record.status.toUpperCase()}.`);
      response.redirect(`/dashboard/${request.params.guildId}/personnel/${request.params.discordUserId}`);
    } catch (error) {
      next(error);
    }
  });

  router.post('/dashboard/:guildId/personnel/:discordUserId/service', requireAuth, guildAccess, async (request, response, next) => {
    try {
      await personnel.addRecord({
        guildId: request.params.guildId,
        discordUserId: request.params.discordUserId,
        type: request.body.type,
        title: String(request.body.title ?? '').slice(0, 100),
        details: String(request.body.details ?? '').slice(0, 1000),
        actorId: request.session.user.id
      });
      setFlash(request, 'success', 'Service-history entry added.');
      response.redirect(`/dashboard/${request.params.guildId}/personnel/${request.params.discordUserId}`);
    } catch (error) {
      next(error);
    }
  });

  router.get('/dashboard/:guildId/loas', requireAuth, guildAccess, async (request, response, next) => {
    try {
      const loas = await repository.listLoas(request.params.guildId, { limit: 250 });
      const personnelRecords = await repository.listPersonnel(request.params.guildId, { limit: 250 });
      const names = Object.fromEntries(personnelRecords.map((item) => [item.discord_user_id, item.discord_username]));
      response.render('loas', { title: 'Leave Management', loas, names });
    } catch (error) {
      next(error);
    }
  });

  router.post('/dashboard/:guildId/loas/:requestId', requireAuth, guildAccess, async (request, response, next) => {
    try {
      await personnel.decideLoa({
        guildId: request.params.guildId,
        requestId: Number(request.params.requestId),
        status: request.body.decision,
        reason: String(request.body.reason ?? '').slice(0, 500),
        actorId: request.session.user.id
      });
      setFlash(request, 'success', `LOA request #${request.params.requestId} was ${request.body.decision}.`);
      response.redirect(`/dashboard/${request.params.guildId}/loas`);
    } catch (error) {
      next(error);
    }
  });

  router.get('/dashboard/:guildId/settings', requireAuth, guildAccess, async (request, response, next) => {
    try {
      const guild = response.locals.guild;
      const binds = await repository.listRankBinds(request.params.guildId);
      const roles = [...guild.roles.cache.values()]
        .filter((role) => role.id !== guild.id && !role.managed)
        .sort((a, b) => b.position - a.position);
      const channels = [...guild.channels.cache.values()]
        .filter((channel) => channel.isTextBased() && !channel.isThread())
        .sort((a, b) => a.rawPosition - b.rawPosition);
      response.render('settings', {
        title: 'System Configuration',
        branches: Object.values(BRANCHES),
        roles,
        channels,
        binds
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/dashboard/:guildId/settings', requireAuth, guildAccess, async (request, response, next) => {
    try {
      const branchId = String(request.body.branch ?? '');
      if (!BRANCHES[branchId]) throw inputError('Select a valid military branch.');
      const organizationName = String(request.body.organization_name ?? '').trim().slice(0, 100);
      if (!organizationName) throw inputError('Organization name is required.');
      const groupId = String(request.body.roblox_group_id ?? '').trim();
      if (groupId && !/^\d{1,20}$/.test(groupId)) throw inputError('Roblox group ID must contain numbers only.');
      const staffRoleIds = arrayValue(request.body.staff_role_ids)
        .map((value) => nullableSnowflake(value, 'Staff role'))
        .filter(Boolean);
      const robloxEnabled = request.body.roblox_enabled === 'on';
      if (robloxEnabled && !groupId) throw inputError('A Roblox group ID is required when verification is enabled.');

      const updated = await repository.updateGuildConfig(request.params.guildId, {
        branch: branchId,
        organizationName,
        staffRoleIds,
        verifiedRoleId: nullableSnowflake(request.body.verified_role_id, 'Verified role'),
        logChannelId: nullableSnowflake(request.body.log_channel_id, 'Log channel'),
        nicknameFormat: String(request.body.nickname_format || '[{rank}] {roblox}').slice(0, 64),
        robloxEnabled,
        robloxGroupId: groupId || null,
        robloxMinRank: Math.min(Math.max(Number(request.body.roblox_min_rank) || 0, 0), 255),
        robloxAutoSync: request.body.roblox_auto_sync === 'on'
      });
      await repository.addAudit({
        guildId: request.params.guildId,
        actorId: request.session.user.id,
        action: 'configuration.updated',
        targetType: 'guild',
        targetId: request.params.guildId,
        details: { branch: updated.branch, robloxEnabled: updated.roblox_enabled }
      });
      setFlash(request, 'success', 'Kronos configuration saved.');
      response.redirect(`/dashboard/${request.params.guildId}/settings`);
    } catch (error) {
      next(error);
    }
  });

  router.post('/dashboard/:guildId/binds', requireAuth, guildAccess, async (request, response, next) => {
    try {
      const groupRank = Number(request.body.roblox_group_rank);
      if (!Number.isInteger(groupRank) || groupRank < 0 || groupRank > 255) {
        throw inputError('Roblox group rank must be between 0 and 255.');
      }
      const config = response.locals.config;
      const rank = getRank(config.branch, request.body.branch_rank_code);
      if (!rank) throw inputError('Select a valid rank for the current branch.');
      await repository.upsertRankBind({
        guildId: request.params.guildId,
        groupRank,
        branchRankCode: rank.code,
        discordRoleId: nullableSnowflake(request.body.discord_role_id, 'Discord role'),
        actorId: request.session.user.id
      });
      await repository.addAudit({
        guildId: request.params.guildId,
        actorId: request.session.user.id,
        action: 'rank_bind.updated',
        targetType: 'roblox_group_rank',
        targetId: String(groupRank),
        details: { rankCode: rank.code }
      });
      setFlash(request, 'success', `Roblox rank ${groupRank} now maps to ${rank.code}.`);
      response.redirect(`/dashboard/${request.params.guildId}/settings#rank-binds`);
    } catch (error) {
      next(error);
    }
  });

  router.post('/dashboard/:guildId/binds/:groupRank/delete', requireAuth, guildAccess, async (request, response, next) => {
    try {
      await repository.removeRankBind(request.params.guildId, Number(request.params.groupRank));
      setFlash(request, 'success', `Rank bind ${request.params.groupRank} removed.`);
      response.redirect(`/dashboard/${request.params.guildId}/settings#rank-binds`);
    } catch (error) {
      next(error);
    }
  });

  router.get('/dashboard/:guildId/audit', requireAuth, guildAccess, async (request, response, next) => {
    try {
      const audit = await repository.listAudit(request.params.guildId, 250);
      response.render('audit', { title: 'Audit Log', audit });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
