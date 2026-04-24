const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
} = require('discord.js');
const embedPresets = require('../../utils/embedPresets');

const SLOWMODE_OPTIONS = [
    { label: 'Off', value: '0', emoji: '❌' },
    { label: '5 detik', value: '5', emoji: '⏱️' },
    { label: '10 detik', value: '10', emoji: '⏱️' },
    { label: '15 detik', value: '15', emoji: '⏱️' },
    { label: '30 detik', value: '30', emoji: '⏱️' },
    { label: '1 menit', value: '60', emoji: '🕐' },
    { label: '2 menit', value: '120', emoji: '🕐' },
    { label: '5 menit', value: '300', emoji: '🕐' },
    { label: '10 menit', value: '600', emoji: '🕐' },
    { label: '15 menit', value: '900', emoji: '🕐' },
    { label: '30 menit', value: '1800', emoji: '🕐' },
    { label: '1 jam', value: '3600', emoji: '🕐' },
    { label: '2 jam', value: '7200', emoji: '🕐' },
    { label: '6 jam', value: '21600', emoji: '🕐' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set slowmode untuk channel')
        .addChannelOption((opt) =>
            opt.setName('channel').setDescription('Channel yang akan di-set slowmode (default: channel ini)').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`slowmode:set:${channel.id}`)
            .setPlaceholder('Pilih durasi slowmode...')
            .addOptions(SLOWMODE_OPTIONS.map((o) => ({ label: o.label, value: o.value, emoji: o.emoji })));

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const currentSlowmode = channel.rateLimitPerUser || 0;
        const embed = embedPresets.info(
            'Slowmode Settings',
            `Channel: ${channel}\nSlowmode saat ini: **${currentSlowmode === 0 ? 'Off' : `${currentSlowmode} detik`}**\n\nPilih durasi slowmode baru:`
        );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },

    async handleSelect(interaction) {
        const channelId = interaction.customId.split(':')[2];
        const seconds = parseInt(interaction.values[0]);

        const channel = interaction.guild.channels.cache.get(channelId);
        if (!channel) {
            return interaction.update({ embeds: [embedPresets.error('Error', 'Channel tidak ditemukan.')], components: [] });
        }

        try {
            await channel.setRateLimitPerUser(seconds, `Set by ${interaction.user.tag}`);

            const label = SLOWMODE_OPTIONS.find((o) => o.value === String(seconds))?.label || `${seconds}s`;

            await interaction.update({
                embeds: [embedPresets.success('Slowmode Updated!', `Slowmode di ${channel} telah di-set ke **${label}**.`)],
                components: [],
            });
        } catch (error) {
            await interaction.update({
                embeds: [embedPresets.error('Error', `Gagal set slowmode: ${error.message}`)],
                components: [],
            });
        }
    },
};
