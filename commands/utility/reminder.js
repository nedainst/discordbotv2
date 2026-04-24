const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const dataManager = require('../../utils/dataManager');
const embedPresets = require('../../utils/embedPresets');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reminder')
        .setDescription('Set reminder dan terima DM saat waktunya tiba')
        .addSubcommand((sub) => sub.setName('set').setDescription('Set reminder baru'))
        .addSubcommand((sub) => sub.setName('list').setDescription('Lihat semua remindermu')),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'set') {
            const modal = new ModalBuilder().setCustomId('reminder:create').setTitle('⏰ Set Reminder');

            const msgInput = new TextInputBuilder()
                .setCustomId('reminder_message')
                .setLabel('Apa yang ingin kamu ingat?')
                .setPlaceholder('Contoh: Meeting jam 3 sore!')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(500);

            const timeInput = new TextInputBuilder()
                .setCustomId('reminder_time')
                .setLabel('Kapan? (contoh: 10m, 2h, 1d, 30s)')
                .setPlaceholder('10m = 10 menit, 2h = 2 jam, 1d = 1 hari')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(10);

            modal.addComponents(
                new ActionRowBuilder().addComponents(msgInput),
                new ActionRowBuilder().addComponents(timeInput)
            );

            await interaction.showModal(modal);
        } else if (sub === 'list') {
            const allReminders = dataManager.getReminders();
            const mine = allReminders.filter((r) => r.userId === interaction.user.id);

            if (mine.length === 0) {
                return interaction.reply({ embeds: [embedPresets.info('Reminders', 'Kamu tidak punya reminder aktif.')], flags: 64 });
            }

            const lines = mine.map((r) => {
                const dueSec = Math.floor(r.triggerAt / 1000);
                return `🔔 <t:${dueSec}:R> — ${r.message.substring(0, 60)}${r.message.length > 60 ? '...' : ''}`;
            });

            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('⏰ Your Reminders')
                .setDescription(lines.join('\n'))
                .setFooter({ text: `Total: ${mine.length} reminder(s)` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: 64 });
        }
    },

    async handleModal(interaction) {
        const message = interaction.fields.getTextInputValue('reminder_message');
        const timeStr = interaction.fields.getTextInputValue('reminder_time').trim().toLowerCase();

        const ms = parseTime(timeStr);
        if (!ms || ms < 5000) {
            return interaction.reply({ content: '❌ Format waktu tidak valid. Gunakan contoh: `10m`, `2h`, `1d`, `30s`.', flags: 64 });
        }
        if (ms > 7 * 24 * 60 * 60 * 1000) {
            return interaction.reply({ content: '❌ Waktu maksimal 7 hari.', flags: 64 });
        }

        const triggerAt = Date.now() + ms;

        dataManager.addReminder({
            userId: interaction.user.id,
            guildId: interaction.guild?.id || null,
            message,
            triggerAt,
            createdAt: Date.now(),
        });

        const triggerSec = Math.floor(triggerAt / 1000);

        await interaction.reply({
            embeds: [
                embedPresets.success(
                    '⏰ Reminder Set!',
                    `Kamu akan diingatkan <t:${triggerSec}:R> via DM.\n\n📝 **Pesan:** ${message}`
                ),
            ],
            flags: 64,
        });
    },
};

function parseTime(str) {
    const match = str.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return null;
    const amount = parseInt(match[1]);
    const unit = match[2];
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return amount * multipliers[unit];
}
