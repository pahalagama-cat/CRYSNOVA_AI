const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const cheerio = require('cheerio');
const config = require('../../../settings/config');
const { downloadContentFromMessage } = require('@crysnovax/baileys');

// -------------------------------------------------------------------
// Apex Gateway configuration
// -------------------------------------------------------------------
const GATEWAY_URL = process.env.GATEWAY_URL || config.api?.gateway || 'https://api.crysnovax.link';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || config.api?.gatewayToken || '';

// -------------------------------------------------------------------
// Database for auto‑reply toggles
// -------------------------------------------------------------------
const DB = path.join(__dirname, '../../database/autoreply.json');
if (!fs.existsSync(DB)) fs.writeFileSync(DB, '{}');
const getDB = () => JSON.parse(fs.readFileSync(DB, 'utf8'));
const saveDB = (data) => fs.writeFileSync(DB, JSON.stringify(data, null, 2));

// -------------------------------------------------------------------
// Image training prompt (injected into AI conversations)
// -------------------------------------------------------------------
const IMAGE_TRAINING_PROMPT = `
You are CRYSNOVA AI V2, a helpful and fun AI assistant.

STRICT IMAGE RULE - NEVER BREAK THIS:
If the user asks for images, pictures, photos, "show me", "send pictures of", "images of", or any visual request, you MUST start your reply with the exact marker on its own line at the very beginning:

[IMAGES: concise search query]

Then continue with your normal helpful response.

Examples:
User: show me images of Nigeria
You: [IMAGES: beautiful Nigeria landmarks and culture]
Nigeria is a beautiful country with rich culture and vibrant people...

User: pictures of cars
You: [IMAGES: luxury sports cars]
Here are some cool car images for you...

Never say "I can't fetch images", "I can't provide images", or refuse. Always use the [IMAGES: ...] marker when images are requested.
`;

// -------------------------------------------------------------------
// Pending image analysis (confirmation flow)
// -------------------------------------------------------------------
const pendingImageAnalysis = new Map(); // chatId -> { buffer, caption }

// -------------------------------------------------------------------
// Image upload (for vision API)
// -------------------------------------------------------------------
async function uploadImage(buffer) {
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
            timeout: 20000
        });
        if (typeof res.data === 'string' && res.data.startsWith('https://')) return res.data.trim();
    } catch {}
    try {
        const form = new FormData();
        form.append('file', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
        const res = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
            headers: form.getHeaders(),
            timeout: 20000
        });
        const url = res.data?.data?.url;
        if (url) return url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
    } catch {}
    throw new Error('Image upload failed');
}

// -------------------------------------------------------------------
// Vision: describe image via Apex gateway
// -------------------------------------------------------------------
async function describeImage(imageBuffer, prompt) {
    const form = new FormData();
    form.append('file', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
    form.append('prompt', prompt || 'Describe this image in detail.');
    
    const res = await axios.post(`${GATEWAY_URL}/vision?token=${encodeURIComponent(GATEWAY_TOKEN)}`, form, {
        headers: form.getHeaders(),
        timeout: 60000
    });
    const description = res.data?.description;
    if (!description) throw new Error('No vision response');
    return description.trim();
}

// -------------------------------------------------------------------
// Voice transcription via Apex gateway
// -------------------------------------------------------------------
async function transcribeAudio(audioBuffer) {
    const form = new FormData();
    form.append('file', audioBuffer, { filename: 'audio.ogg', contentType: 'audio/ogg' });
    const res = await axios.post(`${GATEWAY_URL}/transcribe?token=${encodeURIComponent(GATEWAY_TOKEN)}`, form, {
        headers: form.getHeaders(),
        timeout: 60000
    });
    return res.data?.text || '';
}

// -------------------------------------------------------------------
// Text generation via Apex gateway /chat
// -------------------------------------------------------------------
async function chatWithAI(prompt) {
    const res = await axios.post(`${GATEWAY_URL}/chat?token=${encodeURIComponent(GATEWAY_TOKEN)}`, {
        prompt,
        model: 'gpt-4.5'
    }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
    });
    return res.data?.response || res.data?.text || res.data?.message || '';
}

// -------------------------------------------------------------------
// Bing Image Search (fallback)
// -------------------------------------------------------------------
async function searchBingImages(query, count = 5) {
    try {
        const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 30000
        });
        const $ = cheerio.load(data);
        const images = [];
        $('.mimg').each((i, el) => {
            if (i >= count) return false;
            const src = $(el).attr('src') || $(el).attr('data-src');
            if (src && src.startsWith('http')) images.push(src);
        });
        return { type: 'image', images, query };
    } catch (err) {
        console.error('[BING IMAGE ERROR]', err.message);
        return { type: 'image', images: [], query, fallback: true };
    }
}

// -------------------------------------------------------------------
// DuckDuckGo Image Search (primary)
// -------------------------------------------------------------------
async function searchDuckDuckGoImages(query, count = 2) {
    try {
        const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
        const { data } = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
            timeout: 15000
        });
        const vqdMatch = data.match(/vqd=([0-9-]+)/);
        if (!vqdMatch) throw new Error('Could not extract vqd');
        const vqd = vqdMatch[1];
        
        const apiUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&p=1&s=0&u=bing&f=,,,&l=us-en&vqd=${vqd}`;
        const res = await axios.get(apiUrl, {
            headers: { 'Referer': 'https://duckduckgo.com/', 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
        });
        const results = (res.data?.results || []).filter(r => r?.image);
        const images = [];
        for (const r of results.slice(0, count)) {
            try {
                const imgRes = await axios.get(r.image, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    responseType: 'arraybuffer',
                    timeout: 15000,
                    maxContentLength: 50 * 1024 * 1024
                });
                images.push({
                    buffer: Buffer.from(imgRes.data),
                    mimeType: imgRes.headers['content-type'] || 'image/jpeg',
                    caption: `🖼️ ${query}\n_Source: ${r.source || 'DuckDuckGo'}_`,
                    url: r.image
                });
            } catch (e) {
                continue;
            }
        }
        return { images, query };
    } catch (err) {
        console.error('[DUCKDUCKGO IMAGE ERROR]', err.message);
        return { images: [], query };
    }
}

// -------------------------------------------------------------------
// Fetch images with buffers (tries DuckDuckGo first, falls back to Bing)
// -------------------------------------------------------------------
async function fetchImagesWithBuffers(query, count = 2) {
    let result = await searchDuckDuckGoImages(query, count);
    if (result.images.length === 0) {
        console.log('[IMAGE SEARCH] Falling back to Bing...');
        const bing = await searchBingImages(query, count);
        if (bing.images.length > 0 && !bing.fallback) {
            const imagesWithBuffers = [];
            for (const url of bing.images.slice(0, count)) {
                try {
                    const res = await axios.get(url, {
                        headers: { 'User-Agent': 'Mozilla/5.0' },
                        responseType: 'arraybuffer',
                        timeout: 15000,
                        maxContentLength: 50 * 1024 * 1024
                    });
                    imagesWithBuffers.push({
                        buffer: Buffer.from(res.data),
                        mimeType: res.headers['content-type'] || 'image/jpeg',
                        caption: `🖼️ ${query}\n_Source: Bing Images_`,
                        url
                    });
                } catch (e) {
                    continue;
                }
            }
            result.images = imagesWithBuffers;
        }
    }
    return result;
}

// -------------------------------------------------------------------
// Helper: is image request?
// -------------------------------------------------------------------
function isImageRequest(text) {
    const keywords = ['image', 'images', 'picture', 'pictures', 'pic', 'pics', 'photo', 'photos', 'show me', 'send me', 'give me', 'share', 'visual', 'wallpaper', 'wallpapers', 'look like'];
    const lower = text.toLowerCase();
    return keywords.some(kw => lower.includes(kw));
}

// -------------------------------------------------------------------
// Helper: extract image query from text
// -------------------------------------------------------------------
function extractImageQuery(text) {
    const patterns = [
        /(?:show me|send me|give me|share)\s+(?:some\s+)?(?:images?|pictures?|photos?)\s+(?:of\s+)?(.+)/i,
        /(?:images?|pictures?|photos?)\s+(?:of\s+)?(.+)/i,
        /(?:what does|how does)\s+(.+)\s+(?:look like)/i,
        /(?:see|view)\s+(?:some\s+)?(?:images?|pictures?|photos?)\s+(?:of\s+)?(.+)/i,
        /(?:best|top|beautiful)\s+(.+)\s+(?:images?|pictures?|photos?)/i,
        /(?:images?|pictures?|photos?)\s+(?:from|in|at)\s+(.+)/i,
        /(.+)\s+(?:images?|pictures?|photos?)/i
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) return match[1].trim().replace(/[?.,!]$/, '');
    }
    const cleaned = text.replace(/(?:can you|could you|please|show me|send me|give me|i want|i need|get me|find|search for|look for)/gi, '')
        .replace(/(?:some|few|images?|pictures?|photos?|of|with|and|the)/gi, '')
        .trim();
    return cleaned.length > 2 ? cleaned : text.trim();
}

// -------------------------------------------------------------------
// Conversation memory
// -------------------------------------------------------------------
const chatMemory = new Map();
const MAX_MEMORY = 30;
const getChatId = (m) => m.chat || m.key?.remoteJid || 'unknown';
const isPrivateChat = (jid) => !jid.includes('@g.us') && !jid.includes('status@broadcast');

// -------------------------------------------------------------------
// MAIN EXPORT
// -------------------------------------------------------------------
module.exports = {
    name: 'crysnova',
    alias: ['crys', 'ai'],
    desc: 'CRYSNOVA AI V2 – auto‑reply, image reading, voice transcription, web images',

    execute: async (sock, m, { args, reply }) => {
        const chatId = getChatId(m);
        const db = getDB();
        const isGroup = chatId.includes('@g.us');

        // Manual image command: .crysnova img <query>
        if (args[0]?.toLowerCase() === 'img' || args[0]?.toLowerCase() === 'image') {
            const query = args.slice(1).join(' ').trim();
            if (!query) return reply('⚉ Usage: .crysnova img <search term>');
            await sock.sendPresenceUpdate('composing', chatId);
            try {
                const result = await fetchImagesWithBuffers(query, 3);
                if (result.images.length > 0) {
                    for (let i = 0; i < result.images.length; i++) {
                        const img = result.images[i];
                        await sock.sendMessage(chatId, {
                            image: img.buffer,
                            mimetype: img.mimeType,
                            caption: i === 0 ? `🖼️ ${query}` : undefined
                        }, { quoted: m });
                    }
                } else {
                    return reply('⚉ No images found.');
                }
            } catch (err) {
                reply('⚉ Could not fetch images — try again later.');
            }
            return;
        }

        // Global on/off
        if (args[0]?.toLowerCase() === 'on' && args[1]?.toLowerCase() === 'all') {
            if (isGroup) return reply('Global "on all" only in private chats.');
            db.global_force_private = true;
            saveDB(db);
            return reply('╭─❍ *CRYSNOVA GLOBAL*\n│ Auto-reply *FORCED ON* for all private chats\n╰────────────────');
        }
        if (args[0]?.toLowerCase() === 'off' && args[1]?.toLowerCase() === 'all') {
            if (isGroup) return reply('Global "off all" only in private chats.');
            delete db.global_force_private;
            saveDB(db);
            return reply('╭─❍ *CRYSNOVA GLOBAL*\n│ Global force-on disabled\n╰────────────────');
        }

        // Status / toggle per chat
        if (!args[0]) {
            const status = db[chatId] ? 'ON ✓' : 'OFF ✘';
            const globalNote = (db.global_force_private && isPrivateChat(chatId)) ? ' (global force ON)' : '';
            return reply(`╭─❍ *CRYSNOVA AI V2*\n│ Status: *${status}*${globalNote}\n│ \n│ Commands: on | off | on all | off all | img <query>\n╰────────────────`);
        }

        const action = args[0].toLowerCase();
        if (action === 'on') {
            db[chatId] = true;
            saveDB(db);
            return reply('_*✦ CRYSN⚉VA AI ENABLED ✓*_');
        }
        if (action === 'off') {
            delete db[chatId];
            saveDB(db);
            return reply('_*❏ CRYSN⚉VA AI DISABLED ✘*_');
        }

        // Direct query
        const question = args.join(' ').trim();
        if (!question) return;
        try {
            const response = await chatWithAI(question);
            return reply(`_*⚉*_\n\n${response.trim()}\n\n_*✦ 𝙲𝚁𝚈𝚂𝙽𝙾𝚅𝙰 𝙰𝙸*_`);
        } catch (err) {
            return reply('_Failed — try again_');
        }
    },

    // -------------------------------------------------------------------
    // Auto‑reply handler
    // -------------------------------------------------------------------
    onMessage: async (sock, m) => {
        if (!m.message) return;
        const chatId = getChatId(m);
        if (chatId === 'unknown') return;
        const db = getDB();

        let enabled = false;
        if (isPrivateChat(chatId)) {
            enabled = db.global_force_private || !!db[chatId];
        } else {
            enabled = !!db[chatId];
        }
        if (!enabled) return;

        let fullText = '';
        let lowerText = '';

        // -------------------------------------------------------------------
        // Voice note transcription (via Apex gateway)
        // -------------------------------------------------------------------
        if (m.message?.audioMessage) {
            try {
                await sock.sendPresenceUpdate('composing', chatId);
                const audioMsg = m.message.audioMessage;
                const stream = await downloadContentFromMessage(audioMsg, 'audio');
                let buffer = Buffer.alloc(0);
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                const transcribed = await transcribeAudio(buffer);
                if (transcribed) {
                    fullText = transcribed;
                    lowerText = transcribed.toLowerCase();
                }
            } catch (err) {
                console.error('[AUTO VTT ERROR]', err.message);
            }
        }

        // Extract text/caption
        if (!fullText) {
            fullText = (m.message?.conversation ||
                       m.message?.extendedTextMessage?.text ||
                       m.message?.imageMessage?.caption ||
                       m.message?.videoMessage?.caption ||
                       '').trim();
            lowerText = fullText.toLowerCase();
        }

        if (!fullText && !m.message?.imageMessage && !m.message?.stickerMessage) return;
        if (lowerText.includes('⚉') || lowerText.startsWith('.')) return;

        // -------------------------------------------------------------------
        // Creator info detection
        // -------------------------------------------------------------------
        const creatorKeywords = ['who made you', 'who owns you', 'your creator', 'your owner', 'introduce yourself'];
        if (creatorKeywords.some(kw => lowerText.includes(kw))) {
            await sock.sendMessage(chatId, { react: { text: '🔥', key: m.key } }).catch(() => {});
            const owner = {
                name: 'crysnovax',
                number: '2348077134210',
                displayNumber: '+2348077134210',
                profilePicUrl: 'https://media.crysnovax.workers.dev/d1c4273f-dbd8-4a15-a874-40087fb66eff.jpg',
                established: '2025',
                bio: 'Building intelligent, spicy AI companions and cool designs 🔥',
                github: 'https://github.com/crysnovax',
                youtube: 'https://youtube.com/@crysnovax',
                tiktok: 'https://www.tiktok.com/@crysnovax',
                channel: 'https://whatsapp.com/channel/0029Vb6pe77K0IBn48HLKb38'
            };
            const vcard = [
                'BEGIN:VCARD', 'VERSION:3.0', `FN:${owner.name}`,
                `TEL;type=CELL;type=VOICE;waid=${owner.number}:${owner.displayNumber}`,
                'END:VCARD'
            ].join('\n');
            const intro = `⚉ Heyy! 👋\n\nI'm *CRYSNOVA AI V2* — your multi-core, spicy AI companion 😏\n\nThe real creator & brain behind me is:\n\n*${owner.name} (${owner.displayNumber})*\nAI Developer • Designer • Tinkerer\nBased in Benin City 🔥\nEstablished: ${owner.established}\n\nBio: ${owner.bio}\n\n💻 GitHub: ${owner.github}\n🎬 YouTube: ${owner.youtube}\n🎵 TikTok: ${owner.tiktok}\n\n💬 Support Group: https://chat.whatsapp.com/Besbj8VIle1GwxKKZv1lax\n🥏 Contact Owner: https://wa.me/${owner.number}\n📢 Channel: ${owner.channel}`;
            const picMsg = await sock.sendMessage(chatId, { image: { url: owner.profilePicUrl }, caption: intro }, { quoted: null });
            if (picMsg) await sock.sendMessage(chatId, { react: { text: '🐾', key: picMsg.key } }).catch(() => {});
            await sock.sendMessage(chatId, { contacts: { displayName: owner.name, contacts: [{ vcard }] } }, { quoted: m });
            return;
        }

        // -------------------------------------------------------------------
        // Pending image confirmation
        // -------------------------------------------------------------------
        const pending = pendingImageAnalysis.get(chatId);
        if (pending) {
            const confirmWords = ['yes', 'analyze', 'describe', 'ok', 'go', 'sure', 'do it', 'read it'];
            if (confirmWords.some(w => lowerText.includes(w))) {
                pendingImageAnalysis.delete(chatId);
                await sock.sendPresenceUpdate('composing', chatId);
                try {
                    const description = await describeImage(pending.buffer, pending.caption || 'Describe this image in detail.');
                    await sock.sendMessage(chatId, {
                        text: `⚉ *CRYSNOVA AI V2* analyzed:\n\n${description}\n\n_⚉ Powered by crysnovax verified_`
                    }, { quoted: m });
                } catch (e) {
                    await sock.sendMessage(chatId, { text: '⚉ Analysis failed — try again later.' }, { quoted: m });
                }
                return;
            } else {
                pendingImageAnalysis.delete(chatId);
            }
        }

        // -------------------------------------------------------------------
        // New image detected (no caption)
        // -------------------------------------------------------------------
        if (m.message?.imageMessage || m.message?.stickerMessage) {
            const imgMsg = m.message.imageMessage || m.message.stickerMessage;
            const caption = (imgMsg.caption || '').trim();
            if (caption && caption.toLowerCase().startsWith('.')) return;
            if (imgMsg.viewOnce) return;
            try {
                const buffer = await m.download();
                if (!buffer?.length) return;
                pendingImageAnalysis.set(chatId, { buffer, caption });
                await sock.sendMessage(chatId, {
                    text: `⚉ Image detected.\n\nDo you want me to analyze this image? (yes / analyze / describe / ok)`
                }, { quoted: m });
            } catch (e) {
                console.error('[IMAGE DOWNLOAD ERROR]', e.message);
            }
            return;
        }

        // -------------------------------------------------------------------
        // Normal text reply (with image detection)
        // -------------------------------------------------------------------
        try {
            const isImageReq = isImageRequest(fullText);
            let imageQuery = null;
            let imageResult = null;

            if (isImageReq) {
                imageQuery = extractImageQuery(fullText);
                await sock.sendPresenceUpdate('composing', chatId);
                imageResult = await fetchImagesWithBuffers(imageQuery, 3);
            }

            const prompt = IMAGE_TRAINING_PROMPT + '\n\nUser message: ' + fullText;
            let response = await chatWithAI(prompt);
            
            // Check for [IMAGES: ...] marker from AI
            const markerMatch = response.match(/\[IMAGES:\s*(.+?)\]/i);
            if (markerMatch && !imageQuery) {
                imageQuery = markerMatch[1].trim();
                imageResult = await fetchImagesWithBuffers(imageQuery, 3);
            }
            response = response.replace(/\[IMAGES:\s*.+?\]/i, '').trim();

            if (imageResult && imageResult.images.length > 0) {
                for (let i = 0; i < imageResult.images.length; i++) {
                    const img = imageResult.images[i];
                    await sock.sendMessage(chatId, {
                        image: img.buffer,
                        mimetype: img.mimeType,
                        caption: i === 0 ? `🖼️ ${imageQuery || 'image'}\n\n${response.slice(0, 500)}${response.length > 500 ? '...' : ''}` : undefined
                    }, { quoted: m });
                }
                if (response.length > 500) {
                    await sock.sendMessage(chatId, { text: `_*⚉*_\n\n${response.slice(500)}\n\n_*✦ 𝙲𝚁𝚈𝚂𝙽𝙾𝚅𝙰 𝙰𝙸*_` }, { quoted: m });
                }
            } else if (isImageReq && (!imageResult || imageResult.images.length === 0)) {
                await sock.sendMessage(chatId, {
                    text: `_*⚉*_\n\nI couldn't find images for "${imageQuery || fullText}", but here's what I know:\n\n${response}\n\n_*✦ 𝙲𝚁𝚈𝚂𝙽𝙾𝚅𝙰 𝙰𝙸*_`
                }, { quoted: m });
            } else {
                await sock.sendMessage(chatId, {
                    text: `_*⚉*_\n\n${response}\n\n_*✦ 𝙲𝚁𝚈𝚂𝙽𝙾𝚅𝙰 𝙰𝙸*_`
                }, { quoted: m });
            }
        } catch (err) {
            console.error('[CRYSNOVA AUTO ERROR]', err.message);
            try { await sock.sendMessage(chatId, { text: '_⚉ Something went wrong — try again_' }, { quoted: m }); } catch {}
        }
    }
};