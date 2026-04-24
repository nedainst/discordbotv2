const { SlashCommandBuilder, EmbedBuilder, Events } = require('discord.js');
const config = require('../../config.json');

// AFK storage: guildId -> userId -> { reason, timestamp }
const afkUsers = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set status AFK — orang yang mention kamu akan diberi tahu')
        .addStringOption((opt) =>
            opt.setName('reason').setDescription('Alasan AFK').setRequired(false).setMaxLength(200)
        ),

    // Expose afkUsers for the messageCreate listener
    afkUsers,

    async execute(interaction) {
        const reason = interaction.options.getString('reason') || 'AFK';
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        if (!afkUsers.has(guildId)) afkUsers.set(guildId, new Map());
        afkUsers.get(guildId).set(userId, {
            reason,
            timestamp: Date.now(),
        });

        const embed = new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle('💤 AFK Set')
            .setDescription(`${interaction.user} sekarang AFK: **${reason}**\n\nSemua mention akan diberi tahu.`)
            .setTimestamp()
            .setFooter({ text: config.defaults.footerText });

        await interaction.reply({ embeds: [embed] });

        // Try to set nickname
        try {
            const member = interaction.member;
            if (!member.nickname?.startsWith('[AFK] ')) {
                await member.setNickname(`[AFK] ${member.displayName}`.substring(0, 32)).catch(() => {});
            }
        } catch { /* Can't change nickname */ }
    },
};
