const { Events, ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../utils/logger');
const dataManager = require('../utils/dataManager');

// In-memory map: tempChannelId -> { ownerId, createdAt }
const tempChannels = new Map();

module.exports = {
    name: Events.VoiceStateUpdate,
    once: false,
    tempChannels, // export for /voice command access

    async execute(oldState, newState, client) {
        const guild = newState.guild || oldState.guild;
        if (!guild) return;

        const settings = dataManager.getGuildSettings(guild.id);
        const hubChannelId = settings.voiceHubChannel;

        if (!hubChannelId) return;

        // ── User joined the hub channel → Create private VC ──
        if (newState.channelId === hubChannelId && oldState.channelId !== hubChannelId) {
            const member = newState.member;
            if (!member) return;

            try {
                // Find the hub channel's parent category
                const hubChannel = guild.channels.cache.get(hubChannelId);
                const parentId = hubChannel?.parentId || null;

                // Create a new temporary voice channel
                const tempChannel = await guild.channels.create({
                    name: `🔊 ${member.displayName}'s Room`,
                    type: ChannelType.GuildVoice,
                    parent: parentId,
                    userLimit: settings.voiceDefaultLimit || 0,
                    permissionOverwrites: [
                        // Owner: full control
                        {
                            id: member.id,
                            allow: [
                                PermissionFlagsBits.Connect,
                                PermissionFlagsBits.Speak,
                                PermissionFlagsBits.MuteMembers,
                                PermissionFlagsBits.DeafenMembers,
                                PermissionFlagsBits.MoveMembers,
                                PermissionFlagsBits.ManageChannels,
                                PermissionFlagsBits.Stream,
                            ],
                        },
                        // Everyone: can join by default (owner can lock later)
                        {
                            id: guild.id,
                            allow: [
                                PermissionFlagsBits.Connect,
                                PermissionFlagsBits.Speak,
                                PermissionFlagsBits.Stream,
                            ],
                        },
                    ],
                    reason: `Private VC created for ${member.user.tag}`,
                });

                // Store in map
                tempChannels.set(tempChannel.id, {
                    ownerId: member.id,
                    createdAt: Date.now(),
                    guildId: guild.id,
                });

                // Move user to the new channel
                await member.voice.setChannel(tempChannel, 'Moved to private voice room');

                logger.info(`Created private VC "${tempChannel.name}" for ${member.user.tag}`);

                // Send control panel to the voice channel chat
                const controlEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('🎧 Private Voice Room')
                    .setDescription(
                        `Selamat datang di voice room kamu, ${member}!\n\n` +
                        `Gunakan tombol di bawah untuk mengontrol room.\n` +
                        `Channel akan **otomatis dihapus** saat semua orang keluar.`
                    )
                    .addFields(
                        { name: '👑 Owner', value: `${member}`, inline: true },
                        { name: '🔓 Status', value: 'Unlocked', inline: true },
                        { name: '👥 Limit', value: settings.voiceDefaultLimit ? `${settings.voiceDefaultLimit}` : 'No limit', inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Discord Essentials • Private VC' });

                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`voice:lock:${tempChannel.id}`)
                        .setLabel('🔒 Lock')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`voice:unlock:${tempChannel.id}`)
                        .setLabel('🔓 Unlock')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`voice:rename:${tempChannel.id}`)
                        .setLabel('✏️ Rename')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`voice:limit:${tempChannel.id}`)
                        .setLabel('👥 Set Limit')
                        .setStyle(ButtonStyle.Primary),
                );

                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`voice:hide:${tempChannel.id}`)
                        .setLabel('👻 Hide')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`voice:show:${tempChannel.id}`)
                        .setLabel('👁️ Show')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`voice:claim:${tempChannel.id}`)
                        .setLabel('👑 Claim')
                        .setStyle(ButtonStyle.Secondary),
                );

                await tempChannel.send({ embeds: [controlEmbed], components: [row1, row2] }).catch(() => {});
            } catch (error) {
                logger.error(`Failed to create private VC for ${member?.user?.tag}`, error);
            }
        }

        // ── User left a temp channel → Delete if empty ──
        if (oldState.channelId && tempChannels.has(oldState.channelId)) {
            const oldChannel = guild.channels.cache.get(oldState.channelId);
            if (oldChannel && oldChannel.members.size === 0) {
                try {
                    await oldChannel.delete('Private VC empty — auto-deleted');
                    tempChannels.delete(oldState.channelId);
                    logger.info(`Deleted empty private VC "${oldChannel.name}"`);
                } catch (error) {
                    logger.error(`Failed to delete empty private VC`, error);
                }
            }
        }
    },
};
