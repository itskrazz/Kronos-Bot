import crypto from 'node:crypto';
import { Router } from 'express';

const DISCORD_API = 'https://discord.com/api/v10';

function saveSession(session) {
  return new Promise((resolve, reject) => {
    session.save((error) => (error ? reject(error) : resolve()));
  });
}

export function createAuthRouter({ env, logger }) {
  const router = Router();
  const redirectUri = `${env.PUBLIC_BASE_URL}/auth/discord/callback`;

  router.get('/discord', (request, response) => {
    const state = crypto.randomBytes(24).toString('hex');
    request.session.oauthState = state;

    const query = new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'identify guilds',
      state,
      prompt: 'none'
    });
    response.redirect(`https://discord.com/oauth2/authorize?${query}`);
  });

  router.get('/discord/callback', async (request, response, next) => {
    try {
      const { code, state, error } = request.query;
      if (error) return response.redirect('/?auth=cancelled');
      if (!code || !state || state !== request.session.oauthState) {
        return response.status(400).render('error', {
          title: 'Invalid login request',
          message: 'The Discord login request expired or could not be verified.'
        });
      }

      delete request.session.oauthState;
      const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.DISCORD_CLIENT_ID,
          client_secret: env.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: String(code),
          redirect_uri: redirectUri
        }),
        signal: AbortSignal.timeout(10_000)
      });

      if (!tokenResponse.ok) throw new Error(`Discord OAuth token exchange failed (${tokenResponse.status})`);
      const token = await tokenResponse.json();
      const headers = { Authorization: `Bearer ${token.access_token}` };
      const [userResponse, guildsResponse] = await Promise.all([
        fetch(`${DISCORD_API}/users/@me`, { headers, signal: AbortSignal.timeout(10_000) }),
        fetch(`${DISCORD_API}/users/@me/guilds`, { headers, signal: AbortSignal.timeout(10_000) })
      ]);

      if (!userResponse.ok || !guildsResponse.ok) throw new Error('Discord profile lookup failed');
      const [user, guilds] = await Promise.all([userResponse.json(), guildsResponse.json()]);

      request.session.regenerate(async (regenerateError) => {
        if (regenerateError) return next(regenerateError);
        try {
          request.session.user = {
            id: user.id,
            username: user.username,
            globalName: user.global_name,
            avatar: user.avatar
          };
          request.session.guilds = guilds;
          request.session.authenticatedAt = Date.now();
          await saveSession(request.session);
          response.redirect('/dashboard');
        } catch (sessionError) {
          next(sessionError);
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Discord OAuth callback failed');
      next(error);
    }
  });

  return router;
}

