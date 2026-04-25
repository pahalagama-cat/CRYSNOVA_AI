const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BACKUP_API = 'https://bak.crysnovax.link';
const backupSession = new Map();
const restoreSession = new Map();

// ==================== BACKUP ====================
const backupCmd = {
    name: 'backup',
    alias: ['savebackup', 'cloudbackup'],
    desc: 'Backup your database and settings to the cloud',
    category: 'Owner',
    ownerOnly: true,
    usage: '.backup start | number= | code= | push',
    reactions: { start: '💾', success: '🥀', error: '❔' },

    execute: async (sock, m, { args, reply, prefix }) => {
        const userId = m.sender;
        const fullText = args.join(' ').trim();
        
        if (!backupSession.has(userId)) {
            backupSession.set(userId, { phone: '', password: '' });
        }
        const session = backupSession.get(userId);

        // START
        if (fullText === 'start' || fullText === '') {
            backupSession.set(userId, { phone: '', password: '' });
            return reply(
                `💾 *CLOUD BACKUP*\n\n` +
                `📱 Step 1: ${prefix}backup number=2348077528901\n` +
                `🔐 Step 2: ${prefix}backup code=password\n` +
                `🚀 Step 3: ${prefix}backup push`
            );
        }

        // NUMBER
        if (fullText.startsWith('number=')) {
            const phone = fullText.split('=')[1].replace(/[^0-9]/g, '');
            if (phone.length < 7) return reply('`✘ Invalid phone`');
            
            try {
                const res = await axios.post(`${BACKUP_API}/backup/exists`, { phone });
                session.phone = phone;
                backupSession.set(userId, session);
                
                if (res.data.exists) {
                    const date = new Date(res.data.timestamp).toLocaleString();
                    return reply(
                        `📱 ${phone}\n\n` +
                        `⚠️ *Existing backup found!*\n` +
                        `📅 ${date}\n\n` +
                        `🔐 ${prefix}backup code=password\n` +
                        `_(Will overwrite existing backup)_`
                    );
                }
                return reply(`📱 ${phone} ✅\n🔐 ${prefix}backup code=password`);
            } catch (err) {
                return reply(`❌ API Error: ${err.message}`);
            }
        }

        // CODE
        if (fullText.startsWith('code=')) {
            const password = fullText.split('=').slice(1).join('=');
            if (password.length < 3) return reply('`✘ Min 3 characters`');
            session.password = password;
            backupSession.set(userId, session);
            return reply(`🔐 Password set!\n🚀 ${prefix}backup push`);
        }

        // PUSH
        if (fullText === 'push') {
            if (!session.phone) return reply('`✘ .backup number=234xxx first`');
            if (!session.password) return reply('`✘ .backup code=password first`');

            await sock.sendMessage(m.chat, { react: { text: '💾', key: m.key } });

            const progressMsg = await sock.sendMessage(m.chat, {
                text: `💾 *Uploading Backup...*\n\n▰▱▱▱▱▱▱▱▱▱ 0%\n\n📂 Reading files...`
            });

            try {
                const updateProgress = async (pct, phase) => {
                    const filled = Math.round(pct / 10);
                    const bar = '▰'.repeat(filled) + '▱'.repeat(10 - filled);
                    await sock.sendMessage(m.chat, {
                        text: `💾 *Uploading Backup...*\n\n${bar} ${pct}%\n\n📂 ${phase}`,
                        edit: progressMsg.key
                    });
                };

                await updateProgress(10, 'Reading database...');

                const dbDir = path.join(process.cwd(), 'database');
                const dbFiles = {};
                if (fs.existsSync(dbDir)) {
                    const files = fs.readdirSync(dbDir);
                    for (const file of files) {
                        if (file.endsWith('.json')) {
                            const content = fs.readFileSync(path.join(dbDir, file), 'utf8');
                            try { dbFiles[file] = JSON.parse(content); } catch (e) { dbFiles[file] = content; }
                        }
                    }
                }

                await updateProgress(40, 'Reading .env...');
                let envContent = '';
                const envPath = path.join(process.cwd(), '.env');
                if (fs.existsSync(envPath)) envContent = fs.readFileSync(envPath, 'utf8');

                await updateProgress(60, 'Encrypting...');
                const backupData = { database: dbFiles, env: envContent, timestamp: Date.now() };

                await updateProgress(80, 'Uploading...');
                const saveRes = await axios.post(`${BACKUP_API}/backup/save`, {
                    phone: session.phone,
                    password: session.password,
                    data: backupData
                }, { timeout: 30000 });

                await updateProgress(100, 'Done!');

                const summary = 
                    `✅ *BACKUP SAVED!*\n\n` +
                    `📱 Phone: ${session.phone}\n` +
                    `📂 Database files: ${Object.keys(dbFiles).length}\n` +
                    `📝 .env: ${envContent ? '✅ Backed up' : '❌ Not found'}\n` +
                    `📏 Size: ${saveRes.data.sizeFormatted || (saveRes.data.size / 1024).toFixed(1) + ' KB'}\n\n` +
                    `💡 Use *.restore* on any new deployment!`;

                await sock.sendMessage(m.chat, { text: summary, edit: progressMsg.key });
                await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

            } catch (err) {
                console.error('[BACKUP]', err.message);
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                await sock.sendMessage(m.chat, { text: `❌ *Failed*\n\n${err.response?.data?.error || err.message}`, edit: progressMsg.key });
            }

            backupSession.delete(userId);
            return;
        }

        return reply(`${prefix}backup start\n${prefix}backup number=234xxx\n${prefix}backup code=pass\n${prefix}backup push`);
    }
};

// ==================== RESTORE ====================
const restoreCmd = {
    name: 'restore',
    alias: ['loadbackup', 'cloudrestore'],
    desc: 'Restore your database and settings from cloud backup',
    category: 'Owner',
    ownerOnly: true,
    usage: '.restore start | number= | code= | push',
    reactions: { start: '📥', success: '✅', error: '❔' },

    execute: async (sock, m, { args, reply, prefix }) => {
        const userId = m.sender;
        const fullText = args.join(' ').trim();
        
        if (!restoreSession.has(userId)) {
            restoreSession.set(userId, { phone: '', password: '' });
        }
        const session = restoreSession.get(userId);

        // START
        if (fullText === 'start' || fullText === '') {
            restoreSession.set(userId, { phone: '', password: '' });
            return reply(
                `📥 *CLOUD RESTORE*\n\n` +
                `📱 Step 1: ${prefix}restore number=2348077528901\n` +
                `🔐 Step 2: ${prefix}restore code=password\n` +
                `🚀 Step 3: ${prefix}restore push`
            );
        }

        // NUMBER
        if (fullText.startsWith('number=')) {
            const phone = fullText.split('=')[1].replace(/[^0-9]/g, '');
            if (phone.length < 7) return reply('`✘ Invalid phone`');
            
            try {
                const res = await axios.post(`${BACKUP_API}/backup/exists`, { phone });
                
                if (!res.data.exists) {
                    restoreSession.delete(userId);
                    return reply(`❌ *No backup found for ${phone}*`);
                }

                session.phone = phone;
                const date = new Date(res.data.timestamp).toLocaleString();
                restoreSession.set(userId, session);
                
                return reply(
                    `✅ *Backup found!*\n\n` +
                    `📱 Phone: ${phone}\n` +
                    `📅 Date: ${date}\n` +
                    `📏 Size: ${res.data.sizeFormatted || 'N/A'}\n\n` +
                    `🔐 ${prefix}restore code=password`
                );
            } catch (err) {
                return reply(`❌ API Error: ${err.message}`);
            }
        }

        // CODE
        if (fullText.startsWith('code=')) {
            const password = fullText.split('=').slice(1).join('=');
            if (!password) return reply('`✘ Enter password`');
            session.password = password;
            restoreSession.set(userId, session);
            return reply(
                `🔐 Password set!\n\n` +
                `📱 *${session.phone}*\n\n` +
                `🚀 ${prefix}restore push\n\n` +
                `⚠️ *This will overwrite your current files!*`
            );
        }

        // PUSH
        if (fullText === 'push') {
            if (!session.phone) return reply('`✘ .restore number=234xxx first`');
            if (!session.password) return reply('`✘ .restore code=password first`');

            await sock.sendMessage(m.chat, { react: { text: '📥', key: m.key } });

            const progressMsg = await sock.sendMessage(m.chat, {
                text: `📥 *Restoring Backup...*\n\n▰▱▱▱▱▱▱▱▱▱ 0%\n\n🔓 Decrypting...`
            });

            try {
                const updateProgress = async (pct, phase) => {
                    const filled = Math.round(pct / 10);
                    const bar = '▰'.repeat(filled) + '▱'.repeat(10 - filled);
                    await sock.sendMessage(m.chat, {
                        text: `📥 *Restoring Backup...*\n\n${bar} ${pct}%\n\n🔓 ${phase}`,
                        edit: progressMsg.key
                    });
                };

                await updateProgress(20, 'Downloading...');

                const loadRes = await axios.post(`${BACKUP_API}/backup/load`, {
                    phone: session.phone,
                    password: session.password
                }, { timeout: 30000 });

                if (!loadRes.data.data) throw new Error('No data received');

                const backupData = loadRes.data.data;

                await updateProgress(50, 'Restoring database...');

                let dbCount = 0;
                if (backupData.database) {
                    const dbDir = path.join(process.cwd(), 'database');
                    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
                    
                    for (const [filename, content] of Object.entries(backupData.database)) {
                        const filePath = path.join(dbDir, filename);
                        const data = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
                        fs.writeFileSync(filePath, data, 'utf8');
                        dbCount++;
                    }
                }

                await updateProgress(75, 'Restoring .env...');

                if (backupData.env) {
                    fs.writeFileSync(path.join(process.cwd(), '.env'), backupData.env, 'utf8');
                }

                await updateProgress(100, 'Done! Restarting...');

                const summary = 
                    `✅ *RESTORE COMPLETE!*\n\n` +
                    `📱 Phone: ${session.phone}\n` +
                    `📂 Database files: ${dbCount}\n` +
                    `📝 .env: ${backupData.env ? '✅ Restored' : '⚠️ Not in backup'}\n\n` +
                    `🔄 *Rebooting bot in 3 seconds...*`;

                await sock.sendMessage(m.chat, { text: summary, edit: progressMsg.key });
                await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

                setTimeout(() => process.exit(0), 3000);

            } catch (err) {
                console.error('[RESTORE]', err.message);
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                
                const msg = err.response?.status === 400 ? '🔐 Wrong password!' : err.message;
                await sock.sendMessage(m.chat, { text: `❌ *Failed*\n\n${msg}`, edit: progressMsg.key });
            }

            restoreSession.delete(userId);
            return;
        }

        return reply(`${prefix}restore start\n${prefix}restore number=234xxx\n${prefix}restore code=pass\n${prefix}restore push`);
    }
};

// ==================== EXPORT ====================
module.exports = [backupCmd, restoreCmd];
