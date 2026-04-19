const util = require('util');

module.exports = {
    name: 'eval',
    alias: ['#', '>'],
    desc: 'Execute JavaScript code',
    category: 'Owner',
    ownerOnly: true,

    execute: async (sock, m, { args, reply, text }) => {
        if (!text) return reply('_*ಠ_ಠ Provide code to evaluate*_');

        let consoleOutput = '';
        const originalLog = console.log;
        console.log = (...args) => {
            consoleOutput += args.map(a => util.inspect(a, { depth: 2 })).join(' ') + '\n';
        };

        try {
            // Wrap code in async function to handle returns and awaits
            const wrappedCode = `
                (async () => {
                    ${text.includes('return') ? text : 'return ' + text}
                })()
            `;

            let result = await eval(wrappedCode);
            console.log = originalLog;

            // Format output
            let output = '';
            if (consoleOutput) output += consoleOutput;
            if (result !== undefined) output += util.inspect(result, { depth: 2 });
            if (!output) output = 'undefined';

            reply(`*✐:*\n\`\`\`\n${output.slice(0, 4000)}\n\`\`\``);

        } catch (err) {
            console.log = originalLog;
            reply(`✘ *Error:*\n\`\`\`\n${err.message}\n\`\`\``);
        }
    }
};
