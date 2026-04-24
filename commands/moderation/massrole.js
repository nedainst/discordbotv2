const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');
const embedPresets = require('../../utils/embedPresets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('massrole')
        .setDescription('Tambah atau hapus role dari semua member sekaligus')
        .addSubcommand((sub) =>
            sub
                .setName('add')
                .setDescription('Tambah role ke semua member')
                .addRoleOption((opt) => opt.setName('role').setDescription('Role yang akan ditambahkan').setRequired(true))
        )
        .addSubcommand((sub) =>
            sub
                .setName('remove')
                .setDescription('Hapus role dari semua member')
                .addRoleOption((opt) => opt.setName('role').setDescription('Role yang akan dihapus').setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const role = interaction.options.getRole('role');

        const botMember = interaction.guild.members.me;
        if (role.position >= botMember.roles.highest.position) {
            return interaction.reply({
                embeds: [embedPresets.error('Error', 'Role terlalu tinggi untuk bot.')],
                flags: 64,
            });
        }

        const confirm = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`massrole:confirm:${sub}:${role.id}`)
                .setLabel(`Ya, ${sub === 'add' ? 'tambahkan' : 'hapus'} ke semua member`)
                .setStyle(sub === 'add' ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('massrole:cancel')
                .setLabel('Batal')
                .setStyle(ButtonStyle.Secondary)
        );

        const memberCount = interaction.guild.memberCount;

        await interaction.reply({
            embeds: [
                embedPresets.warning(
                    '⚠️ Konfirmasi Mass Role',
                    `Ini akan **${sub === 'add' ? 'menambahkan' : 'menghapus'}** role ${role} **${sub === 'add' ? 'ke' : 'dari'}** ~${memberCount} member.\n\nIni bisa memakan waktu lama. Lanjutkan?`
                ),
            ],
            components: [confirm],
            flags: 64,
        });
    },

    async handleButton(interaction) {
        const parts = interaction.customId.split(':');

        if (parts[1] === 'cancel') {
            return interaction.update({ embeds: [embedPresets.info('Cancelled', 'Mass role dibatalkan.')], components: [] });
        }

        const action = parts[2]; // add or remove
        const roleId = parts[3];
        const role = interaction.guild.roles.cache.get(roleId);

        if (!role) return interaction.update({ embeds: [embedPresets.error('Error', 'Role tidak ditemukan.')], components: [] });

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.warning)
                    .setTitle('⏳ Processing...')
                    .setDescription(`Sedang ${action === 'add' ? 'menambahkan' : 'menghapus'} role ${role}...`)
            ],
            components: [],
        });

        let success = 0;
        let failed = 0;

        const members = await interaction.guild.members.fetch();
        for (const [, member] of members) {
            if (member.user.bot) continue;
            try {
                if (action === 'add') {
                    if (!member.roles.cache.has(roleId)) {
                        await member.roles.add(role, `Mass role by ${interaction.user.tag}`);
                        success++;
                    }
                } else {
                    if (member.roles.cache.has(roleId)) {
                        await member.roles.remove(role, `Mass role by ${interaction.user.tag}`);
                        success++;
                    }
                }
            } catch {
                failed++;
            }
        }

        await interaction.editReply({
            embeds: [
                embedPresets.success(
                    'Mass Role Complete!',
                    `${action === 'add' ? 'Ditambahkan' : 'Dihapus'}: **${success}** member\nGagal: **${failed}** member`
                ),
            ],
        });
    },
};
