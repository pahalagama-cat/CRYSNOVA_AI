const { applyEffect, getTargetBuffer } = require("../Core/֎");

module.exports = {
    name: "hitler",
    alias: [],
    desc: 'Add "Worse than Hitler" effect to profile picture or image',
    category: "Image-Edit",
    usage: ".hitler [@user] or reply to an image/user",
    reactions: { start: '👿', success: '☠️' },

    execute: async (sock, m, { args, reply }) => {
        await sock.sendMessage(m.chat, { react: { text: '👿', key: m.key } });
        
        const targetBuffer = await getTargetBuffer(sock, m, args);
        
        if (!targetBuffer) {
            return reply("`⟁⃝⚠︎ Mention someone or reply to an image`");
        }

        try {
            const result = await applyEffect(targetBuffer, "hitler");
            await sock.sendMessage(m.chat, {
                image: result
            }, { quoted: m });
            await sock.sendMessage(m.chat, { react: { text: '〽️', key: m.key } });
        } catch (err) {
            console.error("[HITLER ERROR]", err);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply('🤬 Failed to apply hitler effect.');
        }
    }
};