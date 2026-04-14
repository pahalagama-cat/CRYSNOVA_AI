const axios = require("axios");
const config = require("../../../settings/config");

// Use gateway URL and token from config
const GATEWAY_URL = process.env.GATEWAY_URL || config.api?.gateway || 'https://api.crysnovax.link';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || config.api?.gatewayToken || '';

module.exports = {
    name: "deepseek",
    alias: ["ds", "ask", "ai2"],
    category: "AI",
    desc: "Deepseek AI powered by CRYSNOVA",

    execute: async (sock, m, { args, reply }) => {
        const jid = m.chat;
        const query = args.join(" ").trim();

        if (!query) {
            return reply("⚉ _*Please ask something*_.");
        }

        try {
            await sock.sendMessage(jid, { react: { text: "🤖", key: m.key } });

            // Call gateway /deepseek endpoint with token
            const response = await axios.post(
                `${GATEWAY_URL}/deepseek?token=${encodeURIComponent(GATEWAY_TOKEN)}`,
                { query },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 60000
                }
            );

            const data = response.data;

            if (data?.success && data?.message?.content) {
                await sock.sendMessage(jid, {
                    text: data.message.content
                }, { quoted: m });
            } else {
                reply("✘ *Deepseek response failed*.");
            }

            await sock.sendMessage(jid, { react: { text: "💬", key: m.key } });

        } catch (err) {
            console.error("Deepseek Plugin Error:", err.message);
            reply("`❔ AI service error.`");
        }
    }
};
