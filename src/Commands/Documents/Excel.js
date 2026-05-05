const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'excel',
    alias: ['xls', 'xlsx'],
    category: 'Documents',
    desc: 'Generate a simple Excel file',
    usage: '.excel Title | col1,col2 | val1,val2 | val3,val4',

    execute: async (sock, m, { args, reply }) => {
        const input = args.join(' ').trim();
        if (!input) return reply('⚉ Usage: .excel MySheet | Name,Age | John,25 | Jane,30');

        const parts = input.split('|').map(p => p.trim());
        if (parts.length < 2) return reply('_*⚉ Provide title and at least one data row*_');

        const title = parts[0];
        const rows = parts.slice(1);

        // Build simple HTML-based Excel
        let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body><table border="1"><caption>${title}</caption>`;

        rows.forEach((row, i) => {
            const tag = i === 0 ? 'th' : 'td';
            const cols = row.split(',').map(c => `<${tag}>${c.trim()}</${tag}>`).join('');
            html += `<tr>${cols}</tr>`;
        });

        html += '</table></body></html>';

        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const filePath = path.join(tempDir, `${title}_${Date.now()}.xls`);
        fs.writeFileSync(filePath, html);

        await sock.sendMessage(m.chat, {
            document: fs.readFileSync(filePath),
            fileName: `${title}.xls`,
            mimetype: 'application/vnd.ms-excel',
            caption: `💬 Excel: ${title}`
        }, { quoted: m });

        fs.unlinkSync(filePath);
    }
};
