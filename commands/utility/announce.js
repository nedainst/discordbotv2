const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
} = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Buat announcement dengan form')
        .addChannelOption((opt) =>
            opt.setName('channel').setDescription('Channel untuk announcement (default: channel ini)').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        const modal = new ModalBuilder().setCustomId(`announce:create:${channel.id}`).setTitle('📢 Create Announcement');

        const titleInput = new TextInputBuilder()
            .setCustomId('announce_title')
            .setLabel('Judul Announcement')
            .setPlaceholder('Contoh: Server Update!')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(256);

        const descInput = new TextInputBuilder()
            .setCustomId('announce_desc')
            .setLabel('Isi Announcement')
            .setPlaceholder('Tulis isi announcement di sini...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(4000);

        const colorInput = new TextInputBuilder()
            .setCustomId('announce_color')
            .setLabel('Warna (hex code, contoh: #FF5733)')
            .setPlaceholder('#5865F2')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(7);

        const imageInput = new TextInputBuilder()
            .setCustomId('announce_image')
            .setLabel('Image URL (opsional)')
            .setPlaceholder('https://example.com/image.png')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const pingInput = new TextInputBuilder()
            .setCustomId('announce_ping')
            .setLabel('Ping @everyone? (yes/no)')
            .setPlaceholder('no')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(3);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descInput),
            new ActionRowBuilder().addComponents(colorInput),
            new ActionRowBuilder().addComponents(imageInput),
            new ActionRowBuilder().addComponents(pingInput)
        );

        await interaction.showModal(modal);
    },

    async handleModal(interaction) {
        const channelId = interaction.customId.split(':')[2];
        const channel = interaction.guild.channels.cache.get(channelId);

        if (!channel) {
            return interaction.reply({ content: '❌ Channel tidak ditemukan.', ephemeral: true });
        }

        const title = interaction.fields.getTextInputValue('announce_title');
        const description = interaction.fields.getTextInputValue('announce_desc');
        const colorRaw = interaction.fields.getTextInputValue('announce_color');
        const imageUrl = interaction.fields.getTextInputValue('announce_image');
        const pingEveryone = interaction.fields.getTextInputValue('announce_ping');

        let color = config.colors.primary;
        if (colorRaw && /^#[0-9A-Fa-f]{6}$/.test(colorRaw)) {
            color = colorRaw;
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`📢 ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: `Announced by ${interaction.user.tag}` });

        if (imageUrl && imageUrl.startsWith('http')) {
            embed.setImage(imageUrl);
        }

        const content = pingEveryone?.toLowerCase() === 'yes' ? '@everyone' : undefined;

        try {
            await channel.send({ content, embeds: [embed] });
            await interaction.reply({
                content: `✅ Announcement berhasil dikirim ke ${channel}!`,
                ephemeral: true,
            });
        } catch (error) {
            await interaction.reply({
                content: `❌ Gagal mengirim announcement: ${error.message}`,
                ephemeral: true,
            });
        }
    },
};
