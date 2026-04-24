const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useMainPlayer, QueryType } = require('discord-player');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Putar musik dari YouTube, Spotify, SoundCloud, dll')
        .addStringOption((opt) =>
            opt.setName('query').setDescription('Nama lagu atau URL').setRequired(true).setAutocomplete(true)
        ),

    async execute(interaction, client) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.danger)
                        .setDescription('❌ Kamu harus berada di voice channel terlebih dahulu!'),
                ],
                flags: 64,
            });
        }

        const query = interaction.options.getString('query');
        await interaction.deferReply();

        const player = useMainPlayer();

        try {
            const { track } = await player.play(voiceChannel, query, {
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel,
                        requestedBy: interaction.user,
                    },
                    volume: 50,
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 30000,
                    leaveOnEnd: true,
                    leaveOnEndCooldown: 60000,
                    selfDeaf: true,
                    bufferingTimeout: 15000,
                },
                requestedBy: interaction.user,
                connectionOptions: {
                    deaf: true,
                },
            });

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTimestamp()
                .setFooter({ text: `Requested by ${interaction.user.tag}` });

            embed
                .setTitle('🎵 Added to Queue')
                .setDescription(`**[${track.title}](${track.url})**`)
                .addFields(
                    { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
                    { name: '⏱️ Duration', value: track.duration || 'Live', inline: true },
                    { name: '🔊 Source', value: track.source || 'Unknown', inline: true }
                )
                .setThumbnail(track.thumbnail);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Play error:', error);

            let errMsg = 'Gagal memutar lagu.';
            if (error.message?.includes('aborted')) {
                errMsg = 'YouTube stream timeout. Coba lagi atau pakai URL langsung.';
            } else if (error.message?.includes('sign in')) {
                errMsg = 'Video ini memerlukan login YouTube (age-restricted).';
            } else if (error.message?.includes('No results')) {
                errMsg = `Tidak ditemukan hasil untuk **${query}**`;
            } else {
                errMsg = error.message?.substring(0, 200) || 'Unknown error';
            }

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.danger)
                        .setDescription(`❌ ${errMsg}`),
                ],
            });
        }
    },

    async autocomplete(interaction) {
        const query = interaction.options.getFocused();
        if (!query || query.length < 2) return interaction.respond([]);

        try {
            const player = useMainPlayer();
            const results = await player.search(query);

            const choices = results.tracks.slice(0, 10).map((t) => ({
                name: `${t.title} — ${t.author}`.substring(0, 100),
                value: t.url || t.title,
            }));

            await interaction.respond(choices);
        } catch {
            await interaction.respond([]);
        }
    },
};
