import { KronosRepository } from '../db/repository.js';
import { getBranch, getRank } from '../config/branches.js';

export class PersonnelServiceError extends Error {
  constructor(message, code = 'PERSONNEL_ERROR') {
    super(message);
    this.name = 'PersonnelServiceError';
    this.code = code;
  }
}

export class PersonnelService {
  constructor(repository) {
    this.repository = repository;
  }

  async inTransaction(work) {
    const client = await this.repository.pool.connect();
    const transactionRepository = new KronosRepository(client);
    try {
      await client.query('BEGIN');
      const result = await work(transactionRepository);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async enlist({ guildId, member, rankCode, unit, specialty, actorId }) {
    return this.inTransaction(async (repository) => {
      const config = await repository.ensureGuildConfig(guildId);
      const branch = getBranch(config.branch);
      const selectedRank = getRank(branch.id, rankCode) ?? branch.ranks[0];

      const existing = await repository.getPersonnel(guildId, member.id);
      const personnel = await repository.upsertPersonnel({
        guildId,
        discordUserId: member.id,
        discordUsername: member.user?.username ?? member.username ?? member.id,
        branch: branch.id,
        rank: selectedRank,
        unit,
        specialty,
        status: existing?.status === 'discharged' ? 'active' : (existing?.status ?? 'active'),
        actorId
      });

      await repository.addServiceRecord({
        guildId,
        discordUserId: member.id,
        type: 'enlistment',
        title: existing ? 'Personnel record updated' : 'Entered service',
        details: `Assigned ${selectedRank.name}${unit ? `, ${unit}` : ''}.`,
        metadata: { rankCode: selectedRank.code, unit: unit || null, specialty: specialty || null },
        actorId
      });

      await repository.addAudit({
        guildId,
        actorId,
        action: existing ? 'personnel.updated' : 'personnel.enlisted',
        targetType: 'discord_user',
        targetId: member.id,
        details: { rank: selectedRank.code, unit: unit || null }
      });

      return personnel;
    });
  }

  async changeRank({ guildId, discordUserId, rankCode, reason, actorId }) {
    return this.inTransaction(async (repository) => {
      const config = await repository.getGuildConfig(guildId);
      if (!config) throw new PersonnelServiceError('Run `/kronos setup` first.', 'NOT_CONFIGURED');

      const current = await repository.getPersonnel(guildId, discordUserId);
      if (!current) {
        throw new PersonnelServiceError('That member does not have a personnel record.', 'NOT_ENLISTED');
      }

      const branch = getBranch(config.branch);
      const next = getRank(branch.id, rankCode);
      if (!next) throw new PersonnelServiceError('That rank is not valid for this branch.', 'INVALID_RANK');

      const previous = getRank(current.branch, current.rank_code);
      const type = previous && next.order < previous.order ? 'demotion' : 'promotion';
      const updated = await repository.updatePersonnelRank(guildId, discordUserId, branch.id, next);

      await repository.addServiceRecord({
        guildId,
        discordUserId,
        type,
        title: `${type === 'promotion' ? 'Promoted' : 'Reassigned'} to ${next.name}`,
        details: reason || null,
        metadata: {
          from: current.rank_code,
          to: next.code,
          fromPaygrade: current.rank_paygrade,
          toPaygrade: next.paygrade
        },
        actorId
      });

      await repository.addAudit({
        guildId,
        actorId,
        action: `personnel.${type}`,
        targetType: 'discord_user',
        targetId: discordUserId,
        details: { from: current.rank_code, to: next.code, reason: reason || null }
      });

      return { personnel: updated, previous, next, type };
    });
  }

  async changeStatus({ guildId, discordUserId, status, reason, actorId }) {
    const allowed = new Set(['active', 'reserve', 'loa', 'retired', 'discharged']);
    if (!allowed.has(status)) {
      throw new PersonnelServiceError('Invalid personnel status.', 'INVALID_STATUS');
    }

    return this.inTransaction(async (repository) => {
      const current = await repository.getPersonnel(guildId, discordUserId);
      if (!current) {
        throw new PersonnelServiceError('That member does not have a personnel record.', 'NOT_ENLISTED');
      }

      const updated = await repository.updatePersonnelStatus(guildId, discordUserId, status);
      await repository.addServiceRecord({
        guildId,
        discordUserId,
        type: status === 'discharged' ? 'discharge' : 'status_change',
        title: `Status changed to ${status}`,
        details: reason || null,
        metadata: { from: current.status, to: status },
        actorId
      });
      await repository.addAudit({
        guildId,
        actorId,
        action: 'personnel.status_changed',
        targetType: 'discord_user',
        targetId: discordUserId,
        details: { from: current.status, to: status, reason: reason || null }
      });
      return updated;
    });
  }

  async addRecord({ guildId, discordUserId, type, title, details, actorId }) {
    const permitted = new Set(['training', 'award', 'discipline', 'note']);
    if (!permitted.has(type)) {
      throw new PersonnelServiceError('Invalid service record type.', 'INVALID_RECORD_TYPE');
    }
    const personnel = await this.repository.getPersonnel(guildId, discordUserId);
    if (!personnel) {
      throw new PersonnelServiceError('That member does not have a personnel record.', 'NOT_ENLISTED');
    }
    const record = await this.repository.addServiceRecord({
      guildId,
      discordUserId,
      type,
      title,
      details,
      actorId
    });
    await this.repository.addAudit({
      guildId,
      actorId,
      action: 'service_record.created',
      targetType: 'discord_user',
      targetId: discordUserId,
      details: { type, title }
    });
    return record;
  }

  async decideLoa({ guildId, requestId, status, reason, actorId }) {
    if (!['approved', 'denied'].includes(status)) {
      throw new PersonnelServiceError('LOA decisions must be approved or denied.', 'INVALID_LOA_DECISION');
    }

    return this.inTransaction(async (repository) => {
      const request = await repository.decideLoa(guildId, requestId, status, actorId, reason);
      if (!request) {
        throw new PersonnelServiceError('That pending LOA request was not found.', 'LOA_NOT_FOUND');
      }

      if (status === 'approved') {
        const personnel = await repository.getPersonnel(guildId, request.discord_user_id);
        if (personnel) {
          await repository.updatePersonnelStatus(guildId, request.discord_user_id, 'loa');
          await repository.addServiceRecord({
            guildId,
            discordUserId: request.discord_user_id,
            type: 'status_change',
            title: 'Leave of absence approved',
            details: `${request.starts_on} through ${request.ends_on}`,
            metadata: { loaRequestId: request.id },
            actorId
          });
        }
      }

      await repository.addAudit({
        guildId,
        actorId,
        action: `loa.${status}`,
        targetType: 'loa_request',
        targetId: String(request.id),
        details: { member: request.discord_user_id, reason: reason || null }
      });
      return request;
    });
  }
}

