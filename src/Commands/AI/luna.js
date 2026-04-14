const axios = require("axios");
const config = require("../../../settings/config");

const GATEWAY_URL = process.env.GATEWAY_URL || config.api?.gateway || 'https://api.crysnovax.link';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || config.api?.gatewayToken || '';

module.exports = {
    name: 'luna',
    alias: ['ai', 'ask'],
    category: 'AI',
    desc: 'Luna AI Text powered by CRYSNOVA',

    execute: async (sock, m, { args, reply }) => {
        const query = args.join(' ').trim();
        if (!query) return reply('_*⚉ Ask Luna something.*_');

        try {
            await sock.sendMessage(m.chat, { react: { text: '🌙', key: m.key } });

            const response = await axios.post(
                `${GATEWAY_URL}/chat?token=${encodeURIComponent(GATEWAY_TOKEN)}`,
                { prompt: query, model: 'gpt-4.5' },
                { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
            );

            const replyText = response.data?.response || response.data?.text || response.data?.message || '';
            if (!replyText) return reply('_*✦ Luna failed.*_');

            await sock.sendMessage(m.chat, {
                text: '🌙 *Luna AI*\n\n' + replyText
            }, { quoted: m });

        } catch (err) {
            console.error('Luna Plugin Error:', err.message);
            reply('_*✦ Luna failed.*_');
        }
    }
};
