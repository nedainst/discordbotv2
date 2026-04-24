const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

function loadCommands(client) {
    client.commands = new Map();

    const commandsDir = path.join(__dirname, '..', 'commands');
    const categories = fs.readdirSync(commandsDir).filter((dir) => {
        return fs.statSync(path.join(commandsDir, dir)).isDirectory();
    });

    let total = 0;

    for (const category of categories) {
        const categoryDir = path.join(commandsDir, category);
        const commandFiles = fs.readdirSync(categoryDir).filter((file) => file.endsWith('.js'));

        for (const file of commandFiles) {
            try {
                const command = require(path.join(categoryDir, file));

                if (!command.data || !command.execute) {
                    logger.warn(`Command ${file} is missing "data" or "execute" property — skipped.`);
                    continue;
                }

                command.category = category;
                client.commands.set(command.data.name, command);
                total++;
            } catch (error) {
                logger.error(`Failed to load command ${file}`, error);
            }
        }
    }

    logger.success(`Loaded ${total} commands across ${categories.length} categories`);
}

module.exports = { loadCommands };
