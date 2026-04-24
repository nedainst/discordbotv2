const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const embedPresets = require('../../utils/embedPresets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Lock atau unlock channel agar tidak bisa kirim pesan')
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel target (default: channel ini)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const everyoneRole = interaction.guild.roles.everyone;
        const currentPerm = channel.permissionsFor(everyoneRole);
        const isLocked = currentPerm.has(PermissionsBitField.Flags.SendMessages) === false;

        if (isLocked) {
            // Unlock
            await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: null }, { reason: `Unlocked by ${interaction.user.tag}` });

            const embed = embedPresets.success('🔓 Channel Unlocked!', `${channel} sudah dibuka kembali. Semua member bisa mengirim pesan.`);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`lock:toggle:${channel.id}`).setLabel('Lock Lagi').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        } else {
            // Lock
            await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false }, { reason: `Locked by ${interaction.user.tag}` });

            const embed = embedPresets.warning('🔒 Channel Locked!', `${channel} telah dikunci. Hanya staff yang bisa mengirim pesan.`);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`lock:toggle:${channel.id}`).setLabel('Unlock').setStyle(ButtonStyle.Success).setEmoji('🔓')
            );

            await interaction.reply({ embeds: [embed], components: [row] });

            // Announce in the locked channel
            if (channel.id !== interaction.channel.id) {
                await channel.send({ embeds: [embedPresets.warning('🔒 Channel Locked', 'Channel ini telah dikunci oleh staff.')] }).catch(() => {});
            }
        }
    },

    async handleButton(interaction) {
        const channelId = interaction.customId.split(':')[2];
        const channel = interaction.guild.channels.cache.get(channelId);

        if (!channel) {
            return interaction.update({ embeds: [embedPresets.error('Error', 'Channel tidak ditemukan.')], components: [] });
        }

        const everyoneRole = interaction.guild.roles.everyone;
        const currentPerm = channel.permissionsFor(everyoneRole);
        const isLocked = currentPerm.has(PermissionsBitField.Flags.SendMessages) === false;

        if (isLocked) {
            await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: null }, { reason: `Unlocked by ${interaction.user.tag}` });
            const embed = embedPresets.success('🔓 Channel Unlocked!', `${channel} sudah dibuka kembali.`);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`lock:toggle:${channel.id}`).setLabel('Lock Lagi').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );
            await interaction.update({ embeds: [embed], components: [row] });
        } else {
            await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false }, { reason: `Locked by ${interaction.user.tag}` });
            const embed = embedPresets.warning('🔒 Channel Locked!', `${channel} telah dikunci.`);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`lock:toggle:${channel.id}`).setLabel('Unlock').setStyle(ButtonStyle.Success).setEmoji('🔓')
            );
            await interaction.update({ embeds: [embed], components: [row] });
        }
    },
};
