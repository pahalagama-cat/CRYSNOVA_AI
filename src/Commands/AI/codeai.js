const axios = require('axios');
const config = require('../../../settings/config');

const GATEWAY_URL = config.api?.gateway || 'https://api.crysnovax.link';
const GATEWAY_TOKEN = config.api?.gatewayToken || '';

module.exports = {
    name: 'codeai',
    alias: ['advancedcode', 'codegen'],
    desc: 'Generate advanced code with AI',
    category: 'AI',
    usage: '.codeai <prompt>',

    execute: async (sock, m, { args, reply }) => {
        const prompt = args.join(' ').trim();
        if (!prompt) return reply('ಠ_ಠ _*Describe the code you need*_');

        try {
            await sock.sendMessage(m.chat, { react: { text: '💻', key: m.key } });
            
            const res = await axios.get(`${GATEWAY_URL}/ai/code-advanced?token=${GATEWAY_TOKEN}&text=${encodeURIComponent(prompt)}`);
            const data = res.data;
            
            // Extract code from various possible fields
            let code = data?.code || data?.result || data?.response || data?.output || data?.text || data;
            
            if (typeof code === 'object' && code !== null) {
                code = code.content || code.code || code.result || JSON.stringify(code, null, 2);
            }
            
            if (!code || code === '[object Object]') {
                return reply('✘ No code generated.');
            }
            
            await sock.sendMessage(m.chat, {
                text: `𖣘 *CODE GENERATOR*\n\n\`\`\`\n${code}\n\`\`\`\n\n_⚉ CRYSNOVA Gateway_`
            }, { quoted: m });
            
            await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
        } catch (err) {
            console.error('[CODEAI]', err.message);
            reply('✘ Code generation failed');
        }
    }
};