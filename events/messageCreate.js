const { Events, EmbedBuilder } = require('discord.js');
const dataManager = require('../utils/dataManager');
const config = require('../config.json');

// XP cooldown map: userId -> timestamp (to prevent XP spam)
const xpCooldowns = new Map();
const XP_COOLDOWN_MS = 60000; // 1 minute cooldown per user
const XP_MIN = 15;
const XP_MAX = 25;

// Formula: XP needed for next level = 5 * (level^2) + 50*level + 100
function xpForLevel(level) {
    return 5 * Math.pow(level, 2) + 50 * level + 100;
}

module.exports = {
    name: Events.MessageCreate,
    once: false,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const userId = message.author.id;
        const guildId = message.guild.id;
        const now = Date.now();

        // ── AFK System ────────────────────────────────
        try {
            const afkCmd = client.commands.get('afk');
            if (afkCmd && afkCmd.afkUsers) {
                const guildAfk = afkCmd.afkUsers.get(guildId);
                if (guildAfk) {
                    // Remove AFK if user is speaking
                    if (guildAfk.has(userId)) {
                        guildAfk.delete(userId);
                        const member = message.member;
                        if (member?.nickname?.startsWith('[AFK] ')) {
                            member.setNickname(member.nickname.replace('[AFK] ', '')).catch(() => {});
                        }
                        message.reply({ content: `Welcome back ${message.author}! AFK sudah dihapus. ✅` })
                            .then((m) => setTimeout(() => m.delete().catch(() => {}), 5000))
                            .catch(() => {});
                    }

                    // Notify when mentioning AFK users
                    for (const [mentionedId] of message.mentions.users) {
                        if (guildAfk.has(mentionedId)) {
                            const afkData = guildAfk.get(mentionedId);
                            const timeAgo = Math.floor((now - afkData.timestamp) / 60000);
                            message.reply({
                                content: `💤 <@${mentionedId}> sedang AFK: **${afkData.reason}** (${timeAgo}m ago)`,
                            }).then((m) => setTimeout(() => m.delete().catch(() => {}), 8000)).catch(() => {});
                        }
                    }
                }
            }
        } catch { /* ignore AFK errors */ }

        // ── Auto-Mod Check ────────────────────────────
        const autoMod = dataManager.getAutoMod(guildId);
        if (autoMod.enabled) {
            const handled = await runAutoMod(message, autoMod);
            if (handled) return;
        }

        // ── XP System ────────────────────────────────
        const cooldownKey = `${guildId}:${userId}`;
        const lastXP = xpCooldowns.get(cooldownKey) || 0;
        if (now - lastXP < XP_COOLDOWN_MS) return;

        xpCooldowns.set(cooldownKey, now);

        const xpGain = Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;
        dataManager.addXP(guildId, userId, xpGain);

        const userData = dataManager.getXP(guildId, userId);
        const currentLevel = userData.level;
        const neededXP = xpForLevel(currentLevel);

        // Level up check
        if (userData.xp >= neededXP) {
            const newLevel = currentLevel + 1;
            dataManager.setXPLevel(guildId, userId, newLevel, userData.xp - neededXP);

            // Send level-up message
            const settings = dataManager.getGuildSettings(guildId);
            const levelUpChannelId = settings.levelUpChannel || message.channel.id;
            const levelUpChannel = message.guild.channels.cache.get(levelUpChannelId) || message.channel;

            const embed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('⬆️ Level Up!')
                .setDescription(`Selamat ${message.author}! Kamu naik ke **Level ${newLevel}**! 🎉`)
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '📊 Level', value: `${currentLevel} → **${newLevel}**`, inline: true },
                    { name: '✨ Total XP', value: `${userData.totalXp}`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: config.defaults.footerText });

            await levelUpChannel.send({ embeds: [embed] }).catch(() => {});

            // Check for XP role rewards
            const xpRoles = settings.xpRoles || {};
            const roleId = xpRoles[String(newLevel)];
            if (roleId) {
                const member = await message.guild.members.fetch(userId).catch(() => null);
                if (member) {
                    const role = message.guild.roles.cache.get(roleId);
                    if (role) {
                        await member.roles.add(role, `Level ${newLevel} XP reward`).catch(() => {});
                    }
                }
            }
        }
    },
};

async function runAutoMod(message, autoMod) {
    const rules = autoMod.rules || {};

    // Anti-spam links rule
    if (rules.noLinks) {
        const urlRegex = /https?:\/\/[^\s]+/gi;
        if (urlRegex.test(message.content)) {
            await message.delete().catch(() => {});
            await message.channel.send({
                content: `${message.author} Links tidak diperbolehkan di channel ini! ❌`,
            }).then((m) => setTimeout(() => m.delete().catch(() => {}), 5000));
            return true;
        }
    }

    // Anti-caps rule (>70% caps and > 10 chars)
    if (rules.antiCaps && message.content.length > 10) {
        const upperCount = (message.content.match(/[A-Z]/g) || []).length;
        const letterCount = (message.content.match(/[a-zA-Z]/g) || []).length;
        if (letterCount > 0 && upperCount / letterCount > 0.7) {
            await message.delete().catch(() => {});
            await message.channel.send({
                content: `${message.author} Tolong jangan gunakan caps lock berlebihan! ❌`,
            }).then((m) => setTimeout(() => m.delete().catch(() => {}), 5000));
            return true;
        }
    }

    // Anti-mention spam (>5 mentions)
    if (rules.antiMentionSpam) {
        const mentions = message.mentions.users.size + message.mentions.roles.size;
        if (mentions > 5) {
            await message.delete().catch(() => {});
            await message.channel.send({
                content: `${message.author} Terlalu banyak mention sekaligus! ❌`,
            }).then((m) => setTimeout(() => m.delete().catch(() => {}), 5000));
            return true;
        }
    }

    // Bad words filter
    if (rules.badWords && Array.isArray(rules.badWordList) && rules.badWordList.length > 0) {
        const lower = message.content.toLowerCase();
        const found = rules.badWordList.some((w) => lower.includes(w.toLowerCase()));
        if (found) {
            await message.delete().catch(() => {});
            await message.channel.send({
                content: `${message.author} Pesan kamu mengandung kata yang tidak diperbolehkan! ❌`,
            }).then((m) => setTimeout(() => m.delete().catch(() => {}), 5000));
            return true;
        }
    }

    return false;
}
