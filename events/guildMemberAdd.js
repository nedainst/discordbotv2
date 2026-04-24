const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const logger = require('../utils/logger');
const dataManager = require('../utils/dataManager');
const config = require('../config.json');
const { generateCard } = require('../utils/welcomeCard');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member) {
        logger.event('GuildMemberAdd', `${member.user.tag} joined ${member.guild.name}`);

        const settings = dataManager.getGuildSettings(member.guild.id);

        // ── Auto-Role ─────────────────────────────────
        if (settings.autoRole) {
            try {
                const role = member.guild.roles.cache.get(settings.autoRole);
                if (role) {
                    await member.roles.add(role, 'Auto-role on join');
                    logger.info(`Auto-assigned role ${role.name} to ${member.user.tag}`);
                }
            } catch (error) {
                logger.error(`Failed to assign auto-role to ${member.user.tag}`, error);
            }
        }

        const welcomeChannelId = settings.welcomeChannel;
        if (!welcomeChannelId) return;

        const channel = member.guild.channels.cache.get(welcomeChannelId);
        if (!channel) return;

        const memberCount = member.guild.memberCount;
        const createdAt = Math.floor(member.user.createdTimestamp / 1000);

        // ── Welcome Image Card ────────────────────────
        const welcomeConfig = settings.welcomeCard || {};
        const useImage = welcomeConfig.enabled !== false; // Default to enabled

        if (useImage) {
            try {
                const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });

                const imageBuffer = await generateCard({
                    username: member.displayName || member.user.username,
                    discriminator: `@${member.user.username}`,
                    avatarURL,
                    serverName: member.guild.name,
                    memberCount,
                    type: 'welcome',
                    config: welcomeConfig,
                });

                const attachment = new AttachmentBuilder(imageBuffer, { name: 'welcome.png' });

                const embed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setImage('attachment://welcome.png')
                    .setDescription(
                        welcomeConfig.message
                            ? welcomeConfig.message.replace('{user}', `${member}`).replace('{server}', member.guild.name).replace('{count}', memberCount)
                            : `Selamat datang di **${member.guild.name}**, ${member}! 🎉\nKamu adalah member ke-**${memberCount}**. Akun dibuat <t:${createdAt}:R>`
                    )
                    .setTimestamp()
                    .setFooter({ text: config.defaults.footerText });

                await channel.send({ embeds: [embed], files: [attachment] });
            } catch (error) {
                logger.error('Failed to generate welcome card', error);
                // Fallback to text-only
                await sendTextWelcome(channel, member, memberCount, createdAt).catch(() => {});
            }
        } else {
            await sendTextWelcome(channel, member, memberCount, createdAt).catch(() => {});
        }

        // ── Log to log channel ────────────────────────
        const logChannelId = settings.logChannel;
        if (logChannelId) {
            const logChannel = member.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle('📥 Member Joined')
                    .addFields(
                        { name: 'User', value: `${member} (${member.user.tag})`, inline: true },
                        { name: 'ID', value: member.id, inline: true },
                        { name: 'Account Created', value: `<t:${createdAt}:F>`, inline: false }
                    )
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp()
                    .setFooter({ text: `Members: ${memberCount}` });

                await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
            }
        }
    },
};

async function sendTextWelcome(channel, member, memberCount, createdAt) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`✨ Welcome!`)
        .setDescription(
            `Selamat datang di **${member.guild.name}**, ${member}! 🎉\n\n` +
            `Kamu adalah member ke-**${memberCount}**.\nAkun dibuat: <t:${createdAt}:R>`
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setTimestamp();

    await channel.send({ embeds: [embed] });
}
