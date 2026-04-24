require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

const commands = [];
const commandsDir = path.join(__dirname, 'commands');

// ── Load all commands ─────────────────────────────
const categories = fs.readdirSync(commandsDir).filter((dir) => {
    return fs.statSync(path.join(commandsDir, dir)).isDirectory();
});

for (const category of categories) {
    const categoryDir = path.join(commandsDir, category);
    const files = fs.readdirSync(categoryDir).filter((f) => f.endsWith('.js'));

    for (const file of files) {
        const command = require(path.join(categoryDir, file));
        if (command.data) {
            commands.push(command.data.toJSON());
            logger.info(`Loaded: ${command.data.name} (${category})`);
        }
    }
}

// ── Deploy ────────────────────────────────────────
const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
    logger.error('BOT_TOKEN is not set in .env file!');
    process.exit(1);
}

if (!clientId || clientId === 'YOUR_CLIENT_ID_HERE') {
    logger.error('CLIENT_ID is not set in .env file!');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        logger.info(`Deploying ${commands.length} commands...`);

        if (guildId && guildId !== 'YOUR_GUILD_ID_HERE') {
            // Guild-specific deploy (instant)
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
                body: commands,
            });
            logger.success(`Successfully deployed ${commands.length} commands to guild ${guildId}`);
        } else {
            // Global deploy (takes up to 1 hour)
            await rest.put(Routes.applicationCommands(clientId), {
                body: commands,
            });
            logger.success(`Successfully deployed ${commands.length} commands globally`);
            logger.info('Note: Global commands may take up to 1 hour to appear.');
        }
    } catch (error) {
        logger.error('Failed to deploy commands:', error);
    }
})();
