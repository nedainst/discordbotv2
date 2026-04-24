const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Tampilkan avatar user')
        .addUserOption((opt) => opt.setName('user').setDescription('User yang ingin dilihat avatar-nya').setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        const globalAvatar = user.displayAvatarURL({ dynamic: true, size: 4096 });

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`🖼️ Avatar — ${user.tag}`)
            .setImage(globalAvatar)
            .setTimestamp()
            .setFooter({ text: config.defaults.footerText });

        const buttons = [
            new ButtonBuilder().setLabel('Open in Browser').setStyle(ButtonStyle.Link).setURL(globalAvatar).setEmoji('🔗'),
        ];

        // Check if member has server-specific avatar
        if (member && member.avatar) {
            const serverAvatar = member.displayAvatarURL({ dynamic: true, size: 4096 });

            buttons.unshift(
                new ButtonBuilder()
                    .setCustomId(`avatar:global:${user.id}`)
                    .setLabel('Global Avatar')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🌍'),
                new ButtonBuilder()
                    .setCustomId(`avatar:server:${user.id}`)
                    .setLabel('Server Avatar')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏠')
            );
        }

        const row = new ActionRowBuilder().addComponents(buttons);

        await interaction.reply({ embeds: [embed], components: [row] });
    },

    async handleButton(interaction) {
        const parts = interaction.customId.split(':');
        const type = parts[1];
        const userId = parts[2];

        const user = await interaction.client.users.fetch(userId).catch(() => null);
        if (!user) {
            return interaction.update({
                embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ User tidak ditemukan.')],
                components: [],
            });
        }

        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        let avatarUrl;

        if (type === 'server' && member?.avatar) {
            avatarUrl = member.displayAvatarURL({ dynamic: true, size: 4096 });
        } else {
            avatarUrl = user.displayAvatarURL({ dynamic: true, size: 4096 });
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`🖼️ ${type === 'server' ? 'Server' : 'Global'} Avatar — ${user.tag}`)
            .setImage(avatarUrl)
            .setTimestamp()
            .setFooter({ text: config.defaults.footerText });

        const buttons = [
            new ButtonBuilder().setLabel('Open in Browser').setStyle(ButtonStyle.Link).setURL(avatarUrl).setEmoji('🔗'),
        ];

        if (member?.avatar) {
            buttons.unshift(
                new ButtonBuilder()
                    .setCustomId(`avatar:global:${user.id}`)
                    .setLabel('Global Avatar')
                    .setStyle(type === 'global' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setEmoji('🌍'),
                new ButtonBuilder()
                    .setCustomId(`avatar:server:${user.id}`)
                    .setLabel('Server Avatar')
                    .setStyle(type === 'server' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setEmoji('🏠')
            );
        }

        const row = new ActionRowBuilder().addComponents(buttons);

        await interaction.update({ embeds: [embed], components: [row] });
    },
};
