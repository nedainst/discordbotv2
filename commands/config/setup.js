const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    StringSelectMenuBuilder,
    EmbedBuilder,
} = require('discord.js');
const config = require('../../config.json');
const dataManager = require('../../utils/dataManager');
const embedPresets = require('../../utils/embedPresets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Konfigurasi bot untuk server ini')
        .addSubcommand((sub) => sub.setName('welcome').setDescription('Setup welcome message channel'))
        .addSubcommand((sub) => sub.setName('log').setDescription('Setup log channel'))
        .addSubcommand((sub) => sub.setName('view').setDescription('Lihat konfigurasi saat ini'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'welcome') {
            const channelSelect = new ChannelSelectMenuBuilder()
                .setCustomId('setup:welcome_channel')
                .setPlaceholder('Pilih channel untuk welcome message...')
                .setChannelTypes(ChannelType.GuildText);

            const row = new ActionRowBuilder().addComponents(channelSelect);

            const settings = dataManager.getGuildSettings(interaction.guild.id);
            const currentChannel = settings.welcomeChannel ? `<#${settings.welcomeChannel}>` : '*Not set*';

            const embed = embedPresets.info(
                'Setup Welcome Channel',
                `Channel saat ini: ${currentChannel}\n\nPilih channel baru dari menu di bawah:`
            );

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        } else if (sub === 'log') {
            const channelSelect = new ChannelSelectMenuBuilder()
                .setCustomId('setup:log_channel')
                .setPlaceholder('Pilih channel untuk log...')
                .setChannelTypes(ChannelType.GuildText);

            const row = new ActionRowBuilder().addComponents(channelSelect);

            const settings = dataManager.getGuildSettings(interaction.guild.id);
            const currentChannel = settings.logChannel ? `<#${settings.logChannel}>` : '*Not set*';

            const embed = embedPresets.info(
                'Setup Log Channel',
                `Channel saat ini: ${currentChannel}\n\nPilih channel baru dari menu di bawah:`
            );

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        } else if (sub === 'view') {
            const settings = dataManager.getGuildSettings(interaction.guild.id);

            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`⚙️ Server Configuration — ${interaction.guild.name}`)
                .addFields(
                    {
                        name: '👋 Welcome Channel',
                        value: settings.welcomeChannel ? `<#${settings.welcomeChannel}>` : '*Not set*',
                        inline: true,
                    },
                    {
                        name: '📋 Log Channel',
                        value: settings.logChannel ? `<#${settings.logChannel}>` : '*Not set*',
                        inline: true,
                    },
                    {
                        name: '🎫 Ticket Support Role',
                        value: settings.ticketSupportRole ? `<@&${settings.ticketSupportRole}>` : '*Not set*',
                        inline: true,
                    }
                )
                .setTimestamp()
                .setFooter({ text: config.defaults.footerText });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },

    async handleSelect(interaction) {
        const parts = interaction.customId.split(':');
        const type = parts[1];

        const channelId = interaction.values[0];

        if (type === 'welcome_channel') {
            dataManager.setGuildSetting(interaction.guild.id, 'welcomeChannel', channelId);
            await interaction.update({
                embeds: [embedPresets.success('Welcome Channel Set!', `Welcome message akan dikirim ke <#${channelId}>.`)],
                components: [],
            });
        } else if (type === 'log_channel') {
            dataManager.setGuildSetting(interaction.guild.id, 'logChannel', channelId);
            await interaction.update({
                embeds: [embedPresets.success('Log Channel Set!', `Log akan dikirim ke <#${channelId}>.`)],
                components: [],
            });
        }
    },
};
