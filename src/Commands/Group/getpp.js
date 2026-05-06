const axios = require('axios');

// Helper to extract target from mention or quoted message
function getTarget(m) {
    // From mentions
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentioned.length) return mentioned[0];
    
    // From quoted message
    const quoted = m.quoted;
    if (quoted) {
        return quoted.sender || quoted.participant;
    }
    
    return null;
}

// Helper to download and send PP
async function downloadAndSend(sock, target, chatToSend, caption = '', quoted = null) {
    try {
        const url = await sock.profilePictureUrl(target, 'image');
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        await sock.sendMessage(chatToSend, {
            image: Buffer.from(res.data),
            caption: caption || `_*@${target.split('@')[0]}*_`,
            mentions: [target]
        }, quoted ? { quoted } : {});
        return true;
    } catch {
        return false;
    }
}

module.exports = [
    // .getpp - Reply with tag/quote, sends to DM
    {
        name: 'getpp',
        alias: ['pp', 'profilepic'],
        desc: 'Download profile picture (sent to your DM)',
        category: 'Utils',
        reactions: { start: '😉', success: '✨' },
        
        execute: async (sock, m, { reply }) => {
            const target = getTarget(m);
            if (!target) return reply('✘ Tag a user or reply to their message!\nExample: .getpp @user');
            
            const success = await downloadAndSend(sock, target, m.sender, `_*@${target.split('@')[0]}'s Profile Picture*_`);
            if (success) {
                await reply(`( ͡❛ ₃ ͡❛) CHECK DM`);
            } else {
                await reply('_✘ Could not get profile picture! User may have privacy settings._');
            }
        }
    },
    
    // .getppc - Reply with tag/quote, sends to same chat
    {
        name: 'getppc',
        alias: ['ppc', 'pphere', 'profilepichere'],
        desc: 'Download profile picture (sent to this chat)',
        category: 'Utils',
        reactions: { start: '😉', success: '✨' },
        
        execute: async (sock, m, { reply }) => {
            const target = getTarget(m);
            if (!target) return reply('✘ Tag a user or reply to their message!\nExample: .getppc @user');
            
            const success = await downloadAndSend(sock, target, m.chat, `_*@${target.split('@')[0]}'s Profile Picture*_`, m);
            if (!success) {
                await reply('_✘ Could not get profile picture! User may have privacy settings._');
            }
        }
    },
    
    // .getppd - Reply with tag/quote, sends to DM directly (no "check DM" message)
    {
        name: 'getppd',
        alias: ['ppd', 'ppdirect', 'ppdm'],
        desc: 'Download profile picture (sent to your DM silently)',
        category: 'Utils',
        reactions: { start: '😉', success: '✨' },
        
        execute: async (sock, m, { reply }) => {
            const target = getTarget(m);
            if (!target) return reply('✘ Tag a user or reply to their message!\nExample: .getppd @user');
            
            const success = await downloadAndSend(sock, target, m.sender);
            if (!success) {
                await reply('_✘ Could not get profile picture! User may have privacy settings._');
            }
        }
    }
];
