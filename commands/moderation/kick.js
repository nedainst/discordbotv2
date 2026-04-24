const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embedPresets = require('../../utils/embedPresets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption((opt) => opt.setName('user').setDescription('Member yang akan di-kick').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Alasan kick').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') || 'Tidak ada alasan';

        if (!target) {
            return interaction.reply({ embeds: [embedPresets.error('Error', 'User tidak ditemukan di server ini.')], ephemeral: true });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({ embeds: [embedPresets.error('Error', 'Kamu tidak bisa kick dirimu sendiri!')], ephemeral: true });
        }

        if (target.id === interaction.client.user.id) {
            return interaction.reply({ embeds: [embedPresets.error('Error', 'Kamu tidak bisa kick bot ini!')], ephemeral: true });
        }

        if (!target.kickable) {
            return interaction.reply({
                embeds: [embedPresets.error('Error', 'Bot tidak memiliki permission untuk kick member ini. Pastikan role bot lebih tinggi.')],
                ephemeral: true,
            });
        }

        const confirmEmbed = embedPresets.warning(
            'Konfirmasi Kick',
            `Apakah kamu yakin ingin kick **${target.user.tag}**?\n\n📝 **Reason:** ${reason}`
        );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`kick:confirm:${target.id}`).setLabel('Kick').setStyle(ButtonStyle.Danger).setEmoji('🦶'),
            new ButtonBuilder().setCustomId(`kick:cancel`).setLabel('Cancel').setStyle(ButtonStyle.Secondary).setEmoji('❌')
        );

        await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
    },

    async handleButton(interaction, action, args) {
        const [, subAction, targetId] = interaction.customId.split(':');

        if (subAction === 'cancel') {
            return interaction.update({
                embeds: [embedPresets.info('Cancelled', 'Kick dibatalkan.')],
                components: [],
            });
        }

        if (subAction === 'confirm') {
            const target = await interaction.guild.members.fetch(targetId).catch(() => null);

            if (!target) {
                return interaction.update({
                    embeds: [embedPresets.error('Error', 'Member sudah tidak ada di server.')],
                    components: [],
                });
            }

            try {
                // Try to DM the user before kicking
                await target.send({
                    embeds: [
                        embedPresets.moderation('Kick', interaction.user, target.user, 'You have been kicked from ' + interaction.guild.name),
                    ],
                }).catch(() => {});

                await target.kick(`Kicked by ${interaction.user.tag}: ${interaction.customId}`);

                await interaction.update({
                    embeds: [embedPresets.success('Kicked!', `**${target.user.tag}** telah di-kick dari server.`)],
                    components: [],
                });
            } catch (error) {
                await interaction.update({
                    embeds: [embedPresets.error('Error', `Gagal kick member: ${error.message}`)],
                    components: [],
                });
            }
        }
    },
};
