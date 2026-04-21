const { applyEffect, getTargetBuffer } = require("../Core/֎");

module.exports = {
    name: "affect",
    alias: ['baby', 'cry'],
    desc: 'Add "Affect/Baby" effect to profile picture or image',
    category: "Image-Edit",
    usage: ".affect [@user] or reply to an image/user",
    reactions: { start: '😢', success: '〽️' },

    execute: async (sock, m, { args, reply }) => {
        await sock.sendMessage(m.chat, { react: { text: '😢', key: m.key } });
        
        const targetBuffer = await getTargetBuffer(sock, m, args);
        
        if (!targetBuffer) {
            return reply("`⟁⃝⚠︎ Mention someone or reply to an image`");
        }

        try {
            const result = await applyEffect(targetBuffer, "affect");
            await sock.sendMessage(m.chat, {
                image: result
            }, { quoted: m });
            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
        } catch (err) {
            console.error("[AFFECT ERROR]", err);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply('_*⚠︎ Failed to apply affect effect.*_');
        }
    }
};