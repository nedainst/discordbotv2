const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        logger.success(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        logger.success(`Bot logged in as ${client.user.tag}`);
        logger.success(`Serving ${client.guilds.cache.size} server(s)`);
        logger.success(`${client.commands.size} commands loaded`);
        logger.success(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        // Set bot activity
        client.user.setPresence({
            activities: [
                {
                    name: '/help • Discord Essentials',
                    type: ActivityType.Listening,
                },
            ],
            status: 'online',
        });
    },
};
