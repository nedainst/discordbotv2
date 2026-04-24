const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const embedPresets = {
    /**
     * Success embed (green)
     */
    success(title, description) {
        return new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle(`${config.emojis.success} ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: config.defaults.footerText });
    },

    /**
     * Error embed (red)
     */
    error(title, description) {
        return new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle(`${config.emojis.error} ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: config.defaults.footerText });
    },

    /**
     * Warning embed (yellow)
     */
    warning(title, description) {
        return new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle(`${config.emojis.warning} ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: config.defaults.footerText });
    },

    /**
     * Info embed (blurple)
     */
    info(title, description) {
        return new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle(`${config.emojis.info} ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: config.defaults.footerText });
    },

    /**
     * Moderation embed
     */
    moderation(action, moderator, target, reason) {
        return new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle(`${config.emojis.moderation} Moderation — ${action}`)
            .addFields(
                { name: '👤 Target', value: `${target} (${target.id})`, inline: true },
                { name: '🛡️ Moderator', value: `${moderator}`, inline: true },
                { name: '📝 Reason', value: reason || 'No reason provided', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: config.defaults.footerText });
    },

    /**
     * Log embed
     */
    log(title, description, color = config.colors.info) {
        return new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: `${config.defaults.footerText} • Log` });
    },

    /**
     * Custom embed builder
     */
    custom({ title, description, color, fields, thumbnail, image, footer, author }) {
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setFooter({ text: footer || config.defaults.footerText });

        if (title) embed.setTitle(title);
        if (description) embed.setDescription(description);
        if (color) embed.setColor(color);
        if (fields && fields.length > 0) embed.addFields(fields);
        if (thumbnail) embed.setThumbnail(thumbnail);
        if (image) embed.setImage(image);
        if (author) embed.setAuthor(author);

        return embed;
    },
};

module.exports = embedPresets;
