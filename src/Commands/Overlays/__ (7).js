const { applyEffect, getTargetBuffer } = require("../Core/֎");

module.exports = {
    name: "trigger",
    alias: ['triggered'],
    desc: 'Add triggered effect to profile picture or image',
    category: "Image-Edit",
    usage: ".trigger [@user] or reply to an image/user",
    reactions: { start: '😤', success: '🤬' },

    execute: async (sock, m, { args, reply }) => {
        await sock.sendMessage(m.chat, { react: { text: '😤', key: m.key } });
        
        const targetBuffer = await getTargetBuffer(sock, m, args);
        
        if (!targetBuffer) {
            return reply("`⟁⃝⚠︎ Mention someone or reply to an image`");
        }

        try {
            const result = await applyEffect(targetBuffer, "trigger");
            await sock.sendMessage(m.chat, {
                image: result,
                caption: "😤 *TRIGGERED!* 😤"
            }, { quoted: m });
            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
        } catch (err) {
            console.error("[TRIGGER ERROR]", err);
            await sock.sendMessage(m.chat, { react: { text: '❓', key: m.key } });
            reply('( ͡❛ ₃ ͡❛) _*Failed to apply trigger effect.*_');
        }
    }
};