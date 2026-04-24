const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
} = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Tampilkan informasi lengkap tentang server'),

    async execute(interaction) {
        const guild = interaction.guild;
        await guild.members.fetch().catch(() => {});

        const embed = buildOverviewEmbed(guild);
        const row = buildTabRow('overview');

        await interaction.reply({ embeds: [embed], components: [row] });
    },

    async handleButton(interaction) {
        const tab = interaction.customId.split(':')[1];
        const guild = interaction.guild;

        let embed;
        switch (tab) {
            case 'overview':
                embed = buildOverviewEmbed(guild);
                break;
            case 'members':
                embed = buildMembersEmbed(guild);
                break;
            case 'channels':
                embed = buildChannelsEmbed(guild);
                break;
            case 'roles':
                embed = buildRolesEmbed(guild);
                break;
            default:
                embed = buildOverviewEmbed(guild);
        }

        const row = buildTabRow(tab);

        await interaction.update({ embeds: [embed], components: [row] });
    },
};

function buildTabRow(active) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('serverinfo:overview')
            .setLabel('Overview')
            .setStyle(active === 'overview' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('📋'),
        new ButtonBuilder()
            .setCustomId('serverinfo:members')
            .setLabel('Members')
            .setStyle(active === 'members' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('👥'),
        new ButtonBuilder()
            .setCustomId('serverinfo:channels')
            .setLabel('Channels')
            .setStyle(active === 'channels' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('📝'),
        new ButtonBuilder()
            .setCustomId('serverinfo:roles')
            .setLabel('Roles')
            .setStyle(active === 'roles' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('🏷️')
    );
}

function buildOverviewEmbed(guild) {
    const createdAt = Math.floor(guild.createdTimestamp / 1000);
    const verificationLevels = { 0: 'None', 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Very High' };

    const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`${config.emojis.crown} ${guild.name}`)
        .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
        .addFields(
            { name: '👤 Owner', value: `<@${guild.ownerId}>`, inline: true },
            { name: '📅 Created', value: `<t:${createdAt}:R>`, inline: true },
            { name: '🛡️ Verification', value: verificationLevels[guild.verificationLevel] || 'Unknown', inline: true },
            { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
            { name: '📝 Channels', value: `${guild.channels.cache.size}`, inline: true },
            { name: '🏷️ Roles', value: `${guild.roles.cache.size}`, inline: true },
            { name: '😀 Emojis', value: `${guild.emojis.cache.size}`, inline: true },
            { name: '🔰 Boost Level', value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boosts)`, inline: true },
            { name: '🆔 Server ID', value: `\`${guild.id}\``, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `${config.defaults.footerText} • Overview` });

    if (guild.bannerURL()) {
        embed.setImage(guild.bannerURL({ size: 1024 }));
    }

    return embed;
}

function buildMembersEmbed(guild) {
    const members = guild.members.cache;
    const humans = members.filter((m) => !m.user.bot).size;
    const bots = members.filter((m) => m.user.bot).size;
    const online = members.filter((m) => m.presence?.status === 'online').size;
    const idle = members.filter((m) => m.presence?.status === 'idle').size;
    const dnd = members.filter((m) => m.presence?.status === 'dnd').size;
    const offline = members.filter(
        (m) => !m.presence || m.presence.status === 'offline'
    ).size;

    return new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`👥 Members — ${guild.name}`)
        .addFields(
            { name: '👥 Total', value: `${guild.memberCount}`, inline: true },
            { name: '👤 Humans', value: `${humans}`, inline: true },
            { name: '🤖 Bots', value: `${bots}`, inline: true },
            { name: '🟢 Online', value: `${online}`, inline: true },
            { name: '🟡 Idle', value: `${idle}`, inline: true },
            { name: '🔴 DND', value: `${dnd}`, inline: true },
            { name: '⚫ Offline', value: `${offline}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `${config.defaults.footerText} • Members` });
}

function buildChannelsEmbed(guild) {
    const channels = guild.channels.cache;
    const text = channels.filter((c) => c.type === ChannelType.GuildText).size;
    const voice = channels.filter((c) => c.type === ChannelType.GuildVoice).size;
    const categories = channels.filter((c) => c.type === ChannelType.GuildCategory).size;
    const forums = channels.filter((c) => c.type === ChannelType.GuildForum).size;
    const stages = channels.filter((c) => c.type === ChannelType.GuildStageVoice).size;
    const announcements = channels.filter((c) => c.type === ChannelType.GuildAnnouncement).size;

    return new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`📝 Channels — ${guild.name}`)
        .addFields(
            { name: '📊 Total', value: `${channels.size}`, inline: true },
            { name: '💬 Text', value: `${text}`, inline: true },
            { name: '🔊 Voice', value: `${voice}`, inline: true },
            { name: '📁 Categories', value: `${categories}`, inline: true },
            { name: '📢 Announcements', value: `${announcements}`, inline: true },
            { name: '🎭 Stages', value: `${stages}`, inline: true },
            { name: '💬 Forums', value: `${forums}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `${config.defaults.footerText} • Channels` });
}

function buildRolesEmbed(guild) {
    const roles = guild.roles.cache
        .sort((a, b) => b.position - a.position)
        .filter((r) => r.id !== guild.id)
        .map((r) => r.toString());

    const roleList = roles.length > 0 ? roles.join(', ') : 'No roles';
    const truncated = roleList.length > 1024 ? roleList.substring(0, 1020) + '...' : roleList;

    return new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`🏷️ Roles — ${guild.name}`)
        .setDescription(`Total: **${roles.length}** roles`)
        .addFields({ name: 'Roles', value: truncated, inline: false })
        .setTimestamp()
        .setFooter({ text: `${config.defaults.footerText} • Roles` });
}
