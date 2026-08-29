# ⛪ Church Management App (Desktop)

Aplikasi desktop *offline-first* modern untuk mempermudah manajemen kehadiran jemaat gereja, pembuatan kartu ID berbasis QR Code, dan pelaporan otomatis. Aplikasi ini dirancang agar mudah digunakan, berjalan 100% tanpa internet, dan menjaga privasi data gereja secara lokal.

## ✨ Fitur Utama

- **👥 Manajemen Jemaat:** Tambah, edit, dan kelola database jemaat. Mendukung pengelompokan kategori (Jemaat Tetap dan Tamu/Guest).
- **🪪 ID Card & QR Generator:** Sistem otomatis untuk mendesain dan mencetak Kartu ID Jemaat lengkap dengan QR Code unik (Mendukung sisi depan dan belakang).
- **📸 Live Scanner Kehadiran:** Halaman *kiosk* untuk *scan* QR Code secara realtime saat ibadah berlangsung menggunakan barcode scanner, serta fitur input manual.
- **📊 Laporan & Analitik Komprehensif:**
  - **Laporan per Event:** Ringkasan jumlah kehadiran (Total, Tetap, Guest), dengan fitur export ke PDF dan Excel (.xlsx).
  - **Riwayat Individu:** Melacak riwayat kehadiran per individu lengkap dengan filter rentang tanggal.
  - **🏆 Leaderboard (Peringkat Kehadiran):** Melihat jemaat terajin berdasarkan rentang waktu tertentu.
- **🔒 Keamanan & Privasi:** Data disimpan secara lokal menggunakan `SQLite` (`AppData`). Dilengkapi dengan proteksi PIN dan Password (di-hash dengan enkripsi *scrypt*) untuk menu Pengaturan.
- **💾 Export / Import Data:** Mendukung migrasi data jemaat secara massal melalui Microsoft Excel (.xlsx) dan sistem *Full-Database Backup/Restore* format JSON.

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend / Desktop Environment:** Electron, Node.js, Better-SQLite3
- **Utilities:** `jsPDF` & `jspdf-autotable` (Export PDF), `xlsx` (Export/Import Excel), `html2canvas` & `qrcode.react` (Generator Kartu ID)
- **Packager:** `electron-builder` (Target: NSIS Windows Installer)

## 🚀 Persiapan & Development (Lokal)

Pastikan kamu sudah menginstal **Node.js** di komputermu.

1. **Clone repository ini:**
   ```bash
   git clone https://github.com/USERNAME/church-management-app.git
   cd church-management-app
   ```

2. **Install dependensi:**
   ```bash
   npm install
   ```

3. **Jalankan mode development:**
   ```bash
   npm run dev:electron
   ```
   *Perintah ini akan menjalankan Vite (Frontend) dan Electron secara bersamaan.*

## 📦 Build Installer (.exe)

Untuk memaketkan aplikasi menjadi installer `.exe` Windows yang siap didistribusikan:

```bash
npm run build:win
```
*Hasil installer akan muncul di dalam folder `release/`.*

## 🛡️ Catatan Keamanan
- Aplikasi ini sengaja dikonfigurasi untuk menyimpan data secara lokal sehingga aman dari peretasan jarak jauh.
- Pastikan untuk **mengganti Password dan PIN bawaan** melalui menu Pengaturan di dalam aplikasi pada saat penggunaan pertama kali di komputer baru.
