# MailPulse

Aplikasi Node.js yang memantau Gmail secara real-time lewat **IMAP IDLE**, menyaringnya
dengan aturan filter, lalu meneruskan ringkasannya ke **Telegram** menggunakan Telegram Bot API.
Dilengkapi **dashboard web** (Express + Socket.IO) untuk melihat log email masuk, mengelola
filter, dan notifikasi suara di browser.

100% gratis — cukup buat bot lewat [@BotFather](https://t.me/BotFather).

---

## Cara Kerja Singkat

```
[Gmail] --IMAP IDLE--> [Listener] --> [Filter] --> [Formatter] --> [Telegram Bot API] --> [Telegram]
                                          |                              ^
                                    [SQLite rules]                       |
                                          +------ [Dashboard Web :3000] -+
```

Modul utama ada di [src/](src/):

| File | Fungsi |
| --- | --- |
| [src/index.js](src/index.js) | Entry point: Express server, Socket.IO, orkestrasi semua modul |
| [src/imap.js](src/imap.js) | Koneksi Gmail IMAP + listener email baru (auto-reconnect) |
| [src/filter.js](src/filter.js) | Pencocokan email dengan aturan filter |
| [src/db.js](src/db.js) | SQLite (`database.sqlite`) — CRUD tabel `filters` + seed data |
| [src/formatter.js](src/formatter.js) | Format pesan Telegram (HTML) |
| [src/telegram.js](src/telegram.js) | Kirim pesan via Telegram Bot API |
| [public/](public/) | Dashboard web (HTML/CSS/JS) |

> ⚠️ **Catatan penting:** saat ini [src/filter.js](src/filter.js#L4) di-*bypass* —
> **semua email diteruskan** ke Telegram tanpa mempedulikan aturan filter. Hapus
> baris `return true;` di awal `isEmailAllowed()` jika ingin filter aktif kembali.

---

## Prasyarat

1. **Docker Desktop** (sudah terpasang di laptop Anda).
2. **Gmail App Password** — aktifkan 2FA di Google Account, lalu buat App Password di
   <https://myaccount.google.com/apppasswords> (jangan pakai password utama Gmail).
3. **Telegram Bot** — buat lewat [@BotFather](https://t.me/BotFather), ambil **token**-nya.

---

## Membuat Telegram Bot & Mendapatkan Chat ID

1. Buka [@BotFather](https://t.me/BotFather) di Telegram → `/newbot` → ikuti instruksi.
   Anda akan menerima **token** seperti `123456789:ABCdef...`. Ini jadi `TELEGRAM_BOT_TOKEN`.
2. **Dapatkan Chat ID tujuan:**
   - **Chat pribadi:** kirim pesan apa saja ke bot Anda, lalu buka
     `https://api.telegram.org/bot<TOKEN>/getUpdates` di browser. Cari `"chat":{"id":...}`
     — angka itu adalah `TELEGRAM_CHAT_ID`. (Atau gunakan bot bantu seperti `@userinfobot`.)
   - **Grup:** tambahkan bot ke grup, kirim satu pesan di grup, lalu cek `getUpdates`.
     Chat ID grup biasanya berupa angka **negatif** (contoh: `-1001234567890`).

---

## Konfigurasi `.env`

Salin contoh lalu isi nilainya:

```bash
cp .env.example .env
```

```env
PORT=3000
GMAIL_USER=email_anda@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx        # App Password (bukan password Gmail)
TELEGRAM_BOT_TOKEN=123456789:ABCdef...         # token dari BotFather
TELEGRAM_CHAT_ID=123456789                      # chat/grup tujuan (grup = angka negatif)
```

---

## Menjalankan di Laptop (Docker) — Direkomendasikan

`docker-compose.yml` bawaan ditujukan untuk **produksi** (pakai Traefik + network eksternal
`proxy`), jadi **tidak jalan apa adanya di lokal**. Gunakan file khusus lokal yang sudah
disediakan: [docker-compose.local.yml](docker-compose.local.yml).

### 1. Siapkan file database terlebih dahulu

Docker akan membuat **folder** (bukan file) jika target mount belum ada, sehingga SQLite
gagal. Buat dulu file kosongnya:

```bash
# Git Bash / WSL
touch database.sqlite
```

```powershell
# PowerShell
if (-not (Test-Path database.sqlite)) { New-Item -ItemType File database.sqlite }
```

### 2. Build & jalankan

```bash
docker compose -f docker-compose.local.yml up --build
```

### 3. Uji coba

- Dashboard: buka <http://localhost:3005> untuk memantau "Live Email Logs".
- Kirim email ke alamat Gmail Anda → ringkasannya akan dikirim ke chat/grup Telegram tujuan.

Pantau prosesnya di log container: `docker compose -f docker-compose.local.yml logs -f`.

---

## Perintah Berguna

```bash
# Pantau log real-time
docker compose -f docker-compose.local.yml logs -f

# Jalankan di latar belakang (detached)
docker compose -f docker-compose.local.yml up -d

# Rebuild + jalankan ulang (WAJIB setiap kali ubah kode di src/ atau public/)
docker compose -f docker-compose.local.yml up --build -d

# Hentikan & hapus container
docker compose -f docker-compose.local.yml down

# Kirim pesan tes ke Telegram (pakai env di dalam container)
docker compose -f docker-compose.local.yml exec -T mail-wa \
  node -e "require('./src/telegram').sendTelegramMessage('Tes 👋').then(console.log)"
```

> **Catatan:** perubahan pada `src/` atau `public/` tidak otomatis masuk ke container —
> jalankan ulang dengan `up --build -d`. Konfigurasi `.env`, database `database.sqlite`,
> dan filter tetap aman karena di-mount/di-load dari host.

---

## Menjalankan Tanpa Docker (opsional)

Butuh Node.js 18+ (sudah punya `fetch` bawaan untuk memanggil Telegram API).

```bash
npm install
npm start
```

Dashboard: <http://localhost:3000>.

---

## Manajemen Filter

Kelola aturan lewat dashboard, atau langsung via REST API:

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/api/filters` | Daftar semua filter |
| POST | `/api/filters` | Tambah filter |
| PUT | `/api/filters/:id` | Ubah filter |
| DELETE | `/api/filters/:id` | Hapus filter |

Skema tiap filter: `name`, `sender_contains`, `subject_contains`, `body_contains`, `is_active`.
Sebuah email lolos jika **semua** kolom yang terisi pada salah satu aturan aktif cocok
(kolom kosong diabaikan). *(Ingat: filter saat ini di-bypass — lihat catatan di atas.)*

---

## Troubleshooting

| Masalah | Solusi |
| --- | --- |
| `database.sqlite` jadi folder | Hapus foldernya, jalankan langkah persiapan file di atas, lalu `up` ulang |
| Pesan tidak masuk Telegram | Cek log; pastikan `TELEGRAM_BOT_TOKEN` & `TELEGRAM_CHAT_ID` benar, dan Anda sudah pernah mengirim pesan ke bot (untuk chat pribadi) |
| Telegram API error `chat not found` | Chat ID salah, atau bot belum pernah berinteraksi dengan chat/grup tersebut |
| IMAP gagal login | Pastikan pakai **App Password**, bukan password Gmail biasa, dan 2FA aktif |
| Email tidak diteruskan | Cek log; jika filter aktif, pastikan ada aturan yang cocok |
| Port 3005 bentrok | Ubah pemetaan port di [docker-compose.local.yml](docker-compose.local.yml) |

---

## Deploy Produksi

Gunakan [docker-compose.yml](docker-compose.yml) yang sudah berisi label Traefik dan
routing sub-path `/mail-wa` di host `web-support-portal.lmd.co.id`. Membutuhkan Docker
network eksternal bernama `proxy` (Traefik) yang sudah berjalan di server.
