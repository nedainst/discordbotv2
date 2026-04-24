const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const embedPresets = require('../../utils/embedPresets');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('starboard')
        .setDescription('Konfigurasi starboard — pesan dengan banyak ⭐ ditampilkan')
        .addSubcommand((sub) =>
            sub
                .setName('setup')
                .setDescription('Setup starboard channel & threshold')
                .addChannelOption((opt) => opt.setName('channel').setDescription('Channel starboard').addChannelTypes(ChannelType.GuildText).setRequired(true))
                .addIntegerOption((opt) => opt.setName('threshold').setDescription('Minimum ⭐ (default: 3)').setMinValue(1).setMaxValue(20).setRequired(false))
        )
        .addSubcommand((sub) => sub.setName('view').setDescription('Lihat konfigurasi starboard'))
        .addSubcommand((sub) => sub.setName('disable').setDescription('Nonaktifkan starboard'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'setup') {
            const channel = interaction.options.getChannel('channel');
            const threshold = interaction.options.getInteger('threshold') || 3;

            dataManager.setGuildSetting(guildId, 'starboard', {
                channelId: channel.id,
                threshold,
                enabled: true,
            });

            await interaction.reply({
                embeds: [
                    embedPresets.success(
                        '⭐ Starboard Setup!',
                        `Channel: ${channel}\nMinimum stars: **${threshold}** ⭐`
                    ),
                ],
                flags: 64,
            });
        } else if (sub === 'view') {
            const settings = dataManager.getGuildSettings(guildId);
            const sb = settings.starboard;

            if (!sb || !sb.enabled) {
                return interaction.reply({ embeds: [embedPresets.info('Starboard', 'Starboard belum diset.')], flags: 64 });
            }

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.warning)
                        .setTitle('⭐ Starboard Config')
                        .addFields(
                            { name: '📺 Channel', value: `<#${sb.channelId}>`, inline: true },
                            { name: '⭐ Threshold', value: `${sb.threshold}`, inline: true },
                            { name: '✅ Status', value: sb.enabled ? 'Active' : 'Disabled', inline: true }
                        )
                        .setTimestamp(),
                ],
                flags: 64,
            });
        } else if (sub === 'disable') {
            dataManager.setGuildSetting(guildId, 'starboard', { enabled: false });
            await interaction.reply({ embeds: [embedPresets.success('Disabled', 'Starboard dinonaktifkan.')], flags: 64 });
        }
    },
};
