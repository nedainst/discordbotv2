const { Events } = require('discord.js');
const logger = require('../utils/logger');
const embedPresets = require('../utils/embedPresets');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction, client) {
        // ── Slash Commands ────────────────────────────
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                logger.warn(`Unknown command: ${interaction.commandName}`);
                return;
            }

            logger.command(
                interaction.commandName,
                interaction.user.tag,
                interaction.guild?.name || 'DM'
            );

            try {
                await command.execute(interaction, client);
            } catch (error) {
                logger.error(`Error executing command ${interaction.commandName}`, error);

                const errorEmbed = embedPresets.error(
                    'Command Error',
                    'Terjadi error saat menjalankan command ini. Silakan coba lagi.'
                );

                const replyOptions = { embeds: [errorEmbed], ephemeral: true };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(replyOptions).catch(() => {});
                } else {
                    await interaction.reply(replyOptions).catch(() => {});
                }
            }
        }

        // ── Buttons ───────────────────────────────────
        else if (interaction.isButton()) {
            const [action, ...args] = interaction.customId.split(':');

            // Find handler from commands
            for (const [, command] of client.commands) {
                if (command.handleButton && interaction.customId.startsWith(command.data.name)) {
                    try {
                        await command.handleButton(interaction, action, args, client);
                    } catch (error) {
                        logger.error(`Error handling button ${interaction.customId}`, error);
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({
                                embeds: [embedPresets.error('Error', 'Terjadi error saat memproses button.')],
                                ephemeral: true,
                            }).catch(() => {});
                        }
                    }
                    return;
                }
            }

            // Global button handlers
            try {
                await handleGlobalButton(interaction, action, args, client);
            } catch (error) {
                logger.error(`Error handling global button ${interaction.customId}`, error);
            }
        }

        // ── Select Menus ──────────────────────────────
        else if (interaction.isStringSelectMenu() || interaction.isRoleSelectMenu() || interaction.isChannelSelectMenu()) {
            const [action, ...args] = interaction.customId.split(':');

            for (const [, command] of client.commands) {
                if (command.handleSelect && interaction.customId.startsWith(command.data.name)) {
                    try {
                        await command.handleSelect(interaction, action, args, client);
                    } catch (error) {
                        logger.error(`Error handling select menu ${interaction.customId}`, error);
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({
                                embeds: [embedPresets.error('Error', 'Terjadi error saat memproses select menu.')],
                                ephemeral: true,
                            }).catch(() => {});
                        }
                    }
                    return;
                }
            }
        }

        // ── Modals ────────────────────────────────────
        else if (interaction.isModalSubmit()) {
            const [action, ...args] = interaction.customId.split(':');

            for (const [, command] of client.commands) {
                if (command.handleModal && interaction.customId.startsWith(command.data.name)) {
                    try {
                        await command.handleModal(interaction, action, args, client);
                    } catch (error) {
                        logger.error(`Error handling modal ${interaction.customId}`, error);
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({
                                embeds: [embedPresets.error('Error', 'Terjadi error saat memproses form.')],
                                ephemeral: true,
                            }).catch(() => {});
                        }
                    }
                    return;
                }
            }
        }

        // ── Autocomplete ──────────────────────────────
        else if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (command && command.autocomplete) {
                try {
                    await command.autocomplete(interaction, client);
                } catch (error) {
                    logger.error(`Error handling autocomplete for ${interaction.commandName}`, error);
                }
            }
        }
    },
};

// ── Global button handler for persistent buttons ──
async function handleGlobalButton(interaction, action, args, client) {
    // Ticket create button
    if (action === 'ticket_create') {
        const ticketCmd = client.commands.get('ticket');
        if (ticketCmd && ticketCmd.handleButton) {
            await ticketCmd.handleButton(interaction, action, args, client);
        }
    }
    // Giveaway join button
    else if (action === 'giveaway_join') {
        const giveawayCmd = client.commands.get('giveaway');
        if (giveawayCmd && giveawayCmd.handleButton) {
            await giveawayCmd.handleButton(interaction, action, args, client);
        }
    }
    // Reaction role select
    else if (action === 'reactionrole_select') {
        const rrCmd = client.commands.get('reaction-role');
        if (rrCmd && rrCmd.handleSelect) {
            await rrCmd.handleSelect(interaction, action, args, client);
        }
    }
    // Poll vote
    else if (action === 'poll_vote') {
        const pollCmd = client.commands.get('poll');
        if (pollCmd && pollCmd.handleButton) {
            await pollCmd.handleButton(interaction, action, args, client);
        }
    }
    // Voice room controls
    else if (action === 'voice') {
        const voiceCmd = client.commands.get('voice');
        if (voiceCmd && voiceCmd.handleButton) {
            // Reconstruct customId for voice handler
            await voiceCmd.handleButton(interaction, args[0], args, client);
        }
    }
}

