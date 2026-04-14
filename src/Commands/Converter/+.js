// lunav.js - Luna AI Voice (Text-to-Speech)
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const config = require('../../../settings/config');

// Use Apex gateway from config with token
const GATEWAY_URL = process.env.GATEWAY_URL || config.api?.gateway || 'https://api.crysnovax.link';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || config.api?.gatewayToken || '';

module.exports = {
    name: 'lunav',
    alias: ['lvoice'],
    category: 'AI',
    desc: 'Luna AI Voice – Text to speech powered by CRYSNOVA',

    execute: async (sock, m, { args, reply }) => {
        const query = args.join(' ').trim();
        if (!query) return reply('⚉ Ask Luna something.');

        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const outputPath = path.join(tempDir, `luna_${Date.now()}.mp3`);

        try {
            await sock.sendMessage(m.chat, { react: { text: '🌙', key: m.key } });

            // Step 1: Get text response from Luna AI via Apex gateway
            const textResponse = await axios.post(
                `${GATEWAY_URL}/chat?token=${encodeURIComponent(GATEWAY_TOKEN)}`,
                { prompt: query, model: 'gpt-4.5' },
                { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
            );
            const replyText = textResponse.data?.response || textResponse.data?.text || textResponse.data?.message || '';
            if (!replyText) return reply('_*✦ Luna AI returned no response.*_');

            // Step 2: Generate speech from the text
            try {
                // Try gTTS CLI first
                await new Promise((resolve, reject) => {
                    exec(
                        `gtts-cli "${replyText.replace(/"/g, '\\"')}" --lang en --output "${outputPath}"`,
                        { timeout: 30000 },
                        err => (err ? reject(err) : resolve())
                    );
                });
            } catch (gttsError) {
                // Fallback to Google Translate TTS
                const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(replyText)}&tl=en&client=tw-ob`;
                const audioRes = await axios.get(ttsUrl, {
                    responseType: 'arraybuffer',
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                fs.writeFileSync(outputPath, Buffer.from(audioRes.data));
            }

            // Step 3: Send the audio as a voice note
            await sock.sendMessage(m.chat, {
                audio: fs.readFileSync(outputPath),
                mimetype: 'audio/mp4',
                ptt: true
            }, { quoted: m });

        } catch (err) {
            console.error(err);
            reply('_*✦ Voice generation failed.*_');
        } finally {
            // Clean up temp file
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    }
};
