import {
  ChannelType,
  SlashCommandBuilder
} from 'discord.js';
import { BRANCH_CHOICES } from '../config/branches.js';

const statusChoices = [
  { name: 'Active Duty', value: 'active' },
  { name: 'Reserve', value: 'reserve' },
  { name: 'Leave of Absence', value: 'loa' },
  { name: 'Retired', value: 'retired' },
  { name: 'Discharged', value: 'discharged' }
];

export const commands = [
  new SlashCommandBuilder()
    .setName('kronos')
    .setDescription('Configure or inspect the Kronos system')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setup')
        .setDescription('Configure Kronos for this server')
        .addStringOption((option) =>
          option.setName('branch').setDescription('Military branch').setRequired(true).addChoices(...BRANCH_CHOICES)
        )
        .addStringOption((option) =>
          option.setName('organization').setDescription('Organization or group name').setMaxLength(100)
        )
        .addBooleanOption((option) =>
          option.setName('roblox_enabled').setDescription('Require Roblox profile and group verification')
        )
        .addStringOption((option) =>
          option.setName('group_id').setDescription('Roblox group/community ID').setMaxLength(20)
        )
        .addIntegerOption((option) =>
          option.setName('min_group_rank').setDescription('Minimum Roblox rank number').setMinValue(0).setMaxValue(255)
        )
        .addRoleOption((option) =>
          option.setName('staff_role').setDescription('Role allowed to manage personnel')
        )
        .addRoleOption((option) =>
          option.setName('verified_role').setDescription('Role assigned after Roblox verification')
        )
        .addChannelOption((option) =>
          option
            .setName('log_channel')
            .setDescription('Kronos audit log channel')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addStringOption((option) =>
          option
            .setName('nickname_format')
            .setDescription('Tokens: {rank}, {roblox}, {username}, {display}, {branch}')
            .setMaxLength(64)
        )
        .addBooleanOption((option) =>
          option.setName('auto_sync').setDescription('Synchronize verified members automatically')
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('status').setDescription('Show this server’s Kronos configuration and statistics')
    ),

  new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify your Roblox account')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('start')
        .setDescription('Start Roblox profile verification')
        .addStringOption((option) =>
          option.setName('username').setDescription('Your exact Roblox username').setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('confirm').setDescription('Check your Roblox About section and complete verification')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('status').setDescription('Show your current Roblox verification status')
    ),

  new SlashCommandBuilder()
    .setName('personnel')
    .setDescription('Manage personnel records')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('profile')
        .setDescription('View a service record')
        .addUserOption((option) => option.setName('member').setDescription('Member; defaults to you'))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('enlist')
        .setDescription('Create or update a personnel record')
        .addUserOption((option) => option.setName('member').setDescription('Member to enlist').setRequired(true))
        .addStringOption((option) =>
          option.setName('rank').setDescription('Branch rank code or name').setRequired(true).setAutocomplete(true)
        )
        .addStringOption((option) => option.setName('unit').setDescription('Unit or command').setMaxLength(100))
        .addStringOption((option) =>
          option.setName('specialty').setDescription('MOS, rating, AFSC, or specialty').setMaxLength(100)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('rank')
        .setDescription('Promote, demote, or reassign a member’s rank')
        .addUserOption((option) => option.setName('member').setDescription('Member to update').setRequired(true))
        .addStringOption((option) =>
          option.setName('rank').setDescription('New branch rank').setRequired(true).setAutocomplete(true)
        )
        .addStringOption((option) => option.setName('reason').setDescription('Reason or order').setMaxLength(500))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('Change a member’s duty status')
        .addUserOption((option) => option.setName('member').setDescription('Member to update').setRequired(true))
        .addStringOption((option) =>
          option.setName('status').setDescription('New status').setRequired(true).addChoices(...statusChoices)
        )
        .addStringOption((option) => option.setName('reason').setDescription('Reason').setMaxLength(500))
    ),

  new SlashCommandBuilder()
    .setName('service')
    .setDescription('Manage service-history entries')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add training, award, discipline, or note')
        .addUserOption((option) => option.setName('member').setDescription('Member').setRequired(true))
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('Record type')
            .setRequired(true)
            .addChoices(
              { name: 'Training', value: 'training' },
              { name: 'Award', value: 'award' },
              { name: 'Discipline', value: 'discipline' },
              { name: 'Administrative Note', value: 'note' }
            )
        )
        .addStringOption((option) => option.setName('title').setDescription('Record title').setRequired(true).setMaxLength(100))
        .addStringOption((option) => option.setName('details').setDescription('Details').setMaxLength(1000))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('history')
        .setDescription('View recent service history')
        .addUserOption((option) => option.setName('member').setDescription('Member; defaults to you'))
    ),

  new SlashCommandBuilder()
    .setName('loa')
    .setDescription('Request or manage a leave of absence')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('request')
        .setDescription('Submit a leave-of-absence request')
        .addStringOption((option) => option.setName('starts').setDescription('Start date: YYYY-MM-DD').setRequired(true))
        .addStringOption((option) => option.setName('ends').setDescription('End date: YYYY-MM-DD').setRequired(true))
        .addStringOption((option) => option.setName('reason').setDescription('Reason').setRequired(true).setMaxLength(1000))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('decision')
        .setDescription('Approve or deny a pending LOA request')
        .addIntegerOption((option) => option.setName('request_id').setDescription('LOA request number').setRequired(true).setMinValue(1))
        .addStringOption((option) =>
          option
            .setName('decision')
            .setDescription('Decision')
            .setRequired(true)
            .addChoices({ name: 'Approve', value: 'approved' }, { name: 'Deny', value: 'denied' })
        )
        .addStringOption((option) => option.setName('reason').setDescription('Decision note').setMaxLength(500))
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('status').setDescription('View your recent LOA requests')
    ),

  new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Synchronize a verified member from the Roblox group')
    .addUserOption((option) => option.setName('member').setDescription('Member; defaults to you')),

  new SlashCommandBuilder()
    .setName('bind')
    .setDescription('Map Roblox group ranks to Kronos and Discord roles')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set')
        .setDescription('Create or replace a rank bind')
        .addIntegerOption((option) =>
          option.setName('group_rank').setDescription('Roblox group rank number').setRequired(true).setMinValue(0).setMaxValue(255)
        )
        .addStringOption((option) =>
          option.setName('rank').setDescription('Kronos branch rank').setRequired(true).setAutocomplete(true)
        )
        .addRoleOption((option) => option.setName('discord_role').setDescription('Discord role assigned at this rank'))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove a rank bind')
        .addIntegerOption((option) =>
          option.setName('group_rank').setDescription('Roblox group rank number').setRequired(true).setMinValue(0).setMaxValue(255)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('list').setDescription('List all rank binds')
    )
].map((command) => command.toJSON());

