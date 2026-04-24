const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Hapus lagu dari queue')
        .addIntegerOption((opt) =>
            opt.setName('position').setDescription('Posisi lagu di queue (1, 2, 3, ...)').setMinValue(1).setRequired(true)
        ),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        if (!queue || queue.tracks.size === 0) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Queue kosong.')],
                flags: 64,
            });
        }

        const position = interaction.options.getInteger('position') - 1;
        const tracks = queue.tracks.toArray();

        if (position >= tracks.length) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription(`❌ Posisi tidak valid. Queue hanya punya **${tracks.length}** lagu.`)],
                flags: 64,
            });
        }

        const removed = tracks[position];
        queue.node.remove(position);

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.warning)
                    .setDescription(`🗑️ Dihapus: **${removed.title}** dari queue.`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` }),
            ],
        });
    },
};
