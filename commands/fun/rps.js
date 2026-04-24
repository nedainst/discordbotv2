const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

const CHOICES = ['rock', 'paper', 'scissors'];
const EMOJIS = { rock: '🪨', paper: '📄', scissors: '✂️' };
const LABELS = { rock: 'Rock', paper: 'Paper', scissors: 'Scissors' };

function getResult(player, bot) {
    if (player === bot) return 'draw';
    if (
        (player === 'rock' && bot === 'scissors') ||
        (player === 'scissors' && bot === 'paper') ||
        (player === 'paper' && bot === 'rock')
    ) return 'win';
    return 'lose';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('Main Rock Paper Scissors vs bot!'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('🎮 Rock Paper Scissors')
            .setDescription('Pilih gerakanmu!')
            .setFooter({ text: config.defaults.footerText });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('rps:rock').setLabel('Rock').setStyle(ButtonStyle.Secondary).setEmoji('🪨'),
            new ButtonBuilder().setCustomId('rps:paper').setLabel('Paper').setStyle(ButtonStyle.Secondary).setEmoji('📄'),
            new ButtonBuilder().setCustomId('rps:scissors').setLabel('Scissors').setStyle(ButtonStyle.Secondary).setEmoji('✂️')
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },

    async handleButton(interaction) {
        const playerChoice = interaction.customId.split(':')[1];
        const botChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)];
        const result = getResult(playerChoice, botChoice);

        const colors = { win: config.colors.success, lose: config.colors.danger, draw: config.colors.warning };
        const titles = { win: '🏆 Kamu Menang!', lose: '💀 Kamu Kalah!', draw: '🤝 Seri!' };
        const msgs = {
            win: 'Selamat! Kamu berhasil mengalahkan bot! 🎉',
            lose: 'Sayang sekali... Coba lagi! 💪',
            draw: 'Wow, seri! Kita setara! ⚔️',
        };

        const embed = new EmbedBuilder()
            .setColor(colors[result])
            .setTitle(titles[result])
            .setDescription(msgs[result])
            .addFields(
                { name: `${interaction.user.username} memilih`, value: `${EMOJIS[playerChoice]} ${LABELS[playerChoice]}`, inline: true },
                { name: 'Bot memilih', value: `${EMOJIS[botChoice]} ${LABELS[botChoice]}`, inline: true }
            )
            .setFooter({ text: config.defaults.footerText });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('rps:rock').setLabel('Rock').setStyle(ButtonStyle.Secondary).setEmoji('🪨'),
            new ButtonBuilder().setCustomId('rps:paper').setLabel('Paper').setStyle(ButtonStyle.Secondary).setEmoji('📄'),
            new ButtonBuilder().setCustomId('rps:scissors').setLabel('Scissors').setStyle(ButtonStyle.Secondary).setEmoji('✂️')
        );

        await interaction.update({ embeds: [embed], components: [row] });
    },
};
