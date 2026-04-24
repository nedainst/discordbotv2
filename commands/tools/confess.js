const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    ChannelType,
} = require('discord.js');
const dataManager = require('../../utils/dataManager');
const embedPresets = require('../../utils/embedPresets');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('confess')
        .setDescription('Kirim pesan anonymous (confession)')
        .addSubcommand((sub) => sub.setName('send').setDescription('Kirim confession anonymous'))
        .addSubcommand((sub) =>
            sub
                .setName('setup')
                .setDescription('Set channel confession (admin)')
                .addChannelOption((opt) =>
                    opt.setName('channel').setDescription('Channel confession').addChannelTypes(ChannelType.GuildText).setRequired(true)
                )
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'setup') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ embeds: [embedPresets.error('No Permission', 'Butuh Manage Server.')], flags: 64 });
            }

            const channel = interaction.options.getChannel('channel');
            dataManager.setGuildSetting(guildId, 'confessionChannel', channel.id);

            await interaction.reply({
                embeds: [embedPresets.success('Confession Setup', `Confession channel: ${channel}`)],
                flags: 64,
            });
        } else if (sub === 'send') {
            const settings = dataManager.getGuildSettings(guildId);
            if (!settings.confessionChannel) {
                return interaction.reply({
                    embeds: [embedPresets.error('Not Setup', 'Admin belum setup confession channel. Gunakan `/confess setup`.')],
                    flags: 64,
                });
            }

            const modal = new ModalBuilder().setCustomId('confess:send').setTitle('🕵️ Anonymous Confession');

            const input = new TextInputBuilder()
                .setCustomId('confess_content')
                .setLabel('Isi Confession')
                .setPlaceholder('Tulis confession-mu di sini... Identitasmu tidak akan ditampilkan.')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(2000);

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }
    },

    async handleModal(interaction) {
        const content = interaction.fields.getTextInputValue('confess_content');
        const guildId = interaction.guild.id;
        const settings = dataManager.getGuildSettings(guildId);
        const channel = interaction.guild.channels.cache.get(settings.confessionChannel);

        if (!channel) {
            return interaction.reply({ content: '❌ Channel tidak ditemukan.', flags: 64 });
        }

        const confessions = dataManager.read('confessions.json', {});
        if (!confessions[guildId]) confessions[guildId] = { count: 0 };
        confessions[guildId].count++;
        const confId = confessions[guildId].count;
        dataManager.write('confessions.json', confessions);

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`🕵️ Confession #${confId}`)
            .setDescription(content)
            .setTimestamp()
            .setFooter({ text: `Anonymous • ${config.defaults.footerText}` });

        await channel.send({ embeds: [embed] });

        await interaction.reply({
            embeds: [embedPresets.success('Confession Sent!', `Confession #${confId} berhasil dikirim secara anonymous ke ${channel}.`)],
            flags: 64,
        });
    },
};
