# Gareng · SEMAR AI Cashier

Kiosk pemesanan suara untuk pelanggan, tersambung ke [SEMAR ERP](https://github.com/achphoria/semar-erp).
Pelanggan cukup bicara ke layar, Gareng (AI) menjawab dengan suara, menampilkan foto menu, menawarkan tambahan, lalu pelanggan membayar dengan QRIS. Pesanan langsung masuk ke POS, KDS, stok, dan keuangan SEMAR.

> **Status: Tahap 1 (fondasi).** Login dengan akun SEMAR, menu dari SEMAR, pesan lewat layar sentuh, bayar QRIS dummy, pesanan masuk ke POS SEMAR. Suara & AI menyusul di Tahap 2.

**Aplikasi:** https://achphoria.github.io/semar-gareng/ · **Preview orb:** https://achphoria.github.io/semar-gareng/design/orb-preview.html

## Keputusan yang sudah disepakati

| | |
|---|---|
| Pengguna | Pelanggan langsung (self-service). Staff hanya mengaktifkan perangkat dengan akun SEMAR. |
| Login | Satu akun dengan SEMAR (project Supabase yang sama). Pelanggan tidak perlu login. |
| Peran AI | Order pakai suara, upsell, asisten. Prioritas utama: pengalaman (UX). |
| Tampilan | Sementara orb animasi ala Jarvis. Maskot Gareng 3D menyusul. |
| Perangkat | TV/monitor portrait, bisa layar sentuh maupun tidak (suara utama, sentuh sebagai cadangan). |
| Pembayaran | QRIS di layar. Sementara dummy, payment gateway menyusul. |
| Posisi | Pelengkap POS SEMAR, bukan pengganti. |
| Di SEMAR | Diaktifkan lewat Pengaturan → Modul, ditambah permission khusus. |

## Keadaan orb

| Keadaan | Warna | Kapan |
|---|---|---|
| Siaga | Cyan | Menunggu pelanggan |
| Mendengar | Cyan, gelombang bergetar | Pelanggan bicara |
| Berpikir | Kuning emas | AI memproses pesanan |
| Bicara | Cyan, batang suara berdenyut | Gareng menjawab |
| Berhasil | Hijau | Pesanan atau pembayaran berhasil |

## Rencana tahapan

1. **Fondasi**: aktivasi perangkat dengan akun SEMAR, tampilan menu portrait, pesanan masuk ke POS.
2. **Otak + suara**: Claude memesan dari menu asli, suara Indonesia (speech-to-text dan text-to-speech).
3. **Tampilan**: orb dan foto menu melayang, upsell.
4. **QRIS**: pembayaran dummy, lalu payment gateway sungguhan.
5. **Sisi SEMAR**: modul AI Cashier, permission, laporan biaya AI dan upsell.

## Cara kerja (Tahap 1)

1. **Aktivasi** (staf): login dengan akun SEMAR (email owner atau username staf), pilih outlet, pastikan shift kasir terbuka, pilih metode pembayaran QRIS, lalu **Mulai mode kiosk**.
2. **Pelanggan**: pilih makan di sini / bawa pulang, pilih menu (varian & tambahan ikut aturan menu SEMAR), cek pesanan, bayar.
3. **Pesanan** dibuat dengan fungsi yang sama dengan kasir SEMAR (`pos_save_order`), jadi harga, pajak, stok, dan dapur mengikuti otomatis. Catatan order: "Pesanan via Gareng AI Cashier".
4. **QRIS dummy**: tombol "Simulasikan bayar berhasil" mencatat pembayaran sungguhan di SEMAR (`pos_pay_order`) dengan metode QRIS yang dipilih, lalu pesanan masuk dapur. Batal / waktu habis = order di-void.
5. **Keluar mode kiosk**: ketuk tulisan GARENG di pojok kiri atas 5 kali.

> Pembayaran dummy tetap tercatat sebagai penjualan di SEMAR. Untuk uji coba, pakai outlet demo atau void/refund lewat SEMAR.

## Menyambungkan ke SEMAR

Gareng memakai project Supabase yang sama dengan SEMAR (URL + anon key dari `semar-erp/app/.env.production`).

- **Lokal**: `npm install` lalu `npm run dev`. Kalau folder `erp-restoran` ada di sebelah folder ini, koneksinya otomatis dibaca dari sana. Atau salin `.env.example` menjadi `.env.local` dan isi.
- **GitHub Pages**: isi di repo ini → Settings → Secrets and variables → Actions → tab **Secrets**: `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`. Settings → Pages → Source: **GitHub Actions**.

## Isi repo

- `src/`: aplikasi kiosk (React + Vite)
- `design/orb-preview.html`: preview orb (coba tombol "Pakai mic asli")
- `design/gareng/`: desain maskot Gareng (PNG/SVG tampak depan dan belakang) dan [panduan membuat 3D di Meshy](design/gareng/PANDUAN-MESHY.md)
