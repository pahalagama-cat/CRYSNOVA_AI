const { getVar, setVar } = require('../../Plugin/configManager');

module.exports = {
    name: 'autorecording',
    alias: ['autorec', 'recording'],
    desc: 'Toggle auto recording status (shows "recording..." while bot processes)',
    category: 'Owner',
    usage: '`—͟͟͞͞𖣘.autorecording on/off`',

    execute: async (sock, m, { args, reply }) => {
        const action = args[0]?.toLowerCase();

        if (action === 'on') {
            setVar('AUTO_RECORDING', true);
            return reply('`✓ Auto Recording ENABLED`');
        } else if (action === 'off') {
            setVar('AUTO_RECORDING', false);
            return reply('`✘ Auto Recording DISABLED`');
        } else {
            const current = getVar('AUTO_RECORDING', true);
            return reply(`*ⓘ STATUS*: *${current ? 'ON' : 'OFF'}*\n\n_Usage: .autorecording on/off_`);
        }
    }
};
