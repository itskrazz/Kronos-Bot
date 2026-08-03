import {
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { getBranch, getRank, searchRanks } from '../config/branches.js';

function mentionOrNone(id, type = 'role') {
  if (!id) return 'Not configured';
  return type === 'channel' ? `<#${id}>` : `<@&${id}>`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}

async function replyError(interaction, message) {
  const payload = { content: `⚠️ ${message}`, ephemeral: true };
  if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
  return interaction.reply(payload);
}

export function createInteractionHandler({ repository, personnel, roblox, sync, logger }) {
  async function hasStaffAccess(interaction, config = null) {
    if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return true;
    const guildConfig = config ?? await repository.getGuildConfig(interaction.guildId);
    const allowedRoles = Array.isArray(guildConfig?.staff_role_ids) ? guildConfig.staff_role_ids : [];
    return allowedRoles.some((roleId) => interaction.member?.roles?.cache?.has(roleId));
  }

  async function requireStaff(interaction, config = null) {
    if (await hasStaffAccess(interaction, config)) return true;
    await replyError(interaction, 'You need Manage Server or a configured Kronos staff role to do that.');
    return false;
  }

  async function requireConfigured(interaction) {
    const config = await repository.getGuildConfig(interaction.guildId);
    if (!config) {
      await replyError(interaction, 'Kronos is not configured here. A server manager must run `/kronos setup`.');
      return null;
    }
    return config;
  }

  async function handleAutocomplete(interaction) {
    if (!['personnel', 'bind'].includes(interaction.commandName)) return interaction.respond([]);
    const config = await repository.getGuildConfig(interaction.guildId);
    const focused = interaction.options.getFocused(true);
    if (focused.name !== 'rank') return interaction.respond([]);

    const results = searchRanks(config?.branch ?? 'army', focused.value).map((candidate) => ({
      name: `${candidate.paygrade} • ${candidate.code} — ${candidate.name}`.slice(0, 100),
      value: candidate.code
    }));
    return interaction.respond(results);
  }

  async function handleKronos(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'setup') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return replyError(interaction, 'Only members with Manage Server can configure Kronos.');
      }

      await interaction.deferReply({ ephemeral: true });
      const existing = await repository.ensureGuildConfig(interaction.guildId, interaction.guild.name);
      const branchId = interaction.options.getString('branch', true);
      const branch = getBranch(branchId);
      const organizationOption = interaction.options.getString('organization');
      const groupIdOption = interaction.options.getString('group_id');
      const robloxEnabledOption = interaction.options.getBoolean('roblox_enabled');
      const staffRole = interaction.options.getRole('staff_role');
      const verifiedRole = interaction.options.getRole('verified_role');
      const logChannel = interaction.options.getChannel('log_channel');
      const groupId = groupIdOption ?? (existing.roblox_group_id ? String(existing.roblox_group_id) : '');
      const robloxEnabled = robloxEnabledOption ?? existing.roblox_enabled;

      if (groupId && !/^\d{1,20}$/.test(groupId)) {
        return interaction.editReply('⚠️ The Roblox group ID must contain numbers only.');
      }
      if (robloxEnabled && !groupId) {
        return interaction.editReply('⚠️ Add a Roblox group ID when Roblox verification is enabled.');
      }

      const config = await repository.updateGuildConfig(interaction.guildId, {
        branch: branch.id,
        organizationName: organizationOption
          ?? (existing.branch === branch.id ? existing.organization_name : branch.name),
        staffRoleIds: staffRole ? [staffRole.id] : existing.staff_role_ids,
        verifiedRoleId: verifiedRole?.id ?? existing.verified_role_id,
        logChannelId: logChannel?.id ?? existing.log_channel_id,
        nicknameFormat: interaction.options.getString('nickname_format') ?? existing.nickname_format,
        robloxEnabled,
        robloxGroupId: groupId || null,
        robloxMinRank: interaction.options.getInteger('min_group_rank') ?? existing.roblox_min_rank,
        robloxAutoSync: interaction.options.getBoolean('auto_sync') ?? existing.roblox_auto_sync
      });

      await repository.addAudit({
        guildId: interaction.guildId,
        actorId: interaction.user.id,
        action: 'configuration.updated',
        targetType: 'guild',
        targetId: interaction.guildId,
        details: { branch: branch.id, robloxEnabled: config.roblox_enabled }
      });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(branch.color)
            .setTitle('Kronos configured')
            .setDescription(`**${config.organization_name}** is using the ${branch.name} rank structure.`)
            .addFields(
              { name: 'Roblox verification', value: config.roblox_enabled ? `Enabled • Group ${config.roblox_group_id}` : 'Disabled', inline: true },
              { name: 'Minimum group rank', value: String(config.roblox_min_rank), inline: true },
              { name: 'Staff role', value: mentionOrNone(config.staff_role_ids?.[0]), inline: true },
              { name: 'Verified role', value: mentionOrNone(config.verified_role_id), inline: true },
              { name: 'Log channel', value: mentionOrNone(config.log_channel_id, 'channel'), inline: true },
              { name: 'Nickname format', value: `\`${config.nickname_format}\``, inline: true }
            )
        ]
      });
    }

    const config = await requireConfigured(interaction);
    if (!config) return;
    const stats = await repository.getDashboardStats(interaction.guildId);
    const branch = getBranch(config.branch);
    return interaction.reply({
      ephemeral: true,
      embeds: [
        new EmbedBuilder()
          .setColor(branch.color)
          .setTitle(`${config.organization_name} • Kronos Status`)
          .setDescription(`${branch.name} personnel management is online.`)
          .addFields(
            { name: 'Total personnel', value: String(stats.total), inline: true },
            { name: 'Active', value: String(stats.active), inline: true },
            { name: 'On LOA', value: String(stats.on_loa), inline: true },
            { name: 'Roblox verified', value: String(stats.roblox_verified), inline: true },
            { name: 'Roblox integration', value: config.roblox_enabled ? `Group ${config.roblox_group_id}` : 'Optional / disabled', inline: true },
            { name: 'Dashboard', value: 'Use the configured web URL to manage the full roster.', inline: true }
          )
      ]
    });
  }

  async function handleVerify(interaction) {
    const config = await requireConfigured(interaction);
    if (!config) return;
    if (!config.roblox_enabled) return replyError(interaction, 'Roblox verification is disabled in this server.');
    if (!config.roblox_group_id) return replyError(interaction, 'This server has not configured a Roblox group ID.');

    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    if (subcommand === 'start') {
      const resolved = await roblox.resolveUsername(interaction.options.getString('username', true));
      const claimed = await repository.getRobloxLinkByUserId(resolved.id);
      if (claimed && claimed.discord_user_id !== interaction.user.id) {
        return interaction.editReply('⚠️ That Roblox account is already linked to another Discord account.');
      }

      const code = roblox.createChallengeCode();
      const expiresAt = new Date(Date.now() + 10 * 60_000);
      await repository.saveVerificationChallenge({
        guildId: interaction.guildId,
        discordUserId: interaction.user.id,
        robloxUserId: resolved.id,
        robloxUsername: resolved.username,
        code,
        expiresAt
      });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(getBranch(config.branch).color)
            .setTitle('Roblox verification started')
            .setDescription(
              `Open **${resolved.username}** on Roblox and place the code below anywhere in the profile **About** section.\n\n` +
              `\`${code}\`\n\nThen return here and run \`/verify confirm\` within 10 minutes.`
            )
            .setFooter({ text: 'You may remove the code after verification succeeds.' })
        ]
      });
    }

    if (subcommand === 'confirm') {
      const challenge = await repository.getVerificationChallenge(interaction.guildId, interaction.user.id);
      if (!challenge) return interaction.editReply('⚠️ Start with `/verify start` first.');
      if (new Date(challenge.expires_at).valueOf() < Date.now()) {
        await repository.deleteVerificationChallenge(interaction.guildId, interaction.user.id);
        return interaction.editReply('⚠️ That challenge expired. Run `/verify start` again.');
      }
      if (challenge.attempts >= 5) {
        await repository.deleteVerificationChallenge(interaction.guildId, interaction.user.id);
        return interaction.editReply('⚠️ Too many attempts. Run `/verify start` for a new code.');
      }

      const result = await roblox.verifyProfileChallenge(challenge.roblox_user_id, challenge.challenge_code);
      if (!result.verified) {
        await repository.incrementVerificationAttempt(interaction.guildId, interaction.user.id);
        return interaction.editReply(
          `⚠️ I could not find \`${challenge.challenge_code}\` in **${challenge.roblox_username}**’s About section yet. Save the profile and try again.`
        );
      }

      const membership = await roblox.getGroupMembership(challenge.roblox_user_id, config.roblox_group_id);
      if (!membership || Number(membership.role?.rank ?? 0) < config.roblox_min_rank) {
        return interaction.editReply(
          `⚠️ **${challenge.roblox_username}** must be in Roblox group ${config.roblox_group_id} at rank ${config.roblox_min_rank} or higher.`
        );
      }

      const claimed = await repository.getRobloxLinkByUserId(challenge.roblox_user_id);
      if (claimed && claimed.discord_user_id !== interaction.user.id) {
        return interaction.editReply('⚠️ That Roblox account was linked to another Discord account while this challenge was active.');
      }

      await repository.saveRobloxLink(
        interaction.user.id,
        challenge.roblox_user_id,
        challenge.roblox_username
      );
      await repository.deleteVerificationChallenge(interaction.guildId, interaction.user.id);

      let syncNote = 'Roles, nickname, and personnel record synchronized.';
      try {
        await sync.syncMember(interaction.member, { actorId: interaction.user.id, reason: 'verification' });
      } catch (error) {
        logger.warn({ err: error, guildId: interaction.guildId, userId: interaction.user.id }, 'Post-verification sync failed');
        syncNote = 'Account linked, but Discord roles or nickname could not be synchronized. Ask staff to run `/sync` after checking bot permissions.';
      }

      const personnelRecord = await repository.getPersonnel(interaction.guildId, interaction.user.id);
      if (personnelRecord) {
        await repository.addServiceRecord({
          guildId: interaction.guildId,
          discordUserId: interaction.user.id,
          type: 'verification',
          title: 'Roblox identity verified',
          details: `${challenge.roblox_username} • ${membership.role.name}`,
          metadata: { robloxUserId: challenge.roblox_user_id, groupRank: membership.role.rank },
          actorId: interaction.user.id
        });
      }

      return interaction.editReply(
        `✅ Verified as **${challenge.roblox_username}** — ${membership.role.name} (${membership.role.rank}). ${syncNote}`
      );
    }

    const link = await repository.getRobloxLink(interaction.user.id);
    if (!link) return interaction.editReply('You do not have a verified Roblox account. Use `/verify start`.');
    const membership = await roblox.getGroupMembership(link.roblox_user_id, config.roblox_group_id);
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(getBranch(config.branch).color)
          .setTitle('Verification status')
          .addFields(
            { name: 'Roblox account', value: link.roblox_username, inline: true },
            { name: 'Verified', value: formatDate(link.verified_at), inline: true },
            { name: 'Group membership', value: membership ? `${membership.role.name} (${membership.role.rank})` : 'Not in group', inline: false }
          )
      ]
    });
  }

  async function handlePersonnel(interaction) {
    const config = await requireConfigured(interaction);
    if (!config) return;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'profile') {
      const user = interaction.options.getUser('member') ?? interaction.user;
      const record = await repository.getPersonnel(interaction.guildId, user.id);
      if (!record) return replyError(interaction, 'No personnel record exists for that member.');
      const history = await repository.listServiceRecords(interaction.guildId, user.id, 5);
      const branch = getBranch(record.branch);
      return interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setColor(branch.color)
            .setTitle(`${record.rank_code} ${record.discord_username}`)
            .setDescription(`${record.rank_name} • ${record.rank_paygrade}`)
            .addFields(
              { name: 'Branch', value: branch.name, inline: true },
              { name: 'Status', value: record.status.toUpperCase(), inline: true },
              { name: 'Unit', value: record.unit || 'Unassigned', inline: true },
              { name: 'Specialty', value: record.specialty || 'Unassigned', inline: true },
              { name: 'Roblox', value: record.roblox_username || 'Not verified', inline: true },
              { name: 'Group role', value: record.roblox_group_role || 'Not synchronized', inline: true },
              {
                name: 'Recent service history',
                value: history.length
                  ? history.map((item) => `• **${item.title}** — ${formatDate(item.created_at)}`).join('\n').slice(0, 1024)
                  : 'No entries yet.'
              }
            )
        ]
      });
    }

    if (!(await requireStaff(interaction, config))) return;
    await interaction.deferReply({ ephemeral: true });
    const user = interaction.options.getUser('member', true);
    const member = await interaction.guild.members.fetch(user.id);

    if (subcommand === 'enlist') {
      const record = await personnel.enlist({
        guildId: interaction.guildId,
        member,
        rankCode: interaction.options.getString('rank', true),
        unit: interaction.options.getString('unit'),
        specialty: interaction.options.getString('specialty'),
        actorId: interaction.user.id
      });
      return interaction.editReply(`✅ **${user.username}** is recorded as **${record.rank_name} (${record.rank_paygrade})**.`);
    }

    if (subcommand === 'rank') {
      const result = await personnel.changeRank({
        guildId: interaction.guildId,
        discordUserId: user.id,
        rankCode: interaction.options.getString('rank', true),
        reason: interaction.options.getString('reason'),
        actorId: interaction.user.id
      });
      return interaction.editReply(
        `✅ **${user.username}** was ${result.type === 'promotion' ? 'promoted/reassigned' : 'demoted/reassigned'} to **${result.next.name} (${result.next.paygrade})**.`
      );
    }

    const record = await personnel.changeStatus({
      guildId: interaction.guildId,
      discordUserId: user.id,
      status: interaction.options.getString('status', true),
      reason: interaction.options.getString('reason'),
      actorId: interaction.user.id
    });
    return interaction.editReply(`✅ **${user.username}** now has status **${record.status.toUpperCase()}**.`);
  }

  async function handleService(interaction) {
    const config = await requireConfigured(interaction);
    if (!config) return;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'history') {
      const user = interaction.options.getUser('member') ?? interaction.user;
      if (user.id !== interaction.user.id && !(await requireStaff(interaction, config))) return;
      const records = await repository.listServiceRecords(interaction.guildId, user.id, 15);
      return interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setColor(getBranch(config.branch).color)
            .setTitle(`${user.username} • Service History`)
            .setDescription(
              records.length
                ? records.map((record) => `**${record.title}**\n${record.details || record.record_type} • ${formatDate(record.created_at)}`).join('\n\n').slice(0, 4000)
                : 'No service records found.'
            )
        ]
      });
    }

    if (!(await requireStaff(interaction, config))) return;
    const user = interaction.options.getUser('member', true);
    const record = await personnel.addRecord({
      guildId: interaction.guildId,
      discordUserId: user.id,
      type: interaction.options.getString('type', true),
      title: interaction.options.getString('title', true),
      details: interaction.options.getString('details'),
      actorId: interaction.user.id
    });
    return interaction.reply({ content: `✅ Added **${record.title}** to ${user.username}’s service history.`, ephemeral: true });
  }

  async function handleLoa(interaction) {
    const config = await requireConfigured(interaction);
    if (!config) return;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'request') {
      const personnelRecord = await repository.getPersonnel(interaction.guildId, interaction.user.id);
      if (!personnelRecord) return replyError(interaction, 'You need a personnel record before requesting LOA.');
      const starts = interaction.options.getString('starts', true);
      const ends = interaction.options.getString('ends', true);
      if (!isIsoDate(starts) || !isIsoDate(ends)) return replyError(interaction, 'Dates must use YYYY-MM-DD.');
      const startDate = new Date(`${starts}T00:00:00Z`);
      const endDate = new Date(`${ends}T00:00:00Z`);
      const duration = (endDate - startDate) / 86_400_000;
      if (duration < 0 || duration > 365) return replyError(interaction, 'The end date must be after the start date and within one year.');

      const request = await repository.createLoa({
        guildId: interaction.guildId,
        discordUserId: interaction.user.id,
        startsOn: starts,
        endsOn: ends,
        reason: interaction.options.getString('reason', true)
      });
      await repository.addAudit({
        guildId: interaction.guildId,
        actorId: interaction.user.id,
        action: 'loa.requested',
        targetType: 'loa_request',
        targetId: String(request.id),
        details: { starts, ends }
      });
      return interaction.reply({ content: `✅ LOA request **#${request.id}** was submitted for ${starts} through ${ends}.`, ephemeral: true });
    }

    if (subcommand === 'status') {
      const requests = await repository.listLoas(interaction.guildId, { discordUserId: interaction.user.id, limit: 10 });
      return interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setColor(getBranch(config.branch).color)
            .setTitle('Your LOA Requests')
            .setDescription(
              requests.length
                ? requests.map((request) => `**#${request.id} • ${request.status.toUpperCase()}**\n${request.starts_on} → ${request.ends_on}\n${request.reason}`).join('\n\n').slice(0, 4000)
                : 'No LOA requests found.'
            )
        ]
      });
    }

    if (!(await requireStaff(interaction, config))) return;
    const request = await personnel.decideLoa({
      guildId: interaction.guildId,
      requestId: interaction.options.getInteger('request_id', true),
      status: interaction.options.getString('decision', true),
      reason: interaction.options.getString('reason'),
      actorId: interaction.user.id
    });
    return interaction.reply({ content: `✅ LOA request **#${request.id}** was **${request.status}**.`, ephemeral: true });
  }

  async function handleSync(interaction) {
    const config = await requireConfigured(interaction);
    if (!config) return;
    const user = interaction.options.getUser('member') ?? interaction.user;
    if (user.id !== interaction.user.id && !(await requireStaff(interaction, config))) return;
    await interaction.deferReply({ ephemeral: true });
    const member = await interaction.guild.members.fetch(user.id);
    const result = await sync.syncMember(member, { actorId: interaction.user.id, reason: 'slash command' });
    return interaction.editReply(
      `✅ Synchronized **${result.link.roblox_username}** as **${result.personnel.rank_name}** from Roblox role **${result.membership.role.name}**.`
    );
  }

  async function handleBind(interaction) {
    const config = await requireConfigured(interaction);
    if (!config) return;
    if (!(await requireStaff(interaction, config))) return;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'list') {
      const binds = await repository.listRankBinds(interaction.guildId);
      return interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setColor(getBranch(config.branch).color)
            .setTitle('Roblox Rank Binds')
            .setDescription(
              binds.length
                ? binds.map((bind) => `**${bind.roblox_group_rank}** → \`${bind.branch_rank_code}\`${bind.discord_role_id ? ` → <@&${bind.discord_role_id}>` : ''}`).join('\n')
                : 'No rank binds configured.'
            )
        ]
      });
    }

    const groupRank = interaction.options.getInteger('group_rank', true);
    if (subcommand === 'remove') {
      const removed = await repository.removeRankBind(interaction.guildId, groupRank);
      return interaction.reply({ content: removed ? `✅ Removed bind for Roblox rank ${groupRank}.` : '⚠️ No bind exists for that rank.', ephemeral: true });
    }

    const rank = getRank(config.branch, interaction.options.getString('rank', true));
    if (!rank) return replyError(interaction, 'That rank is not valid for this server’s selected branch.');
    const role = interaction.options.getRole('discord_role');
    const bind = await repository.upsertRankBind({
      guildId: interaction.guildId,
      groupRank,
      branchRankCode: rank.code,
      discordRoleId: role?.id,
      actorId: interaction.user.id
    });
    await repository.addAudit({
      guildId: interaction.guildId,
      actorId: interaction.user.id,
      action: 'rank_bind.updated',
      targetType: 'roblox_group_rank',
      targetId: String(groupRank),
      details: { rankCode: rank.code, discordRoleId: role?.id ?? null }
    });
    return interaction.reply({
      content: `✅ Roblox group rank **${bind.roblox_group_rank}** now maps to **${rank.name} (${rank.paygrade})**${role ? ` and ${role}` : ''}.`,
      ephemeral: true
    });
  }

  return async function onInteraction(interaction) {
    try {
      if (interaction.isAutocomplete()) return await handleAutocomplete(interaction);
      if (!interaction.isChatInputCommand() || !interaction.inGuild()) return;

      switch (interaction.commandName) {
        case 'kronos': return await handleKronos(interaction);
        case 'verify': return await handleVerify(interaction);
        case 'personnel': return await handlePersonnel(interaction);
        case 'service': return await handleService(interaction);
        case 'loa': return await handleLoa(interaction);
        case 'sync': return await handleSync(interaction);
        case 'bind': return await handleBind(interaction);
        default: return;
      }
    } catch (error) {
      logger.error(
        { err: error, command: interaction.commandName, guildId: interaction.guildId, userId: interaction.user?.id },
        'Discord interaction failed'
      );
      if (interaction.isAutocomplete()) return interaction.respond([]).catch(() => {});
      return replyError(interaction, error.message || 'Kronos could not complete that request.');
    }
  };
}
