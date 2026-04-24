const WORD_LIST = [
    'apple', 'brave', 'crane', 'dance', 'eagle', 'flame', 'grape', 'heart',
    'igloo', 'jewel', 'knight', 'lemon', 'mango', 'noble', 'ocean', 'piano',
    'queen', 'river', 'stone', 'tiger', 'ultra', 'vivid', 'waste', 'xenon',
    'youth', 'zebra', 'cloud', 'dream', 'earth', 'frost', 'ghost', 'honey',
    'laser', 'moon', 'north', 'olive', 'pearl', 'quick', 'robot', 'sugar',
    'table', 'uncle', 'voice', 'water', 'beach', 'candy', 'daisy', 'early',
    'fairy', 'glass', 'house', 'juice', 'koala', 'light', 'music', 'night'
];

function checkWord(guess, answer) {
    const result = [];
    const answerLetters = answer.split('');
    const guessLetters = guess.split('');
    const used = new Array(answer.length).fill(false);

    // First pass: Mark greens (correct position)
    for (let i = 0; i < 5; i++) {
        if (guessLetters[i] === answerLetters[i]) {
            result[i] = '🟢';
            used[i] = true;
        }
    }

    // Second pass: Mark yellows (wrong position) and reds (not in word)
    for (let i = 0; i < 5; i++) {
        if (result[i]) continue;
        
        let found = false;
        for (let j = 0; j < 5; j++) {
            if (!used[j] && guessLetters[i] === answerLetters[j]) {
                result[i] = '🟡';
                used[j] = true;
                found = true;
                break;
            }
        }
        
        if (!found) result[i] = '⬜';
    }

    return result.join('');
}

module.exports = {
    name: 'wordle',
    alias: ['guessword', 'wordgame'],
    desc: 'Guess the 5-letter word in 6 tries!',
    category: 'Games',
    usage: '.wordle or .wordle start | .wordle <guess>',
    reactions: { start: '🎮', success: '🎭', error: '🏗️' },

    execute: async (sock, m, { args, reply, prefix }) => {
        const sub = args[0]?.toLowerCase();

        if (!global.wordleGames) global.wordleGames = {};
        const game = global.wordleGames[m.chat];

        // ── START NEW GAME ──────────────────────────────────
        if (!sub || sub === 'start') {
            const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
            
            global.wordleGames[m.chat] = {
                word,
                guesses: [],
                maxGuesses: 6,
                started: Date.now()
            };

            await sock.sendMessage(m.chat, { react: { text: '🎮', key: m.key } });

            await sock.sendMessage(m.chat, {
                headerText: `## 🎮 Wordle`,
                contentText: '---',
                title: '🔤 Guess the 5-Letter Word!',
                table: [
                    ['🎯 Goal', 'Guess the word in 6 tries'],
                    ['🟢 Green', 'Correct letter, correct spot'],
                    ['🟡 Yellow', 'Correct letter, wrong spot'],
                    ['⬜ Gray', 'Letter not in word'],
                    ['📝 Usage', `${prefix}wordle <5-letter word>`]
                ],
                footerText: '💡 You have 6 attempts! Good luck!'
            }, { quoted: m });

            return;
        }

        // ── CHECK ACTIVE GAME ───────────────────────────────
        if (!game) {
            return reply(`\`🎮 No active game! Use ${prefix}wordle start to begin.\``);
        }

        // ── MAKE GUESS ──────────────────────────────────────
        const guess = sub.toLowerCase();
        
        if (guess.length !== 5) return reply('`✘ Word must be exactly 5 letters!`');
        if (!/^[a-z]{5}$/.test(guess)) return reply('`✘ Only letters allowed!`');

        game.guesses.push(guess);
        const result = checkWord(guess, game.word);
        const won = guess === game.word;
        const lost = game.guesses.length >= game.maxGuesses && !won;

        // Build game board
        let board = '';
        for (let i = 0; i < game.maxGuesses; i++) {
            if (i < game.guesses.length) {
                const g = game.guesses[i];
                const r = checkWord(g, game.word);
                board += `${r}\n`;
            } else {
                board += '⬜⬜⬜⬜⬜\n';
            }
        }

        await sock.sendMessage(m.chat, {
            headerText: `## 🎮 Wordle`,
            contentText: '---',
            title: `Attempt ${game.guesses.length}/${game.maxGuesses}`,
            table: [
                ['🎮 Board', board],
                ['📝 Last Guess', guess.toUpperCase()],
                ['📊 Status', won ? '🎉 YOU WIN!' : lost ? `😢 GAME OVER! Word: ${game.word.toUpperCase()}` : 'Keep guessing...']
            ],
            footerText: won ? '🎉 Congratulations!' : lost ? '😢 Better luck next time!' : `💡 ${game.maxGuesses - game.guesses.length} attempts left`
        }, { quoted: m });

        // Check if game over
        if (won) {
            delete global.wordleGames[m.chat];
            await sock.sendMessage(m.chat, { react: { text: '🎉', key: m.key } });
        } else if (lost) {
            delete global.wordleGames[m.chat];
            await sock.sendMessage(m.chat, { react: { text: '😢', key: m.key } });
        } else {
            await sock.sendMessage(m.chat, { react: { text: '👌', key: m.key } });
        }
    }
};
