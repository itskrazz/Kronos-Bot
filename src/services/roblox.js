import crypto from 'node:crypto';

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

export class RobloxServiceError extends Error {
  constructor(message, code = 'ROBLOX_ERROR') {
    super(message);
    this.name = 'RobloxServiceError';
    this.code = code;
  }
}

async function defaultFetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Kronos-Military-Management/1.0',
      ...options.headers
    },
    signal: options.signal ?? AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    throw new RobloxServiceError(
      `Roblox returned HTTP ${response.status}. Try again in a moment.`,
      `ROBLOX_HTTP_${response.status}`
    );
  }

  return response.json();
}

export class RobloxService {
  constructor({ fetchJson = defaultFetchJson } = {}) {
    this.fetchJson = fetchJson;
  }

  createChallengeCode() {
    return `KRN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  async resolveUsername(username) {
    const normalized = String(username).trim();
    if (!USERNAME_PATTERN.test(normalized)) {
      throw new RobloxServiceError(
        'Enter a valid Roblox username (3–20 letters, numbers, or underscores).',
        'INVALID_USERNAME'
      );
    }

    const result = await this.fetchJson('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      body: JSON.stringify({ usernames: [normalized], excludeBannedUsers: true })
    });

    const user = result.data?.[0];
    if (!user) {
      throw new RobloxServiceError('That Roblox username was not found.', 'USER_NOT_FOUND');
    }

    return {
      id: Number(user.id),
      username: user.name,
      displayName: user.displayName
    };
  }

  async getUserProfile(userId) {
    const user = await this.fetchJson(`https://users.roblox.com/v1/users/${Number(userId)}`);
    return {
      id: Number(user.id),
      username: user.name,
      displayName: user.displayName,
      description: user.description ?? '',
      isBanned: Boolean(user.isBanned)
    };
  }

  async verifyProfileChallenge(userId, challengeCode) {
    const profile = await this.getUserProfile(userId);
    const verified = profile.description
      .toUpperCase()
      .includes(String(challengeCode).toUpperCase());
    return { verified, profile };
  }

  async getGroupMembership(userId, groupId) {
    const result = await this.fetchJson(
      `https://groups.roblox.com/v1/users/${Number(userId)}/groups/roles`
    );
    const targetId = Number(groupId);
    return result.data?.find((membership) => Number(membership.group?.id) === targetId) ?? null;
  }
}

