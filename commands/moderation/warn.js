const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embedPresets = require('../../utils/embedPresets');
const dataManager = require('../../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a member')
        .addUserOption((opt) => opt.setName('user').setDescription('Member yang akan di-warn').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Alasan warning').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason');

        if (!target) {
            return interaction.reply({ embeds: [embedPresets.error('Error', 'User tidak ditemukan di server ini.')], ephemeral: true });
        }

        if (target.user.bot) {
            return interaction.reply({ embeds: [embedPresets.error('Error', 'Kamu tidak bisa warn bot!')], ephemeral: true });
        }

        // Add warning
        dataManager.addWarning(interaction.guild.id, target.id, {
            moderator: interaction.user.id,
            moderatorTag: interaction.user.tag,
            reason: reason,
        });

        const warnings = dataManager.getWarnings(interaction.guild.id, target.id);

        const embed = embedPresets.moderation('Warning', interaction.user, target.user, reason);
        embed.addFields({ name: '⚠️ Total Warnings', value: `${warnings.length}`, inline: true });

        // Try to DM the user
        await target.send({
            embeds: [
                embedPresets.warning(
                    'You have been warned!',
                    `Kamu mendapat warning di **${interaction.guild.name}**\n📝 **Reason:** ${reason}\n⚠️ **Total:** ${warnings.length} warning(s)`
                ),
            ],
        }).catch(() => {});

        await interaction.reply({ embeds: [embed] });
    },
};
