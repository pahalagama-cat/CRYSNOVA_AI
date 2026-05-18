const axios = require('axios');

// ==================== COMMAND DEFINITIONS ====================

const commands = [
    {
        name: 'animehentai',
        alias: ['ahentai'],
        category: 'Random',
        desc: 'Random anime hentai image',
        endpoint: 'anhhentai',
        mediaType: 'image',
        reactions: { start: '🔞', success: '🎴' }
    },
    {
        name: 'animmoe',
        alias: ['amoe'],
        category: 'Random',
        desc: 'Random anime moe image',
        endpoint: 'anhmoe',
        mediaType: 'image',
        reactions: { start: '🌸', success: '✨' }
    },
    {
        name: 'boypic',
        alias: ['boy'],
        category: 'Random',
        desc: 'Random boy picture',
        endpoint: 'boypic',
        mediaType: 'image',
        reactions: { start: '👦', success: '📸' }
    },
    {
        name: 'animesfw',
        alias: ['asfw'],
        category: 'Random',
        desc: 'Random anime SFW image',
        endpoint: 'anhsfw',
        mediaType: 'image',
        reactions: { start: '🎨', success: '🖼️' }
    },
    {
        name: 'dog',
        alias: ['doggo', 'puppy'],
        category: 'Random',
        desc: 'Random dog picture',
        endpoint: 'dog',
        mediaType: 'image',
        reactions: { start: '🐕', success: '🐶' }
    },
    {
        name: 'car',
        alias: ['auto', 'vehicle'],
        category: 'Random',
        desc: 'Random car picture',
        endpoint: 'car',
        mediaType: 'image',
        reactions: { start: '🚗', success: '🏎️' }
    },
    {
        name: 'chinagirl',
        alias: ['cgirl'],
        category: 'Random',
        desc: 'Random Chinese girl picture',
        endpoint: 'chinagirl',
        mediaType: 'image',
        reactions: { start: '🇨🇳', success: '👩' }
    },
    {
        name: 'hijabgirl',
        alias: ['hgirl', 'hijabi'],
        category: 'Random',
        desc: 'Random hijab girl picture',
        endpoint: 'hijabgirl',
        mediaType: 'image',
        reactions: { start: '🧕', success: '✨' }
    },
    {
        name: 'randomgirl',
        alias: ['rgirl', 'girl'],
        category: 'Random',
        desc: 'Random girl picture',
        endpoint: 'randomgirl',
        mediaType: 'image',
        reactions: { start: '👧', success: '💃' }
    },
    {
        name: 'loli',
        alias: ['loligirl'],
        category: 'Random',
        desc: 'Random loli image',
        endpoint: 'loli',
        mediaType: 'image',
        reactions: { start: '🎀', success: '👧' }
    },
    {
        name: 'koreangirl',
        alias: ['kgirl', 'korean'],
        category: 'Random',
        desc: 'Random Korean girl picture',
        endpoint: 'koreangirl',
        mediaType: 'image',
        reactions: { start: '🇰🇷', success: '👩' }
    },
    {
        name: 'profilepic',
        alias: ['pp', 'pfp', 'avatar'],
        category: 'Random',
        desc: 'Random profile picture',
        endpoint: 'profilepic',
        mediaType: 'image',
        reactions: { start: '🖼️', success: '📷' }
    },
    {
        name: 'malaysiagirl',
        alias: ['mgirl', 'malay'],
        category: 'Random',
        desc: 'Random Malaysian girl picture',
        endpoint: 'malaysiagirl',
        mediaType: 'image',
        reactions: { start: '🇲🇾', success: '👩' }
    },
    {
        name: 'tiktokgirl',
        alias: ['tgirl', 'tiktok'],
        category: 'Random',
        desc: 'Random TikTok girl video',
        endpoint: 'tiktokgirl',
        mediaType: 'video',
        reactions: { start: '🎵', success: '📱' }
    },
    {
        name: 'thailandgirl',
        alias: ['tlgirl', 'thai'],
        category: 'Random',
        desc: 'Random Thailand girl picture',
        endpoint: 'thailandgirl',
        mediaType: 'image',
        reactions: { start: '🇹🇭', success: '👩' }
    },
    {
        name: 'vietnamgirl',
        alias: ['vgirl', 'viet'],
        category: 'Random',
        desc: 'Random Vietnam girl picture',
        endpoint: 'vietnamgirl',
        mediaType: 'image',
        reactions: { start: '🇻🇳', success: '👩' }
    }
];

// ==================== EXPORT ALL COMMANDS ====================

module.exports = commands.map(cmd => ({
    name: cmd.name,
    alias: cmd.alias,
    category: cmd.category,
    desc: cmd.desc,
    usage: `.${cmd.name}`,
    
    execute: async (sock, m, { reply }) => {
        try {
            // React start
            await sock.sendMessage(m.chat, { 
                react: { text: cmd.reactions.start, key: m.key } 
            });
            
            // Fetch directly as buffer — API returns raw image/video
            const res = await axios.get(`https://apis.prexzyvilla.site/random/${cmd.endpoint}`, {
                responseType: 'arraybuffer'
            });
            
            const buffer = Buffer.from(res.data);
            
            if (cmd.mediaType === 'video') {
                // TikTok girl video
                await sock.sendMessage(m.chat, {
                    video: buffer,
                    caption: `🎵 *Random TikTok Girl*`,
                    gifPlayback: false
                }, { quoted: m });
            } else {
                // Image
                await sock.sendMessage(m.chat, {
                    image: buffer,
                    caption: `✨ *${cmd.desc}*`
                }, { quoted: m });
            }
            
            // React success
            await sock.sendMessage(m.chat, { 
                react: { text: cmd.reactions.success, key: m.key } 
            });
            
        } catch (err) {
            console.error(`[${cmd.name}]`, err.message);
            reply(`\`×͜× ${cmd.name} failed ×͜×\``);
        }
    }
}));
