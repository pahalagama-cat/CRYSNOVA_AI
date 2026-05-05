const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'csv',
    alias: ['spreadsheet', 'csvgen'],
    category: 'Documents',
    desc: 'Generate a CSV file from data',
    usage: '.csv header1,header2,header3 | row1val1,row1val2 | row2val1,row2val2',

    execute: async (sock, m, { args, reply }) => {
        const input = args.join(' ').trim();
        if (!input) return reply('⚉ Usage: .csv Name,Age,City | John,25,Lagos | Jane,30,Abuja');

        const rows = input.split('|').map(r => r.trim());
        if (rows.length < 1) return reply('_*⚉ Provide at least a header row*_');

        let csv = '';
        rows.forEach(row => {
            const cols = row.split(',').map(c => `"${c.trim()}"`).join(',');
            csv += cols + '\n';
        });

        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const filePath = path.join(tempDir, `data_${Date.now()}.csv`);
        fs.writeFileSync(filePath, csv);

        await sock.sendMessage(m.chat, {
            document: fs.readFileSync(filePath),
            fileName: 'spreadsheet.csv',
            mimetype: 'text/csv',
            caption: '£ CSV Generated'
        }, { quoted: m });

        fs.unlinkSync(filePath);
    }
};
