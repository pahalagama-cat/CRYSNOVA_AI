const { applyEffect, getTargetBuffer } = require("../Core/֎.js");

module.exports = {
    name: "shit",
    alias: [],
    desc: 'Add "shit" effect to profile picture or image',
    category: "Image-Edit",
    usage: ".shit [@user] or reply to an image/user",
    reactions: { start: '💩', success: '😁' },

    execute: async (sock, m, { args, reply }) => {
        await sock.sendMessage(m.chat, { react: { text: '💩', key: m.key } });
        
        const targetBuffer = await getTargetBuffer(sock, m, args);
        
        if (!targetBuffer) {
            return reply("`⟁⃝⚠︎ Mention someone or reply to an image`");
        }

        try {
            const result = await applyEffect(targetBuffer, "shit");
            await sock.sendMessage(m.chat, {
                image: result,
                caption: "💩 *Eww, you stepped in shit!* 💩"
            }, { quoted: m });
            await sock.sendMessage(m.chat, { react: { text: '😁', key: m.key } });
        } catch (err) {
            console.error("[SHIT ERROR]", err);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply('ಥ⁠‿⁠ಥ ```you are wicked!```');
        }
    }
};