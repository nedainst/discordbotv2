const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip lagu yang sedang diputar'),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Tidak ada musik yang sedang diputar.')],
                flags: 64,
            });
        }

        const current = queue.currentTrack;
        queue.node.skip();

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#5865F2')
                    .setDescription(`⏭️ Skipped **${current.title}**`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` }),
            ],
        });
    },
};
