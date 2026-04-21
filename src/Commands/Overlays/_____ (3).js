const { applyEffect, getTargetBuffer } = require("../Core/֎");

module.exports = {
    name: "rainbow",
    alias: ['pride', 'lgbt'],
    desc: 'Add rainbow pride effect to profile picture or image',
    category: "Image-Edit",
    usage: ".rainbow [@user] or reply to an image/user",
    reactions: { start: '🌈', success: '✨' },

    execute: async (sock, m, { args, reply }) => {
        await sock.sendMessage(m.chat, { react: { text: '🌈', key: m.key } });
        
        const targetBuffer = await getTargetBuffer(sock, m, args);
        
        if (!targetBuffer) {
            return reply("`⟁⃝⚠︎ Mention someone or reply to an image`");
        }

        try {
            const result = await applyEffect(targetBuffer, "rainbow");
            await sock.sendMessage(m.chat, {
                image: result,
                caption: "🌈 *PRIDE!* 🌈"
            }, { quoted: m });
            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
        } catch (err) {
            console.error("[RAINBOW ERROR]", err);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply('😢 Failed to apply rainbow effect.');
        }
    }
};