const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ChannelType,
    PermissionsBitField,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');
const config = require('../../config.json');
const dataManager = require('../../utils/dataManager');
const embedPresets = require('../../utils/embedPresets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Sistem ticket support')
        .addSubcommand((sub) =>
            sub
                .setName('setup')
                .setDescription('Setup panel ticket di channel ini')
                .addRoleOption((opt) =>
                    opt.setName('support_role').setDescription('Role yang bisa akses ticket').setRequired(false)
                )
        )
        .addSubcommand((sub) => sub.setName('close').setDescription('Tutup ticket ini'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'setup') {
            const supportRole = interaction.options.getRole('support_role');

            // Save settings
            dataManager.setGuildSetting(interaction.guild.id, 'ticketSupportRole', supportRole?.id || null);

            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`${config.emojis.ticket} Support Ticket`)
                .setDescription(
                    'Butuh bantuan? Klik tombol di bawah untuk membuat ticket!\n\n' +
                    '**Panduan:**\n' +
                    '• Jelaskan masalahmu dengan detail\n' +
                    '• Staff akan merespon secepatnya\n' +
                    '• Jangan membuat ticket duplikat'
                )
                .setTimestamp()
                .setFooter({ text: config.defaults.footerText });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_create')
                    .setLabel('Create Ticket')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎫')
            );

            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: '✅ Panel ticket berhasil di-setup!', ephemeral: true });
        } else if (sub === 'close') {
            // Check if current channel is a ticket
            const tickets = dataManager.getTickets(interaction.guild.id);
            const ticketData = tickets[interaction.channel.id];

            if (!ticketData) {
                return interaction.reply({
                    embeds: [embedPresets.error('Error', 'Channel ini bukan ticket channel.')],
                    ephemeral: true,
                });
            }

            await closeTicket(interaction);
        }
    },

    async handleButton(interaction) {
        const customId = interaction.customId;

        if (customId === 'ticket_create') {
            // Show reason modal
            const modal = new ModalBuilder().setCustomId('ticket:modal_create').setTitle('🎫 Create Ticket');

            const reasonInput = new TextInputBuilder()
                .setCustomId('ticket_reason')
                .setLabel('Apa yang bisa kami bantu?')
                .setPlaceholder('Jelaskan masalahmu di sini...')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(1000);

            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

            await interaction.showModal(modal);
        } else if (customId === 'ticket_close') {
            await closeTicket(interaction);
        } else if (customId === 'ticket_transcript') {
            await generateTranscript(interaction);
        }
    },

    async handleModal(interaction) {
        const reason = interaction.fields.getTextInputValue('ticket_reason');
        const guild = interaction.guild;
        const member = interaction.member;

        // Check for existing open tickets
        const tickets = dataManager.getTickets(guild.id);
        const existingTicket = Object.entries(tickets).find(
            ([, data]) => data.userId === member.id && !data.closed
        );

        if (existingTicket) {
            return interaction.reply({
                content: `❌ Kamu sudah punya ticket yang terbuka: <#${existingTicket[0]}>`,
                ephemeral: true,
            });
        }

        const settings = dataManager.getGuildSettings(guild.id);
        const supportRoleId = settings.ticketSupportRole;

        // Create ticket channel
        const ticketNumber = Object.keys(tickets).length + 1;
        const channelName = `ticket-${member.user.username}-${ticketNumber}`.substring(0, 100);

        try {
            const permissionOverwrites = [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: member.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.AttachFiles,
                    ],
                },
                {
                    id: interaction.client.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ManageChannels,
                    ],
                },
            ];

            if (supportRoleId) {
                permissionOverwrites.push({
                    id: supportRoleId,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                    ],
                });
            }

            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                topic: `Ticket by ${member.user.tag} | ${reason.substring(0, 200)}`,
                permissionOverwrites,
            });

            // Save ticket data
            dataManager.setTicket(guild.id, ticketChannel.id, {
                userId: member.id,
                userTag: member.user.tag,
                reason,
                createdAt: new Date().toISOString(),
                closed: false,
            });

            // Send welcome message in ticket
            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`${config.emojis.ticket} Ticket #${ticketNumber}`)
                .setDescription(
                    `Halo ${member}, ticket kamu telah dibuat!\n\n` +
                    `**Alasan:**\n${reason}\n\n` +
                    `Staff akan merespon secepatnya. Silakan berikan detail tambahan jika diperlukan.`
                )
                .addFields(
                    { name: '👤 Created by', value: `${member}`, inline: true },
                    { name: '📅 Created at', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: config.defaults.footerText });

            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒'),
                new ButtonBuilder()
                    .setCustomId('ticket_transcript')
                    .setLabel('Save Transcript')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋')
            );

            await ticketChannel.send({
                content: supportRoleId ? `<@&${supportRoleId}>` : undefined,
                embeds: [embed],
                components: [actionRow],
            });

            await interaction.reply({
                content: `✅ Ticket berhasil dibuat: ${ticketChannel}`,
                ephemeral: true,
            });
        } catch (error) {
            await interaction.reply({
                content: `❌ Gagal membuat ticket: ${error.message}`,
                ephemeral: true,
            });
        }
    },
};

async function closeTicket(interaction) {
    const tickets = dataManager.getTickets(interaction.guild.id);
    const ticketData = tickets[interaction.channel.id];

    if (!ticketData) {
        return interaction.reply({
            content: '❌ Channel ini bukan ticket channel.',
            ephemeral: true,
        });
    }

    const confirmEmbed = embedPresets.warning(
        'Close Ticket?',
        'Apakah kamu yakin ingin menutup ticket ini?\nChannel akan dihapus dalam 10 detik setelah konfirmasi.'
    );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_confirm_close')
            .setLabel('Confirm Close')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒'),
        new ButtonBuilder()
            .setCustomId('ticket_cancel_close')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
    );

    const reply = await interaction.reply({ embeds: [confirmEmbed], components: [row], fetchReply: true });

    const filter = (i) => ['ticket_confirm_close', 'ticket_cancel_close'].includes(i.customId);
    const collector = reply.createMessageComponentCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async (i) => {
        if (i.customId === 'ticket_cancel_close') {
            return i.update({ embeds: [embedPresets.info('Cancelled', 'Ticket tetap terbuka.')], components: [] });
        }

        await i.update({
            embeds: [embedPresets.info('Closing...', '🔒 Ticket akan dihapus dalam 10 detik...')],
            components: [],
        });

        // Remove ticket data
        dataManager.removeTicket(interaction.guild.id, interaction.channel.id);

        setTimeout(async () => {
            try {
                await interaction.channel.delete('Ticket closed');
            } catch {
                // Channel may already be deleted
            }
        }, 10000);
    });

    collector.on('end', (collected) => {
        if (collected.size === 0) {
            reply.edit({ embeds: [embedPresets.info('Timeout', 'Tidak ada response — ticket tetap terbuka.')], components: [] }).catch(() => {});
        }
    });
}

async function generateTranscript(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const sorted = [...messages.values()].reverse();

        let transcript = `=== TICKET TRANSCRIPT ===\n`;
        transcript += `Channel: #${interaction.channel.name}\n`;
        transcript += `Generated: ${new Date().toISOString()}\n`;
        transcript += `========================\n\n`;

        for (const msg of sorted) {
            const time = msg.createdAt.toISOString();
            const author = msg.author?.tag || 'Unknown';
            const content = msg.content || '[No text content]';
            transcript += `[${time}] ${author}: ${content}\n`;

            if (msg.embeds.length > 0) {
                transcript += `  [Embed: ${msg.embeds[0].title || 'No title'}]\n`;
            }
            if (msg.attachments.size > 0) {
                transcript += `  [Attachments: ${msg.attachments.map((a) => a.url).join(', ')}]\n`;
            }
        }

        // Send as file
        const buffer = Buffer.from(transcript, 'utf-8');
        await interaction.editReply({
            content: '📋 Transcript generated!',
            files: [{ attachment: buffer, name: `transcript-${interaction.channel.name}.txt` }],
        });
    } catch (error) {
        await interaction.editReply({ content: `❌ Gagal generate transcript: ${error.message}` });
    }
}
