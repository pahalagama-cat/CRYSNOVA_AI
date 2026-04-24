const axios = require('axios');
const FormData = require('form-data');

module.exports = {
    name: 'nurl',
    alias: ['tourl', 'upload'],
    desc: 'Upload image and get a copyable URL',
    category: 'Tools',
    reactions: { start: '📤', success: '🔖', error: '❔' },

    execute: async (sock, m, { reply }) => {
        if (!m.quoted) return reply('`𓉤 Reply to an image`');

        const mtype = m.quoted.mtype || '';
        if (!mtype.includes('image')) return reply('`⚉ Reply to an image`');

        await sock.sendMessage(m.chat, { react: { text: '📤', key: m.key } });

        try {
            const buffer = await m.quoted.download();
            if (!buffer) return reply('`✘ Download failed`');

            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', buffer, 'image.jpg');

            const result = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: {
                    ...form.getHeaders(),
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 60000
            });

            const url = result.data?.trim();
            if (!url?.startsWith('http')) return reply('`✘ Upload failed`');

            await sock.sendMessage(m.chat, {
                text: `⎙ *Uploaded!*\n\n▽ ❏ _Tap button below to copy URL_`,
                nativeFlow: [{
                    text: '📋 Copy URL',
                    copy: url
                }]
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });

        } catch (err) {
            console.error('[NURL ERROR]', err.message);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.message || 'Upload failed'}\``);
        }
    }
};
