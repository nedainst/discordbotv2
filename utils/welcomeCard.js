const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

// Register Inter font if available (falls back to sans-serif)
try {
    GlobalFonts.registerFromPath(path.join(__dirname, '..', 'assets', 'Inter-Bold.ttf'), 'Inter Bold');
    GlobalFonts.registerFromPath(path.join(__dirname, '..', 'assets', 'Inter-Regular.ttf'), 'Inter');
} catch {
    // Use system fonts as fallback
}

/**
 * Generate a welcome or leave card image
 * @param {Object} opts
 * @param {string} opts.username - Display name
 * @param {string} opts.discriminator - Tag or handle
 * @param {string} opts.avatarURL - Avatar URL
 * @param {string} opts.serverName - Guild name
 * @param {number} opts.memberCount - Current member count
 * @param {'welcome'|'leave'} opts.type - Card type
 * @param {Object} opts.config - Custom config from dashboard
 * @returns {Promise<Buffer>} PNG buffer
 */
async function generateCard(opts) {
    const {
        username,
        discriminator,
        avatarURL,
        serverName,
        memberCount,
        type = 'welcome',
        config = {},
    } = opts;

    const W = 900;
    const H = 300;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // ── Background ────────────────────────────────
    const isWelcome = type === 'welcome';
    const gradStart = config.gradientStart || (isWelcome ? '#1a1a2e' : '#2e1a1a');
    const gradEnd = config.gradientEnd || (isWelcome ? '#16213e' : '#3e1621');
    const accentColor = config.accentColor || (isWelcome ? '#5865F2' : '#ED4245');

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, gradStart);
    grad.addColorStop(1, gradEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // ── Decorative circles ────────────────────────
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(W - 80, 60, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(80, H - 40, 100, 0, Math.PI * 2);
    ctx.fill();

    // Subtle grid/dots pattern
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = '#ffffff';
    for (let x = 20; x < W; x += 30) {
        for (let y = 20; y < H; y += 30) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;

    // ── Top accent bar ────────────────────────────
    const barGrad = ctx.createLinearGradient(0, 0, W, 0);
    barGrad.addColorStop(0, accentColor);
    barGrad.addColorStop(1, isWelcome ? '#EB459E' : '#FEE75C');
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, W, 4);

    // ── Avatar ────────────────────────────────────
    const avatarSize = 120;
    const avatarX = 60;
    const avatarY = (H - avatarSize) / 2;

    // Avatar glow
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 25;

    // Avatar border circle
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = accentColor;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Clip and draw avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    try {
        const avatar = await loadImage(avatarURL);
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    } catch {
        // Fallback: colored circle
        ctx.fillStyle = '#36393f';
        ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px "Inter Bold", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(username.charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 16);
    }
    ctx.restore();

    // ── Text Area ─────────────────────────────────
    const textX = avatarX + avatarSize + 40;

    // Title (WELCOME / GOODBYE)
    const titleText = config.titleText || (isWelcome ? 'WELCOME' : 'GOODBYE');
    ctx.font = 'bold 14px "Inter Bold", sans-serif';
    ctx.letterSpacing = '6px';
    ctx.fillStyle = accentColor;
    ctx.textAlign = 'left';
    ctx.fillText(titleText.toUpperCase(), textX, avatarY + 14);
    ctx.letterSpacing = '0px';

    // Username
    const displayName = username.length > 22 ? username.substring(0, 20) + '...' : username;
    ctx.font = 'bold 36px "Inter Bold", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(displayName, textX, avatarY + 58);

    // Discriminator / handle
    ctx.font = '18px "Inter", sans-serif';
    ctx.fillStyle = '#9aa0a6';
    ctx.fillText(discriminator, textX, avatarY + 86);

    // Divider line
    const divY = avatarY + 102;
    const divGrad = ctx.createLinearGradient(textX, divY, textX + 350, divY);
    divGrad.addColorStop(0, accentColor);
    divGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = divGrad;
    ctx.fillRect(textX, divY, 350, 2);

    // Server info / message
    const msgText = config.message || (isWelcome
        ? `Selamat datang di ${serverName}!`
        : `Sampai jumpa lagi dari ${serverName}!`);

    ctx.font = '16px "Inter", sans-serif';
    ctx.fillStyle = '#bfc3c9';
    const truncMsg = msgText.length > 45 ? msgText.substring(0, 43) + '...' : msgText;
    ctx.fillText(truncMsg, textX, divY + 28);

    // Member count
    ctx.font = 'bold 14px "Inter Bold", sans-serif';
    ctx.fillStyle = '#5f6368';
    ctx.fillText(isWelcome ? `Member #${memberCount}` : `${memberCount} members remaining`, textX, divY + 52);

    // ── Bottom badge ──────────────────────────────
    ctx.globalAlpha = 0.4;
    ctx.font = '11px "Inter", sans-serif';
    ctx.fillStyle = '#5f6368';
    ctx.textAlign = 'right';
    ctx.fillText('Discord Essentials Bot', W - 20, H - 12);
    ctx.globalAlpha = 1;

    return canvas.toBuffer('image/png');
}

module.exports = { generateCard };
