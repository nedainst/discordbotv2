const { Events, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const dataManager = require('../utils/dataManager');
const config = require('../config.json');

module.exports = {
    name: Events.MessageDelete,
    once: false,
    async execute(message, client) {
        // Skip bot messages and partials
        if (!message.guild || message.author?.bot) return;

        // ── Record for /snipe ────────────────────────
        try {
            const snipeCmd = client.commands.get('snipe');
            if (snipeCmd && snipeCmd.snipedMessages) {
                snipeCmd.snipedMessages.set(message.channel.id, {
                    content: message.content || null,
                    authorTag: message.author.tag,
                    authorAvatar: message.author.displayAvatarURL({ dynamic: true }),
                    attachment: message.attachments.first()?.url || null,
                    timestamp: Date.now(),
                });
            }
        } catch { /* ignore */ }

        const settings = dataManager.getGuildSettings(message.guild.id);
        const logChannelId = settings.logChannel;

        if (!logChannelId) return;

        const logChannel = message.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        const content = message.content || '*No text content*';
        const truncated = content.length > 1024 ? content.substring(0, 1020) + '...' : content;

        const embed = new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle('🗑️ Message Deleted')
            .addFields(
                { name: 'Author', value: message.author ? `${message.author} (${message.author.tag})` : 'Unknown', inline: true },
                { name: 'Channel', value: `${message.channel}`, inline: true },
                { name: 'Content', value: truncated, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Message ID: ${message.id}` });

        // If message had attachments
        if (message.attachments.size > 0) {
            const attachmentList = message.attachments.map((a) => `[${a.name}](${a.url})`).join('\n');
            embed.addFields({ name: '📎 Attachments', value: attachmentList, inline: false });
        }

        try {
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            logger.error(`Failed to send delete log`, error);
        }
    },
};
