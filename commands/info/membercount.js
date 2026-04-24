const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('membercount')
        .setDescription('Tampilkan statistik member server'),

    async execute(interaction) {
        const guild = interaction.guild;
        await guild.members.fetch();

        const total = guild.memberCount;
        const humans = guild.members.cache.filter((m) => !m.user.bot).size;
        const bots = guild.members.cache.filter((m) => m.user.bot).size;
        const online = guild.members.cache.filter((m) => m.presence?.status === 'online').size;
        const idle = guild.members.cache.filter((m) => m.presence?.status === 'idle').size;
        const dnd = guild.members.cache.filter((m) => m.presence?.status === 'dnd').size;
        const offline = total - online - idle - dnd;

        const bar = (value, max, length = 15) => {
            const pct = Math.round((value / max) * length);
            return '█'.repeat(pct) + '░'.repeat(length - pct);
        };

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`👥 Member Statistics — ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
                {
                    name: '📊 Overview',
                    value: `\`\`\`\nTotal    : ${total}\nHumans   : ${humans}\nBots     : ${bots}\n\`\`\``,
                    inline: false,
                },
                {
                    name: '🟢 Online Activity',
                    value: [
                        `🟢 Online  ${bar(online, total)} ${online}`,
                        `🟡 Idle    ${bar(idle, total)} ${idle}`,
                        `🔴 DND     ${bar(dnd, total)} ${dnd}`,
                        `⚫ Offline ${bar(offline, total)} ${offline}`,
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: '📈 Ratio',
                    value: `Humans ${bar(humans, total)} ${((humans / total) * 100).toFixed(1)}%\nBots   ${bar(bots, total)} ${((bots / total) * 100).toFixed(1)}%`,
                    inline: false,
                }
            )
            .setTimestamp()
            .setFooter({ text: config.defaults.footerText });

        await interaction.reply({ embeds: [embed] });
    },
};
