# Gareng · SEMAR AI Cashier

Kiosk pemesanan suara untuk pelanggan, tersambung ke [SEMAR ERP](https://github.com/achphoria/semar-erp).
Pelanggan cukup bicara ke layar, Gareng (AI) menjawab dengan suara, menampilkan foto menu, menawarkan tambahan, lalu pelanggan membayar dengan QRIS. Pesanan langsung masuk ke POS, KDS, stok, dan keuangan SEMAR.

> **Status: tahap desain.** Belum ada kode aplikasi. Yang ada baru preview tampilan dan aset desain.

**Preview orb:** https://achphoria.github.io/semar-gareng/

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

## Isi repo

- `index.html`: preview orb (buka di TV/HP, coba tombol "Pakai mic asli")
- `design/gareng/`: desain maskot Gareng (PNG/SVG tampak depan dan belakang) dan [panduan membuat 3D di Meshy](design/gareng/PANDUAN-MESHY.md)
