const { applyEffect, getTargetBuffer } = require("../Core/֎");

module.exports = {
    name: "greyscale",
    alias: ['grayscale', 'bw', 'blackwhite'],
    desc: 'Convert profile picture or image to greyscale',
    category: "Image-Edit",
    usage: ".greyscale [@user] or reply to an image/user",
    reactions: { start: '🎞️', success: '✨' },

    execute: async (sock, m, { args, reply }) => {
        await sock.sendMessage(m.chat, { react: { text: '🎞️', key: m.key } });
        
        const targetBuffer = await getTargetBuffer(sock, m, args);
        
        if (!targetBuffer) {
            return reply("`⟁⃝⚠︎ Mention someone or reply to an image`");
        }

        try {
            const result = await applyEffect(targetBuffer, "greyscale");
            await sock.sendMessage(m.chat, {
                image: result
            }, { quoted: m });
            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
        } catch (err) {
            console.error("[GREYSCALE ERROR]", err);
            await sock.sendMessage(m.chat, { react: { text: '😞', key: m.key } });
            reply('_*ಠ_ಠ Failed to apply greyscale effect.*_');
        }
    }
};