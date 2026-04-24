require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { startReminderChecker } = require('./utils/reminderManager');
const { startDashboard } = require('./dashboard/server');
const logger = require('./utils/logger');

// ── Create Client ─────────────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,        // Privileged — enable di Developer Portal!
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,    // Required for private VC system
        GatewayIntentBits.MessageContent,      // Privileged — enable di Developer Portal!
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

// ── Initialize ────────────────────────────────────
client.commands = new Collection();

// ── Music Player ──────────────────────────────────
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');

// Tell discord-player where FFmpeg lives
process.env.FFMPEG_PATH = require('ffmpeg-static');
// Force discord-player to use distube's ytdl-core for extracting (most frequently updated against YT bypasses)
process.env.DP_FORCE_YTDL_MOD = '@distube/ytdl-core';

const player = new Player(client, {
    skipFFmpeg: false,
    connectionTimeout: 30000,
});

// Load extractors (YouTube, Spotify, SoundCloud, Apple Music, etc.)
player.extractors.loadMulti(DefaultExtractors);

client.player = player;

// Player events — send "Now Playing" messages to text channel
player.events.on('playerStart', (queue, track) => {
    const { EmbedBuilder } = require('discord.js');
    const channel = queue.metadata?.channel;
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${track.title}](${track.url})**\nby *${track.author}*`)
        .addFields(
            { name: '⏱️ Duration', value: track.duration || 'Live', inline: true },
            { name: '🔊 Source', value: track.source || 'Unknown', inline: true },
            { name: '👤 Requested', value: `${track.requestedBy || 'Unknown'}`, inline: true }
        )
        .setThumbnail(track.thumbnail)
        .setTimestamp();

    channel.send({ embeds: [embed] }).catch(() => {});
});

player.events.on('emptyQueue', (queue) => {
    const channel = queue.metadata?.channel;
    if (channel) {
        const { EmbedBuilder } = require('discord.js');
        channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setDescription('📭 Queue selesai! Tambahkan lagu dengan `/play`.'),
            ],
        }).catch(() => {});
    }
});

player.events.on('playerError', (queue, error, track) => {
    logger.error(`Player error on "${track?.title}": ${error.message}`);
    logger.error(`Error stack: ${error.stack?.substring(0, 300)}`);
    const channel = queue.metadata?.channel;
    if (channel) {
        const { EmbedBuilder } = require('discord.js');
        channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription(`❌ Gagal memutar **${track?.title || 'Unknown'}**:\n${error.message?.substring(0, 200)}`),
            ],
        }).catch(() => {});
    }
});

player.events.on('error', (queue, error) => {
    logger.error(`Queue error: ${error.message}`);
    logger.error(`Error details: ${error.stack?.substring(0, 300)}`);
});

player.events.on('playerSkip', (queue, track) => {
    logger.warn(`Skipped unplayable track: ${track.title}`);
    const channel = queue.metadata?.channel;
    if (channel) {
        const { EmbedBuilder } = require('discord.js');
        channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setDescription(`⚠️ Skip **${track.title}** — tidak bisa diputar (stream tidak tersedia).`),
            ],
        }).catch(() => {});
    }
});

player.events.on('debug', (queue, message) => {
    if (message.includes('error') || message.includes('Error') || message.includes('failed')) {
        logger.warn(`[Player Debug] ${message}`);
    }
});

logger.info('Starting Discord Essentials Bot...');
logger.info('Loading commands and events...');

// Load commands and events
loadCommands(client);
loadEvents(client);

// Start services when ready
client.once('clientReady', () => {
    startReminderChecker(client);
    startDashboard(client);
    logger.success('Music player initialized with FFmpeg');
});

// ── Error Handling ────────────────────────────────
process.on('unhandledRejection', (error) => {
    logger.error('Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
});

client.on('error', (error) => {
    logger.error('Client Error:', error);
});

client.on('warn', (warning) => {
    logger.warn(`Client Warning: ${warning}`);
});

// ── Login ─────────────────────────────────────────
const token = process.env.BOT_TOKEN;

if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
    logger.error('BOT_TOKEN is not set! Please configure your .env file.');
    logger.info('1. Go to https://discord.com/developers/applications');
    logger.info('2. Create a new application or select existing one');
    logger.info('3. Go to Bot section → Copy the token');
    logger.info('4. Paste it in .env file: BOT_TOKEN=your_token_here');
    process.exit(1);
}

client.login(token).catch((error) => {
    logger.error('Failed to login:', error);
    process.exit(1);
});
