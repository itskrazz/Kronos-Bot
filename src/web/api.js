import crypto from 'node:crypto';
import { Router } from 'express';
import { canManageGuild } from './middleware.js';

function safeKeyMatch(received, expected) {
  if (!received || !expected || received.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export function createApiRouter({ env, client, repository }) {
  const router = Router();

  router.use('/guilds/:guildId', (request, response, next) => {
    const key = request.get('x-kronos-key');
    if (safeKeyMatch(key, env.INTERNAL_API_KEY)) return next();

    const guildId = request.params.guildId;
    const guild = request.session?.guilds?.find((candidate) => candidate.id === guildId);
    if (request.session?.user && guild && canManageGuild(guild)) return next();
    return response.status(401).json({ error: 'unauthorized' });
  });

  router.get('/guilds/:guildId/summary', async (request, response, next) => {
    try {
      if (!client.guilds.cache.has(request.params.guildId)) {
        return response.status(404).json({ error: 'guild_not_available' });
      }
      const config = await repository.getGuildConfig(request.params.guildId);
      if (!config) return response.status(404).json({ error: 'not_configured' });
      const stats = await repository.getDashboardStats(request.params.guildId);
      return response.json({ config, stats });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/guilds/:guildId/personnel', async (request, response, next) => {
    try {
      if (!client.guilds.cache.has(request.params.guildId)) {
        return response.status(404).json({ error: 'guild_not_available' });
      }
      const personnel = await repository.listPersonnel(request.params.guildId, {
        search: request.query.search ?? '',
        status: request.query.status ?? '',
        limit: request.query.limit ?? 100
      });
      return response.json({ personnel });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/guilds/:guildId/personnel/:discordUserId', async (request, response, next) => {
    try {
      const record = await repository.getPersonnel(request.params.guildId, request.params.discordUserId);
      if (!record) return response.status(404).json({ error: 'personnel_not_found' });
      const serviceRecords = await repository.listServiceRecords(
        request.params.guildId,
        request.params.discordUserId,
        100
      );
      return response.json({ personnel: record, serviceRecords });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
