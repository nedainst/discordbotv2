const { SlashCommandBuilder, PermissionFlagsBits, REST, Routes } = require('discord.js');
const embedPresets = require('../../utils/embedPresets');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync')
        .setDescription('Sync/deploy slash commands ke Discord')
        .addStringOption((opt) =>
            opt
                .setName('scope')
                .setDescription('Scope deployment')
                .addChoices(
                    { name: 'Guild (server ini saja — instant)', value: 'guild' },
                    { name: 'Global (semua server — butuh waktu)', value: 'global' }
                )
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const scope = interaction.options.getString('scope');
        const commands = [];

        // Collect all command data
        for (const [, command] of client.commands) {
            commands.push(command.data.toJSON());
        }

        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

        try {
            if (scope === 'guild') {
                const guildId = interaction.guild.id;

                await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), {
                    body: commands,
                });

                logger.success(`Synced ${commands.length} commands to guild ${interaction.guild.name}`);

                await interaction.editReply({
                    embeds: [
                        embedPresets.success(
                            'Commands Synced!',
                            `Berhasil sync **${commands.length}** commands ke server **${interaction.guild.name}**.\n\n` +
                            `Commands tersedia langsung (instant).`
                        ),
                    ],
                });
            } else {
                await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
                    body: commands,
                });

                logger.success(`Synced ${commands.length} commands globally`);

                await interaction.editReply({
                    embeds: [
                        embedPresets.success(
                            'Commands Synced Globally!',
                            `Berhasil sync **${commands.length}** commands secara **global**.\n\n` +
                            `⚠️ Perubahan mungkin butuh waktu hingga **1 jam** untuk tersedia di semua server.`
                        ),
                    ],
                });
            }
        } catch (error) {
            logger.error('Failed to sync commands', error);

            await interaction.editReply({
                embeds: [
                    embedPresets.error(
                        'Sync Failed',
                        `Gagal sync commands: ${error.message}\n\nPastikan BOT_TOKEN dan CLIENT_ID di .env sudah benar.`
                    ),
                ],
            });
        }
    },
};
