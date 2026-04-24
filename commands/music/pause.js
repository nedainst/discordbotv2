const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause atau resume musik'),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Tidak ada musik yang sedang diputar.')],
                flags: 64,
            });
        }

        const wasPaused = queue.node.isPaused();
        queue.node.setPaused(!wasPaused);

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#5865F2')
                    .setDescription(wasPaused ? '▶️ Musik di-**resume**.' : '⏸️ Musik di-**pause**.')
                    .setFooter({ text: `Requested by ${interaction.user.tag}` }),
            ],
        });
    },
};
