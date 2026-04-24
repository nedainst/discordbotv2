const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
} = require('discord.js');
const embedPresets = require('../../utils/embedPresets');

const TIMEOUT_DURATIONS = [
    { label: '60 detik', value: '60', emoji: '⏱️' },
    { label: '5 menit', value: '300', emoji: '⏱️' },
    { label: '10 menit', value: '600', emoji: '⏱️' },
    { label: '30 menit', value: '1800', emoji: '⏱️' },
    { label: '1 jam', value: '3600', emoji: '🕐' },
    { label: '6 jam', value: '21600', emoji: '🕕' },
    { label: '12 jam', value: '43200', emoji: '🕛' },
    { label: '1 hari', value: '86400', emoji: '📅' },
    { label: '3 hari', value: '259200', emoji: '📅' },
    { label: '1 minggu', value: '604800', emoji: '📅' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a member')
        .addUserOption((opt) => opt.setName('user').setDescription('Member yang akan di-timeout').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Alasan timeout').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') || 'Tidak ada alasan';

        if (!target) {
            return interaction.reply({ embeds: [embedPresets.error('Error', 'User tidak ditemukan di server ini.')], ephemeral: true });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({ embeds: [embedPresets.error('Error', 'Kamu tidak bisa timeout dirimu sendiri!')], ephemeral: true });
        }

        if (!target.moderatable) {
            return interaction.reply({
                embeds: [embedPresets.error('Error', 'Bot tidak memiliki permission untuk timeout member ini.')],
                ephemeral: true,
            });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`timeout:duration:${target.id}:${Buffer.from(reason).toString('base64')}`)
            .setPlaceholder('Pilih durasi timeout...')
            .addOptions(TIMEOUT_DURATIONS.map((d) => ({ label: d.label, value: d.value, emoji: d.emoji })));

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = embedPresets.info(
            'Timeout Member',
            `Pilih durasi timeout untuk **${target.user.tag}**\n📝 **Reason:** ${reason}`
        );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },

    async handleSelect(interaction) {
        const parts = interaction.customId.split(':');
        const targetId = parts[2];
        const reason = Buffer.from(parts[3], 'base64').toString('utf-8');
        const durationSeconds = parseInt(interaction.values[0]);

        const target = await interaction.guild.members.fetch(targetId).catch(() => null);

        if (!target) {
            return interaction.update({
                embeds: [embedPresets.error('Error', 'Member sudah tidak ada di server.')],
                components: [],
            });
        }

        try {
            await target.timeout(durationSeconds * 1000, `Timeout by ${interaction.user.tag}: ${reason}`);

            const durationLabel = TIMEOUT_DURATIONS.find((d) => d.value === String(durationSeconds))?.label || `${durationSeconds}s`;

            await interaction.update({
                embeds: [
                    embedPresets.success(
                        'Timeout!',
                        `**${target.user.tag}** telah di-timeout selama **${durationLabel}**.\n📝 **Reason:** ${reason}`
                    ),
                ],
                components: [],
            });
        } catch (error) {
            await interaction.update({
                embeds: [embedPresets.error('Error', `Gagal timeout member: ${error.message}`)],
                components: [],
            });
        }
    },
};
