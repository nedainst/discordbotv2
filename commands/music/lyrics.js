const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const config = require('../../config.json');
const embedPresets = require('../../utils/embedPresets');

const LYRICS_API = 'https://api.lyrics.ovh/v1';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Cari lirik lagu')
        .addStringOption((opt) => opt.setName('artist').setDescription('Nama artis').setRequired(true).setMaxLength(100))
        .addStringOption((opt) => opt.setName('title').setDescription('Judul lagu').setRequired(true).setMaxLength(100)),

    async execute(interaction) {
        await interaction.deferReply();

        const artist = interaction.options.getString('artist');
        const title = interaction.options.getString('title');

        try {
            const url = `${LYRICS_API}/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
            const res = await fetch(url);

            if (!res.ok) {
                return interaction.editReply({
                    embeds: [embedPresets.error('Not Found', `Lirik untuk **${title}** oleh **${artist}** tidak ditemukan.`)],
                });
            }

            const data = await res.json();
            if (!data.lyrics) {
                return interaction.editReply({
                    embeds: [embedPresets.error('Not Found', 'Lirik tidak tersedia untuk lagu ini.')],
                });
            }

            // Split lyrics into pages of max 1800 chars
            const lyrics = data.lyrics.replace(/\r\n/g, '\n').trim();
            const chunkSize = 1800;
            const pages = [];
            for (let i = 0; i < lyrics.length; i += chunkSize) {
                pages.push(lyrics.slice(i, i + chunkSize));
            }

            const buildEmbed = (page, idx, total) =>
                new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle(`🎵 ${title}`)
                    .setDescription(pages[idx])
                    .setAuthor({ name: artist })
                    .setFooter({ text: `Page ${idx + 1}/${total} • Powered by lyrics.ovh` })
                    .setTimestamp();

            const buildRow = (page, total) =>
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`lyrics:prev:${page}:${encodeURIComponent(artist)}:${encodeURIComponent(title)}`)
                        .setLabel('◀')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId(`lyrics:page:${page}`)
                        .setLabel(`${page + 1}/${total}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId(`lyrics:next:${page}:${encodeURIComponent(artist)}:${encodeURIComponent(title)}`)
                        .setLabel('▶')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page >= total - 1)
                );

            // Cache lyrics for pagination
            lyricsCache.set(`${artist}:${title}`.toLowerCase(), pages);

            await interaction.editReply({
                embeds: [buildEmbed(pages, 0, pages.length)],
                components: pages.length > 1 ? [buildRow(0, pages.length)] : [],
            });
        } catch (error) {
            await interaction.editReply({
                embeds: [embedPresets.error('Error', `Gagal mengambil lirik: ${error.message}`)],
            });
        }
    },

    async handleButton(interaction) {
        const parts = interaction.customId.split(':');
        const direction = parts[1];
        const currentPage = parseInt(parts[2]);
        const artist = decodeURIComponent(parts[3]);
        const title = decodeURIComponent(parts[4]);

        const cacheKey = `${artist}:${title}`.toLowerCase();
        let pages = lyricsCache.get(cacheKey);

        if (!pages) {
            // Re-fetch if cache expired
            try {
                const res = await fetch(`${LYRICS_API}/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
                const data = await res.json();
                const lyrics = data.lyrics?.replace(/\r\n/g, '\n').trim() || '';
                pages = [];
                for (let i = 0; i < lyrics.length; i += 1800) pages.push(lyrics.slice(i, i + 1800));
                lyricsCache.set(cacheKey, pages);
            } catch {
                return interaction.update({ content: '❌ Gagal memuat lirik.', components: [] });
            }
        }

        const newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;
        const clampedPage = Math.max(0, Math.min(newPage, pages.length - 1));

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`🎵 ${title}`)
            .setDescription(pages[clampedPage])
            .setAuthor({ name: artist })
            .setFooter({ text: `Page ${clampedPage + 1}/${pages.length} • Powered by lyrics.ovh` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`lyrics:prev:${clampedPage}:${encodeURIComponent(artist)}:${encodeURIComponent(title)}`)
                .setLabel('◀')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(clampedPage === 0),
            new ButtonBuilder()
                .setCustomId(`lyrics:page:${clampedPage}`)
                .setLabel(`${clampedPage + 1}/${pages.length}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(`lyrics:next:${clampedPage}:${encodeURIComponent(artist)}:${encodeURIComponent(title)}`)
                .setLabel('▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(clampedPage >= pages.length - 1)
        );

        await interaction.update({ embeds: [embed], components: pages.length > 1 ? [row] : [] });
    },
};

// In-memory lyrics cache (TTL 10 minutes)
const lyricsCache = new Map();
setInterval(() => lyricsCache.clear(), 10 * 60 * 1000);
