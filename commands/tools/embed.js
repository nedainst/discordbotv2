const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    EmbedBuilder,
    ChannelType,
} = require('discord.js');
const config = require('../../config.json');

// Temporary embed storage for preview
const embedDrafts = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Buat atau edit custom embed')
        .addSubcommand((sub) => sub.setName('create').setDescription('Buat embed baru dengan form interaktif'))
        .addSubcommand((sub) =>
            sub
                .setName('edit')
                .setDescription('Edit embed yang sudah dikirim bot')
                .addStringOption((opt) =>
                    opt.setName('message_id').setDescription('Message ID dari embed yang ingin di-edit').setRequired(true)
                )
                .addChannelOption((opt) =>
                    opt.setName('channel').setDescription('Channel tempat embed berada').setRequired(false)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'create') {
            // Show the initial modal form
            const modal = buildEmbedModal('embed:modal_create');
            await interaction.showModal(modal);
        } else if (sub === 'edit') {
            const messageId = interaction.options.getString('message_id');
            const channel = interaction.options.getChannel('channel') || interaction.channel;

            try {
                const message = await channel.messages.fetch(messageId);
                if (!message.author.id === interaction.client.user.id) {
                    return interaction.reply({
                        content: '❌ Hanya bisa edit embed yang dikirim oleh bot ini.',
                        ephemeral: true,
                    });
                }

                if (message.embeds.length === 0) {
                    return interaction.reply({ content: '❌ Message ini tidak memiliki embed.', ephemeral: true });
                }

                const existingEmbed = message.embeds[0];

                // Store existing embed data for edit
                embedDrafts.set(interaction.user.id, {
                    messageId,
                    channelId: channel.id,
                    title: existingEmbed.title || '',
                    description: existingEmbed.description || '',
                    color: existingEmbed.hexColor || config.colors.primary,
                    footer: existingEmbed.footer?.text || '',
                    image: existingEmbed.image?.url || '',
                    thumbnail: existingEmbed.thumbnail?.url || '',
                    author: existingEmbed.author?.name || '',
                    fields: existingEmbed.fields || [],
                });

                const modal = buildEmbedModal(`embed:modal_edit:${messageId}:${channel.id}`, existingEmbed);
                await interaction.showModal(modal);
            } catch (error) {
                return interaction.reply({
                    content: `❌ Tidak bisa menemukan message: ${error.message}`,
                    ephemeral: true,
                });
            }
        }
    },

    async handleModal(interaction) {
        const parts = interaction.customId.split(':');
        const modalType = parts[1];

        const title = interaction.fields.getTextInputValue('embed_title');
        const description = interaction.fields.getTextInputValue('embed_description');
        const colorRaw = interaction.fields.getTextInputValue('embed_color');
        const footerText = interaction.fields.getTextInputValue('embed_footer');
        const imageUrl = interaction.fields.getTextInputValue('embed_image');

        let color = config.colors.primary;
        if (colorRaw && /^#[0-9A-Fa-f]{6}$/.test(colorRaw)) {
            color = colorRaw;
        }

        const embedData = {
            title: title || null,
            description: description || null,
            color,
            footer: footerText || null,
            image: imageUrl || null,
        };

        if (modalType === 'modal_create') {
            // Store draft and show preview
            embedDrafts.set(interaction.user.id, embedData);

            const previewEmbed = buildPreviewEmbed(embedData);
            const row = buildPreviewActions(interaction.user.id);

            await interaction.reply({
                content: '**📋 Preview Embed** — Cek embed di bawah, lalu pilih aksi:',
                embeds: [previewEmbed],
                components: [row],
                ephemeral: true,
            });
        } else if (modalType === 'modal_edit') {
            const messageId = parts[2];
            const channelId = parts[3];

            try {
                const channel = interaction.guild.channels.cache.get(channelId);
                const message = await channel.messages.fetch(messageId);

                const editedEmbed = buildPreviewEmbed(embedData);
                await message.edit({ embeds: [editedEmbed] });

                await interaction.reply({
                    content: '✅ Embed berhasil di-edit!',
                    ephemeral: true,
                });

                embedDrafts.delete(interaction.user.id);
            } catch (error) {
                await interaction.reply({
                    content: `❌ Gagal edit embed: ${error.message}`,
                    ephemeral: true,
                });
            }
        } else if (modalType === 'modal_reedit') {
            // Re-edit from preview
            embedDrafts.set(interaction.user.id, embedData);

            const previewEmbed = buildPreviewEmbed(embedData);
            const row = buildPreviewActions(interaction.user.id);

            await interaction.reply({
                content: '**📋 Preview Embed (Updated)** — Cek embed di bawah, lalu pilih aksi:',
                embeds: [previewEmbed],
                components: [row],
                ephemeral: true,
            });
        } else if (modalType === 'modal_addfield') {
            // Add field to draft
            const draft = embedDrafts.get(interaction.user.id);
            if (!draft) {
                return interaction.reply({ content: '❌ Draft tidak ditemukan. Silakan buat embed baru.', ephemeral: true });
            }

            const fieldName = interaction.fields.getTextInputValue('embed_title'); // reuse title field for field name
            const fieldValue = interaction.fields.getTextInputValue('embed_description'); // reuse desc field for field value

            if (!draft.fields) draft.fields = [];
            draft.fields.push({ name: fieldName, value: fieldValue, inline: true });
            embedDrafts.set(interaction.user.id, draft);

            const previewEmbed = buildPreviewEmbed(draft);
            const row = buildPreviewActions(interaction.user.id);

            await interaction.reply({
                content: `**📋 Preview Embed** — Field "${fieldName}" ditambahkan!`,
                embeds: [previewEmbed],
                components: [row],
                ephemeral: true,
            });
        }
    },

    async handleButton(interaction) {
        const parts = interaction.customId.split(':');
        const subAction = parts[1];
        const userId = parts[2];

        if (subAction === 'edit_embed') {
            // Show modal again for editing
            const draft = embedDrafts.get(interaction.user.id);
            const modal = buildEmbedModal('embed:modal_reedit', draft ? {
                title: draft.title,
                description: draft.description,
                hexColor: draft.color,
                footer: draft.footer ? { text: draft.footer } : null,
                image: draft.image ? { url: draft.image } : null,
            } : null);
            await interaction.showModal(modal);
        } else if (subAction === 'add_field') {
            const modal = new ModalBuilder().setCustomId('embed:modal_addfield').setTitle('➕ Add Field');

            const nameInput = new TextInputBuilder()
                .setCustomId('embed_title')
                .setLabel('Field Name')
                .setPlaceholder('Contoh: Informasi')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(256);

            const valueInput = new TextInputBuilder()
                .setCustomId('embed_description')
                .setLabel('Field Value')
                .setPlaceholder('Contoh: Ini adalah value dari field')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(1024);

            // Dummy fields to fill the 5 required by reuse
            const colorDummy = new TextInputBuilder()
                .setCustomId('embed_color')
                .setLabel('Inline? (yes/no)')
                .setPlaceholder('yes')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMaxLength(3);

            const footerDummy = new TextInputBuilder()
                .setCustomId('embed_footer')
                .setLabel('(unused)')
                .setPlaceholder('-')
                .setStyle(TextInputStyle.Short)
                .setRequired(false);

            const imageDummy = new TextInputBuilder()
                .setCustomId('embed_image')
                .setLabel('(unused)')
                .setPlaceholder('-')
                .setStyle(TextInputStyle.Short)
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(valueInput),
                new ActionRowBuilder().addComponents(colorDummy),
                new ActionRowBuilder().addComponents(footerDummy),
                new ActionRowBuilder().addComponents(imageDummy)
            );

            await interaction.showModal(modal);
        } else if (subAction === 'send_embed') {
            const draft = embedDrafts.get(interaction.user.id);
            if (!draft) {
                return interaction.update({
                    content: '❌ Draft tidak ditemukan.',
                    embeds: [],
                    components: [],
                });
            }

            // Show channel select
            const textChannels = interaction.guild.channels.cache
                .filter((c) => c.type === ChannelType.GuildText)
                .sort((a, b) => a.position - b.position)
                .first(25);

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`embed:select_channel:${interaction.user.id}`)
                .setPlaceholder('Pilih channel untuk mengirim embed...')
                .addOptions(
                    textChannels.map((c) => ({
                        label: `#${c.name}`,
                        value: c.id,
                        description: c.topic?.substring(0, 50) || undefined,
                        emoji: '📝',
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                content: '📤 Pilih channel tujuan:',
                components: [row],
            });
        } else if (subAction === 'cancel_embed') {
            embedDrafts.delete(interaction.user.id);
            await interaction.update({
                content: '❌ Embed dibatalkan.',
                embeds: [],
                components: [],
            });
        }
    },

    async handleSelect(interaction) {
        const parts = interaction.customId.split(':');
        const subAction = parts[1];

        if (subAction === 'select_channel') {
            const channelId = interaction.values[0];
            const channel = interaction.guild.channels.cache.get(channelId);
            const draft = embedDrafts.get(interaction.user.id);

            if (!channel || !draft) {
                return interaction.update({
                    content: '❌ Channel atau draft tidak ditemukan.',
                    embeds: [],
                    components: [],
                });
            }

            try {
                const embed = buildPreviewEmbed(draft);
                await channel.send({ embeds: [embed] });

                embedDrafts.delete(interaction.user.id);

                await interaction.update({
                    content: `✅ Embed berhasil dikirim ke ${channel}!`,
                    embeds: [],
                    components: [],
                });
            } catch (error) {
                await interaction.update({
                    content: `❌ Gagal mengirim embed: ${error.message}`,
                    embeds: [],
                    components: [],
                });
            }
        }
    },
};

function buildEmbedModal(customId, existingEmbed = null) {
    const modal = new ModalBuilder().setCustomId(customId).setTitle('🎨 Embed Builder');

    const titleInput = new TextInputBuilder()
        .setCustomId('embed_title')
        .setLabel('Title')
        .setPlaceholder('Judul embed...')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(256);

    const descInput = new TextInputBuilder()
        .setCustomId('embed_description')
        .setLabel('Description')
        .setPlaceholder('Deskripsi embed (support markdown)...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(4000);

    const colorInput = new TextInputBuilder()
        .setCustomId('embed_color')
        .setLabel('Color (hex code)')
        .setPlaceholder('#5865F2')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(7);

    const footerInput = new TextInputBuilder()
        .setCustomId('embed_footer')
        .setLabel('Footer Text')
        .setPlaceholder('Footer teks...')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(2048);

    const imageInput = new TextInputBuilder()
        .setCustomId('embed_image')
        .setLabel('Image URL')
        .setPlaceholder('https://example.com/image.png')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    // Pre-fill if editing
    if (existingEmbed) {
        if (existingEmbed.title) titleInput.setValue(existingEmbed.title);
        if (existingEmbed.description) descInput.setValue(existingEmbed.description);
        if (existingEmbed.hexColor) colorInput.setValue(existingEmbed.hexColor);
        if (existingEmbed.footer?.text) footerInput.setValue(existingEmbed.footer.text);
        if (existingEmbed.image?.url) imageInput.setValue(existingEmbed.image.url);
    }

    modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descInput),
        new ActionRowBuilder().addComponents(colorInput),
        new ActionRowBuilder().addComponents(footerInput),
        new ActionRowBuilder().addComponents(imageInput)
    );

    return modal;
}

function buildPreviewEmbed(data) {
    const embed = new EmbedBuilder().setTimestamp();

    if (data.title) embed.setTitle(data.title);
    if (data.description) embed.setDescription(data.description);
    if (data.color) embed.setColor(data.color);
    if (data.footer) embed.setFooter({ text: data.footer });
    if (data.image && data.image.startsWith('http')) embed.setImage(data.image);
    if (data.thumbnail && data.thumbnail.startsWith('http')) embed.setThumbnail(data.thumbnail);
    if (data.author) embed.setAuthor({ name: data.author });
    if (data.fields && data.fields.length > 0) embed.addFields(data.fields);

    // Ensure at least some content
    if (!data.title && !data.description) {
        embed.setDescription('*(empty embed)*');
    }

    return embed;
}

function buildPreviewActions(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`embed:edit_embed:${userId}`)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✏️'),
        new ButtonBuilder()
            .setCustomId(`embed:add_field:${userId}`)
            .setLabel('Add Field')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('➕'),
        new ButtonBuilder()
            .setCustomId(`embed:send_embed:${userId}`)
            .setLabel('Send to Channel')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📤'),
        new ButtonBuilder()
            .setCustomId(`embed:cancel_embed:${userId}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
    );
}
