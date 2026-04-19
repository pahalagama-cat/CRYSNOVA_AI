module.exports = {
    name: 'creategc',
    alias: ['creategc'],
    desc: 'Create a new WhatsApp group',
    category: 'Tools',
    execute: async (sock, m, { args, reply }) => {
        try {
            const groupName = args.join(' ');
            if (!groupName) {
                return reply('`ஃ𖠃 Group name.`');
            }
            
            const result = await sock.groupCreate(groupName, []);
            reply(`_Group "${result.subject}" created successfully!_`);
        } catch (error) {
            console.error(error);
            reply('```An error occurred while creating the group. Please try again.```');
        }
    }
};
