const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

const RESPONSES = [
    // Positive
    { text: 'Ya, sudah pasti! ✨', type: 'yes' },
    { text: 'Tanpa diragukan lagi! 🌟', type: 'yes' },
    { text: 'Tentu saja, ya! 🎯', type: 'yes' },
    { text: 'Semua tanda menunjukkan ya. ✅', type: 'yes' },
    { text: 'Bisa kamu andalkan! 💪', type: 'yes' },
    { text: 'Sepertinya sangat baik. ⭐', type: 'yes' },
    { text: 'Outlook sangat bagus. 🟢', type: 'yes' },
    { text: 'Ya! 👍', type: 'yes' },
    // Neutral
    { text: 'Jawab nanti... 🔮', type: 'neutral' },
    { text: 'Mintalah lagi nanti. ⏳', type: 'neutral' },
    { text: 'Lebih baik tidak memprediksi ini. 🤔', type: 'neutral' },
    { text: 'Tidak bisa diprediksi sekarang. 🌫️', type: 'neutral' },
    { text: 'Fokuskan dirimu dan tanya kembali. 🧘', type: 'neutral' },
    // Negative
    { text: 'Outlooknya tidak terlalu baik. ⚠️', type: 'no' },
    { text: 'Jawaban saya tidak. ❌', type: 'no' },
    { text: 'Sumber saya mengatakan tidak. 🚫', type: 'no' },
    { text: 'Jangan mengandalkan ini. 💀', type: 'no' },
    { text: 'Sangat diragukan. 🔴', type: 'no' },
    { text: 'Tidak mungkin. 😬', type: 'no' },
    { text: 'Outlook tidak bagus. ☁️', type: 'no' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Tanya Magic 8-Ball!')
        .addStringOption((opt) =>
            opt.setName('question').setDescription('Pertanyaan kamu...').setRequired(true).setMaxLength(256)
        ),

    async execute(interaction) {
        const question = interaction.options.getString('question');
        const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
        const colors = { yes: config.colors.success, neutral: config.colors.warning, no: config.colors.danger };

        const embed = new EmbedBuilder()
            .setColor(colors[response.type])
            .setTitle('🎱 Magic 8-Ball')
            .addFields(
                { name: '❓ Pertanyaan', value: question },
                { name: '🔮 Jawaban', value: `> ${response.text}` }
            )
            .setFooter({ text: `Ditanya oleh ${interaction.user.tag}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('8ball:again').setLabel('Tanya Lagi').setStyle(ButtonStyle.Primary).setEmoji('🎱')
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },

    async handleButton(interaction) {
        const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
        const colors = { yes: config.colors.success, neutral: config.colors.warning, no: config.colors.danger };
        const question = interaction.message.embeds[0]?.fields?.[0]?.value || '...';

        const embed = new EmbedBuilder()
            .setColor(colors[response.type])
            .setTitle('🎱 Magic 8-Ball')
            .addFields(
                { name: '❓ Pertanyaan', value: question },
                { name: '🔮 Jawaban', value: `> ${response.text}` }
            )
            .setFooter({ text: `Ditanya oleh ${interaction.user.tag}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('8ball:again').setLabel('Tanya Lagi').setStyle(ButtonStyle.Primary).setEmoji('🎱')
        );

        await interaction.update({ embeds: [embed], components: [row] });
    },
};
