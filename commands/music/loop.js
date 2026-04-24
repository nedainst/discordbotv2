const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue, QueueRepeatMode } = require('discord-player');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Atur mode loop musik')
        .addStringOption((opt) =>
            opt
                .setName('mode')
                .setDescription('Mode loop')
                .addChoices(
                    { name: '❌ Off — Tidak loop', value: 'off' },
                    { name: '🔂 Track — Loop lagu ini', value: 'track' },
                    { name: '🔁 Queue — Loop seluruh queue', value: 'queue' },
                    { name: '♾️ Autoplay — Auto mainkan lagu serupa', value: 'autoplay' }
                )
                .setRequired(true)
        ),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Tidak ada musik yang sedang diputar.')],
                flags: 64,
            });
        }

        const mode = interaction.options.getString('mode');
        const modeMap = {
            off: QueueRepeatMode.OFF,
            track: QueueRepeatMode.TRACK,
            queue: QueueRepeatMode.QUEUE,
            autoplay: QueueRepeatMode.AUTOPLAY,
        };

        const modeLabels = {
            off: '❌ Off',
            track: '🔂 Track Loop',
            queue: '🔁 Queue Loop',
            autoplay: '♾️ Autoplay',
        };

        queue.setRepeatMode(modeMap[mode]);

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#5865F2')
                    .setDescription(`🔄 Loop mode: **${modeLabels[mode]}**`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` }),
            ],
        });
    },
};
