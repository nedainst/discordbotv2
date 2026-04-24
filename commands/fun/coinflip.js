const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip koin — Heads atau Tails?')
        .addStringOption((opt) =>
            opt
                .setName('bet')
                .setDescription('Pilih sisimu')
                .addChoices({ name: '🪙 Heads', value: 'heads' }, { name: '🎲 Tails', value: 'tails' })
                .setRequired(false)
        ),

    async execute(interaction) {
        const bet = interaction.options.getString('bet');
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const emojis = { heads: '🪙', tails: '🎲' };
        const labels = { heads: 'Heads', tails: 'Tails' };

        let description = `**Hasilnya: ${emojis[result]} ${labels[result]}!**`;
        let color = config.colors.primary;

        if (bet) {
            if (bet === result) {
                description += `\n\n✅ Tebakan kamu **BENAR**! 🎉`;
                color = config.colors.success;
            } else {
                description += `\n\n❌ Tebakan kamu **SALAH**! 😢\nKamu pilih: **${labels[bet]}**`;
                color = config.colors.danger;
            }
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🪙 Coin Flip!')
            .setDescription(description)
            .setFooter({ text: config.defaults.footerText })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('coinflip:heads').setLabel('Flip Lagi (Heads)').setStyle(ButtonStyle.Primary).setEmoji('🪙'),
            new ButtonBuilder().setCustomId('coinflip:tails').setLabel('Flip Lagi (Tails)').setStyle(ButtonStyle.Secondary).setEmoji('🎲')
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },

    async handleButton(interaction) {
        const bet = interaction.customId.split(':')[1];
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const emojis = { heads: '🪙', tails: '🎲' };
        const labels = { heads: 'Heads', tails: 'Tails' };

        let description = `**Hasilnya: ${emojis[result]} ${labels[result]}!**`;
        let color = config.colors.primary;

        if (bet === result) {
            description += `\n\n✅ Tebakan kamu **BENAR**! 🎉`;
            color = config.colors.success;
        } else {
            description += `\n\n❌ Tebakan kamu **SALAH**! 😢\nKamu pilih: **${labels[bet]}**`;
            color = config.colors.danger;
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🪙 Coin Flip!')
            .setDescription(description)
            .setFooter({ text: config.defaults.footerText })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('coinflip:heads').setLabel('Flip Lagi (Heads)').setStyle(ButtonStyle.Primary).setEmoji('🪙'),
            new ButtonBuilder().setCustomId('coinflip:tails').setLabel('Flip Lagi (Tails)').setStyle(ButtonStyle.Secondary).setEmoji('🎲')
        );

        await interaction.update({ embeds: [embed], components: [row] });
    },
};
