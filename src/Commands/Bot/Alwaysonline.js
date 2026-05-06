const fs = require('fs');
const path = require('path');

const STATUS_FILE = path.join(__dirname, '../../../database/always-online.json');

let alwaysOnlineEnabled = true; // ON by default

try {
    if (fs.existsSync(STATUS_FILE)) {
        const data = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
        alwaysOnlineEnabled = data.enabled ?? true;
    }
} catch (e) {
    console.error('[Always Online] Load error:', e.message);
}

function saveStatus() {
    try {
        fs.mkdirSync(path.dirname(STATUS_FILE), { recursive: true });
        fs.writeFileSync(STATUS_FILE, JSON.stringify({ enabled: alwaysOnlineEnabled }, null, 2));
    } catch (e) {}
}

let presenceInterval = null;

function startPresenceLoop(sock) {
    if (presenceInterval) clearInterval(presenceInterval);

    presenceInterval = setInterval(async () => {
        try {
            await sock.sendPresenceUpdate('available');
            console.log('[Always Online] Presence refreshed');
        } catch (e) {
            console.error('[Presence Refresh Error]', e.message);
        }
    }, 60000);
}

function stopPresenceLoop() {
    if (presenceInterval) {
        clearInterval(presenceInterval);
        presenceInterval = null;
    }
}

if (alwaysOnlineEnabled) {
    setTimeout(() => {
        if (global.sock) {
            startPresenceLoop(global.sock);
        }
    }, 5000);
}

module.exports = {
    name: 'online',
    alias: ['alwaysonline', 'aonline', 'offline'],
    desc: 'Force bot to appear always online or turn it off',
    category: 'owner',
    usage: '.online   |   .offline   |   .online (check status)',
    owner: true,

    execute: async (sock, m, { args, reply }) => {
        const cmd = m.body.toLowerCase().split(/\s+/)[0].slice(1);

        if (cmd === 'online') {
            if (alwaysOnlineEnabled) {
                return reply('⚉ _Bot is already in_ *always online* _mode_');
            }

            alwaysOnlineEnabled = true;
            saveStatus();
            startPresenceLoop(sock);

            await reply(
                '—͟͟͞͞𖣘 `Always Online mode activated`\n\n' +
                '_*Bot will now appear online 24/7 while connected*_.\n\n' +
                '_Turn off with_: _.offline_'
            );

            await sock.sendMessage(m.chat, {
                react: { text: '👁️‍🗨️', key: m.key }
            });

        } else if (cmd === 'offline') {
            if (!alwaysOnlineEnabled) {
                return reply('𓊈𖣘𓊉 _*Always online mode is already off*_');
            }

            alwaysOnlineEnabled = false;
            saveStatus();
            stopPresenceLoop();

            await sock.sendPresenceUpdate('available');

            await reply(
                'ಠ_ಠ `Always Online mode disabled`\n\n' +
                '_*Bot now shows normal presence (online when active, unavailable when idle)*_.'
            );

            await sock.sendMessage(m.chat, {
                react: { text: '🐾', key: m.key }
            });

        } else {
            const status = alwaysOnlineEnabled ? '_*—͟͟͞͞𖣘 ON*_' : '_*𓊈𖣘𓊉 OFF*_';
            await reply(`Always Online mode: *${status}*\n\n` +
                        `_Use *.online* to enable_\n` +
                        `_Use *.offline* to disable_`);
        }
    }
};
