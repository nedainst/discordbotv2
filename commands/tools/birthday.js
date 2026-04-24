const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const dataManager = require('../../utils/dataManager');
const embedPresets = require('../../utils/embedPresets');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('birthday')
        .setDescription('Set dan lihat ulang tahun')
        .addSubcommand((sub) =>
            sub
                .setName('set')
                .setDescription('Set ulang tahunmu')
                .addIntegerOption((opt) =>
                    opt.setName('day').setDescription('Hari (1-31)').setMinValue(1).setMaxValue(31).setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName('month')
                        .setDescription('Bulan (1-12)')
                        .setMinValue(1)
                        .setMaxValue(12)
                        .setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt.setName('year').setDescription('Tahun (opsional)').setMinValue(1900).setMaxValue(2020).setRequired(false)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('get')
                .setDescription('Lihat ulang tahun user')
                .addUserOption((opt) => opt.setName('user').setDescription('User yang ingin dilihat').setRequired(false))
        )
        .addSubcommand((sub) => sub.setName('list').setDescription('Lihat ulang tahun bulan ini')),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'set') {
            const day = interaction.options.getInteger('day');
            const month = interaction.options.getInteger('month');
            const year = interaction.options.getInteger('year');

            // Validate date
            const testDate = new Date(year || 2000, month - 1, day);
            if (testDate.getDate() !== day || testDate.getMonth() !== month - 1) {
                return interaction.reply({ embeds: [embedPresets.error('Error', `Tanggal ${day}/${month} tidak valid!`)], flags: 64 });
            }

            dataManager.setBirthday(guildId, interaction.user.id, {
                day,
                month,
                year: year || null,
                userId: interaction.user.id,
                username: interaction.user.tag,
            });

            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            await interaction.reply({
                embeds: [
                    embedPresets.success(
                        '🎂 Birthday Set!',
                        `Ulang tahunmu: **${day} ${months[month - 1]}${year ? ` ${year}` : ''}** disimpan! 🎉`
                    ),
                ],
                flags: 64,
            });
        } else if (sub === 'get') {
            const target = interaction.options.getUser('user') || interaction.user;
            const birthdays = dataManager.getBirthdays(guildId);
            const bday = birthdays[target.id];

            if (!bday) {
                return interaction.reply({
                    embeds: [embedPresets.info('Birthday', `**${target.tag}** belum set ulang tahun.`)],
                    flags: 64,
                });
            }

            const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

            // Calculate age or next birthday
            const now = new Date();
            let nextBday = new Date(now.getFullYear(), bday.month - 1, bday.day);
            if (nextBday < now) nextBday.setFullYear(nextBday.getFullYear() + 1);
            const nextSec = Math.floor(nextBday.getTime() / 1000);

            const age = bday.year ? now.getFullYear() - bday.year : null;

            const embed = new EmbedBuilder()
                .setColor(config.colors.purple)
                .setTitle(`🎂 Birthday — ${target.username}`)
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '📅 Tanggal', value: `**${bday.day} ${months[bday.month - 1]}${bday.year ? ` ${bday.year}` : ''}**`, inline: true },
                    { name: '🎉 Ulang Tahun Selanjutnya', value: `<t:${nextSec}:R>`, inline: true }
                );

            if (age !== null) embed.addFields({ name: '🎁 Umur', value: `${age} tahun`, inline: true });

            await interaction.reply({ embeds: [embed] });
        } else if (sub === 'list') {
            const birthdays = dataManager.getBirthdays(guildId);
            const now = new Date();
            const currentMonth = now.getMonth() + 1;

            const monthBdays = Object.values(birthdays).filter((b) => b.month === currentMonth).sort((a, b) => a.day - b.day);

            const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

            if (monthBdays.length === 0) {
                return interaction.reply({
                    embeds: [embedPresets.info('Birthday List', `Tidak ada ulang tahun di bulan **${months[currentMonth - 1]}**.`)],
                });
            }

            const lines = monthBdays.map((b) => {
                const isToday = b.day === now.getDate();
                return `${isToday ? '🎉🎂' : '🎂'} **${b.day} ${months[b.month - 1]}** — <@${b.userId}>${isToday ? ' **← TODAY!**' : ''}`;
            });

            const embed = new EmbedBuilder()
                .setColor(config.colors.purple)
                .setTitle(`🎂 Birthdays — ${months[currentMonth - 1]}`)
                .setDescription(lines.join('\n'))
                .setFooter({ text: `${monthBdays.length} birthday(s) bulan ini` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    },
};
