const axios = require('axios');
const mime = require('mime-types');

module.exports = {
    name: 'd',
    alias: ['download', 'dl'],
    desc: 'Download & send media from direct URL (or reply to a URL)',
    category: 'Downloader',
    usage: '.d <URL> or reply to a message with a URL',
    reactions: { start: '📥', success: '💾', error: '❔' },

    execute: async (sock, m, { args, reply, prefix, quoted }) => {
        let url = args[0]?.trim();

        // Check if replying to a message with URL
        if (!url || !url.startsWith('http')) {
            const target = m.quoted || quoted;
            if (target && target.text) {
                const urlMatch = target.text.match(/(https?:\/\/[^\s]+)/);
                if (urlMatch) url = urlMatch[0];
            }
        }

        if (!url || !url.startsWith('http')) {
            return reply(
                `╭─❍ *DIRECT DOWNLOADER*\n│\n` +
                `│ ⚉ *Usage:* ${prefix}d <URL>\n│\n` +
                `│ ✪ *Or reply to a message with URL*\n│\n` +
                `│ ${prefix}d https://files.catbox.moe/video.mp4\n│\n` +
                `│ 📥 *Downloads from direct links*\n` +
                `╰──────────────────`
            );
        }

        await sock.sendMessage(m.chat, { react: { text: '📥', key: m.key } });

        // ONE message for everything
        const progressMsg = await sock.sendMessage(m.chat, {
            text: `📥 *Downloading...*\n\n▰▱▱▱▱▱▱▱▱▱ 0%\n\n📡 Connecting...`
        });

        const updateProgress = async (percent, phase) => {
            const filled = Math.round(percent / 10);
            const bar = '▰'.repeat(filled) + '▱'.repeat(10 - filled);
            await sock.sendMessage(m.chat, {
                text: `📥 *Downloading...*\n\n${bar} ${percent}%\n\n📡 ${phase}`,
                edit: progressMsg.key
            });
        };

        try {
            await updateProgress(5, 'Connecting to server...');

            let contentType = '';
            try {
                const headRes = await axios.head(url, {
                    timeout: 15000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });
                contentType = headRes.headers['content-type'] || '';
            } catch (e) {}

            await updateProgress(15, 'Starting download...');

            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 120000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                onDownloadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                        updateProgress(percent, `${formatSize(progressEvent.loaded)} / ${formatSize(progressEvent.total)}`);
                    }
                }
            });

            await updateProgress(85, 'Processing...');

            const buffer = Buffer.from(response.data);
            if (buffer.length < 100) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                await sock.sendMessage(m.chat, { text: `𓆉 File too small`, edit: progressMsg.key });
                return;
            }

            contentType = contentType || response.headers['content-type'] || '';
            let ext = mime.extension(contentType) || url.split('.').pop()?.split('?')[0]?.toLowerCase() || 'bin';
            const fileName = `CRYSNOVA_${Date.now()}.${ext}`;

            let sendKey = 'document';
            let caption = '';

            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
                sendKey = 'image';
                caption = `🖼️ ${formatSize(buffer.length)} • ${ext.toUpperCase()}`;
            } else if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv'].includes(ext)) {
                sendKey = 'video';
                caption = `🎬 ${formatSize(buffer.length)} • ${ext.toUpperCase()}`;
            } else if (['mp3', 'm4a', 'ogg', 'wav', 'flac', 'aac'].includes(ext)) {
                sendKey = 'audio';
                caption = `🎵 ${formatSize(buffer.length)} • ${ext.toUpperCase()}`;
            } else {
                sendKey = 'document';
                caption = `📄 ${fileName} • ${formatSize(buffer.length)}`;
            }

            // ✅ Final progress update — 100% complete
            await updateProgress(100, `Done! ${formatSize(buffer.length)} • ${ext.toUpperCase()}`);
            
            // Short pause so user sees 100%
            await new Promise(r => setTimeout(r, 500));

            // Delete the progress message
            await sock.sendMessage(m.chat, { delete: progressMsg.key });

            // Send the actual file
            await sock.sendMessage(m.chat, {
                [sendKey]: buffer,
                mimetype: contentType || 'application/octet-stream',
                ...(sendKey === 'document' ? { fileName } : {}),
                ...(sendKey === 'audio' ? { ptt: false } : {}),
                caption: caption
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });

        } catch (err) {
            console.error('[D ERROR]', err.message || err);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });

            let errorMsg = `🏗️ *Failed*\n\n`;
            if (err.response?.status === 404) errorMsg += '📡 Link not found\n';
            else if (err.code === 'ECONNABORTED') errorMsg += '⏰ Timeout\n';
            else errorMsg += `⚠︎ ${err.message}`;

            await sock.sendMessage(m.chat, { text: errorMsg, edit: progressMsg.key });
        }
    }
};

function formatSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}
