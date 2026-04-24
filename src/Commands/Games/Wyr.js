const QUESTIONS = [
    { a: 'Be able to fly', b: 'Be able to read minds' },
    { a: 'Have unlimited money', b: 'Have unlimited time' },
    { a: 'Live in the ocean', b: 'Live in space' },
    { a: 'Be invisible', b: 'Be able to teleport' },
    { a: 'Never use internet again', b: 'Never watch TV again' },
    { a: 'Have a pet dragon', b: 'Have a pet unicorn' },
    { a: 'Always be 10 minutes late', b: 'Always be 20 minutes early' },
    { a: 'Speak all languages', b: 'Play all instruments' },
    { a: 'Live without music', b: 'Live without movies' },
    { a: 'Be the funniest person', b: 'Be the smartest person' },
    { a: 'Explore the deep sea', b: 'Explore outer space' },
    { a: 'Have super strength', b: 'Have super speed' }
];

module.exports = {
    name: 'wouldyourather',
    alias: ['wyr', 'rather'],
    desc: 'Would You Rather questions',
    category: 'Games',
    usage: '.wyr',
    reactions: { start: '🤔', success: '🎭', error: '🏗️' },

    execute: async (sock, m, { reply }) => {
        await sock.sendMessage(m.chat, { react: { text: '🤔', key: m.key } });

        const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];

        await sock.sendMessage(m.chat, {
            headerText: `## 🤔 Would You Rather`,
            contentText: '---',
            title: '🎯 Choose One!',
            table: [
                ['🅰️ Option A', q.a],
                ['🅱️ Option B', q.b],
                ['💬 Reply', 'Type A or B!']
            ],
            footerText: '💡 .wyr for another question!'
        }, { quoted: m });

        await sock.sendMessage(m.chat, { react: { text: '🎭', key: m.key } });
    }
};
