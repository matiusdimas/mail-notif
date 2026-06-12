Pilihan yang sangat tepat. Menggunakan `whatsapp-web.js` berbasis Node.js adalah solusi terbaik untuk jalur gratisan tanpa biaya API dari Meta, dan sangat cocok dikombinasikan dengan protokol IMAP untuk menarik data dari Gmail secara real-time.

Berikut adalah **Product Requirement Document (PRD)** lengkap dan terstruktur yang siap Anda *copy-paste* langsung ke Claude agar dia bisa langsung menuliskan kodenya untuk Anda.

---

# PRODUCT REQUIREMENT DOCUMENT (PRD)

## Project Name: MailPulse-WA (Automated Gmail to WhatsApp Forwarder)

## 1. Project Overview

MailPulse-WA adalah aplikasi backend berbasis **Node.js** yang berfungsi untuk memantau email masuk pada akun Gmail secara real-time, menyaring (filter) email tersebut berdasarkan kriteria tertentu, dan meneruskan ringkasan email yang lolos filter ke nomor WhatsApp pribadi sebagai notifikasi.

Proyek ini dibangun menggunakan solusi **100% Free/Open-Source** memanfaatkan library `whatsapp-web.js` untuk otomatisasi WhatsApp Web dan protokol IMAP untuk interaksi dengan Gmail.

---

## 2. Technical Stack

* **Runtime Environment:** Node.js
* **Backend Framework:** Express.js (untuk manajemen server & optional webhooks/dashboard jika diperlukan di masa depan)
* **Email Listener:** `imap-simple` atau `node-imap` (Menggunakan fitur IMAP IDLE agar menerima email secara real-time tanpa polling berulang)
* **WhatsApp Gateway:** `whatsapp-web.js` (Berbasis Puppeteer untuk mengontrol WhatsApp Web)
* **Database (Ringan):** SQLite (`sqlite3` atau `better-sqlite3`) atau lokal JSON file untuk menyimpan konfigurasi filter aturan (*rules*).

---

## 3. System Architecture & Workflow

```
[Gmail Server] --(IMAP IDLE / Real-time)--> [App: Email Listener]
                                                   │
                                            [App: Filter Engine] <--> [Database: Rules]
                                                   │
                                            (Jika Lolos Filter)
                                                   ▼
[WhatsApp Web] <---(whatsapp-web.js)------- [App: WA Sender] ───> [WhatsApp HP]

```

### Alur Kerja Detil:

1. **Inisialisasi:** Aplikasi berjalan, mengaktifkan koneksi IMAP ke Gmail, dan memicu *headless browser* untuk WhatsApp Web. Pengguna melakukan scan QR code lewat terminal saat pertama kali dijalankan.
2. **Email Terdeteksi:** Setiap ada email baru masuk ke folder `INBOX`, server Gmail memicu event ke aplikasi via IMAP IDLE.
3. **Parsing Data:** Aplikasi mengambil data: *Sender (Pengirim)*, *Subject (Judul)*, dan *Body (Isi Pesan)*.
4. **Penyaringan (Filtering):** Data email dicocokkan dengan tabel aturan (*rules*) di database.
5. **Eksekusi & Pengiriman:** Jika email memenuhi syarat, aplikasi memformat teks pesan dan mengirimkannya ke nomor WhatsApp tujuan melalui `whatsapp-web.js`.

---

## 4. Functional Requirements (Fitur Utama)

### 4.1. WhatsApp Authentication Module

* Aplikasi harus bisa memunculkan QR Code di terminal (`qrcode-terminal`) ketika sesi WhatsApp belum terautentikasi atau kedaluwarsa.
* Aplikasi harus menyimpan *session data* (`LocalAuth`) agar setelah scan pertama kali, aplikasi tidak perlu meminta scan ulang saat *restart*.
* Menampilkan log status di terminal jika WhatsApp berhasil terhubung (`Client is ready!`).

### 4.2. Gmail IMAP Listener Module

* Terhubung ke Gmail menggunakan host `imap.gmail.com`, port `993` (Secure SSL).
* Menggunakan fitur **IMAP IDLE** untuk mendengarkan email masuk secara *event-driven* (bukan berkala/cron job) agar notifikasi instan.
* Mampu menangani pemutusan koneksi otomatis (*auto-reconnect*) jika koneksi internet terputus.

### 4.3. Filtering Engine Module

Sistem harus mengecek email berdasarkan tabel aturan. Aturan penyaringan meliputi:

* **Berdasarkan Pengirim:** Email hanya diteruskan jika dikirim oleh email spesifik (misal: `boss@company.com`) atau domain spesifik (`@sistem-internal.com`).
* **Berdasarkan Subjek:** Email hanya diteruskan jika subjek mengandung kata kunci tertentu (misal: `"URGENT"`, `"Invoice"`, `"Error"`).
* **Berdasarkan Body:** Memeriksa teks di dalam isi email jika mengandung kata kunci tertentu.

### 4.4. Message Formatter Module

Email yang lolos filter harus diubah menjadi format teks ringkas WhatsApp yang mudah dibaca. Contoh format:

```text
📩 *EMAIL MASUK TERFILTER* 📩

👤 *Pengirim:* John Doe <john.doe@mail.com>
📌 *Subjek:* [URGENT] Laporan Keuangan Bulanan
📅 *Waktu:* 12 Juni 2026, 18:30 WIB

📝 *Ringkasan Isi:*
Halo tim, berikut adalah dokumen laporan keuangan yang harus segera di-review malam ini...

_Pesan ini dikirim otomatis oleh MailPulse-WA_

```

---

## 5. Database Schema (SQLite)

### Tabel `filters`

Digunakan untuk menyimpan aturan email mana saja yang wajib di-forward.

| Column Name | Type | Description |
| --- | --- | --- |
| `id` | INTEGER (PK) | Auto increment ID |
| `name` | TEXT | Nama aturan (contoh: "Notif Sistem Error") |
| `sender_contains` | TEXT (Nullable) | Filter email pengirim (ex: 'noreply@') |
| `subject_contains` | TEXT (Nullable) | Kata kunci wajib ada di Subjek (ex: 'CRITICAL') |
| `body_contains` | TEXT (Nullable) | Kata kunci wajib ada di Isi Email |
| `is_active` | INTEGER (0/1) | Status aktif atau tidaknya aturan ini |

---

## 6. Environment Variables (`.env`)

Aplikasi wajib menggunakan variabel lingkungan untuk keamanan data sensitif:

```env
PORT=3000
GMAIL_USER=email_anda@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx # Menggunakan App Password dari Google Account
TARGET_WA_NUMBER=6281234567890@c.us   # Nomor WA tujuan notifikasi

```

---

## 7. Non-Functional Requirements & Edge Cases

* **Keamanan Sesi Gmail:** Pengguna wajib menggunakan *Google App Password* (2-Factor Authentication diaktifkan), bukan password utama Gmail.
* **Penanganan Body Email HTML:** Email berbasis HTML harus di-parsing menjadi *plain text* biasa (bisa menggunakan library `html-to-text`) sebelum dikirim ke WA.
* **Limit Karakter WA:** Jika isi email terlalu panjang, aplikasi harus memotong (*truncate*) isi pesan maksimal 1000 karakter agar tidak membebani chat WhatsApp.
* **Anti-Crash / Error Handling:** Jika `whatsapp-web.js` mengalami *crash* atau *disconnected*, aplikasi tidak boleh mati sepenuhnya, melainkan mencoba melakukan inisialisasi ulang client secara otomatis.

---

## 8. Implementation Steps for Claude

*(Instruksi pengerjaan untuk Claude)*

1. **Step 1:** Buat struktur proyek Node.js standar lengkap dengan `package.json` yang berisi dependencies: `whatsapp-web.js`, `imap-simple`, `dotenv`, `qrcode-terminal`, `html-to-text`, dan `sqlite3`.
2. **Step 2:** Tulis file konfigurasi database SQLite untuk membuat tabel aturan (*rules*) awal sebagai contoh data uji.
3. **Step 3:** Implementasikan modul WhatsApp autentikasi dengan `LocalAuth` agar memunculkan QR code di terminal dan menyimpan sesi dengan aman.
4. **Step 4:** Implementasikan modul IMAP Gmail menggunakan *event* listener email baru.
5. **Step 5:** Hubungkan logika filter email dengan database dan integrasikan dengan modul pengiriman teks WhatsApp.

---

### Cara Menggunakan Dokumen Ini di Claude:

Anda tinggal menyalin seluruh teks di atas (dari bagian `# PRODUCT REQUIREMENT DOCUMENT` sampai akhir), lalu berikan *prompt* tambahan di bawahnya seperti ini saat mengirim pesan ke Claude:

> *"Claude, tolong buatkan kode lengkap untuk aplikasi Node.js berdasarkan PRD di atas. Mulai dari struktur file, instalasi package, hingga kode utama di setiap filenya secara bertahap."*