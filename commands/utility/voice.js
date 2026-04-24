const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
} = require('discord.js');
const embedPresets = require('../../utils/embedPresets');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice')
        .setDescription('Kontrol private voice room kamu')
        .addSubcommand((sub) =>
            sub.setName('lock').setDescription('Lock room — hanya orang yang sudah di dalam bisa join')
        )
        .addSubcommand((sub) =>
            sub.setName('unlock').setDescription('Unlock room — semua bisa join')
        )
        .addSubcommand((sub) =>
            sub
                .setName('rename')
                .setDescription('Rename voice room kamu')
                .addStringOption((opt) =>
                    opt.setName('name').setDescription('Nama baru').setRequired(true).setMaxLength(100)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('limit')
                .setDescription('Set user limit')
                .addIntegerOption((opt) =>
                    opt.setName('max').setDescription('Maksimum user (0 = no limit)').setMinValue(0).setMaxValue(99).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('invite')
                .setDescription('Invite user ke room (bahkan jika locked)')
                .addUserOption((opt) => opt.setName('user').setDescription('User yang diinvite').setRequired(true))
        )
        .addSubcommand((sub) =>
            sub
                .setName('kick')
                .setDescription('Kick user dari room kamu')
                .addUserOption((opt) => opt.setName('user').setDescription('User yang dikick').setRequired(true))
        )
        .addSubcommand((sub) =>
            sub.setName('hide').setDescription('Hide room dari channel list')
        )
        .addSubcommand((sub) =>
            sub.setName('show').setDescription('Show room di channel list')
        )
        .addSubcommand((sub) =>
            sub
                .setName('transfer')
                .setDescription('Transfer ownership room ke user lain')
                .addUserOption((opt) => opt.setName('user').setDescription('Owner baru').setRequired(true))
        )
        .addSubcommand((sub) =>
            sub.setName('info').setDescription('Info tentang room kamu saat ini')
        ),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const member = interaction.member;

        // Get temp channels from voiceStateUpdate event
        const vsEvent = client.events?.get('voiceStateUpdate');
        const tempChannels = vsEvent?.tempChannels || getTempChannels(client);

        if (!tempChannels) {
            return interaction.reply({ embeds: [embedPresets.error('Error', 'Sistem Private VC tidak tersedia.')], flags: 64 });
        }

        // Check if user is in a temp channel
        const voiceChannel = member.voice.channel;
        if (!voiceChannel || !tempChannels.has(voiceChannel.id)) {
            return interaction.reply({
                embeds: [embedPresets.error('Not in Room', 'Kamu tidak sedang berada di private voice room.')],
                flags: 64,
            });
        }

        const roomData = tempChannels.get(voiceChannel.id);
        const isOwner = roomData.ownerId === member.id;

        // Only owner can manage (except claim)
        if (!isOwner && sub !== 'info' && sub !== 'claim') {
            return interaction.reply({
                embeds: [embedPresets.error('Not Owner', 'Hanya owner room yang bisa mengontrol room ini.')],
                flags: 64,
            });
        }

        switch (sub) {
            case 'lock': {
                await voiceChannel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
                await interaction.reply({
                    embeds: [embedPresets.success('🔒 Room Locked', 'Hanya orang yang sudah di dalam yang bisa join.')],
                    flags: 64,
                });
                break;
            }

            case 'unlock': {
                await voiceChannel.permissionOverwrites.edit(interaction.guild.id, { Connect: true });
                await interaction.reply({
                    embeds: [embedPresets.success('🔓 Room Unlocked', 'Semua orang bisa join sekarang.')],
                    flags: 64,
                });
                break;
            }

            case 'rename': {
                const name = interaction.options.getString('name');
                await voiceChannel.setName(name);
                await interaction.reply({
                    embeds: [embedPresets.success('✏️ Renamed', `Room renamed ke **${name}**`)],
                    flags: 64,
                });
                break;
            }

            case 'limit': {
                const max = interaction.options.getInteger('max');
                await voiceChannel.setUserLimit(max);
                await interaction.reply({
                    embeds: [embedPresets.success('👥 Limit Updated', max > 0 ? `Limit: **${max}** user` : 'Limit dihapus (unlimited).')],
                    flags: 64,
                });
                break;
            }

            case 'invite': {
                const user = interaction.options.getUser('user');
                await voiceChannel.permissionOverwrites.edit(user.id, { Connect: true, ViewChannel: true });
                await interaction.reply({
                    embeds: [embedPresets.success('✅ Invited', `${user} diizinkan masuk ke room ini.`)],
                    flags: 64,
                });

                // Try to DM the user
                try {
                    const inviteEmbed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('🎧 Voice Room Invitation')
                        .setDescription(`${member} mengundang kamu ke voice room mereka di **${interaction.guild.name}**!`)
                        .setTimestamp();
                    await user.send({ embeds: [inviteEmbed] }).catch(() => {});
                } catch { /* ignore */ }
                break;
            }

            case 'kick': {
                const target = interaction.options.getUser('kick')
                    || interaction.options.getUser('user');
                const targetMember = interaction.guild.members.cache.get(target.id);

                if (!targetMember || !targetMember.voice.channel || targetMember.voice.channel.id !== voiceChannel.id) {
                    return interaction.reply({ embeds: [embedPresets.error('Error', 'User tidak berada di room ini.')], flags: 64 });
                }

                await targetMember.voice.disconnect('Kicked from private VC by owner');
                await voiceChannel.permissionOverwrites.edit(target.id, { Connect: false });
                await interaction.reply({
                    embeds: [embedPresets.success('👢 Kicked', `${target} dikick dari room dan tidak bisa join kembali.`)],
                    flags: 64,
                });
                break;
            }

            case 'hide': {
                await voiceChannel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false });
                await interaction.reply({
                    embeds: [embedPresets.success('👻 Hidden', 'Room disembunyikan dari channel list.')],
                    flags: 64,
                });
                break;
            }

            case 'show': {
                await voiceChannel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: true });
                await interaction.reply({
                    embeds: [embedPresets.success('👁️ Visible', 'Room sekarang terlihat di channel list.')],
                    flags: 64,
                });
                break;
            }

            case 'transfer': {
                const newOwner = interaction.options.getUser('user');
                roomData.ownerId = newOwner.id;

                // Give new owner full perms
                await voiceChannel.permissionOverwrites.edit(newOwner.id, {
                    Connect: true,
                    Speak: true,
                    MuteMembers: true,
                    DeafenMembers: true,
                    MoveMembers: true,
                    ManageChannels: true,
                    Stream: true,
                });

                await interaction.reply({
                    embeds: [embedPresets.success('👑 Transferred', `Ownership room ditransfer ke ${newOwner}.`)],
                    flags: 64,
                });
                break;
            }

            case 'info': {
                const owner = await interaction.guild.members.fetch(roomData.ownerId).catch(() => null);
                const createdAt = Math.floor(roomData.createdAt / 1000);
                const isLocked = voiceChannel.permissionOverwrites.cache.get(interaction.guild.id)?.deny?.has(PermissionFlagsBits.Connect);

                const embed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle(`🎧 ${voiceChannel.name}`)
                    .addFields(
                        { name: '👑 Owner', value: owner ? `${owner}` : 'Unknown', inline: true },
                        { name: '🔒 Status', value: isLocked ? 'Locked' : 'Unlocked', inline: true },
                        { name: '👥 Members', value: `${voiceChannel.members.size}${voiceChannel.userLimit ? `/${voiceChannel.userLimit}` : ''}`, inline: true },
                        { name: '📅 Created', value: `<t:${createdAt}:R>`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: config.defaults.footerText });

                await interaction.reply({ embeds: [embed], flags: 64 });
                break;
            }
        }
    },

    // ── Button Handlers ───────────────────────────────
    async handleButton(interaction) {
        const parts = interaction.customId.split(':');
        const action = parts[1];
        const channelId = parts[2];
        const member = interaction.member;
        const guild = interaction.guild;

        // Get tempChannels from the event module
        let tempChannels;
        try {
            const vsModule = require('../events/voiceStateUpdate.js');
            tempChannels = vsModule.tempChannels;
        } catch {
            return interaction.reply({ content: '❌ Error loading voice system.', flags: 64 });
        }

        if (!tempChannels.has(channelId)) {
            return interaction.reply({ content: '❌ Room ini sudah tidak ada.', flags: 64 });
        }

        const roomData = tempChannels.get(channelId);
        const isOwner = roomData.ownerId === member.id;
        const voiceChannel = guild.channels.cache.get(channelId);

        if (!voiceChannel) {
            tempChannels.delete(channelId);
            return interaction.reply({ content: '❌ Channel tidak ditemukan.', flags: 64 });
        }

        switch (action) {
            case 'lock': {
                if (!isOwner) return interaction.reply({ content: '❌ Hanya owner yang bisa melakukan ini.', flags: 64 });
                await voiceChannel.permissionOverwrites.edit(guild.id, { Connect: false });
                await interaction.reply({ embeds: [embedPresets.success('🔒 Locked', 'Room telah dikunci.')], flags: 64 });
                break;
            }

            case 'unlock': {
                if (!isOwner) return interaction.reply({ content: '❌ Hanya owner yang bisa melakukan ini.', flags: 64 });
                await voiceChannel.permissionOverwrites.edit(guild.id, { Connect: true });
                await interaction.reply({ embeds: [embedPresets.success('🔓 Unlocked', 'Room telah dibuka.')], flags: 64 });
                break;
            }

            case 'rename': {
                if (!isOwner) return interaction.reply({ content: '❌ Hanya owner.', flags: 64 });

                const modal = new ModalBuilder()
                    .setCustomId(`voice:rename_modal:${channelId}`)
                    .setTitle('✏️ Rename Voice Room');

                const input = new TextInputBuilder()
                    .setCustomId('new_name')
                    .setLabel('Nama baru room')
                    .setPlaceholder('My Cool Room')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(100);

                modal.addComponents(new ActionRowBuilder().addComponents(input));
                await interaction.showModal(modal);
                break;
            }

            case 'limit': {
                if (!isOwner) return interaction.reply({ content: '❌ Hanya owner.', flags: 64 });

                const modal = new ModalBuilder()
                    .setCustomId(`voice:limit_modal:${channelId}`)
                    .setTitle('👥 Set User Limit');

                const input = new TextInputBuilder()
                    .setCustomId('user_limit')
                    .setLabel('Max users (0 = no limit)')
                    .setPlaceholder('5')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(2);

                modal.addComponents(new ActionRowBuilder().addComponents(input));
                await interaction.showModal(modal);
                break;
            }

            case 'hide': {
                if (!isOwner) return interaction.reply({ content: '❌ Hanya owner.', flags: 64 });
                await voiceChannel.permissionOverwrites.edit(guild.id, { ViewChannel: false });
                await interaction.reply({ embeds: [embedPresets.success('👻 Hidden', 'Room disembunyikan.')], flags: 64 });
                break;
            }

            case 'show': {
                if (!isOwner) return interaction.reply({ content: '❌ Hanya owner.', flags: 64 });
                await voiceChannel.permissionOverwrites.edit(guild.id, { ViewChannel: true });
                await interaction.reply({ embeds: [embedPresets.success('👁️ Visible', 'Room terlihat kembali.')], flags: 64 });
                break;
            }

            case 'claim': {
                // If owner left the channel, someone else can claim it
                const ownerInChannel = voiceChannel.members.has(roomData.ownerId);
                if (ownerInChannel) {
                    return interaction.reply({ content: '❌ Owner masih ada di room ini.', flags: 64 });
                }
                if (!member.voice.channel || member.voice.channel.id !== channelId) {
                    return interaction.reply({ content: '❌ Kamu harus berada di room ini.', flags: 64 });
                }

                roomData.ownerId = member.id;

                await voiceChannel.permissionOverwrites.edit(member.id, {
                    Connect: true,
                    Speak: true,
                    MuteMembers: true,
                    DeafenMembers: true,
                    MoveMembers: true,
                    ManageChannels: true,
                    Stream: true,
                });

                await interaction.reply({
                    embeds: [embedPresets.success('👑 Claimed!', `${member} adalah owner baru room ini.`)],
                    flags: 64,
                });
                break;
            }
        }
    },

    // ── Modal Handlers ────────────────────────────────
    async handleModal(interaction) {
        const parts = interaction.customId.split(':');
        const action = parts[1];
        const channelId = parts[2];
        const guild = interaction.guild;

        let tempChannels;
        try {
            const vsModule = require('../events/voiceStateUpdate.js');
            tempChannels = vsModule.tempChannels;
        } catch {
            return interaction.reply({ content: '❌ Error.', flags: 64 });
        }

        if (!tempChannels.has(channelId)) {
            return interaction.reply({ content: '❌ Room sudah tidak ada.', flags: 64 });
        }

        const roomData = tempChannels.get(channelId);
        if (roomData.ownerId !== interaction.user.id) {
            return interaction.reply({ content: '❌ Hanya owner.', flags: 64 });
        }

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return interaction.reply({ content: '❌ Channel tidak ditemukan.', flags: 64 });

        if (action === 'rename_modal') {
            const newName = interaction.fields.getTextInputValue('new_name');
            await channel.setName(newName);
            await interaction.reply({
                embeds: [embedPresets.success('✏️ Renamed', `Room diubah menjadi **${newName}**`)],
                flags: 64,
            });
        } else if (action === 'limit_modal') {
            const limitStr = interaction.fields.getTextInputValue('user_limit');
            const limit = parseInt(limitStr, 10);
            if (isNaN(limit) || limit < 0 || limit > 99) {
                return interaction.reply({ content: '❌ Masukkan angka 0-99.', flags: 64 });
            }
            await channel.setUserLimit(limit);
            await interaction.reply({
                embeds: [embedPresets.success('👥 Limit Set', limit > 0 ? `Limit: **${limit}** user` : 'Limit dihapus.')],
                flags: 64,
            });
        }
    },
};

// Fallback helper to find tempChannels from event files
function getTempChannels(client) {
    try {
        const vsModule = require('../events/voiceStateUpdate.js');
        return vsModule.tempChannels;
    } catch {
        return null;
    }
}
