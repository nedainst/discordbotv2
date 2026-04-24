// ── Discord Essentials Dashboard — Frontend ──────

const API = '';
let botData = null;
let currentPage = 'overview';
let currentGuild = null;

// ── Init ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const { authenticated } = await api('/api/auth/check');
    if (authenticated) {
        await initDashboard();
    } else {
        showLogin();
    }

    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('login-password').value;
        try {
            await api('/api/login', 'POST', { password });
            await initDashboard();
        } catch {
            const errEl = document.getElementById('login-error');
            errEl.textContent = 'Password salah!';
            errEl.hidden = false;
        }
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', async () => {
        await api('/api/logout', 'POST');
        showLogin();
    });
});

// ── API Helper ────────────────────────────────────
async function api(url, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API + url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// ── Show/Hide ─────────────────────────────────────
function showLogin() {
    document.getElementById('login-screen').hidden = false;
    document.getElementById('dashboard').hidden = true;
}

async function initDashboard() {
    document.getElementById('login-screen').hidden = true;
    document.getElementById('dashboard').hidden = false;

    try {
        botData = await api('/api/bot');
        document.getElementById('bot-avatar').src = botData.avatar;
        document.getElementById('bot-name').textContent = botData.username;

        // Load guild list in sidebar
        const guilds = await api('/api/guilds');
        renderSidebarGuilds(guilds);

        // Navigate
        setupNavigation();
        navigate('overview');
    } catch (err) {
        console.error('Init error:', err);
    }
}

// ── Navigation ────────────────────────────────────
function setupNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach((item) => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigate(item.dataset.page);
        });
    });
}

function navigate(page, guildId = null) {
    currentPage = page;
    if (guildId) currentGuild = guildId;

    document.querySelectorAll('.nav-item').forEach((e) => e.classList.remove('active'));
    const active = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (active) active.classList.add('active');

    if (guildId) {
        const gi = document.querySelector(`.nav-item[data-guild="${guildId}"]`);
        if (gi) gi.classList.add('active');
    }

    renderPage(page, guildId);
}

// ── Sidebar Guilds ────────────────────────────────
function renderSidebarGuilds(guilds) {
    const nav = document.querySelector('.sidebar-nav');
    // Remove old guild items
    nav.querySelectorAll('.server-item, .server-list-heading').forEach((e) => e.remove());

    if (guilds.length === 0) return;

    const heading = document.createElement('div');
    heading.className = 'server-list-heading';
    heading.textContent = 'Servers';
    nav.appendChild(heading);

    guilds.forEach((g) => {
        const a = document.createElement('a');
        a.href = '#';
        a.className = 'nav-item server-item';
        a.dataset.page = 'server';
        a.dataset.guild = g.id;
        a.innerHTML = `
            <img src="${g.icon || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIGZpbGw9IiM1ODY1RjIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiLz48L3N2Zz4='}" alt="${g.name}">
            <span>${g.name}</span>
        `;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            navigate('server', g.id);
        });
        nav.appendChild(a);
    });
}

// ── Page Renderer ─────────────────────────────────
async function renderPage(page, guildId) {
    const main = document.getElementById('main-content');
    main.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';

    try {
        switch (page) {
            case 'overview':
                await renderOverview(main);
                break;
            case 'servers':
                await renderServers(main);
                break;
            case 'commands':
                await renderCommands(main);
                break;
            case 'server':
                await renderServerDetail(main, guildId);
                break;
        }
    } catch (err) {
        main.innerHTML = `<div class="card"><p style="color:var(--danger)">Error loading page: ${err.message}</p></div>`;
    }
}

// ── Overview Page ─────────────────────────────────
async function renderOverview(el) {
    const bot = await api('/api/bot');
    const uptime = formatUptime(bot.uptime);

    el.innerHTML = `
        <div class="page-header">
            <h1>Dashboard Overview</h1>
            <p>Welcome back! Here's your bot status.</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon blue">🖥️</div>
                <div class="stat-value">${bot.guilds}</div>
                <div class="stat-label">Servers</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green">👥</div>
                <div class="stat-value">${bot.users.toLocaleString()}</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon pink">💬</div>
                <div class="stat-value">${bot.channels}</div>
                <div class="stat-label">Channels</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon yellow">⚡</div>
                <div class="stat-value">${bot.commands}</div>
                <div class="stat-label">Commands</div>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon blue">🏓</div>
                <div class="stat-value">${bot.ping}ms</div>
                <div class="stat-label">API Latency</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green">🧠</div>
                <div class="stat-value">${bot.memory} MB</div>
                <div class="stat-label">Memory Usage</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon pink">⏱️</div>
                <div class="stat-value">${uptime}</div>
                <div class="stat-label">Uptime</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon yellow">🤖</div>
                <div class="stat-value">${bot.username}</div>
                <div class="stat-label">Bot Name</div>
            </div>
        </div>
    `;
}

// ── Servers Page ──────────────────────────────────
async function renderServers(el) {
    const guilds = await api('/api/guilds');

    el.innerHTML = `
        <div class="page-header">
            <h1>Servers</h1>
            <p>Manage your bot's servers</p>
        </div>
        <div class="stats-grid">
            ${guilds
                .map(
                    (g) => `
                <div class="stat-card" style="cursor:pointer" onclick="navigate('server','${g.id}')">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
                        <img src="${g.icon || ''}" style="width:40px;height:40px;border-radius:50%" alt="">
                        <div>
                            <div class="stat-label" style="color:var(--text-primary);font-weight:600;font-size:15px">${g.name}</div>
                        </div>
                    </div>
                    <div style="display:flex;gap:16px">
                        <div><span class="stat-value" style="font-size:18px">${g.memberCount}</span><br><span class="stat-label">Members</span></div>
                        <div><span class="stat-value" style="font-size:18px">${g.channels}</span><br><span class="stat-label">Channels</span></div>
                    </div>
                </div>
            `
                )
                .join('')}
        </div>
    `;
}

// ── Commands Page ─────────────────────────────────
async function renderCommands(el) {
    const commands = await api('/api/commands');
    const categories = {};
    commands.forEach((c) => {
        if (!categories[c.category]) categories[c.category] = [];
        categories[c.category].push(c);
    });

    const catMeta = {
        moderation: { emoji: '🛡️', label: 'Moderation' },
        utility: { emoji: '🔧', label: 'Utility' },
        fun: { emoji: '🎮', label: 'Fun' },
        tools: { emoji: '🎨', label: 'Tools' },
        levels: { emoji: '📊', label: 'Leveling' },
        config: { emoji: '⚙️', label: 'Config' },
        automod: { emoji: '🤖', label: 'AutoMod' },
        music: { emoji: '🎵', label: 'Music' },
        info: { emoji: 'ℹ️', label: 'Info' },
    };

    let html = `
        <div class="page-header">
            <h1>Commands</h1>
            <p>${commands.length} commands available</p>
        </div>
    `;

    for (const [cat, cmds] of Object.entries(categories)) {
        const meta = catMeta[cat] || { emoji: '📁', label: cat };
        html += `
            <div class="card">
                <div class="card-header"><h3>${meta.emoji} ${meta.label} (${cmds.length})</h3></div>
                <div class="command-grid">
                    ${cmds
                        .map(
                            (c) => `
                        <div class="command-item">
                            <div>
                                <div class="command-name">/${c.name}</div>
                                <div class="command-desc">${c.description}</div>
                            </div>
                        </div>
                    `
                        )
                        .join('')}
                </div>
            </div>
        `;
    }

    el.innerHTML = html;
}

// ── Server Detail Page ────────────────────────────
async function renderServerDetail(el, guildId) {
    const data = await api(`/api/guilds/${guildId}`);
    const warnings = await api(`/api/guilds/${guildId}/warnings`);
    const automod = await api(`/api/guilds/${guildId}/automod`);
    const leaderboard = await api(`/api/guilds/${guildId}/leaderboard`);

    const channelOptions = data.channels
        .map((c) => `<option value="${c.id}" ${data.settings.welcomeChannel === c.id ? 'selected' : ''}>#${c.name}</option>`)
        .join('');
    const leaveChannelOptions = data.channels
        .map((c) => `<option value="${c.id}" ${data.settings.leaveChannel === c.id ? 'selected' : ''}>#${c.name}</option>`)
        .join('');
    const logChannelOptions = data.channels
        .map((c) => `<option value="${c.id}" ${data.settings.logChannel === c.id ? 'selected' : ''}>#${c.name}</option>`)
        .join('');
    const autoRoleOptions = data.roles
        .map((r) => `<option value="${r.id}" ${data.settings.autoRole === r.id ? 'selected' : ''}>${r.name}</option>`)
        .join('');

    el.innerHTML = `
        <div class="page-header">
            <div style="display:flex;align-items:center;gap:16px">
                <img src="${data.icon || ''}" style="width:48px;height:48px;border-radius:50%" alt="">
                <div>
                    <h1>${data.name}</h1>
                    <p>${data.memberCount} members</p>
                </div>
            </div>
        </div>

        <!-- Settings -->
        <div class="card">
            <div class="card-header"><h3>⚙️ Server Settings</h3></div>
            <div class="setting-row">
                <div class="setting-info">
                    <h4>Welcome Channel</h4>
                    <p>Channel untuk welcome message</p>
                </div>
                <select id="setting-welcomeChannel" onchange="updateSetting('${guildId}','welcomeChannel',this.value)" style="max-width:200px" class="btn btn-ghost">
                    <option value="">None</option>
                    ${channelOptions}
                </select>
            </div>
            <div class="setting-row">
                <div class="setting-info">
                    <h4>Leave Channel</h4>
                    <p>Channel untuk leave message</p>
                </div>
                <select id="setting-leaveChannel" onchange="updateSetting('${guildId}','leaveChannel',this.value)" style="max-width:200px" class="btn btn-ghost">
                    <option value="">Same as Welcome</option>
                    ${leaveChannelOptions}
                </select>
            </div>
            <div class="setting-row">
                <div class="setting-info">
                    <h4>Log Channel</h4>
                    <p>Channel untuk log events</p>
                </div>
                <select id="setting-logChannel" onchange="updateSetting('${guildId}','logChannel',this.value)" style="max-width:200px" class="btn btn-ghost">
                    <option value="">None</option>
                    ${logChannelOptions}
                </select>
            </div>
            <div class="setting-row">
                <div class="setting-info"><h4>Welcome Card Image</h4><p>Kirim gambar banner saat member join</p></div>
                <label class="toggle-switch">
                    <input type="checkbox" ${data.settings.welcomeCard?.enabled !== false ? 'checked' : ''} onchange="toggleCardSetting('${guildId}', 'welcomeCard', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="setting-row">
                <div class="setting-info"><h4>Leave Card Image</h4><p>Kirim gambar banner saat member leave</p></div>
                <label class="toggle-switch">
                    <input type="checkbox" ${data.settings.leaveCard?.enabled !== false ? 'checked' : ''} onchange="toggleCardSetting('${guildId}', 'leaveCard', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="setting-row">
                <div class="setting-info">
                    <h4>Auto Role</h4>
                    <p>Role otomatis saat member join</p>
                </div>
                <select id="setting-autoRole" onchange="updateSetting('${guildId}','autoRole',this.value)" style="max-width:200px" class="btn btn-ghost">
                    <option value="">None</option>
                    ${autoRoleOptions}
                </select>
            </div>
        </div>

        <!-- Auto-Mod -->
        <div class="card">
            <div class="card-header">
                <h3>🤖 AutoMod</h3>
                <label class="toggle-switch">
                    <input type="checkbox" id="automod-enabled" ${automod.enabled ? 'checked' : ''} onchange="toggleAutoMod('${guildId}', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="setting-row">
                <div class="setting-info"><h4>Anti-Link</h4><p>Hapus pesan dengan URL</p></div>
                <label class="toggle-switch">
                    <input type="checkbox" data-rule="noLinks" ${automod.rules?.noLinks ? 'checked' : ''} onchange="toggleAutoModRule('${guildId}','noLinks',this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="setting-row">
                <div class="setting-info"><h4>Anti-Caps</h4><p>Hapus pesan caps berlebihan</p></div>
                <label class="toggle-switch">
                    <input type="checkbox" data-rule="antiCaps" ${automod.rules?.antiCaps ? 'checked' : ''} onchange="toggleAutoModRule('${guildId}','antiCaps',this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="setting-row">
                <div class="setting-info"><h4>Anti-Mention Spam</h4><p>Hapus jika mention &gt;5 user</p></div>
                <label class="toggle-switch">
                    <input type="checkbox" data-rule="antiMentionSpam" ${automod.rules?.antiMentionSpam ? 'checked' : ''} onchange="toggleAutoModRule('${guildId}','antiMentionSpam',this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="setting-row">
                <div class="setting-info"><h4>Bad Words Filter</h4><p>Filter kata terlarang</p></div>
                <label class="toggle-switch">
                    <input type="checkbox" data-rule="badWords" ${automod.rules?.badWords ? 'checked' : ''} onchange="toggleAutoModRule('${guildId}','badWords',this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>

        <!-- Warnings -->
        <div class="card">
            <div class="card-header"><h3>⚠️ Warnings (${warnings.length} users)</h3></div>
            ${
                warnings.length > 0
                    ? `<div class="table-wrap"><table>
                <thead><tr><th>User ID</th><th>Warnings</th><th>Actions</th></tr></thead>
                <tbody>
                    ${warnings
                        .map(
                            (w) => `
                        <tr>
                            <td>${w.userId}</td>
                            <td><span class="tag tag-yellow">${w.count} warning(s)</span></td>
                            <td><button class="btn btn-danger btn-sm" onclick="clearWarnings('${guildId}','${w.userId}')">Clear</button></td>
                        </tr>
                    `
                        )
                        .join('')}
                </tbody>
            </table></div>`
                    : '<p style="color:var(--text-muted);font-size:13px">No warnings</p>'
            }
        </div>

        <!-- XP Leaderboard -->
        <div class="card">
            <div class="card-header"><h3>🏆 XP Leaderboard (Top 10)</h3></div>
            ${
                leaderboard.length > 0
                    ? `<div class="table-wrap"><table>
                <thead><tr><th>#</th><th>User ID</th><th>Level</th><th>Total XP</th></tr></thead>
                <tbody>
                    ${leaderboard
                        .slice(0, 10)
                        .map(
                            (u, i) => `
                        <tr>
                            <td>${['🥇', '🥈', '🥉'][i] || `#${i + 1}`}</td>
                            <td>${u.userId}</td>
                            <td><span class="tag tag-blue">Level ${u.level}</span></td>
                            <td>${u.totalXp.toLocaleString()}</td>
                        </tr>
                    `
                        )
                        .join('')}
                </tbody>
            </table></div>`
                    : '<p style="color:var(--text-muted);font-size:13px">No XP data</p>'
            }
        </div>
    `;
}

// ── Settings Update ───────────────────────────────
async function updateSetting(guildId, key, value) {
    try {
        await api(`/api/guilds/${guildId}/settings`, 'PUT', { key, value: value || null });
        toast('Setting updated!', 'success');
    } catch (err) {
        toast('Failed to update setting', 'error');
    }
}

async function toggleCardSetting(guildId, key, enabled) {
    try {
        const data = await api(`/api/guilds/${guildId}`);
        const current = data.settings[key] || {};
        current.enabled = enabled;
        await api(`/api/guilds/${guildId}/settings`, 'PUT', { key, value: current });
        toast(`${key} ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (err) {
        toast('Failed to update card status', 'error');
    }
}

async function toggleAutoMod(guildId, enabled) {
    try {
        const current = await api(`/api/guilds/${guildId}/automod`);
        current.enabled = enabled;
        await api(`/api/guilds/${guildId}/automod`, 'PUT', current);
        toast(`AutoMod ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (err) {
        toast('Failed to toggle AutoMod', 'error');
    }
}

async function toggleAutoModRule(guildId, rule, enabled) {
    try {
        const current = await api(`/api/guilds/${guildId}/automod`);
        if (!current.rules) current.rules = {};
        current.rules[rule] = enabled;
        await api(`/api/guilds/${guildId}/automod`, 'PUT', current);
        toast(`Rule "${rule}" ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (err) {
        toast('Failed to toggle rule', 'error');
    }
}

async function clearWarnings(guildId, userId) {
    if (!confirm('Clear all warnings for this user?')) return;
    try {
        await api(`/api/guilds/${guildId}/warnings/${userId}`, 'DELETE');
        toast('Warnings cleared!', 'success');
        navigate('server', guildId);
    } catch (err) {
        toast('Failed to clear warnings', 'error');
    }
}

// ── Toast Notifications ───────────────────────────
function toast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = message;
    container.appendChild(t);

    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateX(30px)';
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

// ── Helpers ───────────────────────────────────────
function formatUptime(ms) {
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(' ');
}
