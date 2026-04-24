const {
    SlashCommandBuilder,
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
        .setName('note')
        .setDescription('Simpan catatan pribadimu')
        .addSubcommand((sub) => sub.setName('add').setDescription('Tambah catatan baru'))
        .addSubcommand((sub) => sub.setName('list').setDescription('Lihat semua catatanmu'))
        .addSubcommand((sub) =>
            sub
                .setName('delete')
                .setDescription('Hapus catatan')
                .addStringOption((opt) => opt.setName('id').setDescription('ID catatan yang ingin dihapus').setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'add') {
            const modal = new ModalBuilder().setCustomId('note:create').setTitle('📝 Add Note');

            const titleInput = new TextInputBuilder()
                .setCustomId('note_title')
                .setLabel('Judul')
                .setPlaceholder('Judul catatanmu...')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100);

            const contentInput = new TextInputBuilder()
                .setCustomId('note_content')
                .setLabel('Isi Catatan')
                .setPlaceholder('Tulis catatanmu di sini...')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(1000);

            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(contentInput)
            );

            await interaction.showModal(modal);
        } else if (sub === 'list') {
            const notes = dataManager.getNotes(interaction.user.id);

            if (notes.length === 0) {
                return interaction.reply({ embeds: [embedPresets.info('Notes', 'Kamu belum punya catatan.')], flags: 64 });
            }

            const lines = notes.map((n, i) => `\`${n.id}\` **${i + 1}. ${n.title}** — <t:${Math.floor(new Date(n.createdAt).getTime() / 1000)}:R>`);

            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('📝 Your Notes')
                .setDescription(lines.join('\n'))
                .setFooter({ text: `${notes.length} note(s) • Gunakan /note delete <id> untuk hapus` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: 64 });
        } else if (sub === 'delete') {
            const id = interaction.options.getString('id');
            const notes = dataManager.getNotes(interaction.user.id);
            const exists = notes.find((n) => n.id === id);

            if (!exists) {
                return interaction.reply({ embeds: [embedPresets.error('Not Found', `Catatan dengan ID \`${id}\` tidak ditemukan.`)], flags: 64 });
            }

            dataManager.deleteNote(interaction.user.id, id);
            await interaction.reply({
                embeds: [embedPresets.success('Deleted', `Catatan **${exists.title}** berhasil dihapus.`)],
                flags: 64,
            });
        }
    },

    async handleModal(interaction) {
        const title = interaction.fields.getTextInputValue('note_title');
        const content = interaction.fields.getTextInputValue('note_content');

        dataManager.addNote(interaction.user.id, { title, content });

        await interaction.reply({
            embeds: [embedPresets.success('Note Saved!', `📝 **${title}**\n\n${content}`)],
            flags: 64,
        });
    },
};
