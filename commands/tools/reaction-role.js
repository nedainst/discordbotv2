const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    RoleSelectMenuBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const config = require('../../config.json');
const dataManager = require('../../utils/dataManager');
const embedPresets = require('../../utils/embedPresets');

// Temporary storage for role setup
const setupSessions = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reaction-role')
        .setDescription('Setup self-assignable roles dengan select menu')
        .addSubcommand((sub) =>
            sub
                .setName('create')
                .setDescription('Buat panel reaction role')
                .addStringOption((opt) =>
                    opt.setName('title').setDescription('Judul panel').setRequired(true)
                )
                .addStringOption((opt) =>
                    opt.setName('description').setDescription('Deskripsi panel').setRequired(false)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('delete')
                .setDescription('Hapus panel reaction role')
                .addStringOption((opt) =>
                    opt.setName('message_id').setDescription('Message ID panel').setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'create') {
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description') || 'Pilih role yang kamu inginkan dari menu di bawah!';

            // Store session
            setupSessions.set(interaction.user.id, { title, description, roles: [] });

            // Show role select menu to pick roles
            const roleSelect = new RoleSelectMenuBuilder()
                .setCustomId(`reaction-role:select_roles:${interaction.user.id}`)
                .setPlaceholder('Pilih roles yang mau ditambahkan...')
                .setMinValues(1)
                .setMaxValues(10);

            const row = new ActionRowBuilder().addComponents(roleSelect);

            await interaction.reply({
                content: '🏷️ **Step 1:** Pilih roles yang ingin dijadikan self-assignable:',
                components: [row],
                ephemeral: true,
            });
        } else if (sub === 'delete') {
            const messageId = interaction.options.getString('message_id');

            // Remove from data
            const reactionRoles = dataManager.getReactionRoles(interaction.guild.id);
            if (!reactionRoles[messageId]) {
                return interaction.reply({
                    embeds: [embedPresets.error('Error', 'Panel reaction role tidak ditemukan.')],
                    ephemeral: true,
                });
            }

            // Try to delete the message
            try {
                const channel = interaction.guild.channels.cache.get(reactionRoles[messageId].channelId);
                if (channel) {
                    const msg = await channel.messages.fetch(messageId).catch(() => null);
                    if (msg) await msg.delete();
                }
            } catch {
                // Message may already be deleted
            }

            // Remove data
            dataManager.update('reaction-roles.json', (data) => {
                if (data[interaction.guild.id]) {
                    delete data[interaction.guild.id][messageId];
                }
                return data;
            });

            await interaction.reply({
                embeds: [embedPresets.success('Deleted', 'Panel reaction role berhasil dihapus.')],
                ephemeral: true,
            });
        }
    },

    async handleSelect(interaction) {
        const parts = interaction.customId.split(':');
        const subAction = parts[1];

        if (subAction === 'select_roles') {
            const session = setupSessions.get(interaction.user.id);
            if (!session) {
                return interaction.update({
                    content: '❌ Session expired. Silakan jalankan command lagi.',
                    components: [],
                });
            }

            const selectedRoleIds = interaction.values;
            session.roles = selectedRoleIds;
            setupSessions.set(interaction.user.id, session);

            // Build preview and confirm
            const rolesList = selectedRoleIds.map((id) => `<@&${id}>`).join('\n');

            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('📋 Preview Reaction Role Panel')
                .setDescription(
                    `**${session.title}**\n\n${session.description}\n\n` +
                    `**Roles:**\n${rolesList}`
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`reaction-role:confirm:${interaction.user.id}`)
                    .setLabel('Confirm & Send')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`reaction-role:cancel:${interaction.user.id}`)
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );

            await interaction.update({
                content: null,
                embeds: [embed],
                components: [row],
            });
        } else if (subAction === 'user_pick') {
            // User selecting role from panel
            const messageId = interaction.message.id;
            const guildId = interaction.guild.id;

            const reactionRoles = dataManager.getReactionRoles(guildId);
            const panelData = reactionRoles[messageId];

            if (!panelData) {
                return interaction.reply({
                    content: '❌ Panel ini sudah tidak valid.',
                    ephemeral: true,
                });
            }

            const selectedRoleId = interaction.values[0];
            const member = interaction.member;
            const role = interaction.guild.roles.cache.get(selectedRoleId);

            if (!role) {
                return interaction.reply({ content: '❌ Role tidak ditemukan.', ephemeral: true });
            }

            try {
                if (member.roles.cache.has(selectedRoleId)) {
                    await member.roles.remove(role, 'Self-role via reaction role');
                    await interaction.reply({
                        content: `❌ Role **${role.name}** telah dihapus dari kamu.`,
                        ephemeral: true,
                    });
                } else {
                    await member.roles.add(role, 'Self-role via reaction role');
                    await interaction.reply({
                        content: `✅ Role **${role.name}** berhasil ditambahkan!`,
                        ephemeral: true,
                    });
                }
            } catch (error) {
                await interaction.reply({
                    content: `❌ Gagal mengubah role: ${error.message}`,
                    ephemeral: true,
                });
            }
        }
    },

    async handleButton(interaction) {
        const parts = interaction.customId.split(':');
        const subAction = parts[1];

        if (subAction === 'cancel') {
            setupSessions.delete(interaction.user.id);
            return interaction.update({
                content: '❌ Dibatalkan.',
                embeds: [],
                components: [],
            });
        }

        if (subAction === 'confirm') {
            const session = setupSessions.get(interaction.user.id);
            if (!session) {
                return interaction.update({
                    content: '❌ Session expired.',
                    embeds: [],
                    components: [],
                });
            }

            // Build the panel embed
            const rolesList = session.roles.map((id) => {
                const role = interaction.guild.roles.cache.get(id);
                return role ? `${config.emojis.role} ${role}` : `<@&${id}>`;
            }).join('\n');

            const panelEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`🏷️ ${session.title}`)
                .setDescription(`${session.description}\n\n**Available Roles:**\n${rolesList}\n\nPilih role dari menu di bawah. Pilih lagi untuk menghapus role.`)
                .setTimestamp()
                .setFooter({ text: config.defaults.footerText });

            // Build role select menu for users
            const options = session.roles.map((id) => {
                const role = interaction.guild.roles.cache.get(id);
                return {
                    label: role?.name || 'Unknown Role',
                    value: id,
                    emoji: '🏷️',
                };
            });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`reaction-role:user_pick`)
                .setPlaceholder('Pilih role...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Send panel to channel
            const msg = await interaction.channel.send({ embeds: [panelEmbed], components: [row] });

            // Save to data
            dataManager.setReactionRole(interaction.guild.id, msg.id, {
                channelId: interaction.channel.id,
                roles: session.roles,
                title: session.title,
            });

            setupSessions.delete(interaction.user.id);

            await interaction.update({
                content: '✅ Panel reaction role berhasil dibuat!',
                embeds: [],
                components: [],
            });
        }
    },
};
