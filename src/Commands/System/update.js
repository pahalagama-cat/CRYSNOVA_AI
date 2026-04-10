const { performUpdate } = require('../../Plugin/updater.js');

module.exports = {
    name: 'update',
    alias: ['upgrade', 'upd'],
    category: 'owner',
    owner: true,
    desc: 'Safe auto-updater with progress bar',
    execute: async (sock, m, { reply }) => {
        await reply(`_*✪ Initializing...*_`);
        
        const result = await performUpdate({
            notifyOwner: async (msg) => {
                await sock.sendMessage(m.chat, { text: `\`${msg}\`` }, { quoted: m });
            }
        });

        if (result.success) {
            await reply(`_*✦ Update complete!*_`);
        } else {
            await reply(`_*✘ Update Failed*\n${result.error}_`);
        }
    }
};
