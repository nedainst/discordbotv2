const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const config = require('../../config.json');
const embedPresets = require('../../utils/embedPresets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setxprole')
        .setDescription('Set role reward untuk level tertentu di sistem XP')
        .addSubcommand((sub) =>
            sub
                .setName('set')
                .setDescription('Set role reward untuk level')
                .addIntegerOption((opt) => opt.setName('level').setDescription('Level yang diperlukan').setMinValue(1).setMaxValue(999).setRequired(true))
                .addRoleOption((opt) => opt.setName('role').setDescription('Role yang akan diberikan').setRequired(true))
        )
        .addSubcommand((sub) =>
            sub
                .setName('remove')
                .setDescription('Hapus role reward level')
                .addIntegerOption((opt) => opt.setName('level').setDescription('Level yang dihapus rewardnya').setMinValue(1).setRequired(true))
        )
        .addSubcommand((sub) => sub.setName('list').setDescription('Lihat semua role reward'))
        .addSubcommand((sub) =>
            sub
                .setName('levelup_channel')
                .setDescription('Set channel untuk notifikasi level up')
                .addChannelOption((opt) => opt.setName('channel').setDescription('Channel notifikasi level up').setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'set') {
            const level = interaction.options.getInteger('level');
            const role = interaction.options.getRole('role');

            const settings = dataManager.getGuildSettings(guildId);
            const xpRoles = settings.xpRoles || {};
            xpRoles[String(level)] = role.id;
            dataManager.setGuildSetting(guildId, 'xpRoles', xpRoles);

            await interaction.reply({
                embeds: [embedPresets.success('XP Role Set!', `Role ${role} akan diberikan saat member mencapai **Level ${level}**.`)],
                flags: 64,
            });
        } else if (sub === 'remove') {
            const level = interaction.options.getInteger('level');
            const settings = dataManager.getGuildSettings(guildId);
            const xpRoles = settings.xpRoles || {};

            if (!xpRoles[String(level)]) {
                return interaction.reply({ embeds: [embedPresets.error('Not Found', `Tidak ada role reward untuk Level ${level}.`)], flags: 64 });
            }

            delete xpRoles[String(level)];
            dataManager.setGuildSetting(guildId, 'xpRoles', xpRoles);

            await interaction.reply({ embeds: [embedPresets.success('Removed', `Role reward Level ${level} telah dihapus.`)], flags: 64 });
        } else if (sub === 'list') {
            const settings = dataManager.getGuildSettings(guildId);
            const xpRoles = settings.xpRoles || {};
            const entries = Object.entries(xpRoles).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

            if (entries.length === 0) {
                return interaction.reply({ embeds: [embedPresets.info('XP Roles', 'Belum ada role reward yang diset.')], flags: 64 });
            }

            const lines = entries.map(([lvl, roleId]) => `🏅 **Level ${lvl}** → <@&${roleId}>`);

            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('🏅 XP Role Rewards')
                .setDescription(lines.join('\n'))
                .setFooter({ text: config.defaults.footerText })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: 64 });
        } else if (sub === 'levelup_channel') {
            const channel = interaction.options.getChannel('channel');
            dataManager.setGuildSetting(guildId, 'levelUpChannel', channel.id);

            await interaction.reply({
                embeds: [embedPresets.success('Level Up Channel Set!', `Notifikasi level up akan dikirim ke ${channel}.`)],
                flags: 64,
            });
        }
    },
};
