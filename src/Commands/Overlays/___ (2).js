const { applyEffect, getTargetBuffer } = require("../Core/֎");

module.exports = {
    name: "funny",
    alias: ['jokeoverhead', 'funny', 'joke'],
    desc: 'Add "Joke over head" effect to profile picture or image',
    category: "Image-Edit",
    usage: ".joke [@user] or reply to an image/user",
    reactions: { start: '😅', success: '😁' },

    execute: async (sock, m, { args, reply }) => {
        await sock.sendMessage(m.chat, { react: { text: '😅', key: m.key } });
        
        const targetBuffer = await getTargetBuffer(sock, m, args);
        
        if (!targetBuffer) {
            return reply("`⟁⃝⚠︎ Mention someone or reply to an image`");
        }

        try {
            const result = await applyEffect(targetBuffer, "funny");
            await sock.sendMessage(m.chat, {
                image: result
            }, { quoted: m });
            await sock.sendMessage(m.chat, { react: { text: '🤣', key: m.key } });
        } catch (err) {
            console.error("[JOKE ERROR]", err);
            await sock.sendMessage(m.chat, { react: { text: '🥺', key: m.key } });
            reply('_*↻ Failed to apply joke effect.*_');
        }
    }
};