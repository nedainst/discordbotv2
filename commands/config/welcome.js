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
    AttachmentBuilder,
    ChannelType,
} = require('discord.js');
const dataManager = require('../../utils/dataManager');
const { generateCard } = require('../../utils/welcomeCard');
const embedPresets = require('../../utils/embedPresets');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Konfigurasi welcome & leave image system')
        .addSubcommand((sub) =>
            sub
                .setName('channel')
                .setDescription('Set channel untuk welcome & leave')
                .addChannelOption((opt) => opt.setName('welcome').setDescription('Channel welcome').addChannelTypes(ChannelType.GuildText).setRequired(true))
                .addChannelOption((opt) => opt.setName('leave').setDescription('Channel leave (default: sama)').addChannelTypes(ChannelType.GuildText).setRequired(false))
        )
        .addSubcommand((sub) => sub.setName('customize').setDescription('Kustomisasi warna dan teks welcome/leave card'))
        .addSubcommand((sub) => sub.setName('preview').setDescription('Preview welcome & leave card'))
        .addSubcommand((sub) =>
            sub
                .setName('toggle')
                .setDescription('Aktifkan/nonaktifkan image card')
                .addStringOption((opt) =>
                    opt.setName('type').setDescription('Jenis card').addChoices(
                        { name: 'Welcome Card', value: 'welcomeCard' },
                        { name: 'Leave Card', value: 'leaveCard' }
                    ).setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'channel') {
            const welcomeChannel = interaction.options.getChannel('welcome');
            const leaveChannel = interaction.options.getChannel('leave') || welcomeChannel;

            dataManager.setGuildSetting(guildId, 'welcomeChannel', welcomeChannel.id);
            dataManager.setGuildSetting(guildId, 'leaveChannel', leaveChannel.id);

            await interaction.reply({
                embeds: [
                    embedPresets.success(
                        'Welcome System Set!',
                        `✅ Welcome → ${welcomeChannel}\n✅ Leave → ${leaveChannel}`
                    ),
                ],
                flags: 64,
            });
        } else if (sub === 'customize') {
            const settings = dataManager.getGuildSettings(guildId);
            const wc = settings.welcomeCard || {};

            const modal = new ModalBuilder().setCustomId('welcome:customize').setTitle('🎨 Customize Welcome Card');

            const fields = [
                new TextInputBuilder()
                    .setCustomId('welcome_message')
                    .setLabel('Welcome Message ({user} {server} {count})')
                    .setPlaceholder('Selamat datang di {server}, {user}! Member #{count}')
                    .setValue(wc.message || '')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                    .setMaxLength(200),
                new TextInputBuilder()
                    .setCustomId('leave_message')
                    .setLabel('Leave Message ({user} {server} {count})')
                    .setPlaceholder('{user} telah meninggalkan {server}.')
                    .setValue((settings.leaveCard || {}).message || '')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                    .setMaxLength(200),
                new TextInputBuilder()
                    .setCustomId('accent_color')
                    .setLabel('Accent Color (hex, contoh: #5865F2)')
                    .setPlaceholder('#5865F2')
                    .setValue(wc.accentColor || '')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(7),
                new TextInputBuilder()
                    .setCustomId('gradient_start')
                    .setLabel('Background Gradient Start (hex)')
                    .setPlaceholder('#1a1a2e')
                    .setValue(wc.gradientStart || '')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(7),
                new TextInputBuilder()
                    .setCustomId('gradient_end')
                    .setLabel('Background Gradient End (hex)')
                    .setPlaceholder('#16213e')
                    .setValue(wc.gradientEnd || '')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(7),
            ];

            modal.addComponents(fields.map((f) => new ActionRowBuilder().addComponents(f)));
            await interaction.showModal(modal);
        } else if (sub === 'preview') {
            await interaction.deferReply({ flags: 64 });

            const settings = dataManager.getGuildSettings(guildId);
            const welcomeConfig = settings.welcomeCard || {};
            const leaveConfig = settings.leaveCard || {};
            const avatarURL = interaction.user.displayAvatarURL({ extension: 'png', size: 256 });

            const welcomeBuffer = await generateCard({
                username: interaction.member.displayName || interaction.user.username,
                discriminator: `@${interaction.user.username}`,
                avatarURL,
                serverName: interaction.guild.name,
                memberCount: interaction.guild.memberCount,
                type: 'welcome',
                config: welcomeConfig,
            });

            const leaveBuffer = await generateCard({
                username: interaction.member.displayName || interaction.user.username,
                discriminator: `@${interaction.user.username}`,
                avatarURL,
                serverName: interaction.guild.name,
                memberCount: interaction.guild.memberCount,
                type: 'leave',
                config: leaveConfig,
            });

            const welcomeAttach = new AttachmentBuilder(welcomeBuffer, { name: 'welcome_preview.png' });
            const leaveAttach = new AttachmentBuilder(leaveBuffer, { name: 'leave_preview.png' });

            const welcomeEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('✅ Welcome Card Preview')
                .setImage('attachment://welcome_preview.png');

            const leaveEmbed = new EmbedBuilder()
                .setColor(config.colors.danger)
                .setTitle('👋 Leave Card Preview')
                .setImage('attachment://leave_preview.png');

            await interaction.editReply({
                embeds: [welcomeEmbed, leaveEmbed],
                files: [welcomeAttach, leaveAttach],
            });
        } else if (sub === 'toggle') {
            const type = interaction.options.getString('type');
            const settings = dataManager.getGuildSettings(guildId);
            const current = settings[type] || {};
            current.enabled = !current.enabled;
            dataManager.setGuildSetting(guildId, type, current);

            const name = type === 'welcomeCard' ? 'Welcome Card' : 'Leave Card';
            await interaction.reply({
                embeds: [embedPresets.success('Updated', `${name} sekarang **${current.enabled ? '✅ Aktif' : '❌ Nonaktif'}**.`)],
                flags: 64,
            });
        }
    },

    async handleModal(interaction) {
        const guildId = interaction.guild.id;
        const settings = dataManager.getGuildSettings(guildId);

        const welcomeMsg = interaction.fields.getTextInputValue('welcome_message').trim();
        const leaveMsg = interaction.fields.getTextInputValue('leave_message').trim();
        const accent = interaction.fields.getTextInputValue('accent_color').trim();
        const gradStart = interaction.fields.getTextInputValue('gradient_start').trim();
        const gradEnd = interaction.fields.getTextInputValue('gradient_end').trim();

        const wc = settings.welcomeCard || { enabled: true };
        const lc = settings.leaveCard || { enabled: true };

        if (welcomeMsg) wc.message = welcomeMsg;
        if (accent) wc.accentColor = accent;
        if (gradStart) wc.gradientStart = gradStart;
        if (gradEnd) wc.gradientEnd = gradEnd;

        if (leaveMsg) lc.message = leaveMsg;
        if (accent) lc.accentColor = accent === '#5865F2' ? '#ED4245' : accent;

        dataManager.setGuildSetting(guildId, 'welcomeCard', wc);
        dataManager.setGuildSetting(guildId, 'leaveCard', lc);

        await interaction.reply({
            embeds: [embedPresets.success('Customization Saved!', 'Gunakan `/welcome preview` untuk melihat hasilnya.')],
            flags: 64,
        });
    },
};
