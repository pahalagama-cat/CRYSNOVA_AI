const axios = require('axios');

module.exports = {
    name: 'livematch',
    alias: ['live', 'match', 'football'],
    desc: 'Get live football match scores',
    category: 'Sports',
    usage: '.livematch [team] | .livematch premier | .livematch barcelona',
    reactions: { start: '⚽', success: '✨', error: '❔' },

    execute: async (sock, m, { args, reply, prefix }) => {
        try {
            const teamFilter = args.join(' ') || '';
            
            await sock.sendMessage(m.chat, { react: { text: '⚽', key: m.key } });

            const url = `https://livematch.crysnovax.workers.dev/?team=${encodeURIComponent(teamFilter)}`;
            const res = await axios.get(url, {
                headers: { 'Accept': 'application/json' },
                timeout: 15000
            });

            const matches = res.data;

            if (!matches || matches.length === 0) {
                await sock.sendMessage(m.chat, { react: { text: '💤', key: m.key } });
                return reply(`\`⚽ No live matches found${teamFilter ? ` for "${teamFilter}"` : ''}\``);
            }

            // If no filter, show top 10 popular matches
            const displayMatches = teamFilter ? matches : matches.slice(0, 10);

            if (displayMatches.length === 1) {
                // Single match - detailed view
                const m = displayMatches[0];
                
                await sock.sendMessage(m.chat, {
                    headerText: `## ⚽ ${m.team1} vs ${m.team2}`,
                    contentText: '---',
                    title: '📊 Match Details',
                    table: [
                        ['🏆 League', m.league || 'N/A'],
                        ['📊 Status', m.status || 'N/A'],
                        ['⚽ Score', m.score || '0 - 0'],
                        ['⏱️ Time', m.time || 'N/A']
                    ],
                    footerText: '💡 Live scores • Powered by CRYSNOVA AI'
                }, { quoted: m });
            } else {
                // Multiple matches - table view
                const tableData = [['#', '⚽ Match', '🏆 League', '📊 Score']];
                
                for (let i = 0; i < displayMatches.length; i++) {
                    const match = displayMatches[i];
                    const teams = `${match.team1.slice(0, 12)} vs ${match.team2.slice(0, 12)}`;
                    const league = (match.league || 'N/A').slice(0, 15);
                    const score = match.score || '0 - 0';
                    
                    tableData.push([`${i + 1}`, teams, league, score]);
                }

                const headerText = teamFilter 
                    ? `## ⚽ Results for "${teamFilter}"`
                    : `## ⚽ Live Matches`;

                await sock.sendMessage(m.chat, {
                    headerText: headerText,
                    contentText: '---',
                    title: `📊 ${displayMatches.length} Match${displayMatches.length > 1 ? 'es' : ''}`,
                    table: tableData,
                    footerText: `💡 SWIPE ⇆ • Use ${prefix}livematch <team> to search`
                }, { quoted: m });
            }

            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });

        } catch (err) {
            console.error('[LIVEMATCH ERROR]', err.message);
            await sock.sendMessage(m.chat, { react: { text: '🙊', key: m.key } });
            reply('`✘ Failed to fetch live matches`');
        }
    }
};
