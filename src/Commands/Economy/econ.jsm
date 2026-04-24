const axios = require('axios');
const config = require('../../../settings/config');

// Economy API configuration
const ECO_API = process.env.ECO_API_URL || config.api?.economy || 'https://econ.crysnovax.link';

// Helper: Call economy API
async function ecoCall(endpoint, jid, body = {}) {
    const method = endpoint.startsWith('GET') ? 'get' : 'post';
    const url = `${ECO_API}${endpoint.replace('GET ', '').replace('POST ', '')}`;
    
    const options = {
        headers: { 'X-User-JID': jid },
        timeout: 15000
    };

    if (method === 'post') {
        return axios.post(url, body, options);
    }
    return axios.get(url, options);
}

// Helper: Send table response
async function sendTable(sock, chat, header, title, tableRows, footer) {
    await sock.sendMessage(chat, {
        headerText: header,
        contentText: '---',
        title: title,
        table: tableRows,
        footerText: footer
    });
}

// Helper: Get target from mentions/reply/args (same pattern as promote)
function getTarget(m, args) {
    // Reply to a message
    if (m.quoted?.sender) {
        return m.quoted.sender;
    }

    // @mentions
    if (m.mentionedJid?.length) {
        return m.mentionedJid[0];
    }

    // Phone numbers from args
    for (const arg of args) {
        const num = arg.replace(/[^0-9]/g, '');
        if (num.length >= 7) {
            return num + '@s.whatsapp.net';
        }
    }

    return null;
}

// ==================== BALANCE ====================
const balanceCmd = {
    name: 'balance',
    alias: ['bal', 'wallet', 'eco'],
    desc: 'Check your wallet and bank balance',
    category: 'Economy',
    usage: '.balance',
    reactions: { start: '💰', success: '✨', error: '❔' },

    execute: async (sock, m, { reply }) => {
        await sock.sendMessage(m.chat, { react: { text: '💰', key: m.key } });
        try {
            const res = await ecoCall('GET /balance', m.sender);
            const { balance, bank } = res.data;
            
            await sendTable(sock, m.chat,
                `## 💰 Wallet`,
                '💰 Balance',
                [
                    ['👛 Wallet', `${balance.toLocaleString()} coins`],
                    ['🏦 Bank', `${bank.toLocaleString()} coins`],
                    ['💰 Total', `${(balance + bank).toLocaleString()} coins`]
                ],
                '💡 .deposit | .withdraw to manage funds'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply('`✘ Failed to fetch balance`');
        }
    }
};

// ==================== DEPOSIT ====================
const depositCmd = {
    name: 'deposit',
    alias: ['dep'],
    desc: 'Deposit money into your bank',
    category: 'Economy',
    usage: '.deposit <amount>',
    reactions: { start: '🏦', success: '✨', error: '❔' },

    execute: async (sock, m, { args, reply }) => {
        const amount = parseInt(args[0]);
        if (!amount || amount <= 0) return reply('`✘ .deposit <amount>`');
        
        await sock.sendMessage(m.chat, { react: { text: '🏦', key: m.key } });
        try {
            const res = await ecoCall('POST /deposit', m.sender, { amount });
            const { balance, bank } = res.data;
            
            await sendTable(sock, m.chat,
                `## 🏦 Deposit`,
                '✅ Transferred',
                [
                    ['💰 Amount', `${amount.toLocaleString()} coins`],
                    ['👛 Wallet', `${balance.toLocaleString()} coins`],
                    ['🏦 Bank', `${bank.toLocaleString()} coins`]
                ],
                '💡 Safe in the bank!'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Deposit failed'}\``);
        }
    }
};

// ==================== WITHDRAW ====================
const withdrawCmd = {
    name: 'withdraw',
    alias: ['with', 'wdraw'],
    desc: 'Withdraw money from your bank',
    category: 'Economy',
    usage: '.withdraw <amount>',
    reactions: { start: '🏦', success: '✨', error: '❔' },

    execute: async (sock, m, { args, reply }) => {
        const amount = parseInt(args[0]);
        if (!amount || amount <= 0) return reply('`✘ .withdraw <amount>`');
        
        await sock.sendMessage(m.chat, { react: { text: '🏦', key: m.key } });
        try {
            const res = await ecoCall('POST /withdraw', m.sender, { amount });
            const { balance, bank } = res.data;
            
            await sendTable(sock, m.chat,
                `## 🏦 Withdrawal`,
                '✅ Released',
                [
                    ['💰 Amount', `${amount.toLocaleString()} coins`],
                    ['👛 Wallet', `${balance.toLocaleString()} coins`],
                    ['🏦 Bank', `${bank.toLocaleString()} coins`]
                ],
                '💡 Keep some in the bank!'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Withdrawal failed'}\``);
        }
    }
};

// ==================== PAY ====================
const payCmd = {
    name: 'pay',
    alias: ['send', 'transfer', 'give'],
    desc: 'Pay coins to another user',
    category: 'Economy',
    usage: '.pay @user <amount>',
    reactions: { start: '💸', success: '✨', error: '❔' },

    execute: async (sock, m, { args, reply }) => {
        const target = getTarget(m, args);
        const amount = parseInt(args[0]);
        
        if (!target) return reply('`✘ Reply to message / tag user / type number`');
        if (!amount || amount <= 0) return reply('`✘ .pay <amount>`');
        if (target === m.sender) return reply('`✘ Cannot pay yourself!`');
        
        await sock.sendMessage(m.chat, { react: { text: '💸', key: m.key } });
        try {
            const res = await ecoCall('POST /pay', m.sender, { to: target, amount });
            const { senderBalance, recipientBalance } = res.data;
            
            await sendTable(sock, m.chat,
                `## 💸 Payment`,
                '✅ Sent!',
                [
                    ['💰 Amount', `${amount.toLocaleString()} coins`],
                    ['👤 To', `@${target.split('@')[0]}`],
                    ['👛 Your Balance', `${senderBalance.toLocaleString()} coins`]
                ],
                '💡 Money transferred!'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key }, mentions: [target] });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Payment failed'}\``);
        }
    }
};

// ==================== ROB ====================
const robCmd = {
    name: 'rob',
    alias: ['steal', 'mug'],
    desc: 'Attempt to rob another user',
    category: 'Economy',
    usage: '.rob @user',
    reactions: { start: '😈', success: '✨', error: '❔' },

    execute: async (sock, m, { args, reply }) => {
        const target = getTarget(m, args);
        if (!target) return reply('`✘ Reply / tag / number to rob`');
        if (target === m.sender) return reply('`✘ Cannot rob yourself!`');
        
        await sock.sendMessage(m.chat, { react: { text: '😈', key: m.key } });
        try {
            const res = await ecoCall('POST /rob', m.sender, { target });
            const data = res.data;
            
            if (data.success) {
                await sendTable(sock, m.chat,
                    `## 😈 Robbery!`,
                    '💰 Success',
                    [
                        ['💰 Stolen', `${data.stolen.toLocaleString()} coins`],
                        ['😈 From', `@${target.split('@')[0]}`]
                    ],
                    '💡 Watch your back!'
                );
            } else {
                await sendTable(sock, m.chat,
                    `## 🚔 Failed!`,
                    '❌ Caught',
                    [
                        ['📝 Result', data.message || 'You got caught!'],
                        ['💰 Penalty', 'Lost 50 coins']
                    ],
                    '💡 Train luck to succeed!'
                );
            }
            await sock.sendMessage(m.chat, { react: { text: data.success ? '🔖' : '❔', key: m.key }, mentions: [target] });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Robbery failed'}\``);
        }
    }
};

// ==================== WORK ====================
const workCmd = {
    name: 'work',
    alias: ['job', 'earn'],
    desc: 'Work to earn coins and XP',
    category: 'Economy',
    usage: '.work',
    reactions: { start: '💼', success: '✨', error: '❔' },

    execute: async (sock, m, { reply }) => {
        await sock.sendMessage(m.chat, { react: { text: '💼', key: m.key } });
        try {
            const res = await ecoCall('POST /work', m.sender);
            const { earnings, newBalance, level } = res.data;
            
            await sendTable(sock, m.chat,
                `## 💼 Work`,
                '💰 Earned',
                [
                    ['💰 Earned', `${earnings.toLocaleString()} coins`],
                    ['📊 Balance', `${newBalance.toLocaleString()} coins`],
                    ['⭐ Level', `Level ${level}`]
                ],
                '💡 Work more to level up!'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Work failed'}\``);
        }
    }
};

// ==================== FISH ====================
const fishCmd = {
    name: 'fish',
    alias: ['fishing', 'cast'],
    desc: 'Go fishing for rewards',
    category: 'Economy',
    usage: '.fish',
    reactions: { start: '🎣', success: '✨', error: '❔' },

    execute: async (sock, m, { reply }) => {
        await sock.sendMessage(m.chat, { react: { text: '🎣', key: m.key } });
        try {
            const res = await ecoCall('POST /fish', m.sender);
            const { item, reward, newBalance } = res.data;
            
            const emojis = { 'Old Boot': '👢', 'Salmon': '🐟', 'Tuna': '🐠', 'Golden Fish': '🐡' };
            
            await sendTable(sock, m.chat,
                `## 🎣 Fishing`,
                '🎣 Catch!',
                [
                    ['🐟 Caught', `${emojis[item] || '🎣'} ${item}`],
                    ['💰 Value', `${reward.toLocaleString()} coins`],
                    ['📊 Balance', `${newBalance.toLocaleString()} coins`]
                ],
                '💡 Rare: Golden Fish (200 coins)!'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Fishing failed'}\``);
        }
    }
};

// ==================== DAILY ====================
const dailyCmd = {
    name: 'daily',
    alias: ['dailyreward', 'dailybonus'],
    desc: 'Claim your daily reward',
    category: 'Economy',
    usage: '.daily',
    reactions: { start: '📅', success: '✨', error: '❔' },

    execute: async (sock, m, { reply }) => {
        await sock.sendMessage(m.chat, { react: { text: '📅', key: m.key } });
        try {
            const res = await ecoCall('POST /daily', m.sender);
            const { reward, newBalance } = res.data;
            
            await sendTable(sock, m.chat,
                `## 📅 Daily Reward`,
                '🎁 Claimed!',
                [
                    ['🎁 Reward', `${reward.toLocaleString()} coins`],
                    ['📊 Balance', `${newBalance.toLocaleString()} coins`]
                ],
                '💡 Come back in 24 hours!'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Already claimed!'}\``);
        }
    }
};

// ==================== PROFILE ====================
const profileCmd = {
    name: 'ecoprofile',
    alias: ['eprofile', 'ecostats', 'mystats'],
    desc: 'View your economy profile',
    category: 'Economy',
    usage: '.ecoprofile',
    reactions: { start: '👤', success: '✨', error: '❔' },

    execute: async (sock, m, { reply }) => {
        await sock.sendMessage(m.chat, { react: { text: '👤', key: m.key } });
        try {
            const res = await ecoCall('GET /profile', m.sender);
            const d = res.data;
            
            await sendTable(sock, m.chat,
                `## 👤 Profile`,
                '📊 Stats',
                [
                    ['💰 Balance', `${d.balance.toLocaleString()} coins`],
                    ['🏦 Bank', `${d.bank.toLocaleString()} coins`],
                    ['⭐ Level', `Level ${d.level}`],
                    ['✨ XP', `${d.xp} XP`],
                    ['💪 Strength', d.stats?.strength || 0],
                    ['🍀 Luck', d.stats?.luck || 0],
                    ['🧠 Intelligence', d.stats?.intelligence || 0],
                    ['🎭 Faction', d.faction || 'None'],
                    ['🎒 Items', `${d.inventoryCount || 0} items`],
                    ['💳 Loan', d.loan ? `${d.loan.toLocaleString()} coins` : 'None']
                ],
                '💡 .help economy for all commands'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply('`✘ Failed to load profile`');
        }
    }
};

// ==================== LEADERBOARD ====================
const leaderboardCmd = {
    name: 'leaderboard',
    alias: ['lb', 'richlist', 'top'],
    desc: 'View the richest users',
    category: 'Economy',
    usage: '.leaderboard',
    reactions: { start: '🏆', success: '✨', error: '❔' },

    execute: async (sock, m, { reply }) => {
        await sock.sendMessage(m.chat, { react: { text: '🏆', key: m.key } });
        try {
            const res = await ecoCall('GET /admin/stats', m.sender);
            const users = res.data?.users || [];
            const sorted = users.sort((a, b) => (b.balance + b.bank) - (a.balance + a.bank)).slice(0, 10);
            
            if (!sorted.length) return reply('`📊 No users yet!`');
            
            const tableRows = [['🏆 Rank', '👤 User', '💰 Wealth']];
            sorted.forEach((u, i) => {
                tableRows.push([
                    `#${i + 1}`,
                    u.jid.split('@')[0],
                    `${(u.balance + u.bank).toLocaleString()} coins`
                ]);
            });
            
            await sendTable(sock, m.chat,
                `## 🏆 Richest`,
                '💰 Top 10',
                tableRows,
                '💡 Work hard to climb!'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply('`✘ Failed to load leaderboard`');
        }
    }
};

// ==================== GIFT ====================
const giftCmd = {
    name: 'gift',
    alias: ['givegift'],
    desc: 'Gift coins to a friend',
    category: 'Economy',
    usage: '.gift @user <amount>',
    reactions: { start: '🎁', success: '✨', error: '❔' },

    execute: async (sock, m, { args, reply }) => {
        const target = getTarget(m, args);
        const amount = parseInt(args[0]);
        if (!target) return reply('`✘ Reply / tag / number to gift`');
        if (!amount || amount <= 0) return reply('`✘ .gift <amount>`');
        if (target === m.sender) return reply('`✘ Cannot gift yourself!`');
        
        await sock.sendMessage(m.chat, { react: { text: '🎁', key: m.key } });
        try {
            const res = await ecoCall('POST /gift', m.sender, { to: target, amount });
            
            await sendTable(sock, m.chat,
                `## 🎁 Gift Sent`,
                '✅ Delivered',
                [
                    ['💰 Amount', `${amount.toLocaleString()} coins`],
                    ['👤 To', `@${target.split('@')[0]}`]
                ],
                '💡 Spread the love!'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key }, mentions: [target] });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Gift failed'}\``);
        }
    }
};

// ==================== ATTACK ====================
const attackCmd = {
    name: 'attack',
    alias: ['fight', 'battle'],
    desc: 'Attack another player',
    category: 'Economy',
    usage: '.attack @user',
    reactions: { start: '⚔️', success: '✨', error: '❔' },

    execute: async (sock, m, { args, reply }) => {
        const target = getTarget(m, args);
        if (!target) return reply('`✘ Reply / tag / number to attack`');
        if (target === m.sender) return reply('`✘ Cannot attack yourself!`');
        
        await sock.sendMessage(m.chat, { react: { text: '⚔️', key: m.key } });
        try {
            const res = await ecoCall('POST /attack', m.sender, { target });
            const data = res.data;
            
            if (data.win) {
                await sendTable(sock, m.chat,
                    `## ⚔️ Victory!`,
                    '🏆 You Won',
                    [
                        ['💰 Stolen', `${data.stolen.toLocaleString()} coins`],
                        ['⚔️ From', `@${target.split('@')[0]}`]
                    ],
                    '💡 Train strength to win more!'
                );
            } else {
                await sendTable(sock, m.chat,
                    `## 💀 Defeat!`,
                    '❌ You Lost',
                    [
                        ['📝 Result', data.message || 'You lost the fight!'],
                        ['💰 Penalty', 'Lost 30 coins']
                    ],
                    '💡 Train more before attacking!'
                );
            }
            await sock.sendMessage(m.chat, { react: { text: data.win ? '🔖' : '❔', key: m.key }, mentions: [target] });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Attack failed'}\``);
        }
    }
};

// ==================== ADD COINS (OWNER ONLY) ====================
const addcoinsCmd = {
    name: 'addcoins',
    alias: ['addmoney', 'givecoins', 'setcoins'],
    desc: 'Add coins to a user',
    category: 'Economy',
    ownerOnly: true,
    usage: '.addcoins @user <amount>',
    reactions: { start: '💰', success: '✨', error: '❔' },

    execute: async (sock, m, { args, reply }) => {
        const target = getTarget(m, args);
        const amount = parseInt(args[0]);
        if (!target) return reply('`✘ Reply / tag / number`');
        if (!amount || amount <= 0) return reply('`✘ .addcoins <amount>`');
        
        await sock.sendMessage(m.chat, { react: { text: '💰', key: m.key } });
        try {
            const res = await ecoCall('POST /admin/add-money', m.sender, { jid: target, amount });
            await sendTable(sock, m.chat,
                `## 💰 Coins Added`,
                '✅ Success',
                [
                    ['💰 Amount', `${amount.toLocaleString()} coins`],
                    ['👤 To', `@${target.split('@')[0]}`]
                ],
                '💡 Economy management'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key }, mentions: [target] });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply('`✘ Failed to add coins`');
        }
    }
};

// ==================== QUICK COMMANDS ====================
const quickCmds = [
    {
        name: 'mine',
        alias: ['mining', 'dig'],
        desc: 'Mine for valuable ores',
        category: 'Economy',
        usage: '.mine',
        execute: async (sock, m, { reply }) => {
            try {
                const res = await ecoCall('POST /mine', m.sender);
                const { ore, reward } = res.data;
                const emojis = { 'Stone': '🪨', 'Iron': '⛓️', 'Gold': '🪙', 'Diamond': '💎' };
                await reply(`⛏️ *${emojis[ore] || '⛏️'} ${ore}*\n💰 +${reward} coins`);
                await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                reply(`\`✘ ${err.response?.data?.error || 'Mining failed'}\``);
            }
        }
    },
    {
        name: 'hunt',
        alias: ['hunting'],
        desc: 'Hunt animals for profit',
        category: 'Economy',
        usage: '.hunt',
        execute: async (sock, m, { reply }) => {
            try {
                const res = await ecoCall('POST /hunt', m.sender);
                const { animal, reward } = res.data;
                const emojis = { 'Rabbit': '🐰', 'Deer': '🦌', 'Bear': '🐻' };
                await reply(`🏹 *${emojis[animal] || '🎯'} ${animal}*\n💰 +${reward} coins`);
                await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                reply(`\`✘ ${err.response?.data?.error || 'Hunt failed'}\``);
            }
        }
    },
    {
        name: 'beg',
        alias: ['plead'],
        desc: 'Beg for spare coins',
        category: 'Economy',
        usage: '.beg',
        execute: async (sock, m, { reply }) => {
            try {
                const res = await ecoCall('POST /beg', m.sender);
                await reply(`🥺 Someone gave you *${res.data.reward} coins!*`);
                await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                reply(`\`✘ ${err.response?.data?.error || 'Begging failed'}\``);
            }
        }
    },
    {
        name: 'crime',
        alias: ['commitcrime'],
        desc: 'Commit a crime',
        category: 'Economy',
        usage: '.crime',
        execute: async (sock, m, { reply }) => {
            try {
                const res = await ecoCall('POST /crime', m.sender);
                const d = res.data;
                await reply(d.success ? `🔫 *Success!* +${d.reward} coins` : `🚔 *Caught!* ${d.message}`);
                await sock.sendMessage(m.chat, { react: { text: d.success ? '✨' : '❔', key: m.key } });
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                reply(`\`✘ ${err.response?.data?.error || 'Crime failed'}\``);
            }
        }
    },
    {
        name: 'drugs',
        alias: ['deal'],
        desc: 'Deal drugs (high risk)',
        category: 'Economy',
        usage: '.drugs',
        execute: async (sock, m, { reply }) => {
            try {
                const res = await ecoCall('POST /drugs', m.sender);
                const d = res.data;
                await reply(d.success ? `💊 *Profit!* +${d.profit} coins` : `🚔 *Busted!* ${d.message}`);
                await sock.sendMessage(m.chat, { react: { text: d.success ? '✨' : '❔', key: m.key } });
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                reply(`\`✘ ${err.response?.data?.error || 'Deal failed'}\``);
            }
        }
    },
    {
        name: 'weekly',
        alias: ['weeklyreward'],
        desc: 'Claim weekly bonus',
        category: 'Economy',
        usage: '.weekly',
        execute: async (sock, m, { reply }) => {
            try {
                const res = await ecoCall('POST /weekly', m.sender);
                await reply(`🎁 *Weekly bonus!* +${res.data.reward.toLocaleString()} coins`);
                await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                reply(`\`✘ ${err.response?.data?.error || 'Already claimed!'}\``);
            }
        }
    },
    {
        name: 'shop',
        alias: ['store', 'items'],
        desc: 'View economy shop',
        category: 'Economy',
        usage: '.shop',
        execute: async (sock, m, { reply }) => {
            try {
                const res = await ecoCall('GET /shop', m.sender);
                const items = res.data?.shop || [];
                const tableRows = [['🛍️ Item', '💰 Price', '📝 Description']];
                items.forEach(i => tableRows.push([i.name, `${i.price} coins`, i.description]));
                await sendTable(sock, m.chat, '## 🛍️ Shop', '🏪 Items', tableRows, '💡 .buy <item> to purchase');
                await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                reply('`✘ Failed to load shop`');
            }
        }
    },
    {
        name: 'buy',
        alias: ['purchase'],
        desc: 'Buy an item',
        category: 'Economy',
        usage: '.buy <item>',
        execute: async (sock, m, { args, reply }) => {
            const item = args.join('_').toLowerCase().replace(/\s/g, '_');
            if (!item) return reply('`✘ .buy pickaxe`');
            try {
                const res = await ecoCall('POST /buy', m.sender, { item });
                await reply(`🛒 *${res.data.message}*`);
                await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                reply(`\`✘ ${err.response?.data?.error || 'Purchase failed'}\``);
            }
        }
    },
    {
        name: 'inventory',
        alias: ['inv', 'backpack'],
        desc: 'View your inventory',
        category: 'Economy',
        usage: '.inventory',
        execute: async (sock, m, { reply }) => {
            try {
                const res = await ecoCall('GET /inventory', m.sender);
                const items = res.data?.inventory || [];
                if (!items.length) return reply('`🎒 Empty!`');
                const tableRows = [['🎒 Item', '📦 Qty']];
                items.forEach(i => tableRows.push([i.name, i.quantity]));
                await sendTable(sock, m.chat, '## 🎒 Inventory', '📦 Items', tableRows, '💡 .sell <item> to sell');
                await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                reply('`✘ Failed to load inventory`');
            }
        }
    }
];

// ==================== EXPORT ALL ====================
const allCommands = [
    balanceCmd,
    depositCmd,
    withdrawCmd,
    payCmd,
    robCmd,
    workCmd,
    fishCmd,
    dailyCmd,
    profileCmd,
    leaderboardCmd,
    giftCmd,
    attackCmd,
    addcoinsCmd,
    ...quickCmds
];

module.exports = allCommands;
