const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const dataManager = require('../../utils/dataManager');
const embedPresets = require('../../utils/embedPresets');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tags')
        .setDescription('Custom tag/shortcut response untuk server')
        .addSubcommand((sub) => sub.setName('create').setDescription('Buat tag baru'))
        .addSubcommand((sub) =>
            sub
                .setName('use')
                .setDescription('Gunakan tag')
                .addStringOption((opt) => opt.setName('name').setDescription('Nama tag').setRequired(true))
        )
        .addSubcommand((sub) => sub.setName('list').setDescription('Lihat semua tag server'))
        .addSubcommand((sub) =>
            sub
                .setName('delete')
                .setDescription('Hapus tag')
                .addStringOption((opt) => opt.setName('name').setDescription('Nama tag yang dihapus').setRequired(true))
        )
        .addSubcommand((sub) =>
            sub
                .setName('info')
                .setDescription('Info tentang sebuah tag')
                .addStringOption((opt) => opt.setName('name').setDescription('Nama tag').setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'create') {
            const modal = new ModalBuilder().setCustomId('tags:create').setTitle('🏷️ Create Tag');

            const nameInput = new TextInputBuilder()
                .setCustomId('tag_name')
                .setLabel('Nama Tag')
                .setPlaceholder('contoh: rules, info, help')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(32);

            const contentInput = new TextInputBuilder()
                .setCustomId('tag_content')
                .setLabel('Isi Tag')
                .setPlaceholder('Konten yang akan dikirim saat tag dipakai...')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(2000);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(contentInput)
            );

            await interaction.showModal(modal);
        } else if (sub === 'use') {
            const name = interaction.options.getString('name');
            const tag = dataManager.getTag(guildId, name);

            if (!tag) {
                return interaction.reply({
                    embeds: [embedPresets.error('Not Found', `Tag \`${name}\` tidak ditemukan. Gunakan \`/tags list\` untuk melihat semua tag.`)],
                    flags: 64,
                });
            }

            // Update use count
            tag.uses = (tag.uses || 0) + 1;
            dataManager.setTag(guildId, name, tag);

            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setDescription(tag.content)
                .setFooter({ text: `Tag: ${name} • Dibuat oleh ${tag.creatorTag}` });

            await interaction.reply({ embeds: [embed] });
        } else if (sub === 'list') {
            const tags = dataManager.getTags(guildId);
            const tagEntries = Object.entries(tags);

            if (tagEntries.length === 0) {
                return interaction.reply({ embeds: [embedPresets.info('Tags', 'Server ini belum punya tag. Buat dengan `/tags create`.')], flags: 64 });
            }

            const lines = tagEntries.map(([name, t]) => `\`${name}\` — oleh ${t.creatorTag} (${t.uses || 0}x dipakai)`);

            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`🏷️ Server Tags — ${interaction.guild.name}`)
                .setDescription(lines.join('\n'))
                .setFooter({ text: `${tagEntries.length} tag(s) • ${config.defaults.footerText}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } else if (sub === 'delete') {
            const name = interaction.options.getString('name');
            const tag = dataManager.getTag(guildId, name);

            if (!tag) {
                return interaction.reply({ embeds: [embedPresets.error('Not Found', `Tag \`${name}\` tidak ditemukan.`)], flags: 64 });
            }

            const canDelete =
                tag.creatorId === interaction.user.id ||
                interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);

            if (!canDelete) {
                return interaction.reply({ embeds: [embedPresets.error('No Permission', 'Hanya pembuat tag atau moderator yang bisa menghapus tag ini.')], flags: 64 });
            }

            dataManager.deleteTag(guildId, name);
            await interaction.reply({ embeds: [embedPresets.success('Deleted', `Tag \`${name}\` berhasil dihapus.`)], flags: 64 });
        } else if (sub === 'info') {
            const name = interaction.options.getString('name');
            const tag = dataManager.getTag(guildId, name);

            if (!tag) {
                return interaction.reply({ embeds: [embedPresets.error('Not Found', `Tag \`${name}\` tidak ditemukan.`)], flags: 64 });
            }

            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`🏷️ Tag Info — ${name}`)
                .setDescription(`**Preview:** ${tag.content.substring(0, 200)}${tag.content.length > 200 ? '...' : ''}`)
                .addFields(
                    { name: '👤 Dibuat oleh', value: tag.creatorTag, inline: true },
                    { name: '📊 Dipakai', value: `${tag.uses || 0}x`, inline: true },
                    { name: '📅 Dibuat', value: `<t:${Math.floor(tag.createdAt / 1000)}:R>`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: 64 });
        }
    },

    async handleModal(interaction) {
        const name = interaction.fields.getTextInputValue('tag_name').toLowerCase().replace(/\s+/g, '-');
        const content = interaction.fields.getTextInputValue('tag_content');
        const guildId = interaction.guild.id;

        const existing = dataManager.getTag(guildId, name);
        if (existing) {
            return interaction.reply({
                embeds: [embedPresets.error('Already Exists', `Tag \`${name}\` sudah ada. Hapus dulu atau gunakan nama lain.`)],
                flags: 64,
            });
        }

        dataManager.setTag(guildId, name, {
            content,
            creatorId: interaction.user.id,
            creatorTag: interaction.user.tag,
            createdAt: Date.now(),
            uses: 0,
        });

        await interaction.reply({
            embeds: [embedPresets.success('Tag Created!', `Tag \`${name}\` berhasil dibuat!\nGunakan dengan \`/tags use ${name}\``)],
            flags: 64,
        });
    },
};
