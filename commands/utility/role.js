const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embedPresets = require('../../utils/embedPresets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Manage roles of a member')
        .addSubcommand((sub) =>
            sub
                .setName('add')
                .setDescription('Tambahkan role ke member')
                .addUserOption((opt) => opt.setName('user').setDescription('Target member').setRequired(true))
                .addRoleOption((opt) => opt.setName('role').setDescription('Role yang akan ditambahkan').setRequired(true))
        )
        .addSubcommand((sub) =>
            sub
                .setName('remove')
                .setDescription('Hapus role dari member')
                .addUserOption((opt) => opt.setName('user').setDescription('Target member').setRequired(true))
                .addRoleOption((opt) => opt.setName('role').setDescription('Role yang akan dihapus').setRequired(true))
        )
        .addSubcommand((sub) =>
            sub
                .setName('info')
                .setDescription('Info tentang sebuah role')
                .addRoleOption((opt) => opt.setName('role').setDescription('Role yang ingin dilihat').setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'add') {
            const target = interaction.options.getMember('user');
            const role = interaction.options.getRole('role');

            if (!target) {
                return interaction.reply({ embeds: [embedPresets.error('Error', 'Member tidak ditemukan.')], ephemeral: true });
            }

            // Check if bot can manage this role
            const botMember = interaction.guild.members.me;
            if (role.position >= botMember.roles.highest.position) {
                return interaction.reply({
                    embeds: [embedPresets.error('Error', 'Bot tidak bisa menambahkan role yang lebih tinggi dari role bot.')],
                    ephemeral: true,
                });
            }

            if (target.roles.cache.has(role.id)) {
                return interaction.reply({
                    embeds: [embedPresets.warning('Already Has Role', `**${target.user.tag}** sudah memiliki role ${role}.`)],
                    ephemeral: true,
                });
            }

            try {
                await target.roles.add(role, `Added by ${interaction.user.tag}`);
                await interaction.reply({
                    embeds: [embedPresets.success('Role Added', `Role ${role} berhasil ditambahkan ke **${target.user.tag}**.`)],
                });
            } catch (error) {
                await interaction.reply({
                    embeds: [embedPresets.error('Error', `Gagal menambahkan role: ${error.message}`)],
                    ephemeral: true,
                });
            }
        } else if (sub === 'remove') {
            const target = interaction.options.getMember('user');
            const role = interaction.options.getRole('role');

            if (!target) {
                return interaction.reply({ embeds: [embedPresets.error('Error', 'Member tidak ditemukan.')], ephemeral: true });
            }

            const botMember = interaction.guild.members.me;
            if (role.position >= botMember.roles.highest.position) {
                return interaction.reply({
                    embeds: [embedPresets.error('Error', 'Bot tidak bisa menghapus role yang lebih tinggi dari role bot.')],
                    ephemeral: true,
                });
            }

            if (!target.roles.cache.has(role.id)) {
                return interaction.reply({
                    embeds: [embedPresets.warning('No Role', `**${target.user.tag}** tidak memiliki role ${role}.`)],
                    ephemeral: true,
                });
            }

            try {
                await target.roles.remove(role, `Removed by ${interaction.user.tag}`);
                await interaction.reply({
                    embeds: [embedPresets.success('Role Removed', `Role ${role} berhasil dihapus dari **${target.user.tag}**.`)],
                });
            } catch (error) {
                await interaction.reply({
                    embeds: [embedPresets.error('Error', `Gagal menghapus role: ${error.message}`)],
                    ephemeral: true,
                });
            }
        } else if (sub === 'info') {
            const role = interaction.options.getRole('role');
            const createdAt = Math.floor(role.createdTimestamp / 1000);
            const membersWithRole = role.members.size;

            const embed = embedPresets.custom({
                title: `🏷️ Role Info — ${role.name}`,
                color: role.hexColor === '#000000' ? '#99AAB5' : role.hexColor,
                fields: [
                    { name: '🆔 ID', value: `\`${role.id}\``, inline: true },
                    { name: '🎨 Color', value: role.hexColor, inline: true },
                    { name: '📊 Position', value: `${role.position}`, inline: true },
                    { name: '👥 Members', value: `${membersWithRole}`, inline: true },
                    { name: '📌 Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
                    { name: '🔼 Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
                    { name: '📅 Created', value: `<t:${createdAt}:F>`, inline: false },
                ],
            });

            await interaction.reply({ embeds: [embed] });
        }
    },
};
