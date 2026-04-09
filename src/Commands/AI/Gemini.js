const axios = require("axios");
const config = require("../../../settings/config");

// Use gateway from config
const GATEWAY_URL = process.env.GATEWAY_URL || config.api?.gateway || '';

module.exports = {
    name: "gemini",
    alias: ["gemi", "gptg"],
    category: "AI",
    desc: "Gemini AI Chat powered by CRYSNOVA",
    reactions: {
        start: '✨',
        success: '📑'
    },

    execute: async (sock, m, { args = [], reply }) => {
        const jid = m.chat;
        const query = args.join(" ").trim();

        if (!query) {
            return reply("ಠ_ಠ _*Please ask something*_.");
        }

        try {
            await sock.sendMessage(jid, { react: { text: "✨", key: m.key } });

            // Gemini‑style training prompt (acts like Gemini, powered by DeepSeek)
            const GEMINI_PROMPT = `You are Gemini, a helpful AI assistant created by Google. You are known for being knowledgeable, friendly, and conversational.

Rules:
- Reply naturally and directly, as Gemini would.
- Be helpful, intelligent, and concise.
- Maintain a warm, approachable tone.
- Do not reveal that you are actually a different model.
- Always behave as Google's Gemini assistant.

User Question:
${query}`;

            // Call the gateway's /deepseek endpoint (which already exists)
            const response = await axios.post(
                `${GATEWAY_URL}/deepseek`,
                { query: GEMINI_PROMPT },  // The prompt becomes the "query"
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 60000
                }
            );

            const data = response.data;

            if (data?.success && data?.message?.content) {
                await sock.sendMessage(jid, {
                    text: `ಠ_ಠ *GEMINI AI*\n\n${data.message.content}\n\n_⚉ CRYSNOVA Gateway_`
                }, { quoted: m });
                await sock.sendMessage(jid, { react: { text: "✓", key: m.key } });
            } else {
                reply("_*✘ Gemini response invalid*_.");
            }

        } catch (err) {
            console.error("Gemini Plugin Error:", err.message);
            reply("✘ Gemini AI service error.");
        }
    }
};
