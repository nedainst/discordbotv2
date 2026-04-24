const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageUpdate,
    once: false,
    async execute(oldMessage, newMessage, client) {
        if (!oldMessage.guild || oldMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;

        // Record for /snipe edit
        try {
            const snipeCmd = client.commands.get('snipe');
            if (snipeCmd && snipeCmd.editSnipedMessages) {
                snipeCmd.editSnipedMessages.set(oldMessage.channel.id, {
                    oldContent: oldMessage.content,
                    newContent: newMessage.content,
                    authorTag: oldMessage.author.tag,
                    authorAvatar: oldMessage.author.displayAvatarURL({ dynamic: true }),
                    timestamp: Date.now(),
                });
            }
        } catch { /* ignore */ }
    },
};
