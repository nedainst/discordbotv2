const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Acak urutan queue musik'),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        if (!queue || queue.tracks.size < 2) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Butuh minimal 2 lagu di queue untuk di-shuffle.')],
                flags: 64,
            });
        }

        queue.tracks.shuffle();

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#5865F2')
                    .setDescription(`🔀 Queue berhasil di-shuffle! (${queue.tracks.size} tracks)`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` }),
            ],
        });
    },
};
