const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop musik dan kosongkan queue'),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        if (!queue) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Tidak ada musik yang sedang diputar.')],
                flags: 64,
            });
        }

        queue.delete();

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.danger)
                    .setDescription('⏹️ Musik dihentikan dan queue dikosongkan.')
                    .setFooter({ text: `Requested by ${interaction.user.tag}` }),
            ],
        });
    },
};
