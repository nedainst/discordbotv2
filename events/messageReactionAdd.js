const { Events, EmbedBuilder } = require('discord.js');
const dataManager = require('../utils/dataManager');
const config = require('../config.json');

module.exports = {
    name: Events.MessageReactionAdd,
    once: false,
    async execute(reaction, user) {
        if (user.bot) return;

        // Handle partial reactions
        if (reaction.partial) {
            try { await reaction.fetch(); } catch { return; }
        }

        if (!reaction.message.guild) return;

        // ── Starboard ─────────────────────────────────
        if (reaction.emoji.name === '⭐') {
            const guildId = reaction.message.guild.id;
            const settings = dataManager.getGuildSettings(guildId);
            const sb = settings.starboard;

            if (!sb || !sb.enabled || !sb.channelId) return;

            const count = reaction.count;
            if (count < sb.threshold) return;

            const starChannel = reaction.message.guild.channels.cache.get(sb.channelId);
            if (!starChannel) return;

            const message = reaction.message;

            // Check if already posted
            const starred = dataManager.read('starboard.json', {});
            if (!starred[guildId]) starred[guildId] = {};

            const existing = starred[guildId][message.id];

            const starEmoji = count >= 10 ? '🌟' : count >= 5 ? '✨' : '⭐';

            const embed = new EmbedBuilder()
                .setColor('#FEE75C')
                .setAuthor({
                    name: message.author.tag,
                    iconURL: message.author.displayAvatarURL({ dynamic: true }),
                })
                .setDescription(message.content || '*No text*')
                .addFields(
                    { name: 'Source', value: `[Jump to message](${message.url})`, inline: true },
                    { name: 'Channel', value: `${message.channel}`, inline: true }
                )
                .setTimestamp(message.createdTimestamp)
                .setFooter({ text: `${starEmoji} ${count} stars` });

            // Add image if present
            const attachment = message.attachments.first();
            if (attachment && attachment.contentType?.startsWith('image/')) {
                embed.setImage(attachment.url);
            }

            if (existing) {
                // Update existing starboard message
                try {
                    const starMsg = await starChannel.messages.fetch(existing.starMessageId);
                    await starMsg.edit({
                        content: `${starEmoji} **${count}** | ${message.channel}`,
                        embeds: [embed],
                    });
                } catch {
                    // Message deleted, re-post
                    const newMsg = await starChannel.send({
                        content: `${starEmoji} **${count}** | ${message.channel}`,
                        embeds: [embed],
                    });
                    starred[guildId][message.id] = { starMessageId: newMsg.id };
                    dataManager.write('starboard.json', starred);
                }
            } else {
                // New starboard entry
                const starMsg = await starChannel.send({
                    content: `${starEmoji} **${count}** | ${message.channel}`,
                    embeds: [embed],
                });
                starred[guildId][message.id] = { starMessageId: starMsg.id };
                dataManager.write('starboard.json', starred);
            }
        }
    },
};
