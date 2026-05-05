const axios = require('axios');
const config = require('../../../settings/config');
const ECO_API = process.env.ECO_API_URL || config.api?.economy || 'https://econ.crysnovax.link';

async function eco(endpoint, phone, body = {}) {
    const method = endpoint.startsWith('GET') ? 'get' : 'post';
    const url = ECO_API + endpoint.replace(/^(GET|POST) /, '');
    const options = { headers: { 'X-User-Phone': phone }, timeout: 15000 };
    return method === 'post' ? axios.post(url, body, options) : axios.get(url, options);
}

async function sendTable(sock, chat, header, title, rows, footer) {
    await sock.sendMessage(chat, {
        headerText: header,
        contentText: '---',
        title: title,
        table: rows,
        footerText: footer
    });
}

function myPhone(m) {
    return (m.sender || '').split('@')[0].replace(/[^0-9]/g, '');
}

// Cross-bot notification checker - polls KV every 2 seconds
async function checkCrossBotNotifications(sock) {
    try {
        const botNumber = (sock.user?.id || '').split(':')[0].replace(/[^0-9]/g, '');
        if (!botNumber) return;
        const res = await eco('GET /check-notifications', botNumber);
        const notifs = res.data.notifications || [];
        for (const notif of notifs) {
            const botJid = botNumber + '@s.whatsapp.net';
            const typeIcons = {
                'payment_received': '📥',
                'robbery_victim': '😱',
                'attack_defeat': '💀'
            };
            const icon = typeIcons[notif.type] || '🔔';
            await sock.sendMessage(botJid, {
                text: `${icon} *ECONOMY ALERT!*\n\n${notif.message}\n\nUse *.alerts* to view all.`
            }).catch(() => {});
        }
    } catch (e) {}
}

// Start notification checker - runs every 2 seconds
let notifInterval = null;
function startNotifChecker(sock) {
    if (notifInterval) clearInterval(notifInterval);
    checkCrossBotNotifications(sock);
    notifInterval = setInterval(() => checkCrossBotNotifications(sock), 2000);
}

const cmds = [];

// ==================== ACTIVATE ====================
cmds.push({
    name: 'economy', alias: ['ecoactivate'], category: 'Economy',
    desc: 'Activate your economy account', usage: '.economy activate <phone>',
    execute: async (sock, m, { args, reply, prefix }) => {
        const sub = args[0]?.toLowerCase();
        if (sub !== 'activate') {
            return reply(
                `╭─❍ *ECONOMY ACTIVATION*\n│\n` +
                `│ 💰 *Activate your account:*\n` +
                `│ ${prefix}economy activate <phone>\n│\n` +
                `│ ✪ *Example:*\n` +
                `│ ${prefix}economy activate 2348077528901\n│\n` +
                `│ ⚡ *Required before using commands!*\n` +
                `╰──────────────────`
            );
        }
        const phone = (args[1] || '').replace(/[^0-9]/g, '');
        if (!phone || phone.length < 7) return reply('`✘ Phone number required`');
        await sock.sendMessage(m.chat, { react: { text: '💰', key: m.key } });
        try {
            const res = await eco('POST /activate', phone);
            await sendTable(sock, m.chat,
                '## 💰 Economy Activated!',
                '✅ Welcome!',
                [
                    ['📱 Phone', phone],
                    ['🪙 Starting Balance', '1,000 coins'],
                    ['🏦 Bank', '0 coins'],
                    ['💡 Commands', '.balance | .work | .fish | .rob | .pay']
                ],
                '💡 Use .help economy for all commands!'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Activation failed'}\``);
        }
    }
});

// ==================== BALANCE ====================
cmds.push({
    name: 'balance', alias: ['bal', 'wallet'], category: 'Economy',
    desc: 'Check your wallet and bank balance', usage: '.balance',
    reactions: { start: '💰', success: '💡', error: '❔' },
    execute: async (sock, m, { reply }) => {
        const phone = myPhone(m);
        await sock.sendMessage(m.chat, { react: { text: '💰', key: m.key } });
        try {
            const res = await eco('GET /balance', phone);
            const { balance, bank, total, level, xp } = res.data;
            await sendTable(sock, m.chat,
                `## 💰 ${phone}'s Wallet`,
                '💱 Balance',
                [
                    ['💰 Wallet', `${balance.toLocaleString()} coins`],
                    ['🏦 Bank', `${bank.toLocaleString()} coins`],
                    ['💎 Total', `${(total || balance + bank).toLocaleString()} coins`],
                    ['⭐ Level', `Level ${level}`],
                    ['✨ XP', `${xp || 0} XP`]
                ],
                '🔒 Bank money is SAFE from robbery! | .deposit | .withdraw'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            if (err.response?.status === 404 || err.response?.data?.error?.includes('not')) {
                return reply('`✘ Economy not activated! Use .economy activate <phone>`');
            }
            reply(`\`✘ ${err.response?.data?.error || 'Failed to fetch balance'}\``);
        }
    }
});

// ==================== DEPOSIT ====================
cmds.push({
    name: 'deposit', alias: ['dep'], category: 'Economy',
    desc: 'Deposit money into your bank (safe from robbery)', usage: '.deposit <amount>',
    reactions: { start: '🏦', success: '✨', error: '❔' },
    execute: async (sock, m, { args, reply }) => {
        const phone = myPhone(m);
        const amount = parseInt(args[0]);
        if (!amount || amount <= 0) return reply('`✘ .deposit <amount>`');
        await sock.sendMessage(m.chat, { react: { text: '🏦', key: m.key } });
        try {
            const res = await eco('POST /deposit', phone, { amount });
            await sendTable(sock, m.chat,
                '## 🏦 Deposit Successful',
                '✅ Funds Secured',
                [
                    ['💰 Amount', `${amount.toLocaleString()} coins`],
                    ['👝 Wallet', `${res.data.balance.toLocaleString()} coins`],
                    ['🏦 Bank', `${res.data.bank.toLocaleString()} coins`]
                ],
                '🔒 Money in bank CANNOT be stolen!'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Deposit failed'}\``);
        }
    }
});

// ==================== WITHDRAW ====================
cmds.push({
    name: 'withdraw', alias: ['with', 'wdraw'], category: 'Economy',
    desc: 'Withdraw money from your bank', usage: '.withdraw <amount>',
    reactions: { start: '🏦', success: '✨', error: '❔' },
    execute: async (sock, m, { args, reply }) => {
        const phone = myPhone(m);
        const amount = parseInt(args[0]);
        if (!amount || amount <= 0) return reply('`✘ .withdraw <amount>`');
        await sock.sendMessage(m.chat, { react: { text: '🏦', key: m.key } });
        try {
            const res = await eco('POST /withdraw', phone, { amount });
            await sendTable(sock, m.chat,
                '## 🏦 Withdrawal Successful',
                '✅ Funds Released',
                [
                    ['💰 Amount', `${amount.toLocaleString()} coins`],
                    ['👛 Wallet', `${res.data.balance.toLocaleString()} coins`],
                    ['🏦 Bank', `${res.data.bank.toLocaleString()} coins`]
                ],
                '💡 Keep some in the bank for safety!'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Withdrawal failed'}\``);
        }
    }
});

// ==================== PAY ====================
cmds.push({
    name: 'pay', alias: ['send', 'transfer'], category: 'Economy',
    desc: 'Pay coins to another user by phone number', usage: '.pay <phone>=<amount>',
    reactions: { start: '💸', success: '✨', error: '❔' },
    execute: async (sock, m, { args, reply }) => {
        const senderPhone = myPhone(m);
        const input = args.join(' ').replace(/\s/g, '');
        const match = input.match(/^(\d{7,15})=(\d+)$/);
        if (!match) return reply('`✘ Format: .pay 2348077528901=500`');
        const targetPhone = match[1];
        const amount = parseInt(match[2]);
        if (!amount || amount <= 0) return reply('`✘ Amount must be positive`');
        if (targetPhone === senderPhone) return reply('`✘ Cannot pay yourself!`');
        await sock.sendMessage(m.chat, { react: { text: '💸', key: m.key } });
        try {
            const res = await eco('POST /pay', senderPhone, { to: targetPhone, amount });
            await sendTable(sock, m.chat,
                '## 💸 Payment Sent',
                '💱 Success',
                [
                    ['🪙 Amount', `${amount.toLocaleString()} coins`],
                    ['👤 To', targetPhone],
                    ['💰 Your Balance', `${res.data.senderBalance.toLocaleString()} coins`]
                ],
                '💡 Recipient will be notified!'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Payment failed'}\``);
        }
    }
});

// ==================== ROB ====================
cmds.push({
    name: 'rob', alias: ['extort', 'mug'], category: 'Economy',
    desc: 'Attempt to rob someone (wallet only, bank is safe)', usage: '.rob <phone>',
    reactions: { start: '😈', success: '✨', error: '❔' },
    execute: async (sock, m, { args, reply }) => {
        const robberPhone = myPhone(m);
        const targetPhone = (args[0] || '').replace(/[^0-9]/g, '');
        if (!targetPhone) return reply('`✘ .rob <phone>`');
        if (targetPhone === robberPhone) return reply('`✘ Cannot rob yourself!`');
        await sock.sendMessage(m.chat, { react: { text: '😈', key: m.key } });
        try {
            const res = await eco('POST /rob', robberPhone, { target: targetPhone });
            const d = res.data;
            if (d.success) {
                await sendTable(sock, m.chat,
                    '## 😈 Robbery Successful!',
                    '💰 Stolen',
                    [
                        ['🪙 Stolen', `${d.stolen.toLocaleString()} coins`],
                        ['👤 From', targetPhone],
                        ['💰 Your Balance', `${d.balance.toLocaleString()} coins`]
                    ],
                    '💡 Victim will be notified via their bot!'
                );
                await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
            } else {
                await sendTable(sock, m.chat,
                    '## 🚔 Robbery Failed!',
                    '❌ Caught',
                    [
                        ['📝 Result', d.message],
                        ['💰 Your Balance', `${d.balance?.toLocaleString() || '?'} coins`]
                    ],
                    '🔒 Target\'s bank money is protected!'
                );
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            }
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Robbery failed'}\``);
        }
    }
});

// ==================== WORK ====================
cmds.push({
    name: 'work', alias: ['job', 'earn'], category: 'Economy',
    desc: 'Work a random job to earn coins and XP', usage: '.work',
    reactions: { start: '💼', success: '✨', error: '❔' },
    execute: async (sock, m, { reply }) => {
        const phone = myPhone(m);
        await sock.sendMessage(m.chat, { react: { text: '💼', key: m.key } });
        try {
            const res = await eco('POST /work', phone);
            const d = res.data;
            const rows = [
                ['👔 Job', d.job || 'Worker'],
                ['🪙 Earned', `${d.earnings.toLocaleString()} coins`],
                ['✨ XP', `+${d.xpGain || '?'} XP`],
                ['⭐ Level', `Level ${d.level}`],
                ['💰 Balance', `${d.newBalance.toLocaleString()} coins`]
            ];
            if (d.levelUp) rows.push(['🎉 LEVEL UP!', `Now Level ${d.level}!`]);
            await sendTable(sock, m.chat,
                '## 💼 Work Complete!',
                '💰 Earnings',
                rows,
                d.levelUp ? '🎉 LEVEL UP! Keep grinding!' : '💡 Work more to level up! 2 min cooldown.'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Work failed'}\``);
        }
    }
});

// ==================== ECOROFILE ====================
cmds.push({
    name: 'ecoprofile', alias: ['eprofile', 'estats'], category: 'Economy',
    desc: 'View your full economy profile', usage: '.ecoprofile',
    execute: async (sock, m, { reply }) => {
        const phone = myPhone(m);
        try {
            const res = await eco('GET /profile', phone);
            const d = res.data;
            await sendTable(sock, m.chat,
                `## 👤 ${phone}'s Profile`,
                '📊 Economy Stats',
                [
                    ['💰 Wallet', `${d.balance.toLocaleString()} coins`],
                    ['🏦 Bank', `${d.bank.toLocaleString()} coins`],
                    ['💎 Total', `${d.total.toLocaleString()} coins`],
                    ['⭐ Level', `Level ${d.level}`],
                    ['✨ XP', `${d.xp}/${d.xpNeeded} XP`],
                    ['💪 Strength', d.stats?.strength || 0],
                    ['🍀 Luck', d.stats?.luck || 0],
                    ['🧠 Intelligence', d.stats?.intelligence || 0],
                    ['🎯 Faction', d.faction || 'None'],
                    ['🎒 Items', `${d.inventory || 0} items`],
                    ['📈 Investments', `${d.investments || 0} active`],
                    ['💳 Loan', d.loan ? `${d.loan.toLocaleString()} coins` : 'None'],
                    ['🔥 Daily Streak', `${d.dailyStreak || 0} days`],
                    ['🔔 Alerts', `${d.alerts || 0} unread`]
                ],
                '💡 Use .alerts to check notifications!'
            );
        } catch (err) {
            reply(`\`✘ ${err.response?.data?.error || 'Failed'}\``);
        }
    }
});

// ==================== ALERTS ====================
cmds.push({
    name: 'alerts', alias: ['notifications', 'notifs'], category: 'Economy',
    desc: 'View your transaction alerts', usage: '.alerts',
    execute: async (sock, m, { reply }) => {
        const phone = myPhone(m);
        try {
            const res = await eco('GET /alerts', phone);
            const alerts = res.data.alerts || [];
            if (!alerts.length) return reply('`🔔 No alerts! You\'re all clear.`');
            const typeIcons = {
                'payment_sent': '💸', 'payment_received': '📥',
                'robbery_success': '😈', 'robbery_victim': '😱', 'robbery_failed': '👮',
                'attack_victory': '⚔️', 'attack_defeat': '💀', 'attack_failed': '😵'
            };
            const rows = [['📅 Time', '📝 Alert']];
            alerts.slice(-10).reverse().forEach(a => {
                const time = new Date(a.time).toLocaleString();
                const icon = typeIcons[a.type] || '📢';
                rows.push([time, `${icon} ${a.message}`]);
            });
            await sendTable(sock, m.chat,
                '## 🔔 Transaction History',
                `📬 ${res.data.unreadCount || alerts.length} entries`,
                rows,
                '💡 Both parties get alerts for every transaction!'
            );
        } catch (err) {
            reply(`\`✘ ${err.response?.data?.error || 'Failed'}\``);
        }
    }
});

// ==================== LEADERBOARD ====================
cmds.push({
    name: 'leaderboard', alias: ['lb', 'top', 'richlist'], category: 'Economy',
    desc: 'View the richest players', usage: '.leaderboard',
    execute: async (sock, m, { reply }) => {
        try {
            const res = await eco('GET /admin/stats', '0');
            const users = (res.data.users || []).sort((a, b) => (b.balance + b.bank) - (a.balance + a.bank)).slice(0, 10);
            if (!users.length) return reply('`📊 No users yet!`');
            const rows = [['🏆 Rank', '👤 Phone', '💰 Wealth']];
            users.forEach((u, i) => {
                rows.push([`#${i + 1}`, u.phone, `${(u.balance + u.bank).toLocaleString()} coins`]);
            });
            await sendTable(sock, m.chat,
                '## 🏆 Richest Players',
                '💰 Top 10',
                rows,
                '💡 Work hard to climb the ranks!'
            );
        } catch (err) {
            reply('`✘ Failed to load leaderboard`');
        }
    }
});

// ==================== QUICK COMMANDS ====================
const quick = [
    { n: 'fish', a: ['fishing'], u: '.fish', d: 'Go fishing',
        f: async (s, m, p) => {
            const r = await eco('POST /fish', p);
            await s.sendMessage(m.chat, { text: r.data.message || `🎣 *${r.data.item}*\n💰 +${r.data.reward.toLocaleString()} coins` });
        }
    },
    { n: 'mine', a: ['mining'], u: '.mine', d: 'Mine for ores',
        f: async (s, m, p) => {
            const r = await eco('POST /mine', p);
            await s.sendMessage(m.chat, { text: r.data.message || `⛏️ *${r.data.ore}*\n💰 +${r.data.reward.toLocaleString()} coins` });
        }
    },
    { n: 'hunt', a: ['hunting'], u: '.hunt', d: 'Hunt animals',
        f: async (s, m, p) => {
            const r = await eco('POST /hunt', p);
            await s.sendMessage(m.chat, { text: r.data.message || `🏹 *${r.data.animal}*\n💰 +${r.data.reward.toLocaleString()} coins` });
        }
    },
    { n: 'beg', a: ['plead'], u: '.beg', d: 'Beg for coins',
        f: async (s, m, p) => {
            const r = await eco('POST /beg', p);
            await s.sendMessage(m.chat, { text: r.data.message || `🥺 Someone gave you *${r.data.reward} coins!*` });
        }
    },
    { n: 'crime', u: '.crime', d: 'Commit a crime',
        f: async (s, m, p) => {
            const r = await eco('POST /crime', p);
            await s.sendMessage(m.chat, { text: r.data.message || (r.data.success ? `🔫 Success! +${r.data.reward} coins` : `🚔 Busted!`) });
        }
    },
    { n: 'drugs', u: '.drugs', d: 'Deal drugs',
        f: async (s, m, p) => {
            const r = await eco('POST /drugs', p);
            await s.sendMessage(m.chat, { text: r.data.message || (r.data.success ? `💊 Profit! +${r.data.profit} coins` : `🚨 Busted!`) });
        }
    },
    { n: 'gamble', u: '.gamble <amount>', d: 'Gamble coins',
        f: async (s, m, p, a) => {
            const amt = parseInt(a[0]);
            if (!amt || amt <= 0) return s.sendMessage(m.chat, { text: '`✘ .gamble <amount>`' });
            const r = await eco('POST /gamble', p, { amount: amt });
            await s.sendMessage(m.chat, { text: r.data.message || (r.data.win ? `🎰 Won ${r.data.won} coins!` : `🎰 Lost ${r.data.lost} coins`) });
        }
    },
    { n: 'invest', u: '.invest <symbol> <amount>', d: 'Invest in stocks',
        f: async (s, m, p, a) => {
            const symbol = a[0]?.toUpperCase();
            const amt = parseInt(a[1]);
            if (!symbol || !amt) return s.sendMessage(m.chat, { text: '`✘ .invest <CRYP|TECH|OIL|GOLD|FOOD> <amount>`' });
            const r = await eco('POST /invest', p, { symbol, amount: amt });
            await s.sendMessage(m.chat, { text: r.data.message || `📈 Invested ${amt} in ${symbol}` });
        }
    },
    { n: 'sellinvest', a: ['sellstocks', 'cashout'], u: '.sellinvest', d: 'Sell stocks',
        f: async (s, m, p) => {
            const r = await eco('POST /sell-investments', p);
            await s.sendMessage(m.chat, { text: r.data.message || `📊 Sold! Return: ${r.data.totalReturn.toLocaleString()} coins` });
        }
    },
    { n: 'daily', u: '.daily', d: 'Daily reward',
        f: async (s, m, p) => {
            const r = await eco('POST /daily', p);
            await s.sendMessage(m.chat, { text: r.data.message || `📅 Daily: +${r.data.reward.toLocaleString()} coins` });
        }
    },
    { n: 'weekly', u: '.weekly', d: 'Weekly bonus',
        f: async (s, m, p) => {
            const r = await eco('POST /weekly', p);
            await s.sendMessage(m.chat, { text: r.data.message || `🎁 Weekly: +${r.data.reward.toLocaleString()} coins` });
        }
    },
    { n: 'attack', u: '.attack <phone>', d: 'Attack player',
        f: async (s, m, p, a) => {
            const t = (a[0] || '').replace(/[^0-9]/g, '');
            if (!t) return s.sendMessage(m.chat, { text: '`✘ .attack <phone>`' });
            const r = await eco('POST /attack', p, { target: t });
            await s.sendMessage(m.chat, { text: r.data.message || (r.data.win ? `⚔️ Victory! +${r.data.stolen.toLocaleString()} coins` : `💀 Defeat!`) });
        }
    },
    { n: 'gift', u: '.gift <phone> <amount>', d: 'Gift coins',
        f: async (s, m, p, a) => {
            const t = (a[0] || '').replace(/[^0-9]/g, '');
            const amt = parseInt(a[1]);
            if (!t || !amt) return s.sendMessage(m.chat, { text: '`✘ .gift <phone> <amount>`' });
            const r = await eco('POST /gift', p, { to: t, amount: amt });
            await s.sendMessage(m.chat, { text: `🎁 ${r.data.message || 'Gift sent!'}` });
        }
    },
    { n: 'loan', u: '.loan <amount>', d: 'Take loan',
        f: async (s, m, p, a) => {
            const amt = parseInt(a[0]);
            if (!amt) return s.sendMessage(m.chat, { text: '`✘ .loan <amount>`' });
            const r = await eco('POST /loan', p, { amount: amt });
            await s.sendMessage(m.chat, { text: r.data.message || `💳 Loan: ${r.data.loanAmount.toLocaleString()} coins` });
        }
    },
    { n: 'repayloan', a: ['payloan'], u: '.repayloan', d: 'Repay loan',
        f: async (s, m, p) => {
            const r = await eco('POST /repay-loan', p);
            await s.sendMessage(m.chat, { text: r.data.message || `✅ Loan repaid!` });
        }
    },
    { n: 'shop', u: '.shop', d: 'View shop',
        f: async (s, m) => {
            const r = await eco('GET /shop', '0');
            const rows = [['🛍️ Item', '💰 Price', '📝 Description']];
            r.data.shop.forEach(i => rows.push([i.name, `${i.price.toLocaleString()} coins`, i.description]));
            await sendTable(s, m.chat, '## 🛍️ Economy Shop', '🏪 Items', rows, '💡 .buy <item> | Stocks: CRYP TECH OIL GOLD FOOD');
        }
    },
    { n: 'buy', u: '.buy <item>', d: 'Buy item',
        f: async (s, m, p, a) => {
            const item = a.join('_').replace(/\s/g, '_');
            if (!item) return s.sendMessage(m.chat, { text: '`✘ .buy pickaxe`' });
            const r = await eco('POST /buy', p, { item });
            await s.sendMessage(m.chat, { text: `🛒 ${r.data.message || 'Purchased!'}` });
        }
    },
    { n: 'sell', u: '.sell <item>', d: 'Sell item',
        f: async (s, m, p, a) => {
            const item = a.join('_').replace(/\s/g, '_');
            if (!item) return s.sendMessage(m.chat, { text: '`✘ .sell pickaxe`' });
            const r = await eco('POST /sell', p, { item });
            await s.sendMessage(m.chat, { text: `💸 ${r.data.message || 'Sold!'}` });
        }
    },
    { n: 'inventory', a: ['inv'], u: '.inventory', d: 'View backpack',
        f: async (s, m, p) => {
            const r = await eco('GET /inventory', p);
            const items = r.data.inventory || [];
            if (!items.length) return s.sendMessage(m.chat, { text: '`🎒 Empty!`' });
            const rows = [['🎒 Item', '📦 Qty']];
            items.forEach(i => rows.push([i.name, i.quantity]));
            await sendTable(s, m.chat, '## 🎒 Inventory', '📦 Items', rows, '.sell <item>');
        }
    },
    { n: 'training', u: '.training <stat>', d: 'Train stats',
        f: async (s, m, p, a) => {
            const stat = a[0];
            if (!stat) return s.sendMessage(m.chat, { text: '`✘ .training strength|luck|intelligence`' });
            const r = await eco('POST /training', p, { stat });
            await s.sendMessage(m.chat, { text: `💪 ${r.data.message}\nStr: ${r.data.stats?.strength||0} | Luck: ${r.data.stats?.luck||0} | Int: ${r.data.stats?.intelligence||0}` });
        }
    },
    { n: 'levelup', u: '.levelup', d: 'Level up',
        f: async (s, m, p) => {
            const r = await eco('POST /levelup', p);
            await s.sendMessage(m.chat, { text: r.data.message || `⭐ Level ${r.data.level}!` });
        }
    },
    { n: 'travel', u: '.travel <dest>', d: 'Travel',
        f: async (s, m, p, a) => {
            const dest = a[0];
            if (!dest) return s.sendMessage(m.chat, { text: '`✘ city|forest|ocean|mountains`' });
            const r = await eco('POST /travel', p, { destination: dest });
            await s.sendMessage(m.chat, { text: `✈️ ${r.data.message || 'Travelled!'}` });
        }
    },
    { n: 'faction', u: '.faction <join/leave> <name>', d: 'Join faction',
        f: async (s, m, p, a) => {
            const action = a[0], faction = a[1];
            if (!action) return s.sendMessage(m.chat, { text: '`✘ .faction join|leave <thieves|hunters|miners>`' });
            const r = await eco('POST /faction', p, { action, faction });
            await s.sendMessage(m.chat, { text: r.data.message || `🎯 ${r.data.faction || 'None'}` });
        }
    }
];

quick.forEach(q => {
    cmds.push({
        name: q.n, alias: q.a || [], category: 'Economy', desc: q.d, usage: q.u,
        execute: async (sock, m, { args, reply }) => {
            const phone = myPhone(m);
            try {
                await q.f(sock, m, phone, args);
                await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                reply(`\`✘ ${err.response?.data?.error || 'Failed'}\``);
            }
        }
    });
});

module.exports = cmds;
module.exports.startNotifChecker = startNotifChecker;