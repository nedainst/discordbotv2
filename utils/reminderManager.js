const dataManager = require('./dataManager');
const logger = require('./logger');

let reminderInterval = null;

function startReminderChecker(client) {
    if (reminderInterval) clearInterval(reminderInterval);

    reminderInterval = setInterval(async () => {
        const now = Date.now();
        const reminders = dataManager.getReminders();
        const due = reminders.filter((r) => r.triggerAt <= now);

        for (const reminder of due) {
            try {
                const user = await client.users.fetch(reminder.userId).catch(() => null);
                if (!user) continue;

                await user.send({
                    embeds: [
                        {
                            color: 0x5865f2,
                            title: '⏰ Reminder!',
                            description: reminder.message,
                            fields: [{ name: '📅 Set on', value: `<t:${Math.floor(reminder.createdAt / 1000)}:R>`, inline: true }],
                            footer: { text: 'Discord Essentials Bot' },
                            timestamp: new Date().toISOString(),
                        },
                    ],
                }).catch(() => {});

                dataManager.removeReminder(reminder.id);
                logger.info(`Sent reminder to ${reminder.userId}`);
            } catch (error) {
                logger.error(`Failed to send reminder ${reminder.id}`, error);
            }
        }
    }, 30000); // Check every 30 seconds

    logger.success('Reminder checker started');
}

module.exports = { startReminderChecker };
