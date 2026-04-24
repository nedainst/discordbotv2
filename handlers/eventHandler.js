const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

function loadEvents(client) {
    const eventsDir = path.join(__dirname, '..', 'events');
    const eventFiles = fs.readdirSync(eventsDir).filter((file) => file.endsWith('.js'));

    let total = 0;

    for (const file of eventFiles) {
        try {
            const event = require(path.join(eventsDir, file));

            if (!event.name || !event.execute) {
                logger.warn(`Event ${file} is missing "name" or "execute" property — skipped.`);
                continue;
            }

            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }

            total++;
        } catch (error) {
            logger.error(`Failed to load event ${file}`, error);
        }
    }

    logger.success(`Loaded ${total} events`);
}

module.exports = { loadEvents };
