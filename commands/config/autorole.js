const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const embedPresets = require('../../utils/embedPresets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Auto-assign role saat member join')
        .addSubcommand((sub) =>
            sub
                .setName('set')
                .setDescription('Set role otomatis')
                .addRoleOption((opt) => opt.setName('role').setDescription('Role yang akan diberikan ke member baru').setRequired(true))
        )
        .addSubcommand((sub) => sub.setName('remove').setDescription('Hapus auto-role'))
        .addSubcommand((sub) => sub.setName('view').setDescription('Lihat auto-role saat ini'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'set') {
            const role = interaction.options.getRole('role');

            const botMember = interaction.guild.members.me;
            if (role.position >= botMember.roles.highest.position) {
                return interaction.reply({
                    embeds: [embedPresets.error('Error', 'Bot tidak bisa assign role yang lebih tinggi dari role bot.')],
                    flags: 64,
                });
            }

            dataManager.setGuildSetting(guildId, 'autoRole', role.id);

            await interaction.reply({
                embeds: [embedPresets.success('AutoRole Set!', `Member baru akan otomatis mendapat role ${role}.`)],
            });
        } else if (sub === 'remove') {
            dataManager.setGuildSetting(guildId, 'autoRole', null);
            await interaction.reply({
                embeds: [embedPresets.success('AutoRole Removed', 'Auto-role telah dihapus.')],
                flags: 64,
            });
        } else if (sub === 'view') {
            const settings = dataManager.getGuildSettings(guildId);
            const roleId = settings.autoRole;

            await interaction.reply({
                embeds: [
                    embedPresets.info(
                        'AutoRole',
                        roleId ? `Role otomatis saat ini: <@&${roleId}>` : 'Tidak ada auto-role yang diset.'
                    ),
                ],
                flags: 64,
            });
        }
    },
};
