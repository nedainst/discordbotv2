const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');

// Safe math evaluator (no eval!)
function safeCalc(expression) {
    // Only allow numbers, operators, parentheses, spaces, dots
    const sanitized = expression.replace(/[^0-9+\-*/().\s%^]/g, '').trim();
    if (!sanitized) throw new Error('Invalid expression');

    // Replace ^ with ** for power
    const withPow = sanitized.replace(/\^/g, '**');

    // Use Function constructor in a safer way (still restricted by sanitization)
    try {
        const result = Function(`"use strict"; return (${withPow})`)();
        if (!isFinite(result)) throw new Error('Result is not finite');
        return result;
    } catch {
        throw new Error('Invalid expression');
    }
}

function formatResult(n) {
    if (Number.isInteger(n)) return n.toLocaleString();
    return parseFloat(n.toPrecision(10)).toLocaleString();
}

// Calculator state per user
const calcHistory = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('calc')
        .setDescription('Kalkulator pintar dengan ekspresi math')
        .addStringOption((opt) =>
            opt
                .setName('expression')
                .setDescription('Ekspresi math (contoh: (15 * 8) + 100 / 4)')
                .setRequired(true)
                .setMaxLength(200)
        ),

    async execute(interaction) {
        const expr = interaction.options.getString('expression');

        let result;
        let error = null;

        try {
            result = safeCalc(expr);
        } catch (e) {
            error = e.message;
        }

        if (error || result === undefined) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.danger)
                        .setTitle('🧮 Calculator — Error')
                        .setDescription(`❌ Ekspresi tidak valid: \`${expr}\`\n\nGunakan: angka, +, -, *, /, %, (, ), ^`)
                        .setFooter({ text: config.defaults.footerText }),
                ],
                flags: 64,
            });
        }

        // Track history
        const userId = interaction.user.id;
        const history = calcHistory.get(userId) || [];
        history.unshift({ expr, result });
        if (history.length > 5) history.pop();
        calcHistory.set(userId, history);

        const historyText = history.length > 1
            ? history.slice(1).map((h) => `\`${h.expr}\` = **${formatResult(h.result)}**`).join('\n')
            : '*Tidak ada history*';

        const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('🧮 Calculator')
            .addFields(
                { name: '📥 Ekspresi', value: `\`${expr}\``, inline: false },
                { name: '📤 Hasil', value: `## ${formatResult(result)}`, inline: false },
                { name: '📜 History', value: historyText, inline: false }
            )
            .setFooter({ text: config.defaults.footerText })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`calc:clear:${userId}`)
                .setLabel('Clear History')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️')
        );

        await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
    },

    async handleButton(interaction) {
        const userId = interaction.customId.split(':')[2];
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ Bukan milikmu!', flags: 64 });
        }
        calcHistory.delete(userId);
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle('🧮 Calculator')
                    .setDescription('✅ History dibersihkan!')
                    .setFooter({ text: config.defaults.footerText }),
            ],
            components: [],
        });
    },
};
