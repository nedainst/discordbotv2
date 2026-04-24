const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    StringSelectMenuBuilder,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const dataManager = require('../../utils/dataManager');
const embedPresets = require('../../utils/embedPresets');
const config = require('../../config.json');

const AUTOMOD_RULES = [
    { label: 'Anti-Link', value: 'noLinks', description: 'Hapus pesan yang mengandung URL/link', emoji: '🔗' },
    { label: 'Anti-Caps', value: 'antiCaps', description: 'Hapus pesan dengan >70% huruf kapital', emoji: '🔤' },
    { label: 'Anti-Mention Spam', value: 'antiMentionSpam', description: 'Hapus jika mention >5 user/role', emoji: '📢' },
    { label: 'Bad Words Filter', value: 'badWords', description: 'Filter kata-kata yang dilarang', emoji: '🚫' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Konfigurasi auto-moderation')
        .addSubcommand((sub) => sub.setName('setup').setDescription('Setup aturan auto-mod'))
        .addSubcommand((sub) => sub.setName('view').setDescription('Lihat aturan auto-mod aktif'))
        .addSubcommand((sub) =>
            sub
                .setName('badwords')
                .setDescription('Kelola daftar kata terlarang')
                .addStringOption((opt) =>
                    opt.setName('action').setDescription('add atau remove kata').addChoices(
                        { name: 'Add kata', value: 'add' },
                        { name: 'Remove kata', value: 'remove' },
                        { name: 'List kata', value: 'list' }
                    ).setRequired(true)
                )
                .addStringOption((opt) => opt.setName('word').setDescription('Kata yang akan ditambah/dihapus').setRequired(false))
        )
        .addSubcommand((sub) =>
            sub.setName('toggle').setDescription('Aktifkan / nonaktifkan automod')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'setup') {
            const current = dataManager.getAutoMod(guildId);
            const currentRules = current.rules || {};

            const menu = new StringSelectMenuBuilder()
                .setCustomId('automod:toggle_rules')
                .setPlaceholder('Pilih aturan yang ingin diaktifkan...')
                .setMinValues(0)
                .setMaxValues(AUTOMOD_RULES.length)
                .addOptions(
                    AUTOMOD_RULES.map((r) => ({
                        label: r.label,
                        value: r.value,
                        description: r.description,
                        emoji: r.emoji,
                        default: !!currentRules[r.value],
                    }))
                );

            const row = new ActionRowBuilder().addComponents(menu);

            const embed = embedPresets.info(
                '🤖 Auto-Mod Setup',
                `Status: **${current.enabled ? '✅ Aktif' : '❌ Nonaktif'}**\n\nPilih aturan yang ingin diaktifkan:`
            );

            await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
        } else if (sub === 'view') {
            const current = dataManager.getAutoMod(guildId);
            const rules = current.rules || {};

            const rulesList = AUTOMOD_RULES.map((r) =>
                `${rules[r.value] ? '✅' : '❌'} **${r.label}** — ${r.description}`
            ).join('\n');

            const badWords = rules.badWordList || [];

            const embed = new EmbedBuilder()
                .setColor(current.enabled ? config.colors.success : config.colors.danger)
                .setTitle('🤖 Auto-Mod Rules')
                .setDescription(`**Status:** ${current.enabled ? '✅ Aktif' : '❌ Nonaktif'}\n\n${rulesList}`)
                .addFields({
                    name: `🚫 Bad Word List (${badWords.length})`,
                    value: badWords.length > 0 ? `\`${badWords.join('`, `')}\`` : '*Tidak ada*',
                })
                .setTimestamp()
                .setFooter({ text: config.defaults.footerText });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('automod:btn_toggle')
                    .setLabel(current.enabled ? 'Nonaktifkan AutoMod' : 'Aktifkan AutoMod')
                    .setStyle(current.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
            );

            await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
        } else if (sub === 'toggle') {
            const current = dataManager.getAutoMod(guildId);
            current.enabled = !current.enabled;
            dataManager.setAutoMod(guildId, current);

            await interaction.reply({
                embeds: [embedPresets.success(
                    'AutoMod Updated',
                    `AutoMod sekarang **${current.enabled ? '✅ Aktif' : '❌ Nonaktif'}**.`
                )],
                flags: 64,
            });
        } else if (sub === 'badwords') {
            const action = interaction.options.getString('action');
            const word = interaction.options.getString('word');
            const current = dataManager.getAutoMod(guildId);
            if (!current.rules) current.rules = {};
            if (!current.rules.badWordList) current.rules.badWordList = [];

            if (action === 'list') {
                const words = current.rules.badWordList;
                await interaction.reply({
                    embeds: [embedPresets.info('Bad Word List', words.length > 0 ? `\`${words.join('`, `')}\`` : '*Tidak ada kata terlarang.*')],
                    flags: 64,
                });
            } else if (action === 'add') {
                if (!word) return interaction.reply({ content: '❌ Masukkan kata yang ingin ditambahkan.', flags: 64 });
                if (!current.rules.badWordList.includes(word.toLowerCase())) {
                    current.rules.badWordList.push(word.toLowerCase());
                    dataManager.setAutoMod(guildId, current);
                }
                await interaction.reply({ embeds: [embedPresets.success('Added', `Kata \`${word}\` ditambahkan ke daftar.`)], flags: 64 });
            } else if (action === 'remove') {
                if (!word) return interaction.reply({ content: '❌ Masukkan kata yang ingin dihapus.', flags: 64 });
                current.rules.badWordList = current.rules.badWordList.filter((w) => w !== word.toLowerCase());
                dataManager.setAutoMod(guildId, current);
                await interaction.reply({ embeds: [embedPresets.success('Removed', `Kata \`${word}\` dihapus dari daftar.`)], flags: 64 });
            }
        }
    },

    async handleSelect(interaction) {
        if (!interaction.customId.startsWith('automod:toggle_rules')) return;

        const guildId = interaction.guild.id;
        const current = dataManager.getAutoMod(guildId);
        if (!current.rules) current.rules = {};

        const selectedValues = interaction.values;
        for (const rule of AUTOMOD_RULES) {
            current.rules[rule.value] = selectedValues.includes(rule.value);
        }

        dataManager.setAutoMod(guildId, current);

        const activeRules = AUTOMOD_RULES.filter((r) => current.rules[r.value]).map((r) => r.label);
        await interaction.update({
            embeds: [embedPresets.success('AutoMod Updated', `Aturan aktif: ${activeRules.length > 0 ? activeRules.join(', ') : 'Tidak ada'}`)],
            components: [],
        });
    },

    async handleButton(interaction) {
        if (interaction.customId === 'automod:btn_toggle') {
            const guildId = interaction.guild.id;
            const current = dataManager.getAutoMod(guildId);
            current.enabled = !current.enabled;
            dataManager.setAutoMod(guildId, current);

            await interaction.update({
                embeds: [embedPresets.success('AutoMod Updated', `AutoMod sekarang **${current.enabled ? '✅ Aktif' : '❌ Nonaktif'}**.`)],
                components: [],
            });
        }
    },
};
