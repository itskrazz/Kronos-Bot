export class KronosRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async ensureGuildConfig(guildId, organizationName = 'United States Army') {
    const { rows } = await this.pool.query(
      `INSERT INTO guild_configs (guild_id, organization_name)
       VALUES ($1, $2)
       ON CONFLICT (guild_id) DO UPDATE SET guild_id = EXCLUDED.guild_id
       RETURNING *`,
      [guildId, organizationName]
    );
    return rows[0];
  }

  async getGuildConfig(guildId) {
    const { rows } = await this.pool.query(
      'SELECT * FROM guild_configs WHERE guild_id = $1',
      [guildId]
    );
    return rows[0] ?? null;
  }

  async updateGuildConfig(guildId, config) {
    const { rows } = await this.pool.query(
      `UPDATE guild_configs
       SET branch = $2,
           organization_name = $3,
           staff_role_ids = $4::jsonb,
           verified_role_id = $5,
           log_channel_id = $6,
           nickname_format = $7,
           roblox_enabled = $8,
           roblox_group_id = $9,
           roblox_min_rank = $10,
           roblox_auto_sync = $11
       WHERE guild_id = $1
       RETURNING *`,
      [
        guildId,
        config.branch,
        config.organizationName,
        JSON.stringify(config.staffRoleIds ?? []),
        config.verifiedRoleId || null,
        config.logChannelId || null,
        config.nicknameFormat,
        Boolean(config.robloxEnabled),
        config.robloxGroupId || null,
        config.robloxMinRank ?? 1,
        Boolean(config.robloxAutoSync)
      ]
    );
    return rows[0] ?? null;
  }

  async getDashboardStats(guildId) {
    const { rows } = await this.pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'loa')::int AS on_loa,
         COUNT(*) FILTER (WHERE status = 'reserve')::int AS reserve,
         COUNT(*) FILTER (WHERE status = 'discharged')::int AS discharged,
         COUNT(*) FILTER (WHERE roblox_group_rank IS NOT NULL)::int AS roblox_verified
       FROM personnel
       WHERE guild_id = $1`,
      [guildId]
    );
    return rows[0];
  }

  async listPersonnel(guildId, { search = '', status = '', limit = 100, offset = 0 } = {}) {
    const values = [guildId];
    const clauses = ['p.guild_id = $1'];

    if (search) {
      values.push(`%${search}%`);
      clauses.push(`(
        p.discord_username ILIKE $${values.length}
        OR COALESCE(rl.roblox_username, '') ILIKE $${values.length}
        OR COALESCE(p.unit, '') ILIKE $${values.length}
        OR COALESCE(p.specialty, '') ILIKE $${values.length}
      )`);
    }

    if (status) {
      values.push(status);
      clauses.push(`p.status = $${values.length}`);
    }

    values.push(Math.min(Math.max(Number(limit) || 100, 1), 250));
    const limitIndex = values.length;
    values.push(Math.max(Number(offset) || 0, 0));
    const offsetIndex = values.length;

    const { rows } = await this.pool.query(
      `SELECT p.*, rl.roblox_user_id, rl.roblox_username, rl.verified_at AS roblox_verified_at
       FROM personnel p
       LEFT JOIN roblox_links rl ON rl.discord_user_id = p.discord_user_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY p.status = 'discharged', p.rank_paygrade DESC, p.discord_username ASC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      values
    );
    return rows;
  }

  async getPersonnel(guildId, discordUserId) {
    const { rows } = await this.pool.query(
      `SELECT p.*, rl.roblox_user_id, rl.roblox_username, rl.verified_at AS roblox_verified_at
       FROM personnel p
       LEFT JOIN roblox_links rl ON rl.discord_user_id = p.discord_user_id
       WHERE p.guild_id = $1 AND p.discord_user_id = $2`,
      [guildId, discordUserId]
    );
    return rows[0] ?? null;
  }

  async upsertPersonnel({
    guildId,
    discordUserId,
    discordUsername,
    branch,
    rank,
    unit,
    specialty,
    status = 'active',
    actorId
  }) {
    const { rows } = await this.pool.query(
      `INSERT INTO personnel (
         guild_id, discord_user_id, discord_username, branch, rank_code,
         rank_name, rank_paygrade, unit, specialty, status, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (guild_id, discord_user_id) DO UPDATE SET
         discord_username = EXCLUDED.discord_username,
         branch = EXCLUDED.branch,
         rank_code = EXCLUDED.rank_code,
         rank_name = EXCLUDED.rank_name,
         rank_paygrade = EXCLUDED.rank_paygrade,
         unit = EXCLUDED.unit,
         specialty = EXCLUDED.specialty,
         status = EXCLUDED.status
       RETURNING *`,
      [
        guildId,
        discordUserId,
        discordUsername,
        branch,
        rank.code,
        rank.name,
        rank.paygrade,
        unit || null,
        specialty || null,
        status,
        actorId || null
      ]
    );
    return rows[0];
  }

  async updatePersonnelRank(guildId, discordUserId, branch, rank) {
    const { rows } = await this.pool.query(
      `UPDATE personnel
       SET branch = $3, rank_code = $4, rank_name = $5, rank_paygrade = $6
       WHERE guild_id = $1 AND discord_user_id = $2
       RETURNING *`,
      [guildId, discordUserId, branch, rank.code, rank.name, rank.paygrade]
    );
    return rows[0] ?? null;
  }

  async updatePersonnelStatus(guildId, discordUserId, status) {
    const { rows } = await this.pool.query(
      `UPDATE personnel SET status = $3
       WHERE guild_id = $1 AND discord_user_id = $2
       RETURNING *`,
      [guildId, discordUserId, status]
    );
    return rows[0] ?? null;
  }

  async updateRobloxSnapshot(guildId, discordUserId, membership) {
    const { rows } = await this.pool.query(
      `UPDATE personnel
       SET roblox_group_rank = $3, roblox_group_role = $4
       WHERE guild_id = $1 AND discord_user_id = $2
       RETURNING *`,
      [guildId, discordUserId, membership?.role?.rank ?? null, membership?.role?.name ?? null]
    );
    return rows[0] ?? null;
  }

  async addServiceRecord({ guildId, discordUserId, type, title, details, metadata = {}, actorId }) {
    const { rows } = await this.pool.query(
      `INSERT INTO service_records (
         guild_id, discord_user_id, record_type, title, details, metadata, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
       RETURNING *`,
      [guildId, discordUserId, type, title, details || null, JSON.stringify(metadata), actorId || null]
    );
    return rows[0];
  }

  async listServiceRecords(guildId, discordUserId, limit = 50) {
    const { rows } = await this.pool.query(
      `SELECT * FROM service_records
       WHERE guild_id = $1 AND discord_user_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [guildId, discordUserId, Math.min(Math.max(Number(limit) || 50, 1), 200)]
    );
    return rows;
  }

  async saveRobloxLink(discordUserId, robloxUserId, robloxUsername) {
    const { rows } = await this.pool.query(
      `INSERT INTO roblox_links (discord_user_id, roblox_user_id, roblox_username)
       VALUES ($1, $2, $3)
       ON CONFLICT (discord_user_id) DO UPDATE SET
         roblox_user_id = EXCLUDED.roblox_user_id,
         roblox_username = EXCLUDED.roblox_username,
         verified_at = NOW()
       RETURNING *`,
      [discordUserId, robloxUserId, robloxUsername]
    );
    return rows[0];
  }

  async getRobloxLink(discordUserId) {
    const { rows } = await this.pool.query(
      'SELECT * FROM roblox_links WHERE discord_user_id = $1',
      [discordUserId]
    );
    return rows[0] ?? null;
  }

  async getRobloxLinkByUserId(robloxUserId) {
    const { rows } = await this.pool.query(
      'SELECT * FROM roblox_links WHERE roblox_user_id = $1',
      [robloxUserId]
    );
    return rows[0] ?? null;
  }

  async saveVerificationChallenge({ guildId, discordUserId, robloxUserId, robloxUsername, code, expiresAt }) {
    const { rows } = await this.pool.query(
      `INSERT INTO verification_challenges (
         guild_id, discord_user_id, roblox_user_id, roblox_username, challenge_code, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (guild_id, discord_user_id) DO UPDATE SET
         roblox_user_id = EXCLUDED.roblox_user_id,
         roblox_username = EXCLUDED.roblox_username,
         challenge_code = EXCLUDED.challenge_code,
         attempts = 0,
         expires_at = EXCLUDED.expires_at,
         created_at = NOW()
       RETURNING *`,
      [guildId, discordUserId, robloxUserId, robloxUsername, code, expiresAt]
    );
    return rows[0];
  }

  async getVerificationChallenge(guildId, discordUserId) {
    const { rows } = await this.pool.query(
      `SELECT * FROM verification_challenges
       WHERE guild_id = $1 AND discord_user_id = $2`,
      [guildId, discordUserId]
    );
    return rows[0] ?? null;
  }

  async incrementVerificationAttempt(guildId, discordUserId) {
    await this.pool.query(
      `UPDATE verification_challenges SET attempts = attempts + 1
       WHERE guild_id = $1 AND discord_user_id = $2`,
      [guildId, discordUserId]
    );
  }

  async deleteVerificationChallenge(guildId, discordUserId) {
    await this.pool.query(
      'DELETE FROM verification_challenges WHERE guild_id = $1 AND discord_user_id = $2',
      [guildId, discordUserId]
    );
  }

  async listRankBinds(guildId) {
    const { rows } = await this.pool.query(
      `SELECT * FROM rank_binds WHERE guild_id = $1
       ORDER BY roblox_group_rank ASC`,
      [guildId]
    );
    return rows;
  }

  async getRankBind(guildId, groupRank) {
    const { rows } = await this.pool.query(
      `SELECT * FROM rank_binds
       WHERE guild_id = $1 AND roblox_group_rank = $2`,
      [guildId, groupRank]
    );
    return rows[0] ?? null;
  }

  async upsertRankBind({ guildId, groupRank, branchRankCode, discordRoleId, actorId }) {
    const { rows } = await this.pool.query(
      `INSERT INTO rank_binds (
         guild_id, roblox_group_rank, branch_rank_code, discord_role_id, created_by
       ) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (guild_id, roblox_group_rank) DO UPDATE SET
         branch_rank_code = EXCLUDED.branch_rank_code,
         discord_role_id = EXCLUDED.discord_role_id,
         created_by = EXCLUDED.created_by
       RETURNING *`,
      [guildId, groupRank, branchRankCode, discordRoleId || null, actorId || null]
    );
    return rows[0];
  }

  async removeRankBind(guildId, groupRank) {
    const { rowCount } = await this.pool.query(
      'DELETE FROM rank_binds WHERE guild_id = $1 AND roblox_group_rank = $2',
      [guildId, groupRank]
    );
    return rowCount > 0;
  }

  async createLoa({ guildId, discordUserId, startsOn, endsOn, reason }) {
    const { rows } = await this.pool.query(
      `INSERT INTO loa_requests (guild_id, discord_user_id, starts_on, ends_on, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [guildId, discordUserId, startsOn, endsOn, reason]
    );
    return rows[0];
  }

  async getLoa(guildId, id) {
    const { rows } = await this.pool.query(
      'SELECT * FROM loa_requests WHERE guild_id = $1 AND id = $2',
      [guildId, id]
    );
    return rows[0] ?? null;
  }

  async listLoas(guildId, { status = '', discordUserId = '', limit = 100 } = {}) {
    const values = [guildId];
    const clauses = ['guild_id = $1'];
    if (status) {
      values.push(status);
      clauses.push(`status = $${values.length}`);
    }
    if (discordUserId) {
      values.push(discordUserId);
      clauses.push(`discord_user_id = $${values.length}`);
    }
    values.push(Math.min(Math.max(Number(limit) || 100, 1), 250));
    const { rows } = await this.pool.query(
      `SELECT * FROM loa_requests
       WHERE ${clauses.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${values.length}`,
      values
    );
    return rows;
  }

  async decideLoa(guildId, id, status, actorId, decisionReason = '') {
    const { rows } = await this.pool.query(
      `UPDATE loa_requests
       SET status = $3, decided_by = $4, decision_reason = $5, decided_at = NOW()
       WHERE guild_id = $1 AND id = $2 AND status = 'pending'
       RETURNING *`,
      [guildId, id, status, actorId, decisionReason || null]
    );
    return rows[0] ?? null;
  }

  async addAudit({ guildId, actorId, action, targetType, targetId, details = {} }) {
    const { rows } = await this.pool.query(
      `INSERT INTO audit_logs (
         guild_id, actor_discord_id, action, target_type, target_id, details
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING *`,
      [guildId, actorId || null, action, targetType || null, targetId || null, JSON.stringify(details)]
    );
    return rows[0];
  }

  async listAudit(guildId, limit = 100) {
    const { rows } = await this.pool.query(
      `SELECT * FROM audit_logs WHERE guild_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [guildId, Math.min(Math.max(Number(limit) || 100, 1), 250)]
    );
    return rows;
  }
}
