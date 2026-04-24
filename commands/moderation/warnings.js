const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require('discord.js');
const embedPresets = require('../../utils/embedPresets');
const dataManager = require('../../utils/dataManager');
const config = require('../../config.json');

const ITEMS_PER_PAGE = 5;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('View warnings of a member')
        .addSubcommand((sub) =>
            sub
                .setName('list')
                .setDescription('Lihat daftar warnings')
                .addUserOption((opt) => opt.setName('user').setDescription('Member yang ingin dilihat warnings-nya').setRequired(true))
        )
        .addSubcommand((sub) =>
            sub
                .setName('clear')
                .setDescription('Hapus semua warnings')
                .addUserOption((opt) => opt.setName('user').setDescription('Member yang warnings-nya akan dihapus').setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'clear') {
            dataManager.clearWarnings(guildId, target.id);
            return interaction.reply({
                embeds: [embedPresets.success('Warnings Cleared', `Semua warnings untuk **${target.tag}** telah dihapus.`)],
            });
        }

        // List warnings
        const warnings = dataManager.getWarnings(guildId, target.id);

        if (warnings.length === 0) {
            return interaction.reply({
                embeds: [embedPresets.info('No Warnings', `**${target.tag}** tidak memiliki warnings.`)],
                ephemeral: true,
            });
        }

        const totalPages = Math.ceil(warnings.length / ITEMS_PER_PAGE);
        const embed = buildWarningPage(target, warnings, 0, totalPages);

        const components = totalPages > 1 ? [buildPaginationRow(target.id, 0, totalPages)] : [];

        await interaction.reply({ embeds: [embed], components, ephemeral: true });
    },

    async handleButton(interaction) {
        const parts = interaction.customId.split(':');
        const subAction = parts[1];
        const targetId = parts[2];
        const currentPage = parseInt(parts[3]);

        const target = await interaction.client.users.fetch(targetId).catch(() => null);
        if (!target) {
            return interaction.update({ embeds: [embedPresets.error('Error', 'User tidak ditemukan.')], components: [] });
        }

        const warnings = dataManager.getWarnings(interaction.guild.id, targetId);
        const totalPages = Math.ceil(warnings.length / ITEMS_PER_PAGE);

        let newPage = currentPage;
        if (subAction === 'prev') newPage = Math.max(0, currentPage - 1);
        else if (subAction === 'next') newPage = Math.min(totalPages - 1, currentPage + 1);

        const embed = buildWarningPage(target, warnings, newPage, totalPages);
        const components = totalPages > 1 ? [buildPaginationRow(targetId, newPage, totalPages)] : [];

        await interaction.update({ embeds: [embed], components });
    },
};

function buildWarningPage(target, warnings, page, totalPages) {
    const start = page * ITEMS_PER_PAGE;
    const pageWarnings = warnings.slice(start, start + ITEMS_PER_PAGE);

    const description = pageWarnings
        .map((w, i) => {
            const num = start + i + 1;
            const date = new Date(w.timestamp).toLocaleDateString('id-ID');
            return `**#${num}** — oleh <@${w.moderator}>\n📝 ${w.reason}\n📅 ${date}\n`;
        })
        .join('\n');

    return new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle(`⚠️ Warnings — ${target.tag}`)
        .setDescription(description)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Total: ${warnings.length} warning(s) • Page ${page + 1}/${totalPages}` })
        .setTimestamp();
}

function buildPaginationRow(targetId, currentPage, totalPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`warnings:prev:${targetId}:${currentPage}`)
            .setLabel('◀ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),
        new ButtonBuilder()
            .setCustomId(`warnings:page:${targetId}:${currentPage}`)
            .setLabel(`${currentPage + 1}/${totalPages}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`warnings:next:${targetId}:${currentPage}`)
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage >= totalPages - 1)
    );
}
