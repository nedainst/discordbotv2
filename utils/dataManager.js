const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const dataDir = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dataManager = {
    /**
     * Read data from a JSON file
     * @param {string} filename - Name of the file (e.g., 'warnings.json')
     * @param {*} defaultValue - Default value if file doesn't exist
     * @returns {*} Parsed data or default value
     */
    read(filename, defaultValue = {}) {
        const filePath = path.join(dataDir, filename);
        try {
            if (!fs.existsSync(filePath)) {
                this.write(filename, defaultValue);
                return defaultValue;
            }
            const raw = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(raw);
        } catch (error) {
            logger.error(`Failed to read ${filename}`, error);
            return defaultValue;
        }
    },

    /**
     * Write data to a JSON file
     * @param {string} filename - Name of the file
     * @param {*} data - Data to write
     */
    write(filename, data) {
        const filePath = path.join(dataDir, filename);
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            logger.error(`Failed to write ${filename}`, error);
        }
    },

    /**
     * Update data in a JSON file using a callback
     * @param {string} filename - Name of the file
     * @param {Function} updater - Function that receives current data and returns updated data
     * @param {*} defaultValue - Default value if file doesn't exist
     */
    update(filename, updater, defaultValue = {}) {
        const data = this.read(filename, defaultValue);
        const updated = updater(data);
        this.write(filename, updated);
        return updated;
    },

    // ── Guild Settings ──────────────────────────────
    getGuildSettings(guildId) {
        const all = this.read('guild-settings.json', {});
        return all[guildId] || {};
    },

    setGuildSetting(guildId, key, value) {
        return this.update('guild-settings.json', (data) => {
            if (!data[guildId]) data[guildId] = {};
            data[guildId][key] = value;
            return data;
        });
    },

    // ── Warnings ────────────────────────────────────
    getWarnings(guildId, userId) {
        const all = this.read('warnings.json', {});
        return (all[guildId] && all[guildId][userId]) || [];
    },

    addWarning(guildId, userId, warning) {
        return this.update('warnings.json', (data) => {
            if (!data[guildId]) data[guildId] = {};
            if (!data[guildId][userId]) data[guildId][userId] = [];
            data[guildId][userId].push({
                ...warning,
                id: Date.now().toString(36),
                timestamp: new Date().toISOString(),
            });
            return data;
        });
    },

    clearWarnings(guildId, userId) {
        return this.update('warnings.json', (data) => {
            if (data[guildId]) {
                delete data[guildId][userId];
            }
            return data;
        });
    },

    // ── Giveaways ───────────────────────────────────
    getGiveaways(guildId) {
        const all = this.read('giveaways.json', {});
        return all[guildId] || [];
    },

    addGiveaway(guildId, giveaway) {
        return this.update('giveaways.json', (data) => {
            if (!data[guildId]) data[guildId] = [];
            data[guildId].push(giveaway);
            return data;
        });
    },

    updateGiveaway(guildId, messageId, updater) {
        return this.update('giveaways.json', (data) => {
            if (!data[guildId]) return data;
            const idx = data[guildId].findIndex((g) => g.messageId === messageId);
            if (idx !== -1) {
                data[guildId][idx] = updater(data[guildId][idx]);
            }
            return data;
        });
    },

    // ── Tickets ─────────────────────────────────────
    getTickets(guildId) {
        const all = this.read('tickets.json', {});
        return all[guildId] || {};
    },

    setTicket(guildId, channelId, ticketData) {
        return this.update('tickets.json', (data) => {
            if (!data[guildId]) data[guildId] = {};
            data[guildId][channelId] = ticketData;
            return data;
        });
    },

    removeTicket(guildId, channelId) {
        return this.update('tickets.json', (data) => {
            if (data[guildId]) {
                delete data[guildId][channelId];
            }
            return data;
        });
    },

    // ── Reaction Roles ──────────────────────────────
    getReactionRoles(guildId) {
        const all = this.read('reaction-roles.json', {});
        return all[guildId] || {};
    },

    setReactionRole(guildId, messageId, roleData) {
        return this.update('reaction-roles.json', (data) => {
            if (!data[guildId]) data[guildId] = {};
            data[guildId][messageId] = roleData;
            return data;
        });
    },

    // ── XP / Leveling ────────────────────────────────
    getXP(guildId, userId) {
        const all = this.read('xp.json', {});
        return (all[guildId] && all[guildId][userId]) || { xp: 0, level: 0, totalXp: 0 };
    },

    addXP(guildId, userId, amount) {
        return this.update('xp.json', (data) => {
            if (!data[guildId]) data[guildId] = {};
            if (!data[guildId][userId]) data[guildId][userId] = { xp: 0, level: 0, totalXp: 0 };
            data[guildId][userId].xp += amount;
            data[guildId][userId].totalXp += amount;
            return data;
        });
    },

    setXPLevel(guildId, userId, level, xp) {
        return this.update('xp.json', (data) => {
            if (!data[guildId]) data[guildId] = {};
            if (!data[guildId][userId]) data[guildId][userId] = { xp: 0, level: 0, totalXp: 0 };
            data[guildId][userId].level = level;
            data[guildId][userId].xp = xp;
            return data;
        });
    },

    getLeaderboard(guildId) {
        const all = this.read('xp.json', {});
        if (!all[guildId]) return [];
        return Object.entries(all[guildId])
            .map(([userId, d]) => ({ userId, ...d }))
            .sort((a, b) => b.totalXp - a.totalXp);
    },

    // ── Notes ────────────────────────────────────────
    getNotes(userId) {
        const all = this.read('notes.json', {});
        return all[userId] || [];
    },

    addNote(userId, note) {
        return this.update('notes.json', (data) => {
            if (!data[userId]) data[userId] = [];
            data[userId].push({ id: Date.now().toString(36), ...note, createdAt: new Date().toISOString() });
            return data;
        });
    },

    deleteNote(userId, noteId) {
        return this.update('notes.json', (data) => {
            if (data[userId]) data[userId] = data[userId].filter((n) => n.id !== noteId);
            return data;
        });
    },

    // ── Tags ─────────────────────────────────────────
    getTags(guildId) {
        const all = this.read('tags.json', {});
        return all[guildId] || {};
    },

    getTag(guildId, name) {
        const tags = this.getTags(guildId);
        return tags[name.toLowerCase()] || null;
    },

    setTag(guildId, name, tagData) {
        return this.update('tags.json', (data) => {
            if (!data[guildId]) data[guildId] = {};
            data[guildId][name.toLowerCase()] = tagData;
            return data;
        });
    },

    deleteTag(guildId, name) {
        return this.update('tags.json', (data) => {
            if (data[guildId]) delete data[guildId][name.toLowerCase()];
            return data;
        });
    },

    // ── Reminders ────────────────────────────────────
    getReminders() {
        return this.read('reminders.json', []);
    },

    addReminder(reminder) {
        return this.update('reminders.json', (data) => {
            if (!Array.isArray(data)) data = [];
            data.push({ id: Date.now().toString(36), ...reminder });
            return data;
        }, []);
    },

    removeReminder(id) {
        return this.update('reminders.json', (data) => {
            if (!Array.isArray(data)) return [];
            return data.filter((r) => r.id !== id);
        }, []);
    },

    // ── Auto-Mod ─────────────────────────────────────
    getAutoMod(guildId) {
        const all = this.read('automod.json', {});
        return all[guildId] || { enabled: false, rules: {} };
    },

    setAutoMod(guildId, data) {
        return this.update('automod.json', (all) => {
            all[guildId] = data;
            return all;
        });
    },

    // ── Birthdays ────────────────────────────────────
    getBirthdays(guildId) {
        const all = this.read('birthdays.json', {});
        return all[guildId] || {};
    },

    setBirthday(guildId, userId, data) {
        return this.update('birthdays.json', (all) => {
            if (!all[guildId]) all[guildId] = {};
            all[guildId][userId] = data;
            return all;
        });
    },

    // ── Events ───────────────────────────────────────
    getEvents(guildId) {
        const all = this.read('events.json', {});
        return all[guildId] || {};
    },

    setEvent(guildId, messageId, eventData) {
        return this.update('events.json', (all) => {
            if (!all[guildId]) all[guildId] = {};
            all[guildId][messageId] = eventData;
            return all;
        });
    },

    removeEvent(guildId, messageId) {
        return this.update('events.json', (all) => {
            if (all[guildId]) delete all[guildId][messageId];
            return all;
        });
    },
};

module.exports = dataManager;
