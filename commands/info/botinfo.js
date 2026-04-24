const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Informasi tentang bot ini'),

    async execute(interaction, client) {
        const uptime = formatUptime(client.uptime);
        const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const guildCount = client.guilds.cache.size;
        const userCount = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
        const channelCount = client.channels.cache.size;
        const commandCount = client.commands.size;
        const nodeVersion = process.version;
        const djsVersion = require('discord.js').version;

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`🤖 ${client.user.username}`)
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setDescription('Discord Essentials Bot — All-in-one server management bot')
            .addFields(
                { name: '📊 Statistics', value: `\`\`\`\nServers  : ${guildCount}\nUsers    : ${userCount.toLocaleString()}\nChannels : ${channelCount}\nCommands : ${commandCount}\n\`\`\``, inline: true },
                { name: '⚙️ System', value: `\`\`\`\nMemory   : ${memUsage} MB\nNode.js  : ${nodeVersion}\nDiscord.js: v${djsVersion}\nUptime   : ${uptime}\n\`\`\``, inline: true },
                { name: '🔗 Dashboard', value: '[Open Dashboard](http://localhost:3000)', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Ping: ${client.ws.ping}ms • ${config.defaults.footerText}` });

        await interaction.reply({ embeds: [embed] });
    },
};

function formatUptime(ms) {
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(' ');
}
