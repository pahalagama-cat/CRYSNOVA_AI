const { applyEffect, getTargetBuffer } = require("../Core/֎");

module.exports = {
    name: "facepalm",
    alias: ['fp', 'palm'],
    desc: 'Add facepalm effect to profile picture or image',
    category: "Image-Edit",
    usage: ".facepalm [@user] or reply to an image/user",
    reactions: { start: '🤦', success: '😄' },

    execute: async (sock, m, { args, reply }) => {
        await sock.sendMessage(m.chat, { react: { text: '🤦', key: m.key } });
        
        const targetBuffer = await getTargetBuffer(sock, m, args);
        
        if (!targetBuffer) {
            return reply("`⟁⃝⚠︎ Mention someone or reply to an image`");
        }

        try {
            const result = await applyEffect(targetBuffer, "facepalm");
            await sock.sendMessage(m.chat, {
                image: result
            }, { quoted: m });
            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
        } catch (err) {
            console.error("[FACEPALM ERROR]", err);
            await sock.sendMessage(m.chat, { react: { text: '❓', key: m.key } });
            reply('😁 Failed to apply facepalm effect.');
        }
    }
};