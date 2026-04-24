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
    ChannelType,
} = require('discord.js');
const dataManager = require('../../utils/dataManager');
const embedPresets = require('../../utils/embedPresets');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Kirim saran untuk server')
        .addSubcommand((sub) =>
            sub
                .setName('send')
                .setDescription('Kirim saran baru')
        )
        .addSubcommand((sub) =>
            sub
                .setName('setup')
                .setDescription('Set channel suggestion')
                .addChannelOption((opt) =>
                    opt.setName('channel').setDescription('Channel untuk suggestion').addChannelTypes(ChannelType.GuildText).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('respond')
                .setDescription('Respon ke suggestion (staff)')
                .addStringOption((opt) => opt.setName('message_id').setDescription('Message ID suggestion').setRequired(true))
                .addStringOption((opt) =>
                    opt.setName('status').setDescription('Status').addChoices(
                        { name: '✅ Approved', value: 'approved' },
                        { name: '❌ Denied', value: 'denied' },
                        { name: '🔄 Considering', value: 'considering' },
                        { name: '✔️ Implemented', value: 'implemented' }
                    ).setRequired(true)
                )
                .addStringOption((opt) => opt.setName('reason').setDescription('Alasan').setRequired(false))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'setup') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ embeds: [embedPresets.error('No Permission', 'Kamu tidak punya izin.')], flags: 64 });
            }

            const channel = interaction.options.getChannel('channel');
            dataManager.setGuildSetting(guildId, 'suggestionChannel', channel.id);

            await interaction.reply({
                embeds: [embedPresets.success('Suggestion Setup', `Suggestion channel diset ke ${channel}.`)],
                flags: 64,
            });
        } else if (sub === 'send') {
            const settings = dataManager.getGuildSettings(guildId);
            if (!settings.suggestionChannel) {
                return interaction.reply({
                    embeds: [embedPresets.error('Not Setup', 'Suggestion channel belum diset. Admin gunakan `/suggest setup`.')],
                    flags: 64,
                });
            }

            const modal = new ModalBuilder().setCustomId('suggest:create').setTitle('💡 Kirim Saran');

            const titleInput = new TextInputBuilder()
                .setCustomId('suggest_title')
                .setLabel('Judul Saran')
                .setPlaceholder('Ringkasan singkat saran kamu...')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100);

            const descInput = new TextInputBuilder()
                .setCustomId('suggest_desc')
                .setLabel('Detail Saran')
                .setPlaceholder('Jelaskan saran kamu secara detail...')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(1500);

            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(descInput)
            );

            await interaction.showModal(modal);
        } else if (sub === 'respond') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return interaction.reply({ embeds: [embedPresets.error('No Permission', 'Kamu butuh Manage Messages.')], flags: 64 });
            }

            const msgId = interaction.options.getString('message_id');
            const status = interaction.options.getString('status');
            const reason = interaction.options.getString('reason') || 'Tidak ada alasan.';

            const settings = dataManager.getGuildSettings(guildId);
            const channel = interaction.guild.channels.cache.get(settings.suggestionChannel);
            if (!channel) return interaction.reply({ content: '❌ Channel tidak ditemukan.', flags: 64 });

            try {
                const msg = await channel.messages.fetch(msgId);
                if (!msg.embeds[0]) return interaction.reply({ content: '❌ Bukan pesan suggestion.', flags: 64 });

                const statusConfig = {
                    approved: { color: '#57F287', emoji: '✅', label: 'Approved' },
                    denied: { color: '#ED4245', emoji: '❌', label: 'Denied' },
                    considering: { color: '#FEE75C', emoji: '🔄', label: 'Considering' },
                    implemented: { color: '#5865F2', emoji: '✔️', label: 'Implemented' },
                };

                const sc = statusConfig[status];
                const embed = EmbedBuilder.from(msg.embeds[0])
                    .setColor(sc.color)
                    .addFields({
                        name: `${sc.emoji} Status: ${sc.label}`,
                        value: `${reason}\n— *${interaction.user.tag}*`,
                    });

                await msg.edit({ embeds: [embed] });
                await interaction.reply({ embeds: [embedPresets.success('Updated', `Suggestion status: **${sc.label}**`)], flags: 64 });
            } catch {
                await interaction.reply({ content: '❌ Message tidak ditemukan.', flags: 64 });
            }
        }
    },

    async handleModal(interaction) {
        const guildId = interaction.guild.id;
        const settings = dataManager.getGuildSettings(guildId);
        const channel = interaction.guild.channels.cache.get(settings.suggestionChannel);

        if (!channel) return interaction.reply({ content: '❌ Channel tidak ditemukan.', flags: 64 });

        const title = interaction.fields.getTextInputValue('suggest_title');
        const desc = interaction.fields.getTextInputValue('suggest_desc');

        const suggestId = `S-${Date.now().toString(36).toUpperCase()}`;

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`💡 Suggestion — ${title}`)
            .setDescription(desc)
            .addFields(
                { name: '👤 Submitted by', value: `${interaction.user}`, inline: true },
                { name: '🏷️ ID', value: suggestId, inline: true },
                { name: '📊 Votes', value: '👍 0 | 👎 0', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `${config.defaults.footerText} • Pending review` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`suggest:upvote:${suggestId}`).setLabel('👍 Upvote').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`suggest:downvote:${suggestId}`).setLabel('👎 Downvote').setStyle(ButtonStyle.Danger)
        );

        const msg = await channel.send({ embeds: [embed], components: [row] });

        // Store votes
        const suggestions = dataManager.read('suggestions.json', {});
        if (!suggestions[guildId]) suggestions[guildId] = {};
        suggestions[guildId][suggestId] = {
            messageId: msg.id,
            channelId: channel.id,
            userId: interaction.user.id,
            title,
            upvotes: [],
            downvotes: [],
        };
        dataManager.write('suggestions.json', suggestions);

        await interaction.reply({
            embeds: [embedPresets.success('Suggestion Sent!', `Saran kamu telah dikirim ke ${channel}!\nID: \`${suggestId}\``)],
            flags: 64,
        });
    },

    async handleButton(interaction) {
        const parts = interaction.customId.split(':');
        const action = parts[1]; // upvote or downvote
        const suggestId = parts[2];
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        const suggestions = dataManager.read('suggestions.json', {});
        const gs = suggestions[guildId]?.[suggestId];
        if (!gs) return interaction.reply({ content: '❌ Suggestion tidak ditemukan.', flags: 64 });

        // Remove previous vote
        gs.upvotes = gs.upvotes.filter((id) => id !== userId);
        gs.downvotes = gs.downvotes.filter((id) => id !== userId);

        if (action === 'upvote') {
            gs.upvotes.push(userId);
        } else {
            gs.downvotes.push(userId);
        }

        dataManager.write('suggestions.json', suggestions);

        // Update embed
        const embed = EmbedBuilder.from(interaction.message.embeds[0]);
        const fields = [...embed.data.fields];
        const voteIdx = fields.findIndex((f) => f.name === '📊 Votes');
        if (voteIdx !== -1) {
            fields[voteIdx] = { name: '📊 Votes', value: `👍 ${gs.upvotes.length} | 👎 ${gs.downvotes.length}`, inline: true };
            embed.setFields(fields);
        }

        await interaction.update({ embeds: [embed] });
    },
};
