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
const config = require('../../config.json');
const dataManager = require('../../utils/dataManager');
const embedPresets = require('../../utils/embedPresets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Buat dan kelola giveaway')
        .addSubcommand((sub) => sub.setName('start').setDescription('Mulai giveaway baru'))
        .addSubcommand((sub) =>
            sub
                .setName('end')
                .setDescription('Akhiri giveaway sekarang')
                .addStringOption((opt) =>
                    opt.setName('message_id').setDescription('Message ID giveaway').setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('reroll')
                .setDescription('Reroll winner giveaway')
                .addStringOption((opt) =>
                    opt.setName('message_id').setDescription('Message ID giveaway').setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const modal = new ModalBuilder().setCustomId('giveaway:modal_create').setTitle('🎉 Create Giveaway');

            const prizeInput = new TextInputBuilder()
                .setCustomId('giveaway_prize')
                .setLabel('Prize / Hadiah')
                .setPlaceholder('Contoh: Discord Nitro 1 Bulan')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(256);

            const durationInput = new TextInputBuilder()
                .setCustomId('giveaway_duration')
                .setLabel('Durasi (dalam menit)')
                .setPlaceholder('60')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(10);

            const winnersInput = new TextInputBuilder()
                .setCustomId('giveaway_winners')
                .setLabel('Jumlah Winner')
                .setPlaceholder('1')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(2);

            const descInput = new TextInputBuilder()
                .setCustomId('giveaway_desc')
                .setLabel('Deskripsi (opsional)')
                .setPlaceholder('Deskripsi tambahan...')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
                .setMaxLength(1000);

            modal.addComponents(
                new ActionRowBuilder().addComponents(prizeInput),
                new ActionRowBuilder().addComponents(durationInput),
                new ActionRowBuilder().addComponents(winnersInput),
                new ActionRowBuilder().addComponents(descInput)
            );

            await interaction.showModal(modal);
        } else if (sub === 'end') {
            const messageId = interaction.options.getString('message_id');
            await endGiveaway(interaction, messageId);
        } else if (sub === 'reroll') {
            const messageId = interaction.options.getString('message_id');
            await rerollGiveaway(interaction, messageId);
        }
    },

    async handleModal(interaction) {
        const prize = interaction.fields.getTextInputValue('giveaway_prize');
        const durationMin = parseInt(interaction.fields.getTextInputValue('giveaway_duration'));
        const winnersCount = parseInt(interaction.fields.getTextInputValue('giveaway_winners')) || 1;
        const description = interaction.fields.getTextInputValue('giveaway_desc');

        if (isNaN(durationMin) || durationMin < 1) {
            return interaction.reply({ content: '❌ Durasi harus berupa angka minimal 1 menit.', ephemeral: true });
        }

        const endsAt = Date.now() + durationMin * 60000;
        const endsAtUnix = Math.floor(endsAt / 1000);

        const embed = new EmbedBuilder()
            .setColor(config.colors.purple)
            .setTitle(`${config.emojis.giveaway} GIVEAWAY`)
            .setDescription(
                `**${prize}**\n\n` +
                (description ? `${description}\n\n` : '') +
                `⏰ Berakhir: <t:${endsAtUnix}:R>\n` +
                `🏆 Winners: **${winnersCount}**\n` +
                `🎫 Participants: **0**\n\n` +
                `Klik tombol di bawah untuk ikut!`
            )
            .setTimestamp(new Date(endsAt))
            .setFooter({ text: `Hosted by ${interaction.user.tag} • Ends at` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('giveaway_join')
                .setLabel('Join Giveaway!')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎉')
        );

        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        // Save giveaway data
        dataManager.addGiveaway(interaction.guild.id, {
            messageId: msg.id,
            channelId: interaction.channel.id,
            prize,
            description,
            winnersCount,
            hostId: interaction.user.id,
            endsAt,
            participants: [],
            ended: false,
        });

        // Schedule end
        setTimeout(async () => {
            try {
                await autoEndGiveaway(interaction.client, interaction.guild.id, msg.id);
            } catch {
                // Message may have been deleted
            }
        }, durationMin * 60000);
    },

    async handleButton(interaction) {
        const customId = interaction.customId;

        if (customId === 'giveaway_join') {
            const messageId = interaction.message.id;
            const guildId = interaction.guild.id;
            const userId = interaction.user.id;

            const giveaways = dataManager.getGiveaways(guildId);
            const giveaway = giveaways.find((g) => g.messageId === messageId);

            if (!giveaway) {
                return interaction.reply({ content: '❌ Giveaway tidak ditemukan.', ephemeral: true });
            }

            if (giveaway.ended) {
                return interaction.reply({ content: '❌ Giveaway ini sudah berakhir.', ephemeral: true });
            }

            // Toggle participation
            const isParticipant = giveaway.participants.includes(userId);

            dataManager.updateGiveaway(guildId, messageId, (g) => {
                if (isParticipant) {
                    g.participants = g.participants.filter((id) => id !== userId);
                } else {
                    g.participants.push(userId);
                }
                return g;
            });

            const updatedGiveaways = dataManager.getGiveaways(guildId);
            const updated = updatedGiveaways.find((g) => g.messageId === messageId);
            const participantCount = updated.participants.length;

            // Update embed
            const embed = EmbedBuilder.from(interaction.message.embeds[0]);
            const desc = embed.data.description;
            const updatedDesc = desc.replace(
                /🎫 Participants: \*\*\d+\*\*/,
                `🎫 Participants: **${participantCount}**`
            );
            embed.setDescription(updatedDesc);

            await interaction.update({ embeds: [embed] });

            // Don't need a reply since we already updated
        } else if (customId.startsWith('giveaway_reroll')) {
            const messageId = interaction.customId.split(':')[1];
            await rerollGiveaway(interaction, messageId);
        }
    },
};

async function autoEndGiveaway(client, guildId, messageId) {
    const giveaways = dataManager.getGiveaways(guildId);
    const giveaway = giveaways.find((g) => g.messageId === messageId);

    if (!giveaway || giveaway.ended) return;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(giveaway.channelId);
    if (!channel) return;

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) return;

    // Pick winners
    const winners = pickWinners(giveaway.participants, giveaway.winnersCount);

    // Mark as ended
    dataManager.updateGiveaway(guildId, messageId, (g) => {
        g.ended = true;
        g.winners = winners;
        return g;
    });

    const winnersText = winners.length > 0 ? winners.map((id) => `<@${id}>`).join(', ') : 'No valid participants';

    const endedEmbed = new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle(`${config.emojis.giveaway} GIVEAWAY ENDED`)
        .setDescription(
            `**${giveaway.prize}**\n\n` +
            `🏆 **Winner(s):** ${winnersText}\n` +
            `🎫 **Total Participants:** ${giveaway.participants.length}\n` +
            `👑 **Hosted by:** <@${giveaway.hostId}>`
        )
        .setTimestamp()
        .setFooter({ text: 'Giveaway ended' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`giveaway_reroll:${messageId}`)
            .setLabel('Reroll Winners')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄')
    );

    await message.edit({ embeds: [endedEmbed], components: [row] });

    if (winners.length > 0) {
        await channel.send({
            content: `🎉 Selamat ${winnersText}! Kamu memenangkan **${giveaway.prize}**!`,
        });
    }
}

async function endGiveaway(interaction, messageId) {
    await autoEndGiveaway(interaction.client, interaction.guild.id, messageId);
    await interaction.reply({ content: '✅ Giveaway berhasil diakhiri!', ephemeral: true });
}

async function rerollGiveaway(interaction, messageId) {
    const giveaways = dataManager.getGiveaways(interaction.guild.id);
    const giveaway = giveaways.find((g) => g.messageId === messageId);

    if (!giveaway) {
        return interaction.reply({ content: '❌ Giveaway tidak ditemukan.', ephemeral: true });
    }

    const newWinners = pickWinners(giveaway.participants, giveaway.winnersCount);

    if (newWinners.length === 0) {
        return interaction.reply({ content: '❌ Tidak ada peserta yang bisa di-reroll.', ephemeral: true });
    }

    const winnersText = newWinners.map((id) => `<@${id}>`).join(', ');

    const isButton = interaction.isButton();
    const method = isButton ? 'reply' : 'reply';

    await interaction[method]({
        content: `🔄 **Reroll!** Winner baru: ${winnersText} — Selamat memenangkan **${giveaway.prize}**!`,
        ephemeral: false,
    });
}

function pickWinners(participants, count) {
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}
