const fetch = require('node-fetch');

module.exports = {
    name: 'ginfo',
    alias: ['groupinfo', 'gi'],
    desc: 'Get the group full details — name, link, and description',
    category: 'Admin',
    usage: '_⎔ .ginfo_',
    admin: false,  // Anyone can use, but bot needs admin to get link
    group: true,

    execute: async (sock, m, { reply }) => {
        if (!m.isGroup) {
            return reply('`⟁⃝ GROUP ONLY! ℘`');
        }

        try {
            // Fetch group metadata
            let metadata;
            try {
                metadata = await sock.groupMetadata(m.chat);
            } catch (e) {
                console.error('[GINFO METADATA]', e?.message || e);
                return reply('`𓉤 Failed to fetch group info`');
            }

            const groupName = metadata?.subject || 'Unknown Group';
            const desc = metadata?.desc || '_No description set_';
            const participants = metadata?.participants?.length || 0;
            const owner = metadata?.owner?.split('@')[0] || 'Unknown';

            // Try to get invite code (bot needs admin)
            let inviteLink = null;
            let linkStatus = '_✘ Bot is not admin — cannot fetch invite link_';

            try {
                const code = await sock.groupInviteCode(m.chat);
                if (code) {
                    inviteLink = `https://chat.whatsapp.com/${code}?mode=gi_t`;
                    linkStatus = null;
                }
            } catch (err) {
                console.error('[GINFO INVITE]', err?.message || err);
            }

            // Thumbnail
            let thumbnail = null;
            try {
                const pp = await sock.profilePictureUrl(m.chat, 'image');
                thumbnail = await fetch(pp).then(r => r.buffer());
            } catch {}

            // Build info text
            const infoText = `*⟁⃝  GROUP INFORMATION —͟͟͞͞𖣘*\n\n` +
                           `*Name:* ${groupName}\n` +
                           `*Members:* ${participants}\n` +
                           `*Owner:* ${owner}\n` +
                           `*Description:* ${desc}\n` +
                           (linkStatus ? `\n${linkStatus}\n` : '');

            // Send info text
            await sock.sendMessage(m.chat, { text: infoText }, { quoted: m });

            // Send invite link with rich preview if available
            if (inviteLink) {
                await sock.sendMessage(m.chat, {
                    extendedTextMessage: {
                        text: inviteLink,
                        matchedText: inviteLink,
                        canonicalUrl: inviteLink,
                        title: groupName,
                        description: 'WhatsApp Group Invite',
                        previewType: 1,
                        jpegThumbnail: thumbnail
                    },
                    raw: true
                });
            }

        } catch (e) {
            console.error('[GINFO ERROR]', e);
            reply(`𓆉 Error: ${e.message}`);
        }
    }
};
        
