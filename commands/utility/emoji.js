const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const embedPresets = require('../../utils/embedPresets');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emoji')
        .setDescription('Tambah emoji ke server dari URL')
        .addStringOption((opt) => opt.setName('name').setDescription('Nama emoji').setRequired(true).setMaxLength(32))
        .addStringOption((opt) => opt.setName('url').setDescription('URL gambar emoji (PNG, JPG, GIF)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions),

    async execute(interaction) {
        const name = interaction.options.getString('name').replace(/\s+/g, '_');
        const url = interaction.options.getString('url');

        await interaction.deferReply({ flags: 64 });

        try {
            const emoji = await interaction.guild.emojis.create({ attachment: url, name, reason: `Added by ${interaction.user.tag}` });

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.success)
                        .setTitle('✅ Emoji Added!')
                        .setDescription(`Emoji ${emoji} (\`:${emoji.name}:\`) berhasil ditambahkan!`)
                        .setThumbnail(emoji.url)
                        .setTimestamp(),
                ],
            });
        } catch (error) {
            let errMsg = 'Gagal menambahkan emoji.';
            if (error.message.includes('Maximum number')) errMsg = 'Server sudah mencapai batas emoji!';
            else if (error.message.includes('Invalid')) errMsg = 'URL gambar tidak valid atau terlalu besar (max 256KB).';

            await interaction.editReply({
                embeds: [embedPresets.error('Error', errMsg)],
            });
        }
    },
};
