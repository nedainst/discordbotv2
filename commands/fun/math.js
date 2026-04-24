const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

// Math quiz questions pool
const QUESTIONS = [
    { q: 'Berapakah 15 × 8?', choices: ['100', '120', '115', '125'], answer: 1 },
    { q: 'Berapakah 144 ÷ 12?', choices: ['10', '14', '12', '11'], answer: 2 },
    { q: 'Berapakah akar kuadrat dari 225?', choices: ['14', '16', '15', '13'], answer: 2 },
    { q: 'Berapakah 7! (7 faktorial)?', choices: ['5040', '720', '2520', '4096'], answer: 0 },
    { q: 'Berapakah 2^10?', choices: ['512', '1024', '2048', '256'], answer: 1 },
    { q: 'Berapakah 17 × 13?', choices: ['221', '210', '201', '231'], answer: 0 },
    { q: 'Berapakah 1000 ÷ 8?', choices: ['115', '125', '120', '130'], answer: 1 },
    { q: 'Berapakah 3^5?', choices: ['81', '243', '729', '189'], answer: 1 },
    { q: 'Berapakah 256 ÷ 4?', choices: ['62', '68', '64', '66'], answer: 2 },
    { q: 'Berapakah 99 × 99?', choices: ['9801', '9702', '9899', '9980'], answer: 0 },
    { q: 'Berapakah luas lingkaran dengan jari-jari 7? (π≈22/7)', choices: ['154', '144', '162', '148'], answer: 0 },
    { q: 'Berapakah 45% dari 200?', choices: ['80', '95', '90', '85'], answer: 2 },
    { q: 'Jika x + 5 = 17, berapakah x?', choices: ['11', '13', '12', '10'], answer: 2 },
    { q: 'Berapakah bilangan prima ke-10?', choices: ['23', '31', '29', '27'], answer: 2 },
    { q: 'Berapakah 500 × 0.08?', choices: ['48', '42', '40', '45'], answer: 2 },
];

const activeQuizzes = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('math')
        .setDescription('Quiz matematika! Jawab dengan cepat untuk skor lebih tinggi!'),

    async execute(interaction) {
        const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        const startTime = Date.now();

        activeQuizzes.set(interaction.user.id, { question: q, startTime, messageId: null });

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('🧮 Math Quiz!')
            .setDescription(`**${q.q}**\n\nPilih jawaban yang benar!`)
            .setFooter({ text: '⏱️ Skor lebih tinggi jika menjawab lebih cepat!' })
            .setTimestamp();

        const labels = ['A', 'B', 'C', 'D'];
        const styles = [ButtonStyle.Primary, ButtonStyle.Secondary, ButtonStyle.Success, ButtonStyle.Danger];
        const row = new ActionRowBuilder().addComponents(
            q.choices.map((choice, i) =>
                new ButtonBuilder()
                    .setCustomId(`math:answer:${i}`)
                    .setLabel(`${labels[i]}. ${choice}`)
                    .setStyle(styles[i])
            )
        );

        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        activeQuizzes.get(interaction.user.id).messageId = msg.id;
    },

    async handleButton(interaction) {
        const answerIdx = parseInt(interaction.customId.split(':')[2]);
        const quiz = activeQuizzes.get(interaction.user.id);

        if (!quiz) {
            return interaction.reply({ content: '❌ Kuis ini sudah berakhir atau bukan milikmu.', flags: 64 });
        }

        const timeTaken = ((Date.now() - quiz.startTime) / 1000).toFixed(1);
        const isCorrect = answerIdx === quiz.question.answer;
        const score = isCorrect ? Math.max(100 - Math.floor(parseFloat(timeTaken) * 5), 10) : 0;

        activeQuizzes.delete(interaction.user.id);

        const labels = ['A', 'B', 'C', 'D'];

        const embed = new EmbedBuilder()
            .setColor(isCorrect ? config.colors.success : config.colors.danger)
            .setTitle(isCorrect ? '✅ Benar!' : '❌ Salah!')
            .setDescription(`**${quiz.question.q}**`)
            .addFields(
                { name: 'Jawaban Kamu', value: `${labels[answerIdx]}. ${quiz.question.choices[answerIdx]}`, inline: true },
                { name: 'Jawaban Benar', value: `${labels[quiz.question.answer]}. ${quiz.question.choices[quiz.question.answer]}`, inline: true },
                { name: '⏱️ Waktu', value: `${timeTaken} detik`, inline: true },
                { name: '⭐ Skor', value: isCorrect ? `**${score} poin**` : '0 poin', inline: true }
            )
            .setFooter({ text: config.defaults.footerText })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('math:new').setLabel('Soal Baru').setStyle(ButtonStyle.Primary).setEmoji('🧮')
        );

        await interaction.update({ embeds: [embed], components: [row] });
    },
};

// Handle "Soal Baru" button restarting the quiz
const originalHandleButton = module.exports.handleButton;
module.exports.handleButton = async function (interaction) {
    if (interaction.customId === 'math:new') {
        // Trigger a fresh quiz
        const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        const startTime = Date.now();
        activeQuizzes.set(interaction.user.id, { question: q, startTime, messageId: interaction.message.id });

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('🧮 Math Quiz!')
            .setDescription(`**${q.q}**\n\nPilih jawaban yang benar!`)
            .setFooter({ text: '⏱️ Skor lebih tinggi jika menjawab lebih cepat!' })
            .setTimestamp();

        const labels = ['A', 'B', 'C', 'D'];
        const styles = [ButtonStyle.Primary, ButtonStyle.Secondary, ButtonStyle.Success, ButtonStyle.Danger];
        const row = new ActionRowBuilder().addComponents(
            q.choices.map((choice, i) =>
                new ButtonBuilder()
                    .setCustomId(`math:answer:${i}`)
                    .setLabel(`${labels[i]}. ${choice}`)
                    .setStyle(styles[i])
            )
        );

        return interaction.update({ embeds: [embed], components: [row] });
    }
    return originalHandleButton(interaction);
};
