import { EmbedBuilder } from 'discord.js';
import { getBranch, getRank } from '../config/branches.js';

export class DiscordSyncError extends Error {
  constructor(message, code = 'SYNC_ERROR') {
    super(message);
    this.name = 'DiscordSyncError';
    this.code = code;
  }
}

export class DiscordSyncService {
  constructor({ repository, roblox, logger }) {
    this.repository = repository;
    this.roblox = roblox;
    this.logger = logger;
  }

  formatNickname(format, { rank, member, robloxUsername, branch }) {
    return String(format || '[{rank}] {roblox}')
      .replaceAll('{rank}', rank?.code ?? 'N/A')
      .replaceAll('{username}', member.user.username)
      .replaceAll('{display}', member.displayName)
      .replaceAll('{roblox}', robloxUsername ?? member.user.username)
      .replaceAll('{branch}', branch.abbreviation)
      .slice(0, 32);
  }

  async syncMember(member, { actorId = null, reason = 'manual' } = {}) {
    const guildId = member.guild.id;
    const config = await this.repository.getGuildConfig(guildId);
    if (!config) throw new DiscordSyncError('Kronos has not been configured in this server.', 'NOT_CONFIGURED');
    if (!config.roblox_enabled) {
      throw new DiscordSyncError('Roblox verification is disabled for this server.', 'ROBLOX_DISABLED');
    }
    if (!config.roblox_group_id) {
      throw new DiscordSyncError('A Roblox group ID has not been configured.', 'GROUP_NOT_CONFIGURED');
    }

    const link = await this.repository.getRobloxLink(member.id);
    if (!link) throw new DiscordSyncError('This member has not verified a Roblox account.', 'NOT_VERIFIED');

    const membership = await this.roblox.getGroupMembership(link.roblox_user_id, config.roblox_group_id);
    if (!membership || Number(membership.role?.rank ?? 0) < config.roblox_min_rank) {
      throw new DiscordSyncError('The verified Roblox account does not meet this group’s membership requirement.', 'GROUP_REQUIREMENT');
    }

    const branch = getBranch(config.branch);
    const bind = await this.repository.getRankBind(guildId, membership.role.rank);
    const boundRank = bind ? getRank(branch.id, bind.branch_rank_code) : null;
    let personnel = await this.repository.getPersonnel(guildId, member.id);
    const previousRank = personnel ? getRank(personnel.branch, personnel.rank_code) : null;

    if (!personnel) {
      personnel = await this.repository.upsertPersonnel({
        guildId,
        discordUserId: member.id,
        discordUsername: member.user.username,
        branch: branch.id,
        rank: boundRank ?? branch.ranks[0],
        status: 'active',
        actorId
      });
    } else if (boundRank && personnel.rank_code !== boundRank.code) {
      personnel = await this.repository.updatePersonnelRank(guildId, member.id, branch.id, boundRank);
      const recordType = previousRank && boundRank.order < previousRank.order ? 'demotion' : 'promotion';
      await this.repository.addServiceRecord({
        guildId,
        discordUserId: member.id,
        type: recordType,
        title: `Roblox sync changed rank to ${boundRank.name}`,
        details: `Mapped from Roblox group role ${membership.role.name} (${membership.role.rank}).`,
        metadata: { from: previousRank?.code ?? null, to: boundRank.code, source: 'roblox_sync' },
        actorId
      });
    }

    await this.repository.updateRobloxSnapshot(guildId, member.id, membership);

    const allBinds = await this.repository.listRankBinds(guildId);
    const allBoundRoleIds = allBinds.map((item) => item.discord_role_id).filter(Boolean);
    const rolesToRemove = allBoundRoleIds.filter(
      (roleId) => roleId !== bind?.discord_role_id && member.roles.cache.has(roleId)
    );

    if (rolesToRemove.length) await member.roles.remove(rolesToRemove, `Kronos sync: ${reason}`);
    if (bind?.discord_role_id && !member.roles.cache.has(bind.discord_role_id)) {
      await member.roles.add(bind.discord_role_id, `Kronos sync: ${reason}`);
    }
    if (config.verified_role_id && !member.roles.cache.has(config.verified_role_id)) {
      await member.roles.add(config.verified_role_id, `Kronos verification: ${reason}`);
    }

    if (member.manageable) {
      const rank = boundRank ?? getRank(branch.id, personnel.rank_code);
      const nickname = this.formatNickname(config.nickname_format, {
        rank,
        member,
        robloxUsername: link.roblox_username,
        branch
      });
      if (member.displayName !== nickname) {
        await member.setNickname(nickname, `Kronos sync: ${reason}`);
      }
    }

    await this.repository.addAudit({
      guildId,
      actorId,
      action: 'member.synced',
      targetType: 'discord_user',
      targetId: member.id,
      details: {
        reason,
        robloxUserId: link.roblox_user_id,
        groupRank: membership.role.rank,
        groupRole: membership.role.name,
        rankCode: boundRank?.code ?? personnel.rank_code
      }
    });

    await this.sendLog(member.guild, config, {
      title: 'Personnel synchronized',
      description: `${member} synchronized as **${link.roblox_username}**.`,
      fields: [
        { name: 'Roblox group role', value: `${membership.role.name} (${membership.role.rank})`, inline: true },
        { name: 'Kronos rank', value: boundRank?.name ?? personnel.rank_name, inline: true }
      ]
    });

    return { link, membership, bind, personnel };
  }

  async sendLog(guild, config, { title, description, fields = [] }) {
    if (!config.log_channel_id) return;
    const channel = guild.channels.cache.get(config.log_channel_id);
    if (!channel?.isTextBased()) return;

    try {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(getBranch(config.branch).color)
            .setTitle(title)
            .setDescription(description)
            .addFields(fields)
            .setTimestamp()
            .setFooter({ text: 'Kronos Personnel Management' })
        ]
      });
    } catch (error) {
      this.logger.warn({ err: error, guildId: guild.id }, 'Could not send Kronos log message');
    }
  }
}
