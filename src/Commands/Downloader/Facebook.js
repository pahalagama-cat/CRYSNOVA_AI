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

    execute: async (sock, m, { args, reply }) => {
        const url = args[0]?.trim();

        if (!url || !url.includes('facebook.com')) {
            return reply(
                '𓄄 *Provide a valid Facebook URL!*\n\n' +
                'Example:\n' +
                '`.fb https://facebook.com/...`'
            );
        }

        await reply('_*✪ Downloading...*_');

        try {
            // Call Apex gateway /download/facebookv2 endpoint
            const apiUrl = `${GATEWAY_URL}/download/facebookv2?token=${encodeURIComponent(GATEWAY_TOKEN)}&url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl, { timeout: 60000 });
            const data = res.data;

            // Debug: log the response structure (remove after testing)
            console.log('[FB GATEWAY RESPONSE]', JSON.stringify(data).slice(0, 500));

            // Robust extraction of video URL from many possible response formats
            let videoUrl = null;
            let title = 'Facebook Video';

            // Helper: deep search for any string that looks like an MP4 URL
            const findVideoUrl = (obj) => {
                if (!obj || typeof obj !== 'object') return null;
                // Check common fields
                const candidates = [
                    obj?.result?.hd, obj?.result?.sd, obj?.hd, obj?.sd,
                    obj?.url, obj?.video, obj?.link, obj?.download_url,
                    obj?.data?.hd, obj?.data?.sd, obj?.data?.url,
                    obj?.respon?.url, obj?.response?.url
                ];
                for (const c of candidates) {
                    if (typeof c === 'string' && c.startsWith('http')) return c;
                }
                // Search values recursively (shallow)
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

            // Try to get title
            title = data?.result?.title || data?.title || data?.respon?.title || data?.data?.title || 'Facebook Video';

            if (!videoUrl) {
           //     console.error('[FB] Could not extract video URL from:', data);
                return reply('_✘ Failed to extract video URL from gateway response._');
            }

            const caption =
                `📘 *Facebook Downloader*\n\n` +
                `❏◦: ${title}\n` +
                `_*CRYSNOVA Gateway*_`;

            await sock.sendMessage(m.chat, {
                video: { url: videoUrl },
                mimetype: 'video/mp4',
                caption,
                fileName: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`
            }, { quoted: m });

        } catch (err) {
            console.error('[FB ERROR]', err.message);
            reply('✘ Download failed. Try again later.');
        }
    }
};
