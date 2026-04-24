const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Lihat antrian musik saat ini')
        .addIntegerOption((opt) =>
            opt.setName('page').setDescription('Halaman (10 per page)').setMinValue(1).setRequired(false)
        ),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Queue kosong.')],
                flags: 64,
            });
        }

        const tracks = queue.tracks.toArray();
        const current = queue.currentTrack;
        const page = (interaction.options.getInteger('page') || 1) - 1;
        const perPage = 10;
        const totalPages = Math.max(1, Math.ceil(tracks.length / perPage));
        const pageNum = Math.min(page, totalPages - 1);

        const start = pageNum * perPage;
        const pageTracks = tracks.slice(start, start + perPage);

        const progressBar = queue.node.createProgressBar({
            timecodes: true,
            queue: false,
            length: 15,
        });

        let description = `**Now Playing:**\n🎵 [${current.title}](${current.url}) — \`${current.duration}\`\n${progressBar || ''}\n\n`;

        if (pageTracks.length > 0) {
            description += '**Up Next:**\n';
            description += pageTracks
                .map((t, i) => `\`${start + i + 1}.\` [${t.title}](${t.url}) — \`${t.duration}\``)
                .join('\n');
        } else if (tracks.length === 0) {
            description += '*Queue kosong — tambahkan lagu dengan `/play`*';
        }

        const loopModes = ['Off', '🔂 Track', '🔁 Queue', '♾️ Autoplay'];
        const loopMode = loopModes[queue.repeatMode] || 'Off';

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🎶 Music Queue — ${interaction.guild.name}`)
            .setDescription(description)
            .addFields(
                { name: '🔊 Volume', value: `${queue.node.volume}%`, inline: true },
                { name: '🔄 Loop', value: loopMode, inline: true },
                { name: '📋 Tracks', value: `${tracks.length} in queue`, inline: true }
            )
            .setFooter({ text: `Page ${pageNum + 1}/${totalPages} • Requested by ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
