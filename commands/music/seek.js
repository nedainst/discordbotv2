const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Loncat ke posisi tertentu di lagu')
        .addStringOption((opt) =>
            opt.setName('time').setDescription('Posisi (contoh: 1:30, 90, 2:15)').setRequired(true)
        ),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Tidak ada musik yang sedang diputar.')],
                flags: 64,
            });
        }

        const timeStr = interaction.options.getString('time');

        // Parse time string (1:30, 90, 2:15:00, etc.)
        let seconds = 0;
        const parts = timeStr.split(':').map(Number);
        if (parts.some(isNaN)) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Format waktu tidak valid. Contoh: `1:30`, `90`, `2:15`')],
                flags: 64,
            });
        }

        if (parts.length === 1) seconds = parts[0];
        else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
        else if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];

        const ms = seconds * 1000;

        try {
            await queue.node.seek(ms);

            const formatted = [
                Math.floor(seconds / 60).toString().padStart(2, '0'),
                (seconds % 60).toString().padStart(2, '0'),
            ].join(':');

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#5865F2')
                        .setDescription(`⏩ Meloncat ke **${formatted}**`)
                        .setFooter({ text: `Requested by ${interaction.user.tag}` }),
                ],
            });
        } catch {
            await interaction.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Gagal seek ke posisi tersebut.')],
                flags: 64,
            });
        }
    },
};
