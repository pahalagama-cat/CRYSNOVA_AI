# 🚀 CRYSNOVA AI CODI.0 — Setup Guide

## ✨ NEW: Interactive Setup Wizard

**No more editing config files!** When you deploy CRYSNOVA AI V2.0 for the first time, the bot will guide you through an interactive setup.

---

## 📦 Installation (3 Steps)

### Step 1: Clone/Download
```bash
git clone https://github.com/crysnovax/CRYSNOVA_AI.git
cd CRYSNOVA_AI
```

Or download the ZIP and extract it.

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start Bot
```bash
npm start
```

That's it! The interactive setup will begin automatically on first run.

---

## 🎯 Interactive Setup (First Time Only)

When you run the bot for the first time, you'll see:

```
╔════════════════════════════════════════════════════════╗
║                                                        ║
║        🚀 CRYSNOVA AI V2.0 — FIRST TIME SETUP 🚀      ║
║                                                        ║
║     Let's configure your bot before connecting!        ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

### You'll be asked:

1. **👤 Enter your name**
   - Example: `CRYSNOVA` or `John`
   - This is the owner name (you!)

2. **🤖 Enter bot name**
   - Example: `CRYSNOVA AI` or `MyAwesomeBot`
   - This appears in stickers and bot messages

3. **⚡ Enter command prefix**
   - Default: `.`
   - You can use: `.` or `!` or `/` or any symbol
   - Commands will be: `.menu` `.help` etc.

4. **🔓 Public mode?**
   - Type `yes` = Anyone can use the bot
   - Type `no` = Only you (owner) can use it
   - Default: `yes`

5. **📞 Enter WhatsApp number**
   - Must include country code (no + or spaces)
   - Example: `2348077528901` (Nigeria)
   - Example: `14155552671` (USA)

### Then you'll receive:

```
🔐 Your pairing code:  AB-CD-EF-12
```

Enter this code in WhatsApp:
- Open WhatsApp on your phone
- Go to **Settings** → **Linked Devices**
- Tap **Link a Device**
- Choose **Link with phone number**
- Enter the pairing code

**Done! Bot connected!** 🎉

---

## 📋 Configuration Summary

After setup, your answers are saved to:
```
database/user-config.json
```

**Example:**
```json
{
  "setupCompleted": true,
  "setupDate": "2026-02-19T10:30:00.000Z",
  "owner": {
    "name": "CRYSNOVA",
    "number": "2348077528901",
    "jid": "2348077528901@s.whatsapp.net"
  },
  "bot": {
    "name": "CRYSNOVA AI",
    "prefix": ".",
    "public": true
  }
}
```

**You never need to edit config files manually!** Everything is set up from your answers.

---

## 🔄 Changing Settings Later

If you want to change bot name, prefix, or mode after setup:

### Option 1: Delete config and restart
```bash
rm database/user-config.json
npm start
```
Setup wizard will run again.

### Option 2: Edit the JSON file directly
```bash
nano database/user-config.json
```
Change values, save, restart bot.

### Option 3: Use .setvar commands (if available)
```
.setvar BOT_NAME=NewName
.setvar PREFIX=!
```

---

## 🆘 Troubleshooting

### "Config file not found" error
- **Solution**: Just start the bot — it will create the file automatically during setup

### Pairing code doesn't work
- **Solution**: Make sure you entered your number **exactly** with country code and no spaces
- Example: `2348077528901` not `+234 807 752 8901`

### Bot doesn't respond to commands
- **Check 1**: Did you use the correct prefix?
  - If you set prefix as `!`, use `!menu` not `.menu`
- **Check 2**: Is public mode enabled?
  - If public mode is `false`, only the owner can use commands

### Want to reset everything
```bash
rm -rf sessions database/user-config.json
npm start
```

---

## 📂 File Structure

After first run:
```
CRYSNOVA_AI/
├── database/
│   └── user-config.json       ← Your setup answers (auto-created)
├── sessions/
│   └── creds.json             ← WhatsApp session (auto-created)
├── settings/
│   └── config.js              ← Loads from user-config.json
├── index.js                   ← Main bot file (with setup wizard)
└── package.json
```

---

## ⚙️ Advanced: Manual Configuration

If you prefer to skip the wizard and set config manually:

1. Create `database/user-config.json`:
```json
{
  "setupCompleted": true,
  "owner": {
    "name": "YourName",
    "number": "2348077528901",
    "jid": "2348077528901@s.whatsapp.net"
  },
  "bot": {
    "name": "YourBotName",
    "prefix": ".",
    "public": true
  }
}
```

2. Start bot:
```bash
npm start
```

Setup wizard will be skipped!

---

## 🎉 Success Checklist

After setup, your bot should:
- ✅ Connect to WhatsApp with pairing code
- ✅ Respond to commands with your chosen prefix (e.g., `.menu`)
- ✅ Show your bot name in stickers and messages
- ✅ Work in public mode (if you chose yes) or private mode (if you chose no)
- ✅ Recognize you as the owner

---

## 📞 Support

- **Channel**: https://whatsapp.com/channel/0029Vb6pe77K0IBn48HLKb38
- **GitHub**: https://github.com/crysnovax/CRYSNOVA_AI
- **Issues**: https://github.com/crysnovax/CRYSNOVA_AI/issues

---

**Made with ❤️ by CRYSNOVA**
