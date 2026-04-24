const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder,
} = require('discord.js');
const dataManager = require('../../utils/dataManager');
const embedPresets = require('../../utils/embedPresets');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voicesetup')
        .setDescription('Setup sistem Private Voice Room (Join-to-Create)')
        .addSubcommand((sub) =>
            sub
                .setName('channel')
                .setDescription('Set voice channel hub (join untuk create room)')
                .addChannelOption((opt) =>
                    opt
                        .setName('channel')
                        .setDescription('Voice channel yang jadi hub')
                        .addChannelTypes(ChannelType.GuildVoice)
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('limit')
                .setDescription('Set default user limit untuk tiap room baru')
                .addIntegerOption((opt) =>
                    opt
                        .setName('users')
                        .setDescription('Maksimum user (0 = no limit)')
                        .setMinValue(0)
                        .setMaxValue(99)
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('disable')
                .setDescription('Nonaktifkan sistem Private VC')
        )
        .addSubcommand((sub) =>
            sub
                .setName('info')
                .setDescription('Lihat konfigurasi Private VC saat ini')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'channel') {
            const channel = interaction.options.getChannel('channel');

            dataManager.setGuildSetting(guildId, 'voiceHubChannel', channel.id);

            const embed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('🎧 Private VC — Setup Complete!')
                .setDescription(
                    `Hub channel: ${channel}\n\n` +
                    `**Cara kerja:**\n` +
                    `1️⃣ Member join ke ${channel}\n` +
                    `2️⃣ Bot otomatis membuat private voice room\n` +
                    `3️⃣ Member dipindahkan ke room pribadi\n` +
                    `4️⃣ Room otomatis dihapus saat kosong\n\n` +
                    `💡 Owner room bisa **lock**, **rename**, **set limit**, dan **hide** room-nya!`
                )
                .setTimestamp()
                .setFooter({ text: config.defaults.footerText });

            await interaction.reply({ embeds: [embed], flags: 64 });
        } else if (sub === 'limit') {
            const limit = interaction.options.getInteger('users');
            dataManager.setGuildSetting(guildId, 'voiceDefaultLimit', limit);

            await interaction.reply({
                embeds: [
                    embedPresets.success(
                        'Default Limit Updated',
                        limit > 0
                            ? `Setiap room baru akan memiliki limit **${limit}** user.`
                            : 'Room baru tidak akan memiliki limit user.'
                    ),
                ],
                flags: 64,
            });
        } else if (sub === 'disable') {
            dataManager.setGuildSetting(guildId, 'voiceHubChannel', null);
            await interaction.reply({
                embeds: [embedPresets.success('Disabled', 'Sistem Private VC dinonaktifkan.')],
                flags: 64,
            });
        } else if (sub === 'info') {
            const settings = dataManager.getGuildSettings(guildId);

            if (!settings.voiceHubChannel) {
                return interaction.reply({
                    embeds: [embedPresets.info('Private VC', 'Belum dikonfigurasi. Gunakan `/voicesetup channel`.')],
                    flags: 64,
                });
            }

            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('🎧 Private VC — Info')
                .addFields(
                    { name: '📺 Hub Channel', value: `<#${settings.voiceHubChannel}>`, inline: true },
                    { name: '👥 Default Limit', value: settings.voiceDefaultLimit ? `${settings.voiceDefaultLimit}` : 'No limit', inline: true },
                    { name: '✅ Status', value: 'Active', inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: 64 });
        }
    },
};
