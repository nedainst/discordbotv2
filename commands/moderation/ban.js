const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embedPresets = require('../../utils/embedPresets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption((opt) => opt.setName('user').setDescription('Member yang akan di-ban').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Alasan ban').setRequired(false))
        .addIntegerOption((opt) =>
            opt
                .setName('delete_days')
                .setDescription('Hapus pesan member (hari)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('user');
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Tidak ada alasan';
        const deleteDays = interaction.options.getInteger('delete_days') || 0;

        if (!target && !user) {
            return interaction.reply({ embeds: [embedPresets.error('Error', 'User tidak ditemukan.')], ephemeral: true });
        }

        const targetId = target?.id || user.id;
        const targetTag = target?.user?.tag || user.tag;

        if (targetId === interaction.user.id) {
            return interaction.reply({ embeds: [embedPresets.error('Error', 'Kamu tidak bisa ban dirimu sendiri!')], ephemeral: true });
        }

        if (targetId === interaction.client.user.id) {
            return interaction.reply({ embeds: [embedPresets.error('Error', 'Kamu tidak bisa ban bot ini!')], ephemeral: true });
        }

        if (target && !target.bannable) {
            return interaction.reply({
                embeds: [embedPresets.error('Error', 'Bot tidak memiliki permission untuk ban member ini.')],
                ephemeral: true,
            });
        }

        const confirmEmbed = embedPresets.warning(
            'Konfirmasi Ban',
            `Apakah kamu yakin ingin ban **${targetTag}**?\n\n📝 **Reason:** ${reason}\n🗑️ **Delete Messages:** ${deleteDays} hari`
        );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ban:confirm:${targetId}:${deleteDays}`)
                .setLabel('Ban')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔨'),
            new ButtonBuilder().setCustomId(`ban:cancel`).setLabel('Cancel').setStyle(ButtonStyle.Secondary).setEmoji('❌')
        );

        await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
    },

    async handleButton(interaction) {
        const parts = interaction.customId.split(':');
        const subAction = parts[1];

        if (subAction === 'cancel') {
            return interaction.update({
                embeds: [embedPresets.info('Cancelled', 'Ban dibatalkan.')],
                components: [],
            });
        }

        if (subAction === 'confirm') {
            const targetId = parts[2];
            const deleteDays = parseInt(parts[3]) || 0;

            try {
                const user = await interaction.client.users.fetch(targetId).catch(() => null);

                // Try to DM the user before banning
                if (user) {
                    await user.send({
                        embeds: [
                            embedPresets.moderation('Ban', interaction.user, user, 'You have been banned from ' + interaction.guild.name),
                        ],
                    }).catch(() => {});
                }

                await interaction.guild.members.ban(targetId, {
                    deleteMessageSeconds: deleteDays * 86400,
                    reason: `Banned by ${interaction.user.tag}`,
                });

                await interaction.update({
                    embeds: [embedPresets.success('Banned!', `**${user?.tag || targetId}** telah di-ban dari server.`)],
                    components: [],
                });
            } catch (error) {
                await interaction.update({
                    embeds: [embedPresets.error('Error', `Gagal ban member: ${error.message}`)],
                    components: [],
                });
            }
        }
    },
};
