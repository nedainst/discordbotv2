const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Tampilkan informasi lengkap tentang user')
        .addUserOption((opt) => opt.setName('user').setDescription('User yang ingin dilihat (default: kamu)').setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        const createdAt = Math.floor(user.createdTimestamp / 1000);

        const embed = new EmbedBuilder()
            .setColor(member?.displayHexColor || config.colors.primary)
            .setTitle(`${config.emojis.member} User Info`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '👤 Username', value: `${user.tag}`, inline: true },
                { name: '🆔 ID', value: `\`${user.id}\``, inline: true },
                { name: '🤖 Bot', value: user.bot ? 'Yes' : 'No', inline: true },
                { name: '📅 Account Created', value: `<t:${createdAt}:F>\n(<t:${createdAt}:R>)`, inline: true }
            );

        if (member) {
            const joinedAt = Math.floor(member.joinedTimestamp / 1000);
            const roles = member.roles.cache
                .filter((r) => r.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map((r) => r.toString());

            const roleList = roles.length > 0 ? roles.join(', ') : 'None';
            const truncatedRoles = roleList.length > 1024 ? roleList.substring(0, 1020) + '...' : roleList;

            embed.addFields(
                { name: '📥 Joined Server', value: `<t:${joinedAt}:F>\n(<t:${joinedAt}:R>)`, inline: true },
                { name: '🎨 Display Color', value: member.displayHexColor, inline: true },
                { name: '👑 Highest Role', value: `${member.roles.highest}`, inline: true },
                { name: `🏷️ Roles (${roles.length})`, value: truncatedRoles, inline: false }
            );

            // Permissions
            const keyPerms = [];
            const permChecks = {
                Administrator: 'Administrator',
                ManageGuild: 'Manage Server',
                ManageRoles: 'Manage Roles',
                ManageChannels: 'Manage Channels',
                ManageMessages: 'Manage Messages',
                KickMembers: 'Kick Members',
                BanMembers: 'Ban Members',
                MentionEveryone: 'Mention Everyone',
            };

            for (const [perm, label] of Object.entries(permChecks)) {
                if (member.permissions.has(perm)) {
                    keyPerms.push(`✅ ${label}`);
                }
            }

            if (keyPerms.length > 0) {
                embed.addFields({ name: '🔑 Key Permissions', value: keyPerms.join('\n'), inline: false });
            }
        }

        // User banner (if fetch succeeds)
        try {
            const fetchedUser = await user.fetch();
            if (fetchedUser.bannerURL()) {
                embed.setImage(fetchedUser.bannerURL({ dynamic: true, size: 512 }));
            }
        } catch {
            // No banner
        }

        embed.setTimestamp().setFooter({ text: config.defaults.footerText });

        await interaction.reply({ embeds: [embed] });
    },
};
