const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

// Snipe storage: channelId -> { content, author, attachments, timestamp }
const snipedMessages = new Map();
const editSnipedMessages = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('Recover pesan yang terakhir dihapus di channel ini')
        .addSubcommand((sub) => sub.setName('delete').setDescription('Lihat pesan terakhir yang dihapus'))
        .addSubcommand((sub) => sub.setName('edit').setDescription('Lihat edit terakhir di channel ini')),

    snipedMessages,
    editSnipedMessages,

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const channelId = interaction.channel.id;

        if (sub === 'delete') {
            const sniped = snipedMessages.get(channelId);

            if (!sniped) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Tidak ada pesan yang bisa di-snipe.')],
                    flags: 64,
                });
            }

            const embed = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle('🔍 Sniped Message')
                .setDescription(sniped.content || '*No text content*')
                .setAuthor({ name: sniped.authorTag, iconURL: sniped.authorAvatar })
                .setTimestamp(sniped.timestamp)
                .setFooter({ text: `Deleted ${timeAgo(sniped.timestamp)}` });

            if (sniped.attachment) {
                embed.setImage(sniped.attachment);
            }

            await interaction.reply({ embeds: [embed] });
        } else if (sub === 'edit') {
            const sniped = editSnipedMessages.get(channelId);

            if (!sniped) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Tidak ada edit yang bisa di-snipe.')],
                    flags: 64,
                });
            }

            const embed = new EmbedBuilder()
                .setColor(config.colors.info)
                .setTitle('✏️ Edit Sniped')
                .addFields(
                    { name: 'Before', value: sniped.oldContent?.substring(0, 1024) || '*empty*' },
                    { name: 'After', value: sniped.newContent?.substring(0, 1024) || '*empty*' }
                )
                .setAuthor({ name: sniped.authorTag, iconURL: sniped.authorAvatar })
                .setTimestamp(sniped.timestamp)
                .setFooter({ text: `Edited ${timeAgo(sniped.timestamp)}` });

            await interaction.reply({ embeds: [embed] });
        }
    },
};

function timeAgo(ts) {
    const diff = Date.now() - ts;
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
}
