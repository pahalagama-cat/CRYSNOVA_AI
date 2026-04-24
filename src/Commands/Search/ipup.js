const axios = require('axios');

module.exports = {
    name: 'iplookup',
    alias: ['ip', 'ipinfo', 'iptrace', 'trackip'],
    desc: 'Get IP address information',
    category: 'Search',
    usage: '.iplookup [ip] or just .iplookup for yours',
    reactions: { start: '🌐', success: '🎭', error: '❔' },

    execute: async (sock, m, { args, reply, prefix }) => {
        const ip = args[0]?.trim();
        
        await sock.sendMessage(m.chat, { react: { text: '🌐', key: m.key } });

        try {
            const url = ip 
                ? `https://ipapi.co/${encodeURIComponent(ip)}/json/`
                : 'https://ipapi.co/json/';
            
            const res = await axios.get(url, {
                timeout: 10000,
                headers: { 'Accept': 'application/json' }
            });

            const data = res.data;
            
            if (data.error) {
                await sock.sendMessage(m.chat, { react: { text: '🏗️', key: m.key } });
                return reply(`\`✘ Invalid IP or lookup failed\``);
            }

            const tableData = [
                ['🌐 IP Address', data.ip],
                ['🏙️ City', data.city || 'N/A'],
                ['📍 Region', data.region || 'N/A'],
                ['🏛️ Country', `${data.country_name || 'N/A'} (${data.country || ''})`],
                ['📮 Postal', data.postal || 'N/A'],
                ['🌍 Coordinates', `${data.latitude || 'N/A'}, ${data.longitude || 'N/A'}`],
                ['⏰ Timezone', data.timezone || 'N/A'],
                ['📡 ISP', data.org || 'N/A'],
                ['💻 Network', data.network || 'N/A']
            ];

            await sock.sendMessage(m.chat, {
                headerText: `## 🌐 IP Lookup`,
                contentText: '---',
                title: `📊 ${data.ip}`,
                table: tableData,
                footerText: `💡 Try ${prefix}iplookup <ip> for other IPs`
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });

        } catch (error) {
            console.error('[IP ERROR]', error.message);
            await sock.sendMessage(m.chat, { react: { text: '🏗️', key: m.key } });
            reply('`✘ Failed to lookup IP`');
        }
    }
};
