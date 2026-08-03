import http from 'node:http';
import pino from 'pino';
import { loadEnv } from './config/env.js';
import { createPool } from './db/pool.js';
import { runMigrations } from './db/migrate.js';
import { KronosRepository } from './db/repository.js';
import { RobloxService } from './services/roblox.js';
import { PersonnelService } from './services/personnel.js';
import { DiscordSyncService } from './services/discord-sync.js';
import { createDiscordClient } from './bot/client.js';
import { createInteractionHandler } from './bot/handlers.js';
import { createWebApp } from './web/app.js';

const env = loadEnv();
const logger = pino({ level: env.LOG_LEVEL });
const pool = createPool(env, logger);
const repository = new KronosRepository(pool);
const roblox = new RobloxService();
const personnel = new PersonnelService(repository);
const client = createDiscordClient();
const sync = new DiscordSyncService({ repository, roblox, logger });

await runMigrations(pool, logger);

client.on('interactionCreate', createInteractionHandler({
  repository,
  personnel,
  roblox,
  sync,
  logger
}));

client.once('ready', () => {
  logger.info({ bot: client.user.tag, guilds: client.guilds.cache.size }, 'Discord bot ready');
});

client.on('guildCreate', async (guild) => {
  await repository.ensureGuildConfig(guild.id, guild.name);
  logger.info({ guildId: guild.id, guildName: guild.name }, 'Kronos installed in guild');
});

client.on('guildMemberAdd', async (member) => {
  try {
    const config = await repository.getGuildConfig(member.guild.id);
    const link = await repository.getRobloxLink(member.id);
    if (config?.roblox_enabled && config.roblox_auto_sync && link) {
      await sync.syncMember(member, { reason: 'member join' });
    }
  } catch (error) {
    logger.warn({ err: error, guildId: member.guild.id, userId: member.id }, 'Automatic member sync failed');
  }
});

const app = createWebApp({ env, pool, client, repository, personnel, logger });
const server = http.createServer(app);

await Promise.all([
  client.login(env.DISCORD_TOKEN),
  new Promise((resolve) => server.listen(env.PORT, resolve))
]);

logger.info({ port: env.PORT, url: env.PUBLIC_BASE_URL }, 'Kronos web service ready');

async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down Kronos');
  server.close();
  client.destroy();
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

