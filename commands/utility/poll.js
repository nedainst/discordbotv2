const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require('discord.js');
const config = require('../../config.json');

// In-memory poll storage (per message)
const activePolls = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Buat poll interaktif dengan voting buttons'),

    async execute(interaction) {
        const modal = new ModalBuilder().setCustomId('poll:create').setTitle('📊 Create Poll');

        const questionInput = new TextInputBuilder()
            .setCustomId('poll_question')
            .setLabel('Pertanyaan Poll')
            .setPlaceholder('Contoh: Bahasa programming favorit kalian?')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(256);

        const optionsInput = new TextInputBuilder()
            .setCustomId('poll_options')
            .setLabel('Opsi (pisahkan dengan baris baru, maks 5)')
            .setPlaceholder('JavaScript\nPython\nGo\nRust')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);

        const durationInput = new TextInputBuilder()
            .setCustomId('poll_duration')
            .setLabel('Durasi dalam menit (kosongkan = tanpa batas)')
            .setPlaceholder('60')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(10);

        modal.addComponents(
            new ActionRowBuilder().addComponents(questionInput),
            new ActionRowBuilder().addComponents(optionsInput),
            new ActionRowBuilder().addComponents(durationInput)
        );

        await interaction.showModal(modal);
    },

    async handleModal(interaction) {
        const question = interaction.fields.getTextInputValue('poll_question');
        const optionsRaw = interaction.fields.getTextInputValue('poll_options');
        const durationStr = interaction.fields.getTextInputValue('poll_duration');

        const options = optionsRaw
            .split('\n')
            .map((o) => o.trim())
            .filter((o) => o.length > 0)
            .slice(0, 5);

        if (options.length < 2) {
            return interaction.reply({
                content: '❌ Minimal 2 opsi diperlukan untuk membuat poll.',
                ephemeral: true,
            });
        }

        const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

        const optionsText = options.map((opt, i) => `${numberEmojis[i]} **${opt}** — \`0 votes\``).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`📊 ${question}`)
            .setDescription(`${optionsText}\n\n👥 **Total voters:** 0`)
            .setTimestamp()
            .setFooter({ text: `Poll by ${interaction.user.tag} • ${config.defaults.footerText}` });

        if (durationStr && !isNaN(parseInt(durationStr))) {
            const durationMin = parseInt(durationStr);
            const endsAt = Math.floor((Date.now() + durationMin * 60000) / 1000);
            embed.addFields({ name: '⏰ Berakhir', value: `<t:${endsAt}:R>`, inline: true });
        }

        // Create buttons
        const rows = [];
        const buttonChunks = [];
        for (let i = 0; i < options.length; i++) {
            buttonChunks.push(
                new ButtonBuilder()
                    .setCustomId(`poll_vote:${i}`)
                    .setLabel(options[i].substring(0, 80))
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(numberEmojis[i])
            );
        }

        // Split buttons into rows of max 5
        for (let i = 0; i < buttonChunks.length; i += 5) {
            rows.push(new ActionRowBuilder().addComponents(buttonChunks.slice(i, i + 5)));
        }

        const msg = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });

        // Store poll data
        activePolls.set(msg.id, {
            question,
            options,
            votes: Object.fromEntries(options.map((_, i) => [i, new Set()])),
            creatorId: interaction.user.id,
        });

        // Auto-close timer
        if (durationStr && !isNaN(parseInt(durationStr))) {
            const durationMs = parseInt(durationStr) * 60000;
            setTimeout(async () => {
                try {
                    const pollData = activePolls.get(msg.id);
                    if (!pollData) return;

                    const closedEmbed = buildResultEmbed(pollData, true);
                    await msg.edit({ embeds: [closedEmbed], components: [] });
                    activePolls.delete(msg.id);
                } catch {
                    // Message may have been deleted
                }
            }, durationMs);
        }
    },

    async handleButton(interaction) {
        const messageId = interaction.message.id;
        const pollData = activePolls.get(messageId);

        if (!pollData) {
            return interaction.reply({ content: '❌ Poll ini sudah berakhir atau tidak valid.', ephemeral: true });
        }

        const optionIndex = parseInt(interaction.customId.split(':')[1]);
        const userId = interaction.user.id;

        // Remove user from all options first (change vote)
        for (const voters of Object.values(pollData.votes)) {
            voters.delete(userId);
        }

        // Add vote
        pollData.votes[optionIndex].add(userId);

        // Update embed
        const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
        const totalVoters = new Set(Object.values(pollData.votes).flatMap((s) => [...s])).size;

        const optionsText = pollData.options
            .map((opt, i) => {
                const count = pollData.votes[i].size;
                const percentage = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
                const bar = createProgressBar(percentage);
                return `${numberEmojis[i]} **${opt}**\n${bar} \`${count} votes (${percentage}%)\``;
            })
            .join('\n\n');

        const embed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(
            `${optionsText}\n\n👥 **Total voters:** ${totalVoters}`
        );

        await interaction.update({ embeds: [embed] });
    },
};

function createProgressBar(percentage) {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

function buildResultEmbed(pollData, closed = false) {
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
    const totalVoters = new Set(Object.values(pollData.votes).flatMap((s) => [...s])).size;

    const optionsText = pollData.options
        .map((opt, i) => {
            const count = pollData.votes[i].size;
            const percentage = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
            const bar = createProgressBar(percentage);
            return `${numberEmojis[i]} **${opt}**\n${bar} \`${count} votes (${percentage}%)\``;
        })
        .join('\n\n');

    return new EmbedBuilder()
        .setColor(closed ? config.colors.danger : config.colors.primary)
        .setTitle(`📊 ${pollData.question}${closed ? ' (CLOSED)' : ''}`)
        .setDescription(`${optionsText}\n\n👥 **Total voters:** ${totalVoters}`)
        .setTimestamp()
        .setFooter({ text: closed ? 'Poll ended' : config.defaults.footerText });
}
