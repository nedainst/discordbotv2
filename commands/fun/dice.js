const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');

const DICE = [
    { label: 'D4 (1–4)', value: '4', emoji: '🎲' },
    { label: 'D6 (1–6)', value: '6', emoji: '🎲' },
    { label: 'D8 (1–8)', value: '8', emoji: '🎲' },
    { label: 'D10 (1–10)', value: '10', emoji: '🎲' },
    { label: 'D12 (1–12)', value: '12', emoji: '🎲' },
    { label: 'D20 (1–20)', value: '20', emoji: '🎲' },
    { label: 'D100 (1–100)', value: '100', emoji: '🎰' },
];

function roll(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

function buildDiceEmbed(sides, results, count) {
    const total = results.reduce((a, b) => a + b, 0);
    const max = sides * count;
    const percentage = Math.round((total / max) * 100);
    const bar = buildBar(percentage);

    return new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`🎲 Dice Roll — D${sides}`)
        .setDescription(
            `Melempar **${count}x D${sides}**\n\n` +
            `**Hasil:** ${results.join(', ')}\n` +
            `**Total:** \`${total}\` / \`${max}\`\n\n` +
            `${bar} \`${percentage}%\``
        )
        .setFooter({ text: config.defaults.footerText })
        .setTimestamp();
}

function buildBar(pct) {
    const filled = Math.round(pct / 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('Roll dadu!')
        .addIntegerOption((opt) =>
            opt.setName('sides').setDescription('Jumlah sisi dadu').setMinValue(2).setMaxValue(1000).setRequired(false)
        )
        .addIntegerOption((opt) =>
            opt.setName('count').setDescription('Jumlah dadu (1–10)').setMinValue(1).setMaxValue(10).setRequired(false)
        ),

    async execute(interaction) {
        const sides = interaction.options.getInteger('sides');
        const count = interaction.options.getInteger('count') || 1;

        if (sides) {
            const results = Array.from({ length: count }, () => roll(sides));
            const embed = buildDiceEmbed(sides, results, count);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`dice:reroll:${sides}:${count}`).setLabel('Roll Lagi').setStyle(ButtonStyle.Primary).setEmoji('🎲')
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        } else {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('dice:select')
                .setPlaceholder('Pilih jenis dadu...')
                .addOptions(DICE);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.reply({
                content: '🎲 Pilih jenis dadu:',
                components: [row],
                flags: 64,
            });
        }
    },

    async handleSelect(interaction) {
        const sides = parseInt(interaction.values[0]);
        const results = [roll(sides)];
        const embed = buildDiceEmbed(sides, results, 1);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`dice:reroll:${sides}:1`).setLabel('Roll Lagi').setStyle(ButtonStyle.Primary).setEmoji('🎲')
        );

        await interaction.update({ content: null, embeds: [embed], components: [row] });
    },

    async handleButton(interaction) {
        const parts = interaction.customId.split(':');
        const sides = parseInt(parts[2]);
        const count = parseInt(parts[3]);

        const results = Array.from({ length: count }, () => roll(sides));
        const embed = buildDiceEmbed(sides, results, count);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`dice:reroll:${sides}:${count}`).setLabel('Roll Lagi').setStyle(ButtonStyle.Primary).setEmoji('🎲')
        );

        await interaction.update({ embeds: [embed], components: [row] });
    },
};
