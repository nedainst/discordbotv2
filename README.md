<div align="center">
  <br />
  <p>
    <a href="https://discord.js.org"><img src="https://discord.js.org/static/logo.svg" width="500" alt="discord.js" /></a>
  </p>
  <br />
  <p>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-18.x-green.svg?style=for-the-badge&logo=node.js" alt="Node.js" /></a>
    <a href="https://discord.js.org"><img src="https://img.shields.io/badge/Discord.js-v14-blue.svg?style=for-the-badge&logo=discord" alt="Discord.js" /></a>
    <a href="https://expressjs.com"><img src="https://img.shields.io/badge/Express-Web_Dashboard-black.svg?style=for-the-badge&logo=express" alt="Express" /></a>
    <a href="#"><img src="https://img.shields.io/badge/License-MIT-red.svg?style=for-the-badge" alt="License" /></a>
  </p>
</div>

# 🚀 Discord Essentials Bot

**Discord Essentials Bot** adalah sebuah bot Discord *All-in-One* yang sangat kuat, dirancang menggunakan **Discord.js v14**. Bot ini dibuat modular dengan sistem handler canggih (65+ Commands & 9 Events), dilengkapi dengan fitur moderasi lengkap, utilitas server mutakhir, sistem canvas *Welcome/Leave Cards* terintegrasi, dan sebuah **Web Dashboard** modern untuk manajemen penuh.

Semua yang kamu butuhkan untuk membangun dan memanajemen server komunitas raksasa, ada di dalam satu bot!

---

## 🔥 Key Features

### 💻 Web Dashboard Control Panel
Tidak perlu konfigurasi rumit lewat chat. Kontrol server melalui *Web Interface* yang berjalan di `localhost:3000`. Atur *Welcome Channels*, hapus *Warnings*, nyalakan *Automod*, hingga *Live Dashboard Metrics*. 
> *(Screenshot goes here)*

### 🎵 High-Fidelity Music System
Bawa konser ke dalam servermu! 
Memutar lagu dari *YouTube*, *Spotify*, dan *SoundCloud* dengan dukungan sistem Audio Filter (Bassboost, Nightcore, 8D), dan *progress bar* yang *aesthetic*. Dibantu performa tinggi FFmpeg dan `@distube/ytdl-core`.

### 🎨 Modular Canvas Images (Welcome & Leave Cards)
Jadikan server kamu lebih "Wow" dengan *custom generated images*! Saat ada member baru join, sistem akan langsung membuat kartu selamat datang beresolusi tinggi dengan Avatar glow, gradient background, dan badge server, yang semua **warnanya bisa dikustomisasi**.

### 🎧 Join-to-Create (Private VC)
Cukup set 1 saluran *Hub*, dan bot otomatis akan membuat **Private Voice Channel** eksklusif dengan panel kontrol (*Lock, Unlock, Set Limit, Hide*) untuk setiap member yang masuk. Ruangan otomatis dihapus saat kosong!

### 🛡️ Smart Moderation & Automod
Sistem Auto-moderasi untuk mengeblok Links, Caps-lock berlebihan, Mention-spam, dan kata-kata kotor. Dilengkapi dengan command *Ban, Kick, Warn, Purge*, serta *Snipe* pesan!

### 📊 Leveling, Utility, & Tools
* **Leveling System**: XP *text-based*, Rank Card, Leaderboard, dan Auto-Role Rewards.
* **Community Tools**: Starboard System ⭐, Anonymous Confessions 🕵️, Suggestion Tracking 💡, Ticket Builder 🎫, Giveaway 🎁.
* **Productivity**: Reminders, Tags, Auto-Translation (13+ Bahasa), Weather (Cuaca).

---

## 🛠️ Installation & Setup

Ikuti panduan berikut untuk menghosting *Discord Essentials Bot* kamu sendiri.

### 1. Prerequisites
- **Node.js** (Minimal v18+)
- **Python** & **Build Tools** (Dibutuhkan untuk kompilasi Canvas / NAPI-RS)
- Sebuah Bot Token dari [Discord Developer Portal](https://discord.com/developers/applications)

### 2. Clone and Install Dependencies
Buka terminal dan jalankan:
```bash
git clone https://github.com/UsernameKamu/botdiscordessentials.git
cd botdiscordessentials
npm install
```

### 3. Setup Configuration
Duplikat atau ubah file `.env` di dalam root project dan isi data beriktu:
```env
# Bot Configuration
BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN
CLIENT_ID=YOUR_BOT_CLIENT_ID
GUILD_ID=YOUR_SERVER_ID

# Dashboard Configuration
DASHBOARD_PASSWORD=admin123
```

⚠️ **PENTING:** Pastikan Anda mengaktifkan **Tiga Privileged Gateway Intents** (Message Content, Server Members, Server Voice States) di Discord Developer Portal.

### 4. Deploy Commands & Run!
Deployment *slash commands* ke Discord API:
```bash
node deploy-commands.js
```
Jalankan bot:
```bash
node index.js
```

Bot dan Web Dashboard sekarang sudah *online*! Buka `http://localhost:3000` di web browser untuk mengontrol botmu!

---

## 📂 Project Tree
```text
botdiscordessentials/
├── commands/            # Terbagi per-kategori (music, moderation, fun, dll)
├── dashboard/           # Express Web Server + Frontend SPA
├── data/                # Lightweight JSON Databases (XP, Confessions, Warnings)
├── events/              # Event listeners (Ready, InteractionCreate, VoiceState)
├── handlers/            # Modular command & event loaders
├── utils/               # Helper (Canvas Generator, Logger, DataManager)
├── index.js             # 🚀 Main Entry Point
└── package.json
```

## 🤝 Contributing
Merasa ada yang kurang? Pull Requests sangat terbuka! Kami menerima semua ide pengembangan, terutama modul Dashboard React / Vue jika ada yang berminat migrasi dari Vanilla JS.

---
⭐ *Don't forget to give this project a star if you like it!* ⭐
