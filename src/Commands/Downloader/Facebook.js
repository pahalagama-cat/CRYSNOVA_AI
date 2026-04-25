const axios = require('axios');
const config = require('../../../settings/config');

// Use Apex gateway from config with token
const GATEWAY_URL = process.env.GATEWAY_URL || config.api?.gateway || 'https://api.crysnovax.link';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || config.api?.gatewayToken || '';

module.exports = {
    name: 'fb',
    alias: ['facebook', 'fbdown'],
    desc: 'Download Facebook video via CRYSNOVA Gateway',
    category: 'downloader',
    usage: '.fb <Facebook URL>',
    owner: false,
    reactions: { start: '📘', success: '🔖', error: '❔' },

    execute: async (sock, m, { args, reply, quoted }) => {
        let url = args[0]?.trim();

        // ✅ Check if replying to a message with Facebook URL
        if (!url || !url.includes('facebook.com')) {
            const target = m.quoted || quoted;
            if (target && target.text) {
                const urlMatch = target.text.match(/(https?:\/\/(?:www\.|web\.|m\.)?facebook\.com\/[^\s]+)/);
                if (urlMatch) url = urlMatch[0];
            }
        }

        if (!url || !url.includes('facebook.com')) {
            return reply(
                '𓄄 *Provide a valid Facebook URL!*\n\n' +
                'Example:\n' +
                '`.fb https://facebook.com/...`\n\n' +
                '📱 _Or reply to a message with a Facebook link_'
            );
        }

        await sock.sendMessage(m.chat, { react: { text: '📘', key: m.key } });

        // ✅ Progress message
        const progressMsg = await sock.sendMessage(m.chat, {
            text: `📘 *Fetching Facebook Video...*\n\n▰▱▱▱▱▱▱▱▱▱ 0%\n\n🔍 Resolving URL...`
        });

        const updateProgress = async (percent, phase) => {
            const filled = Math.round(percent / 10);
            const bar = '▰'.repeat(filled) + '▱'.repeat(10 - filled);
            await sock.sendMessage(m.chat, {
                text: `📘 *Fetching Facebook Video...*\n\n${bar} ${percent}%\n\n🔍 ${phase}`,
                edit: progressMsg.key
            });
        };

        await updateProgress(15, 'Connecting to gateway...');

        try {
            // Call Apex gateway /download/facebookv2 endpoint
            const apiUrl = `${GATEWAY_URL}/download/facebookv2?token=${encodeURIComponent(GATEWAY_TOKEN)}&url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl, { timeout: 60000 });
            const data = res.data;

            console.log('[FB GATEWAY RESPONSE]', JSON.stringify(data).slice(0, 500));

            await updateProgress(40, 'Extracting video URL...');

            // Robust extraction of video URL
            let videoUrl = null;
            let title = 'Facebook Video';

            const findVideoUrl = (obj) => {
                if (!obj || typeof obj !== 'object') return null;
                const candidates = [
                    obj?.result?.hd, obj?.result?.sd, obj?.hd, obj?.sd,
                    obj?.url, obj?.video, obj?.link, obj?.download_url,
                    obj?.data?.hd, obj?.data?.sd, obj?.data?.url,
                    obj?.respon?.url, obj?.response?.url
                ];
                for (const c of candidates) {
                    if (typeof c === 'string' && c.startsWith('http')) return c;
                }
                for (const v of Object.values(obj)) {
                    if (typeof v === 'string' && v.startsWith('http') && v.includes('.mp4')) return v;
                    if (v && typeof v === 'object') {
                        const nested = findVideoUrl(v);
                        if (nested) return nested;
                    }
                }
                return null;
            };

            videoUrl = findVideoUrl(data);
            title = data?.result?.title || data?.title || data?.respon?.title || data?.data?.title || 'Facebook Video';

            if (!videoUrl) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                await sock.sendMessage(m.chat, { text: '🏗️ Could not extract video URL', edit: progressMsg.key });
                return;
            }

            await updateProgress(70, 'Downloading video...');

            const caption =
                `📘 *Facebook Downloader*\n\n` +
                `❏◦: ${title}\n` +
                `_*CRYSNOVA Gateway*_`;

            await updateProgress(90, 'Processing...');
            await updateProgress(100, 'Done!');
            await new Promise(r => setTimeout(r, 400));
            await sock.sendMessage(m.chat, { delete: progressMsg.key });

            await sock.sendMessage(m.chat, {
                video: { url: videoUrl },
                mimetype: 'video/mp4',
                caption,
                fileName: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });

        } catch (err) {
            console.error('[FB ERROR]', err.message);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });

            let errorMsg = '🏗️ *Download Failed*\n\n';
            if (err.code === 'ECONNABORTED') errorMsg += '⏰ Timeout\n';
            else errorMsg += `𓆉 ${err.message}`;

            await sock.sendMessage(m.chat, { text: errorMsg, edit: progressMsg.key });
        }
    }
};
