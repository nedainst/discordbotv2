const express = require('express');
const session = require('express-session');
const path = require('path');
const logger = require('../utils/logger');

function startDashboard(client) {
    const app = express();
    const PORT = process.env.DASHBOARD_PORT || 3000;

    // ── Middleware ─────────────────────────────────
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(
        session({
            secret: process.env.SESSION_SECRET || 'discord-essentials-secret-' + Date.now(),
            resave: false,
            saveUninitialized: false,
            cookie: { maxAge: 24 * 60 * 60 * 1000 },
        })
    );

    // Serve static files
    app.use(express.static(path.join(__dirname, 'public')));

    // ── Auth Middleware ────────────────────────────
    const dashPassword = process.env.DASHBOARD_PASSWORD || 'admin123';

    function requireAuth(req, res, next) {
        if (req.session.authenticated) return next();
        res.status(401).json({ error: 'Unauthorized' });
    }

    // ── Auth Routes ───────────────────────────────
    app.post('/api/login', (req, res) => {
        const { password } = req.body;
        if (password === dashPassword) {
            req.session.authenticated = true;
            res.json({ success: true });
        } else {
            res.status(401).json({ error: 'Wrong password' });
        }
    });

    app.post('/api/logout', (req, res) => {
        req.session.destroy();
        res.json({ success: true });
    });

    app.get('/api/auth/check', (req, res) => {
        res.json({ authenticated: !!req.session.authenticated });
    });

    // ── Bot Info ───────────────────────────────────
    app.get('/api/bot', requireAuth, (req, res) => {
        res.json({
            username: client.user.username,
            avatar: client.user.displayAvatarURL({ dynamic: true, size: 128 }),
            id: client.user.id,
            guilds: client.guilds.cache.size,
            users: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
            channels: client.channels.cache.size,
            commands: client.commands.size,
            uptime: client.uptime,
            ping: client.ws.ping,
            memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
        });
    });

    // ── Guilds ─────────────────────────────────────
    app.get('/api/guilds', requireAuth, (req, res) => {
        const guilds = client.guilds.cache.map((g) => ({
            id: g.id,
            name: g.name,
            icon: g.iconURL({ dynamic: true, size: 64 }),
            memberCount: g.memberCount,
            channels: g.channels.cache.size,
        }));
        res.json(guilds);
    });

    // ── Guild Settings ────────────────────────────
    const dataManager = require('../utils/dataManager');

    app.get('/api/guilds/:id', requireAuth, (req, res) => {
        const guild = client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: 'Guild not found' });

        const settings = dataManager.getGuildSettings(guild.id);
        const channels = guild.channels.cache
            .filter((c) => c.type === 0)
            .map((c) => ({ id: c.id, name: c.name }));
        const roles = guild.roles.cache
            .filter((r) => !r.managed && r.id !== guild.id)
            .map((r) => ({ id: r.id, name: r.name, color: r.hexColor }))
            .sort((a, b) => guild.roles.cache.get(b.id).position - guild.roles.cache.get(a.id).position);

        res.json({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ dynamic: true, size: 128 }),
            memberCount: guild.memberCount,
            settings,
            channels,
            roles,
        });
    });

    app.put('/api/guilds/:id/settings', requireAuth, (req, res) => {
        const guild = client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: 'Guild not found' });

        const { key, value } = req.body;
        const allowed = [
            'welcomeChannel', 'leaveChannel', 'logChannel', 'autoRole', 'levelUpChannel',
            'suggestionChannel', 'confessionChannel', 'welcomeCard', 'leaveCard'
        ];
        if (!allowed.includes(key)) return res.status(400).json({ error: 'Invalid setting key' });

        dataManager.setGuildSetting(guild.id, key, value || null);
        res.json({ success: true, key, value });
    });

    // ── Warnings ──────────────────────────────────
    app.get('/api/guilds/:id/warnings', requireAuth, (req, res) => {
        const all = dataManager.read('warnings.json', {});
        const guildWarnings = all[req.params.id] || {};

        const formatted = Object.entries(guildWarnings).map(([userId, warns]) => ({
            userId,
            warnings: warns,
            count: warns.length,
        }));

        res.json(formatted);
    });

    app.delete('/api/guilds/:id/warnings/:userId', requireAuth, (req, res) => {
        dataManager.clearWarnings(req.params.id, req.params.userId);
        res.json({ success: true });
    });

    // ── AutoMod ───────────────────────────────────
    app.get('/api/guilds/:id/automod', requireAuth, (req, res) => {
        const autoMod = dataManager.getAutoMod(req.params.id);
        res.json(autoMod);
    });

    app.put('/api/guilds/:id/automod', requireAuth, (req, res) => {
        dataManager.setAutoMod(req.params.id, req.body);
        res.json({ success: true });
    });

    // ── XP / Leveling ─────────────────────────────
    app.get('/api/guilds/:id/leaderboard', requireAuth, (req, res) => {
        const lb = dataManager.getLeaderboard(req.params.id);
        res.json(lb.slice(0, 50));
    });

    // ── Tags ──────────────────────────────────────
    app.get('/api/guilds/:id/tags', requireAuth, (req, res) => {
        const tags = dataManager.getTags(req.params.id);
        res.json(tags);
    });

    app.delete('/api/guilds/:id/tags/:name', requireAuth, (req, res) => {
        dataManager.deleteTag(req.params.id, req.params.name);
        res.json({ success: true });
    });

    // ── Giveaways ─────────────────────────────────
    app.get('/api/guilds/:id/giveaways', requireAuth, (req, res) => {
        const giveaways = dataManager.getGiveaways(req.params.id);
        res.json(giveaways);
    });

    // ── Birthdays ─────────────────────────────────
    app.get('/api/guilds/:id/birthdays', requireAuth, (req, res) => {
        const birthdays = dataManager.getBirthdays(req.params.id);
        res.json(birthdays);
    });

    // ── Command List ──────────────────────────────
    app.get('/api/commands', requireAuth, (req, res) => {
        const commands = [];
        for (const [, cmd] of client.commands) {
            commands.push({
                name: cmd.data.name,
                description: cmd.data.description,
                category: cmd.category || 'other',
            });
        }
        res.json(commands);
    });

    // ── SPA fallback ──────────────────────────────
    app.use((req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // ── Start Server ──────────────────────────────
    app.listen(PORT, () => {
        logger.success(`Dashboard running at http://localhost:${PORT}`);
    });

    return app;
}

module.exports = { startDashboard };
