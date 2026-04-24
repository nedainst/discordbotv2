const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require('discord.js');
const embedPresets = require('../../utils/embedPresets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nickname')
        .setDescription('Ubah nickname member')
        .addUserOption((opt) => opt.setName('user').setDescription('Member yang akan diubah nicknamenya').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

    async execute(interaction) {
        const target = interaction.options.getMember('user');

        if (!target) {
            return interaction.reply({ embeds: [embedPresets.error('Error', 'Member tidak ditemukan.')], flags: 64 });
        }

        // Check hierarchy
        const botMember = interaction.guild.members.me;
        if (target.roles.highest.position >= botMember.roles.highest.position) {
            return interaction.reply({
                embeds: [embedPresets.error('Error', 'Bot tidak bisa mengubah nickname member dengan role lebih tinggi.')],
                flags: 64,
            });
        }

        const modal = new ModalBuilder()
            .setCustomId(`nickname:set:${target.id}`)
            .setTitle(`✏️ Change Nickname — ${target.user.username}`);

        const nicknameInput = new TextInputBuilder()
            .setCustomId('new_nickname')
            .setLabel('Nickname Baru (kosongkan untuk reset)')
            .setPlaceholder(target.nickname || target.user.username)
            .setValue(target.nickname || '')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(32);

        modal.addComponents(new ActionRowBuilder().addComponents(nicknameInput));

        await interaction.showModal(modal);
    },

    async handleModal(interaction) {
        const targetId = interaction.customId.split(':')[2];
        const target = await interaction.guild.members.fetch(targetId).catch(() => null);

        if (!target) {
            return interaction.reply({ embeds: [embedPresets.error('Error', 'Member tidak ditemukan.')], flags: 64 });
        }

        const newNick = interaction.fields.getTextInputValue('new_nickname').trim() || null;
        const oldNick = target.nickname || target.user.username;

        try {
            await target.setNickname(newNick, `Changed by ${interaction.user.tag}`);
            await interaction.reply({
                embeds: [
                    embedPresets.success(
                        'Nickname Changed!',
                        `Nickname **${target.user.tag}** berhasil diubah.\n\n📛 **${oldNick}** → **${newNick || target.user.username}**`
                    ),
                ],
            });
        } catch (error) {
            await interaction.reply({
                embeds: [embedPresets.error('Error', `Gagal mengubah nickname: ${error.message}`)],
                flags: 64,
            });
        }
    },
};
