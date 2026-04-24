const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
} = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Tampilkan semua command yang tersedia'),

    async execute(interaction, client) {
        const categories = {};
        for (const [, cmd] of client.commands) {
            const cat = cmd.category || 'other';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(cmd);
        }

        const catMeta = {
            moderation: { emoji: '🛡️', label: 'Moderation', desc: 'Kick, ban, timeout, warn, purge, lock' },
            utility: { emoji: '🔧', label: 'Utility', desc: 'Serverinfo, avatar, calc, tags, reminder' },
            fun: { emoji: '🎮', label: 'Fun & Games', desc: 'RPS, 8ball, dice, math quiz, coinflip' },
            tools: { emoji: '🎨', label: 'Tools', desc: 'Embed builder, ticket, giveaway, events' },
            levels: { emoji: '📊', label: 'Leveling', desc: 'Rank, leaderboard, XP role rewards' },
            config: { emoji: '⚙️', label: 'Config', desc: 'Setup, sync commands' },
            automod: { emoji: '🤖', label: 'AutoMod', desc: 'Auto-moderation rules' },
            music: { emoji: '🎵', label: 'Music', desc: 'Lyrics, music info' },
            info: { emoji: 'ℹ️', label: 'Info', desc: 'Server & bot information' },
        };

        const totalCmds = client.commands.size;

        const overviewEmbed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`✨ Discord Essentials Bot`)
            .setDescription(
                `Selamat datang! Bot ini memiliki **${totalCmds} commands** di **${Object.keys(categories).length} kategori**.\n\n` +
                `Pilih kategori dari menu di bawah untuk melihat command.\n\n` +
                Object.entries(categories)
                    .map(([key, cmds]) => {
                        const meta = catMeta[key] || { emoji: '📁', label: key };
                        return `${meta.emoji} **${meta.label}** — ${cmds.length} commands`;
                    })
                    .join('\n')
            )
            .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '🔗 Links', value: '[Dashboard](http://localhost:3000) • Powered by discord.js', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `${config.defaults.footerText} • v2.0` });

        const options = Object.entries(categories).map(([key, cmds]) => {
            const meta = catMeta[key] || { emoji: '📁', label: key, desc: `${cmds.length} commands` };
            return { label: meta.label, value: key, description: meta.desc, emoji: meta.emoji };
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help:category')
            .setPlaceholder('Pilih kategori...')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({ embeds: [overviewEmbed], components: [row] });
    },

    async handleSelect(interaction, action, args, client) {
        const category = interaction.values[0];
        const catMeta = {
            moderation: { emoji: '🛡️', label: 'Moderation' },
            utility: { emoji: '🔧', label: 'Utility' },
            fun: { emoji: '🎮', label: 'Fun & Games' },
            tools: { emoji: '🎨', label: 'Tools' },
            levels: { emoji: '📊', label: 'Leveling' },
            config: { emoji: '⚙️', label: 'Config' },
            automod: { emoji: '🤖', label: 'AutoMod' },
            music: { emoji: '🎵', label: 'Music' },
            info: { emoji: 'ℹ️', label: 'Info' },
        };

        const meta = catMeta[category] || { emoji: '📁', label: category };
        const commands = [];
        for (const [, cmd] of client.commands) {
            if ((cmd.category || 'other') === category) commands.push(cmd);
        }

        const cmdList = commands.map((cmd) => {
            const subs = cmd.data.options?.filter((o) => o.toJSON().type === 1) || [];
            if (subs.length > 0) {
                const subList = subs.map((s) => `  └ \`/${cmd.data.name} ${s.toJSON().name}\` — ${s.toJSON().description}`).join('\n');
                return `**/${cmd.data.name}** — ${cmd.data.description}\n${subList}`;
            }
            return `\`/${cmd.data.name}\` — ${cmd.data.description}`;
        });

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`${meta.emoji} ${meta.label} Commands`)
            .setDescription(cmdList.join('\n\n') || 'Tidak ada command.')
            .setTimestamp()
            .setFooter({ text: `${commands.length} command(s) • ${config.defaults.footerText}` });

        await interaction.update({ embeds: [embed] });
    },
};
