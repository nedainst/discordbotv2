const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const config = require('../../config.json');

function xpForLevel(level) {
    return 5 * Math.pow(level, 2) + 50 * level + 100;
}

function buildProgressBar(current, total, length = 12) {
    const pct = Math.min(current / total, 1);
    const filled = Math.round(pct * length);
    return '█'.repeat(filled) + '░'.repeat(length - filled);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Lihat level dan XP kamu atau member lain')
        .addUserOption((opt) => opt.setName('user').setDescription('User yang ingin dilihat').setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        const userData = dataManager.getXP(interaction.guild.id, target.id);
        const { xp, level, totalXp } = userData;
        const neededXP = xpForLevel(level);
        const progressBar = buildProgressBar(xp, neededXP);
        const pct = Math.min(Math.round((xp / neededXP) * 100), 100);

        // Get rank position
        const leaderboard = dataManager.getLeaderboard(interaction.guild.id);
        const rank = leaderboard.findIndex((u) => u.userId === target.id) + 1;

        const embed = new EmbedBuilder()
            .setColor(member?.displayHexColor || config.colors.primary)
            .setTitle(`📊 Rank — ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '🏆 Rank', value: rank > 0 ? `#${rank}` : 'Unranked', inline: true },
                { name: '⬆️ Level', value: `**${level}**`, inline: true },
                { name: '✨ Total XP', value: `${totalXp.toLocaleString()}`, inline: true },
                {
                    name: `📈 Progress ke Level ${level + 1}`,
                    value: `\`${progressBar}\` **${xp}** / **${neededXP}** XP (${pct}%)`,
                    inline: false,
                }
            )
            .setTimestamp()
            .setFooter({ text: `${config.defaults.footerText} • XP System` });

        await interaction.reply({ embeds: [embed] });
    },
};
