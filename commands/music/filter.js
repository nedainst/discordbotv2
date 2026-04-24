const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const config = require('../../config.json');

const availableFilters = {
    bassboost: '🎸 Bass Boost',
    nightcore: '🌙 Nightcore',
    vaporwave: '🌊 Vaporwave',
    '8D': '🎧 8D Audio',
    tremolo: '〰️ Tremolo',
    vibrato: '📳 Vibrato',
    karaoke: '🎤 Karaoke',
    earrape: '💥 Earrape',
    normalizer: '📊 Normalizer',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('Terapkan audio filter ke musik')
        .addStringOption((opt) =>
            opt
                .setName('name')
                .setDescription('Nama filter')
                .addChoices(
                    ...Object.entries(availableFilters).map(([k, v]) => ({
                        name: v,
                        value: k,
                    }))
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

        const filterName = interaction.options.getString('name');
        const label = availableFilters[filterName] || filterName;

        await interaction.deferReply();

        try {
            const isEnabled = queue.filters.ffmpeg.isEnabled(filterName);

            if (isEnabled) {
                queue.filters.ffmpeg.setFilters([filterName]);
                // Toggle off by disabling
                await queue.filters.ffmpeg.toggle([filterName]);
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.colors.warning)
                            .setDescription(`❌ Filter **${label}** dinonaktifkan.`),
                    ],
                });
            } else {
                await queue.filters.ffmpeg.toggle([filterName]);
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#5865F2')
                            .setDescription(`✅ Filter **${label}** diaktifkan!`)
                            .setFooter({ text: 'Audio mungkin terhenti sebentar saat menerapkan filter.' }),
                    ],
                });
            }
        } catch (error) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.danger)
                        .setDescription(`❌ Gagal menerapkan filter: ${error.message?.substring(0, 200) || 'Unknown error'}`),
                ],
            });
        }
    },
};
