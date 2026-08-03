import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { rateLimit } from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { createAuthRouter } from './auth.js';
import { createWebRouter } from './routes.js';
import { createApiRouter } from './api.js';
import { csrfProtection, flashMiddleware } from './middleware.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export function createWebApp({ env, pool, client, repository, personnel, logger }) {
  const app = express();
  const PgSession = connectPgSimple(session);

  app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(currentDirectory, 'views'));
  app.disable('x-powered-by');

  app.use(pinoHttp({ logger }));
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://cdn.discordapp.com'],
        connectSrc: ["'self'"]
      }
    }
  }));
  app.use(rateLimit({
    windowMs: 60_000,
    limit: 180,
    standardHeaders: 'draft-8',
    legacyHeaders: false
  }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static(path.join(currentDirectory, 'public'), {
    maxAge: env.NODE_ENV === 'production' ? '1h' : 0,
    etag: true
  }));
  app.use(session({
    store: new PgSession({ pool, tableName: 'user_sessions', createTableIfMissing: false }),
    name: 'kronos.sid',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  }));

  app.locals.year = new Date().getUTCFullYear();
  app.locals.botInviteUrl = `https://discord.com/oauth2/authorize?client_id=${env.DISCORD_CLIENT_ID}&permissions=402738176&scope=bot%20applications.commands`;
  app.locals.formatDate = (value) => value
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))
    : '—';
  app.locals.formatDateTime = (value) => value
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '—';
  app.locals.guild = null;
  app.locals.config = null;
  app.locals.branch = null;
  app.locals.user = null;
  app.locals.flash = null;
  app.locals.currentPath = '';
  app.locals.csrfToken = '';

  app.get('/healthz', async (_request, response) => {
    try {
      await pool.query('SELECT 1');
      response.json({ status: 'ok', botReady: client.isReady() });
    } catch {
      response.status(503).json({ status: 'degraded', botReady: client.isReady() });
    }
  });

  app.use('/api/v1', createApiRouter({ env, client, repository }));
  app.use('/auth', createAuthRouter({ env, logger }));
  app.use(csrfProtection);
  app.use(flashMiddleware);
  app.use(createWebRouter({ client, repository, personnel }));

  app.use((_request, response) => {
    response.status(404).render('error', {
      title: 'Page not found',
      message: 'The requested Kronos page does not exist.'
    });
  });

  app.use((error, request, response, _next) => {
    request.log?.error({ err: error }, 'Web request failed');
    if (response.headersSent) return;
    const expectedError = error.expose === true
      || ['PersonnelServiceError', 'RobloxServiceError', 'DiscordSyncError'].includes(error.name);
    const safeMessage = env.NODE_ENV === 'production' && !expectedError
      ? 'Kronos could not complete that request. Check the information and try again.'
      : error.message;
    response.status(error.status ?? 500).render('error', {
      title: 'Request failed',
      message: safeMessage
    });
  });

  return app;
}
