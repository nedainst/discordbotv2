const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const dataManager = require('../../utils/dataManager');
const config = require('../../config.json');

const PAGE_SIZE = 10;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Tampilkan XP leaderboard server'),

    async execute(interaction) {
        await interaction.deferReply();
        const embed = await buildPage(interaction.guild, 0);
        const total = dataManager.getLeaderboard(interaction.guild.id).length;
        const totalPages = Math.ceil(total / PAGE_SIZE);

        const row = buildRow(0, totalPages);
        await interaction.editReply({ embeds: [embed], components: totalPages > 1 ? [row] : [] });
    },

    async handleButton(interaction) {
        const parts = interaction.customId.split(':');
        const page = parseInt(parts[1]);

        await interaction.deferUpdate();
        const embed = await buildPage(interaction.guild, page);
        const total = dataManager.getLeaderboard(interaction.guild.id).length;
        const totalPages = Math.ceil(total / PAGE_SIZE);

        const row = buildRow(page, totalPages);
        await interaction.editReply({ embeds: [embed], components: totalPages > 1 ? [row] : [] });
    },
};

async function buildPage(guild, page) {
    const all = dataManager.getLeaderboard(guild.id);
    const start = page * PAGE_SIZE;
    const slice = all.slice(start, start + PAGE_SIZE);
    const totalPages = Math.ceil(all.length / PAGE_SIZE);

    const medals = ['🥇', '🥈', '🥉'];

    const lines = await Promise.all(
        slice.map(async (entry, i) => {
            const rank = start + i + 1;
            const medal = rank <= 3 ? medals[rank - 1] : `\`#${rank}\``;
            let name;
            try {
                const member = await guild.members.fetch(entry.userId).catch(() => null);
                name = member?.displayName || `Unknown (${entry.userId})`;
            } catch {
                name = `<@${entry.userId}>`;
            }
            return `${medal} **${name}** — Level **${entry.level}** · ${entry.totalXp.toLocaleString()} XP`;
        })
    );

    return new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`🏆 XP Leaderboard — ${guild.name}`)
        .setDescription(lines.length > 0 ? lines.join('\n') : '*Belum ada data XP.*')
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setFooter({ text: `Page ${page + 1}/${Math.max(totalPages, 1)} • ${config.defaults.footerText}` })
        .setTimestamp();
}

function buildRow(page, total) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`leaderboard:${page - 1}`)
            .setLabel('◀ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`leaderboard:${page + 1}`)
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= total - 1)
    );
}
