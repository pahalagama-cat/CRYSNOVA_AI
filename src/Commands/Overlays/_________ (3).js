const { applyEffect, getTargetBuffer } = require("../Core/֎");

module.exports = {
    name: "circle",
    alias: ['round'],
    desc: 'Crop profile picture or image into a circle',
    category: "Image-Edit",
    usage: ".circle [@user] or reply to an image/user",
    reactions: { start: '⚪', success: '✨' },

    execute: async (sock, m, { args, reply }) => {
        await sock.sendMessage(m.chat, { react: { text: '⚪', key: m.key } });
        
        const targetBuffer = await getTargetBuffer(sock, m, args);
        
        if (!targetBuffer) {
            return reply("`⟁⃝⚠︎ Mention someone or reply to an image`");
        }

        try {
            const result = await applyEffect(targetBuffer, "circle");
            await sock.sendMessage(m.chat, {
                image: result
            }, { quoted: m });
            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
        } catch (err) {
            console.error("[CIRCLE ERROR]", err);
            await sock.sendMessage(m.chat, { react: { text: '❓', key: m.key } });
            reply('🤬 Failed to apply circle effect.');
        }
    }
};