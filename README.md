# Kronos Military Management

Kronos is a production-ready Discord bot and web personnel system for U.S. military Roblox communities. It defaults to the United States Army, while each Discord server can select its own branch:

- United States Army
- United States Marine Corps
- United States Navy
- United States Air Force
- United States Space Force
- United States Coast Guard

Roblox verification is optional and never requires a Roblox Studio script, `.ROBLOSECURITY` cookie, or account password. Ownership is proven with a temporary code in the Roblox profile About section, then Kronos checks membership through Roblox's public group API.

## Included systems

- Discord slash-command bot built with Discord.js v14
- Responsive Discord OAuth2 web dashboard
- PostgreSQL personnel roster and immutable audit history
- Branch-aware ranks, paygrades, terminology, colors, and autocomplete
- Enlistment, promotions, demotions, status changes, discharge, units, and specialties
- Training, awards, discipline, administrative notes, and service history
- Leave-of-absence requests and command decisions
- Optional Roblox profile verification and group membership requirement
- Exact Roblox group-rank → Kronos rank → Discord role binds
- Verified role, nickname formatting, member-join sync, and manual sync
- Per-server staff roles plus Discord Manage Server access
- Read-only REST endpoints for integrations
- PostgreSQL sessions, CSRF protection, rate limiting, security headers, input validation, and parameterized SQL
- Render Blueprint, Dockerfile, health check, migrations, tests, and deployment documentation

## Stack

- Node.js 22+
- Discord.js 14
- Express 5 + EJS
- PostgreSQL 14+
- Render-ready deployment

## Quick start on Windows

Install [Node.js 22 LTS](https://nodejs.org/) and PostgreSQL, then open Command Prompt in this folder:

```bat
copy .env.example .env
npm install
```

Open `.env` and add the real values. Then run:

```bat
npm run db:migrate
npm run deploy:commands
npm start
```

The dashboard will be at `http://localhost:3000` unless `PORT` or `PUBLIC_BASE_URL` was changed.

For macOS or Linux, use `cp .env.example .env` instead of `copy`.

## Discord application setup

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and create an application.
2. Open **Bot**, create/reset the token, and enable **Server Members Intent**.
3. Copy the Application ID, bot token, and OAuth2 client secret into `.env`.
4. Under **OAuth2 → Redirects**, add exactly:

   ```text
   https://YOUR-DOMAIN/auth/discord/callback
   ```

   For local testing, also add `http://localhost:3000/auth/discord/callback`.
5. Install the bot with these permissions:
   - View Channels
   - Send Messages
   - Embed Links
   - Read Message History
   - Manage Roles
   - Manage Nicknames
6. In the Discord server, move the Kronos bot role **above** the verified role and every rank-bind role.
7. Run `npm run deploy:commands`. Set `DISCORD_GUILD_ID` while testing for instant guild commands; leave it blank to publish global commands.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DISCORD_TOKEN` | Yes | Discord bot token |
| `DISCORD_CLIENT_ID` | Yes | Discord application ID |
| `DISCORD_CLIENT_SECRET` | Yes | OAuth2 client secret |
| `DISCORD_GUILD_ID` | No | Test guild for instant command deployment |
| `PUBLIC_BASE_URL` | Yes | Public dashboard origin without a trailing slash |
| `PORT` | Yes | HTTP port; Render normally uses `3000` from this project |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DATABASE_SSL` | Yes | Use `true` for Render PostgreSQL |
| `SESSION_SECRET` | Yes | Random string of at least 32 characters |
| `INTERNAL_API_KEY` | No | Random key for read-only API access without a dashboard session |
| `NODE_ENV` | Yes | `development`, `test`, or `production` |
| `LOG_LEVEL` | No | `info` by default |

Generate secure values for `SESSION_SECRET` and `INTERNAL_API_KEY`:

```bat
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Run it twice and use a different result for each variable.

## First-time server setup

After the bot is online and the commands are deployed, a server manager runs:

```text
/kronos setup
```

Choose the branch and configure the optional fields. The full configuration is also available in **Dashboard → Configuration**.

For Army-only use, leave the branch set to **United States Army**. Rank autocomplete then includes the complete enlisted, warrant-officer, and officer library.

## Optional Roblox verification

1. Open **Dashboard → Configuration**.
2. Turn on Roblox verification.
3. Enter the numeric Roblox group/community ID and minimum group rank.
4. Select a Discord verified role.
5. Add rank binds only where automatic Kronos-rank or Discord-role assignment is wanted.
6. A member runs `/verify start username:TheirUsername`.
7. They put the supplied `KRN-XXXXXXXX` code in their Roblox profile About section.
8. They run `/verify confirm`.

Kronos verifies ownership, confirms group membership, creates or updates the personnel record, applies an exact rank bind, assigns manageable roles, and formats the nickname. The code can be removed from the profile afterward.

See [docs/ROBLOX.md](docs/ROBLOX.md) for behavior and troubleshooting.

## Commands

Kronos deploys seven top-level commands:

- `/kronos` — setup and system status
- `/verify` — Roblox identity verification
- `/personnel` — profiles, enlistment, ranks, and duty status
- `/service` — training, awards, discipline, notes, and history
- `/loa` — leave requests and decisions
- `/sync` — manual Roblox/Discord synchronization
- `/bind` — Roblox group-rank bindings

See [docs/COMMANDS.md](docs/COMMANDS.md) for every subcommand and permission rule.

## Render deployment

The included `render.yaml` can create the web service and PostgreSQL database. The short sequence is:

1. Push this folder to a GitHub repository.
2. In Render, choose **New → Blueprint** and select the repository.
3. Fill the secret environment variables requested by Render.
4. Set `PUBLIC_BASE_URL` to the final `https://...onrender.com` URL.
5. Add that URL plus `/auth/discord/callback` to Discord OAuth2 Redirects.
6. Deploy slash commands once.

The Blueprint starts with Render's free database for easy testing. Render currently expires free PostgreSQL databases after 30 days, so upgrade the database before using Kronos as a permanent production roster. See [Render's free-service limits](https://render.com/docs/free).

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the exact Render procedure and checks.

## REST API

The read-only API accepts either an authenticated dashboard session or `x-kronos-key: YOUR_INTERNAL_API_KEY`.

```text
GET /api/v1/guilds/:guildId/summary
GET /api/v1/guilds/:guildId/personnel
GET /api/v1/guilds/:guildId/personnel/:discordUserId
```

Roster query parameters: `search`, `status`, and `limit`.

## Common “Missing Permissions” fix

If verification or `/sync` returns Missing Permissions:

1. Open **Server Settings → Roles**.
2. Drag the Kronos bot role above the verified role and every role used in a rank bind.
3. Give the bot **Manage Roles** and **Manage Nicknames**.
4. The bot cannot edit the server owner, members with an equal/higher top role, or administrator-managed integration roles.
5. Run `/sync` again.

## Validation

```bat
npm run check
npm test
npm audit --omit=dev
```

The test suite validates all branch rank libraries, current Roblox response handling, environment security, the complete PostgreSQL migration, and runtime rendering of every dashboard page.

## Important note

This is community-management software. It is not affiliated with, approved by, or operated by the United States Department of Defense or any U.S. military branch.
