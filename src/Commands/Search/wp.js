const axios = require('axios');

module.exports = [{
    name: 'wallpaper',
    alias: ['wp', 'wall', 'bg'],
    category: 'Search',
    desc: 'Search and send wallpapers',
    usage: '.wallpaper <query>',
    reactions: { start: '🖼️', success: '✨' },
    
    execute: async (sock, m, { args, reply }) => {
        const query = args.join(' ').trim();
        if (!query) return reply('`×͜× Provide a wallpaper search query ×͜×`');
        
        try {
            await sock.sendMessage(m.chat, { 
                react: { text: '🖼️', key: m.key } 
            });
            
            // Use YOUR Worker API
            const res = await axios.get(`https://wallpaper.crysnovax.link/api/search?query=${encodeURIComponent(query)}`);
            const results = res.data?.results;
            
            if (!Array.isArray(results) || results.length === 0) {
                return reply(`\`×͜× No wallpapers found for "${query}" ×͜×\``);
            }
            
            // Send first wallpaper with caption
            await sock.sendMessage(m.chat, {
                image: { url: results[0].proxy },
                caption: `🖼️ *Wallpaper: ${query}*\n📸 *1 of ${results.length}*`
            }, { quoted: m });
            
            // Send 4 more wallpapers
            for (let i = 1; i < Math.min(results.length, 5); i++) {
                await sock.sendMessage(m.chat, {
                    image: { url: results[i].proxy },
                    caption: `🖼️ *${query}* [${i + 1}/${results.length}]`
                }, { quoted: m });
                await new Promise(r => setTimeout(r, 500));
            }
            
            // Show remaining count
        //    if (results.length > 5) {
        //        await sock.sendMessage(m.chat, {
       //             text: `📋 *+${results.length - 5} more wallpapers available*\n🔍 *Query:* ${query}\n📸 *Total:* ${results.length} results\n\n_Use .wp ${query} again for fresh results_`
         //       }, { quoted: m });
      //      }
            
            await sock.sendMessage(m.chat, { 
                react: { text: '✨', key: m.key } 
            });
            
        } catch (err) {
            console.error('[WALLPAPER]', err.message);
            reply('`×͜× Wallpaper search failed ×͜×`');
        }
    }
}];
