const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Atur volume musik')
        .addIntegerOption((opt) =>
            opt.setName('level').setDescription('Volume (0-100)').setMinValue(0).setMaxValue(100).setRequired(true)
        ),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Tidak ada musik yang sedang diputar.')],
                flags: 64,
            });
        }

        const level = interaction.options.getInteger('level');
        queue.node.setVolume(level);

        const volumeBar = (v) => {
            const filled = Math.round(v / 10);
            return '█'.repeat(filled) + '░'.repeat(10 - filled);
        };

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#5865F2')
                    .setDescription(`🔊 Volume: **${level}%**\n\`${volumeBar(level)}\``)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` }),
            ],
        });
    },
};
