const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const logger = require('../utils/logger');
const dataManager = require('../utils/dataManager');
const config = require('../config.json');
const { generateCard } = require('../utils/welcomeCard');

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,
    async execute(member) {
        logger.event('GuildMemberRemove', `${member.user.tag} left ${member.guild.name}`);

        const settings = dataManager.getGuildSettings(member.guild.id);

        // ── Leave Image Card ──────────────────────────
        const leaveChannelId = settings.leaveChannel || settings.welcomeChannel;
        if (leaveChannelId) {
            const channel = member.guild.channels.cache.get(leaveChannelId);
            if (channel) {
                const leaveConfig = settings.leaveCard || {};
                const useImage = leaveConfig.enabled !== false;

                if (useImage) {
                    try {
                        const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });

                        const imageBuffer = await generateCard({
                            username: member.displayName || member.user.username,
                            discriminator: `@${member.user.username}`,
                            avatarURL,
                            serverName: member.guild.name,
                            memberCount: member.guild.memberCount,
                            type: 'leave',
                            config: leaveConfig,
                        });

                        const attachment = new AttachmentBuilder(imageBuffer, { name: 'goodbye.png' });

                        const embed = new EmbedBuilder()
                            .setColor(config.colors.danger)
                            .setImage('attachment://goodbye.png')
                            .setDescription(
                                leaveConfig.message
                                    ? leaveConfig.message
                                          .replace('{user}', member.user.tag)
                                          .replace('{server}', member.guild.name)
                                          .replace('{count}', member.guild.memberCount)
                                    : `**${member.user.tag}** telah meninggalkan server. Sekarang ada **${member.guild.memberCount}** member.`
                            )
                            .setTimestamp()
                            .setFooter({ text: config.defaults.footerText });

                        await channel.send({ embeds: [embed], files: [attachment] });
                    } catch (error) {
                        logger.error('Failed to generate leave card', error);
                        const fallback = new EmbedBuilder()
                            .setColor(config.colors.danger)
                            .setTitle('👋 Goodbye!')
                            .setDescription(`**${member.user.tag}** telah meninggalkan **${member.guild.name}**.`)
                            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                            .setTimestamp();
                        await channel.send({ embeds: [fallback] }).catch(() => {});
                    }
                } else {
                    const embed = new EmbedBuilder()
                        .setColor(config.colors.danger)
                        .setTitle('👋 Goodbye!')
                        .setDescription(`**${member.user.tag}** telah meninggalkan **${member.guild.name}**.`)
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .setTimestamp();
                    await channel.send({ embeds: [embed] }).catch(() => {});
                }
            }
        }

        // ── Log ───────────────────────────────────────
        const logChannelId = settings.logChannel;
        if (logChannelId) {
            const logChannel = member.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const roles = member.roles.cache
                    .filter((r) => r.id !== member.guild.id)
                    .map((r) => r.toString())
                    .join(', ') || 'None';
                const joinedAt = member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown';

                const logEmbed = new EmbedBuilder()
                    .setColor(config.colors.danger)
                    .setTitle('📤 Member Left')
                    .addFields(
                        { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
                        { name: 'Joined', value: joinedAt, inline: true },
                        { name: 'Roles', value: roles.substring(0, 1024), inline: false }
                    )
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp()
                    .setFooter({ text: `Members: ${member.guild.memberCount}` });

                await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
            }
        }
    },
};
