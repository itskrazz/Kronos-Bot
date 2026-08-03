import crypto from 'node:crypto';
import { getBranch } from '../config/branches.js';

const ADMINISTRATOR = 0x8n;
const MANAGE_GUILD = 0x20n;

export function canManageGuild(guild) {
  try {
    const permissions = BigInt(guild.permissions ?? '0');
    return guild.owner === true || (permissions & (ADMINISTRATOR | MANAGE_GUILD)) !== 0n;
  } catch {
    return false;
  }
}

export function requireAuth(request, response, next) {
  if (request.session?.user) return next();
  request.session.returnTo = request.originalUrl;
  return response.redirect('/auth/discord');
}

export function createGuildAccessMiddleware({ client, repository }) {
  return async function requireGuildAccess(request, response, next) {
    try {
      const guildId = request.params.guildId;
      const oauthGuild = request.session.guilds?.find((candidate) => candidate.id === guildId);
      if (!oauthGuild || !canManageGuild(oauthGuild)) {
        return response.status(403).render('error', {
          title: 'Access denied',
          message: 'You need Manage Server in that Discord server.'
        });
      }

      const discordGuild = client.guilds.cache.get(guildId);
      if (!discordGuild) {
        return response.status(409).render('error', {
          title: 'Bot not installed',
          message: 'Install the Kronos bot in this server, then reload the dashboard.'
        });
      }

      const config = await repository.ensureGuildConfig(guildId, discordGuild.name);
      response.locals.guild = discordGuild;
      response.locals.oauthGuild = oauthGuild;
      response.locals.config = config;
      response.locals.branch = getBranch(config.branch);
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export function csrfProtection(request, response, next) {
  if (!request.session.csrfToken) {
    request.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  response.locals.csrfToken = request.session.csrfToken;

  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const submitted = request.body?._csrf || request.get('x-csrf-token');
    const expected = request.session.csrfToken;
    const valid = typeof submitted === 'string'
      && submitted.length === expected.length
      && crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(expected));
    if (!valid) {
      return response.status(403).render('error', {
        title: 'Request expired',
        message: 'Reload this page and submit the form again.'
      });
    }
  }

  return next();
}

export function flashMiddleware(request, response, next) {
  response.locals.flash = request.session.flash ?? null;
  delete request.session.flash;
  response.locals.user = request.session.user ?? null;
  response.locals.currentPath = request.path;
  next();
}

export function setFlash(request, type, message) {
  request.session.flash = { type, message };
}

