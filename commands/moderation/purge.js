const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embedPresets = require('../../utils/embedPresets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete multiple messages at once')
        .addIntegerOption((opt) =>
            opt.setName('amount').setDescription('Jumlah pesan yang akan dihapus (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)
        )
        .addUserOption((opt) => opt.setName('user').setDescription('Filter: hanya hapus pesan dari user ini').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');

        const confirmEmbed = embedPresets.warning(
            'Konfirmasi Purge',
            `Apakah kamu yakin ingin menghapus **${amount}** pesan${targetUser ? ` dari **${targetUser.tag}**` : ''}?\n\n⚠️ Aksi ini tidak bisa di-undo!`
        );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`purge:confirm:${amount}:${targetUser?.id || 'all'}`)
                .setLabel(`Hapus ${amount} Pesan`)
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️'),
            new ButtonBuilder().setCustomId('purge:cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary).setEmoji('❌')
        );

        await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
    },

    async handleButton(interaction) {
        const parts = interaction.customId.split(':');
        const subAction = parts[1];

        if (subAction === 'cancel') {
            return interaction.update({ embeds: [embedPresets.info('Cancelled', 'Purge dibatalkan.')], components: [] });
        }

        if (subAction === 'confirm') {
            const amount = parseInt(parts[2]);
            const targetUserId = parts[3] === 'all' ? null : parts[3];

            await interaction.update({
                embeds: [embedPresets.info('Processing...', '⏳ Menghapus pesan...')],
                components: [],
            });

            try {
                let messages = await interaction.channel.messages.fetch({ limit: amount });

                if (targetUserId) {
                    messages = messages.filter((m) => m.author.id === targetUserId);
                }

                // Filter messages older than 14 days (Discord limitation)
                const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
                messages = messages.filter((m) => m.createdTimestamp > twoWeeksAgo);

                const deleted = await interaction.channel.bulkDelete(messages, true);

                await interaction.editReply({
                    embeds: [
                        embedPresets.success(
                            'Purge Complete!',
                            `Berhasil menghapus **${deleted.size}** pesan.${targetUserId ? `\n👤 Filter: <@${targetUserId}>` : ''}`
                        ),
                    ],
                    components: [],
                });
            } catch (error) {
                await interaction.editReply({
                    embeds: [embedPresets.error('Error', `Gagal menghapus pesan: ${error.message}`)],
                    components: [],
                });
            }
        }
    },
};
