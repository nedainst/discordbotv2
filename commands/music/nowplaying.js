const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Tampilkan lagu yang sedang diputar'),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Tidak ada lagu yang sedang diputar.')],
                flags: 64,
            });
        }

        const track = queue.currentTrack;
        const progress = queue.node.createProgressBar({
            timecodes: true,
            queue: false,
            length: 20,
            indicator: '🔵',
        });

        const loopModes = ['Off', '🔂 Track', '🔁 Queue', '♾️ Autoplay'];

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎵 Now Playing')
            .setDescription(`**[${track.title}](${track.url})**\nby *${track.author}*`)
            .addFields(
                { name: '⏱️ Progress', value: progress || `${track.duration}`, inline: false },
                { name: '🔊 Volume', value: `${queue.node.volume}%`, inline: true },
                { name: '🔄 Loop', value: loopModes[queue.repeatMode] || 'Off', inline: true },
                { name: '📺 Source', value: track.source || 'Unknown', inline: true }
            )
            .setThumbnail(track.thumbnail)
            .setFooter({ text: `Requested by ${track.requestedBy?.tag || 'Unknown'}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
