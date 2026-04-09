const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');
const config = require('../../../settings/config');

// Use gateway from config
const GATEWAY_URL = process.env.GATEWAY_URL || config.api?.gateway || '';

module.exports = {
    name: 'changebg',
    alias: ['bg', 'background'],
    category: 'AI',
    desc: 'AI background changer powered by CRYSNOVA',
    usage: '.changebg <background description> (reply to image)',

    execute: async (sock, m, { args, reply, prefix }) => {
        try {
            const quoted = m.quoted;

            if (!quoted) {
                return reply(`_⚉ Reply to an image or sticker_\\n\\n✪ Example: \`${prefix}changebg beach sunset\``);
            }

            if (!/image|webp/.test(quoted.mimetype || '')) {
                return reply('`✘ Reply must be an image or static sticker`');
            }

            const prompt = args.join(' ').trim();
            if (!prompt) {
                return reply(`_⚉ Provide a background description_\\n\\n✪ Example: \`${prefix}changebg cyberpunk city\``);
            }

            await sock.sendPresenceUpdate('composing', m.chat);
            await sock.sendMessage(m.chat, { react: { text: '🎨', key: m.key } });

            // Download media
            let media = await quoted.download();
            if (!media) return reply('`✘ Failed to download media`');

            // Auto compression
            if (Buffer.isBuffer(media)) {
                try {
                    media = await sharp(media)
                        .resize({
                            width: 1024,
                            height: 1024,
                            fit: 'inside'
                        })
                        .jpeg({ quality: 80 })
                        .toBuffer();
                } catch (e) {
                    console.log('[ChangeBG] Compression skipped:', e.message);
                }
            }

            const form = new FormData();
            form.append('image', media, { filename: 'image.jpg' });
            form.append('prompt', prompt);

            await reply('`🎨 Processing image...`');

            // Call gateway /changebg endpoint
            const response = await axios.post(
                `${GATEWAY_URL}/changebg`,
                form,
                {
                    headers: form.getHeaders(),
                    responseType: 'arraybuffer',
                    timeout: 180000
                }
            );

            if (!response?.data) return reply('`✘ AI returned empty response`');

            const result = Buffer.from(response.data);

            if (!result.length) return reply('`✘ Empty image received`');
            if (result.length > 5 * 1024 * 1024) return reply('`𓉤 Result exceeds WhatsApp 5MB limit`');

            await sock.sendMessage(m.chat, {
                image: result,
                caption: `_✦ Background changed_\n\n🎨 \`${prompt}\`\n\n_⚉ Powered by CRYSNOVA AI_`
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '💯', key: m.key } });

        } catch (err) {
            console.error('[CHANGEBG ERROR]', err);

            if (err.response?.status === 429) return reply('`𓉤 Rate limit exceeded`');
            if (err.response?.status === 500) return reply('`𓉤 AI server unavailable`');
            if (err.code === 'ECONNABORTED') return reply('`𓉤 Processing timeout`');

            reply(`\`✘ ${err.message || 'Unknown error'}\``);
        }
    }
};
