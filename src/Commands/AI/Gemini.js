const axios = require("axios");

// Apex Gateway - Gemini (smartest endpoint)
const AI_GATEWAY = 'https://appex.crysnovax.link';
const AI_TOKEN = 'x';

module.exports = {
    name: "gemini",
    alias: ["gchat", "gemgpt"],
    category: "AI",
    desc: "Gemini AI Assistant powered by CRYSNOVA",

    execute: async (sock, m, { args, reply }) => {
        const jid = m.chat;
        const query = args.join(" ").trim();

        if (!query) {
            return reply("⚉ _*Please ask something*_.");
        }

        try {
            await sock.sendMessage(jid, { react: { text: "", key: m.key } });

            const prompt = `You are CRYSNOVA AI, a helpful, intelligent, and professional assistant. Be concise, accurate, and natural. Do not roleplay, flirt, or break character.\n\nUser: ${query}\nAssistant:`;

            // Call Apex Gemini API
            const response = await axios.get(
                `${AI_GATEWAY}/ai/gemini?text=${encodeURIComponent(prompt)}&token=${AI_TOKEN}`,
                { timeout: 45000 }
            );

            const replyText = response.data?.result || '';

            if (replyText && replyText.length > 5) {
                // Clean up any roleplay/flirty remnants
                const cleanText = replyText
                    .replace(/handsome|darling|sweetie|honey|babe|cushy/gi, '')
                    .trim();
                
                await sock.sendMessage(jid, { text: cleanText || replyText }, { quoted: m });
            } else {
                // Fallback to Bypass
                const fallbackRes = await axios.get(
                    `${AI_GATEWAY}/ai/bypass?text=${encodeURIComponent(query)}&token=${AI_TOKEN}`,
                    { timeout: 45000 }
                );
                const fallbackText = fallbackRes.data?.result || '';
                
                if (fallbackText && fallbackText.length > 5) {
                    await sock.sendMessage(jid, { text: fallbackText }, { quoted: m });
                } else {
                    reply("𓉤 GPT response invalid.");
                }
            }

            await sock.sendMessage(jid, { react: { text: "🔖", key: m.key } });

        } catch (err) {
            console.error("Gemini Plugin Error:", err.message);
            reply("`⚠︎ AI failed. Try again later.`");
        }
    }
};
