const { applyEffect, getTargetBuffer } = require("../Core/֎");

module.exports = {
    name: "trash",
    alias: ['garbage'],
    desc: 'Add trash effect to profile picture or image',
    category: "Image-Edit",
    usage: ".trash [@user] or reply to an image/user",
    reactions: { start: '🗑️', success: '💯' },

    execute: async (sock, m, { args, reply }) => {
        await sock.sendMessage(m.chat, { react: { text: '🗑️', key: m.key } });
        
        const targetBuffer = await getTargetBuffer(sock, m, args);
        
        if (!targetBuffer) {
            return reply("`⟁⃝⚠︎ Mention someone or reply to an image`");
        }

        try {
            const result = await applyEffect(targetBuffer, "trash");
            await sock.sendMessage(m.chat, {
                image: result,
                caption: "🗑️ *TRASH!* 🗑️"
            }, { quoted: m });
            await sock.sendMessage(m.chat, { react: { text: '😊', key: m.key } });
        } catch (err) {
            console.error("[TRASH ERROR]", err);
            await sock.sendMessage(m.chat, { react: { text: '😔', key: m.key } });
            reply('_*⁠☞⁠ ͡⁠°⁠ ͜⁠ʖ⁠ ͡⁠°⁠)⁠☞ Failed to apply trash effect.*_');
        }
    }
};