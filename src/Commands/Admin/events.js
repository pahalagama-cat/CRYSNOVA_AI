// © 2026 CRYSNOVA AI V2.0 - All Rights Reserved.

const fs = require('fs');
const path = './database/groupEvents.json';

if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify({}));

module.exports = {
    name: 'events',
    alias: [],
    desc: '⚉ Toggle Group Events System ⚉',
    category: 'group',
    group: true,
    admin: true,
    owner: true,

    execute: async (sock, m, { reply }) => {
        try {
            const args = m.body.trim().split(/\s+/);
            const option = args[1]?.toLowerCase();

            const db = JSON.parse(fs.readFileSync(path));
            if (!db[m.chat]) db[m.chat] = { 
                enabled: false, 
                welcomeEnabled: false, 
                goodbyeEnabled: false, 
                welcome: null, 
                goodbye: null 
            };

            if (!option) {
                return await reply(
`⟁⃝  *GROUP EVENTS SYSTEM* 

Usage:  
.events on  
.events off  
.events welcome  
.events goodbye

Available Features:  
❏• Premium Welcome Card  
❏• Goodbye Messages  
❏• Editable Welcome Text  
❏• Member Count Display  
❏• Join Time Display  
❏• @User Tagging  
❏• Online Tracker`
                );
            }

            if (option === 'on') {
                db[m.chat].enabled = true;
                db[m.chat].welcomeEnabled = true;
                db[m.chat].goodbyeEnabled = true;
                fs.writeFileSync(path, JSON.stringify(db, null, 2));
                return await reply('_*✓ Group Events Enabled (Welcome + Goodbye)!*_');
            }

            if (option === 'off') {
                db[m.chat].enabled = false;
                db[m.chat].welcomeEnabled = false;
                db[m.chat].goodbyeEnabled = false;
                fs.writeFileSync(path, JSON.stringify(db, null, 2));
                return await reply('_*✘ Group Events Disabled!*_');
            }

            if (option === 'welcome') {
                db[m.chat].enabled = true;
                db[m.chat].welcomeEnabled = true;
                db[m.chat].goodbyeEnabled = false;
                fs.writeFileSync(path, JSON.stringify(db, null, 2));
                return await reply('_*✓ Welcome Only Mode Enabled!*_');
            }

            if (option === 'goodbye') {
                db[m.chat].enabled = true;
                db[m.chat].welcomeEnabled = false;
                db[m.chat].goodbyeEnabled = true;
                fs.writeFileSync(path, JSON.stringify(db, null, 2));
                return await reply('_*✓ Goodbye Only Mode Enabled!*_');
            }

            return await reply('✘ *Invalid option!* Use "on", "off", "welcome", or "goodbye"𓄄');
        } catch (e) {
            console.error('Events Plugin Error:', e);
            return await reply('✘ *Something went wrong!* 𓄄');
        }
    }
};