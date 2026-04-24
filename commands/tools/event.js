const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require('discord.js');
const dataManager = require('../../utils/dataManager');
const embedPresets = require('../../utils/embedPresets');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('event')
        .setDescription('Buat event server dengan sistem RSVP')
        .addSubcommand((sub) => sub.setName('create').setDescription('Buat event baru'))
        .addSubcommand((sub) =>
            sub
                .setName('cancel')
                .setDescription('Batalkan event')
                .addStringOption((opt) => opt.setName('message_id').setDescription('Message ID event').setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'create') {
            const modal = new ModalBuilder().setCustomId('event:create').setTitle('📅 Create Server Event');

            const fields = [
                new TextInputBuilder().setCustomId('event_name').setLabel('Nama Event').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100),
                new TextInputBuilder().setCustomId('event_desc').setLabel('Deskripsi').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000),
                new TextInputBuilder().setCustomId('event_date').setLabel('Tanggal & Waktu (contoh: 25 Apr 2026, 20:00 WIB)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50),
                new TextInputBuilder().setCustomId('event_location').setLabel('Lokasi / Link (opsional)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(200),
                new TextInputBuilder().setCustomId('event_maxslots').setLabel('Slot maksimal (0 = unlimited)').setPlaceholder('0').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(5),
            ];

            modal.addComponents(fields.map((f) => new ActionRowBuilder().addComponents(f)));
            await interaction.showModal(modal);
        } else if (sub === 'cancel') {
            const messageId = interaction.options.getString('message_id');
            const events = dataManager.getEvents(interaction.guild.id);
            const ev = events[messageId];

            if (!ev) return interaction.reply({ embeds: [embedPresets.error('Not Found', 'Event tidak ditemukan.')], flags: 64 });

            try {
                const channel = interaction.guild.channels.cache.get(ev.channelId);
                const msg = await channel?.messages.fetch(messageId).catch(() => null);
                if (msg) {
                    const cancelEmbed = EmbedBuilder.from(msg.embeds[0]).setColor(config.colors.danger).setTitle(`❌ CANCELLED — ${ev.name}`);
                    await msg.edit({ embeds: [cancelEmbed], components: [] });
                }
            } catch { /* ignore */ }

            dataManager.removeEvent(interaction.guild.id, messageId);
            await interaction.reply({ embeds: [embedPresets.success('Event Cancelled', 'Event berhasil dibatalkan.')], flags: 64 });
        }
    },

    async handleModal(interaction) {
        const name = interaction.fields.getTextInputValue('event_name');
        const desc = interaction.fields.getTextInputValue('event_desc');
        const date = interaction.fields.getTextInputValue('event_date');
        const location = interaction.fields.getTextInputValue('event_location') || null;
        const maxSlots = parseInt(interaction.fields.getTextInputValue('event_maxslots')) || 0;

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`📅 ${name}`)
            .setDescription(desc)
            .addFields(
                { name: '📆 Waktu', value: date, inline: true },
                { name: '👥 RSVP', value: `0${maxSlots > 0 ? `/${maxSlots}` : ''} peserta`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Dibuat oleh ${interaction.user.tag} • ${config.defaults.footerText}` });

        if (location) embed.addFields({ name: '📍 Lokasi', value: location, inline: false });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('event:join').setLabel('✅ Join').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('event:leave').setLabel('❌ Leave').setStyle(ButtonStyle.Secondary)
        );

        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        dataManager.setEvent(interaction.guild.id, msg.id, {
            name,
            desc,
            date,
            location,
            maxSlots,
            channelId: interaction.channel.id,
            hostId: interaction.user.id,
            attendees: [],
        });
    },

    async handleButton(interaction) {
        const action = interaction.customId.split(':')[1];
        const messageId = interaction.message.id;
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        const events = dataManager.getEvents(guildId);
        const ev = events[messageId];

        if (!ev) return interaction.reply({ content: '❌ Event tidak ditemukan.', flags: 64 });

        if (action === 'join') {
            if (ev.attendees.includes(userId)) {
                return interaction.reply({ content: '⚠️ Kamu sudah join event ini!', flags: 64 });
            }
            if (ev.maxSlots > 0 && ev.attendees.length >= ev.maxSlots) {
                return interaction.reply({ content: `❌ Slot penuh! (${ev.attendees.length}/${ev.maxSlots})`, flags: 64 });
            }

            ev.attendees.push(userId);
            dataManager.setEvent(guildId, messageId, ev);

            const embed = EmbedBuilder.from(interaction.message.embeds[0]);
            const fields = [...embed.data.fields];
            const rsvpIdx = fields.findIndex((f) => f.name === '👥 RSVP');
            if (rsvpIdx !== -1) {
                fields[rsvpIdx] = { name: '👥 RSVP', value: `${ev.attendees.length}${ev.maxSlots > 0 ? `/${ev.maxSlots}` : ''} peserta`, inline: true };
                embed.setFields(fields);
            }

            await interaction.update({ embeds: [embed] });
            await interaction.followUp({ content: `✅ Kamu berhasil join event **${ev.name}**!`, flags: 64 });
        } else if (action === 'leave') {
            if (!ev.attendees.includes(userId)) {
                return interaction.reply({ content: '⚠️ Kamu belum join event ini.', flags: 64 });
            }

            ev.attendees = ev.attendees.filter((id) => id !== userId);
            dataManager.setEvent(guildId, messageId, ev);

            const embed = EmbedBuilder.from(interaction.message.embeds[0]);
            const fields = [...embed.data.fields];
            const rsvpIdx = fields.findIndex((f) => f.name === '👥 RSVP');
            if (rsvpIdx !== -1) {
                fields[rsvpIdx] = { name: '👥 RSVP', value: `${ev.attendees.length}${ev.maxSlots > 0 ? `/${ev.maxSlots}` : ''} peserta`, inline: true };
                embed.setFields(fields);
            }

            await interaction.update({ embeds: [embed] });
            await interaction.followUp({ content: `❌ Kamu keluar dari event **${ev.name}**.`, flags: 64 });
        }
    },
};
