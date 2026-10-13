# Gareng → 3D di Meshy

File di folder ini:
- `gareng-front.png`: tampak depan (gambar UTAMA untuk Meshy)
- `gareng-back.png`: tampak belakang (gambar tambahan untuk Multi-view)
- `*.svg`: file sumber vektor, kalau mau diedit (warna, baju) di Figma, Illustrator, atau Inkscape

## Langkah

1. **Image to 3D**
   - Upload `gareng-front.png` sebagai gambar utama.
   - Kalau model yang dipilih mendukung **Multi-view**, tambahkan `gareng-back.png`.
     (Tidak semua versi model Meshy mendukung Multi-view. Kalau tidak ada, cukup pakai gambar depan.)
   - Klik **Remove Background** di semua gambar.
   - Pose: **A-pose** (supaya mudah di-rig).
   - Generate beberapa varian, lalu pilih yang wajah dan hidungnya paling mirip.

2. **Prompt** (kalau ada kolom teks/texture prompt, pakai bahasa Inggris):

   ```
   Cute chibi 3D mascot, Gareng from Javanese punakawan, friendly young man,
   big round bulbous nose, large expressive eyes slightly cross-eyed, black hair
   with a small top bun tied with a gold band, warm brown skin, teal short-sleeve
   shirt with gold V-neck trim, glowing cyan leaf emblem on the chest, orange-red
   waist sash with gold buckle, brown batik parang sarong to the knees with front
   pleats, dark slippers with red straps, A-pose, full body, stylized Pixar-like,
   smooth clean surfaces, soft clay material, white background
   ```

   Negative prompt (kalau ada): `realistic, scary, extra fingers, extra limbs, thin parts, text, multiple characters`

3. **Rapikan untuk web** (karena dijalankan di mini PC di belakang TV):
   - Remesh / polycount: target **± 30.000 triangle** (maksimal 50 ribu)
   - Tekstur **2K**
   - Ukuran file GLB idealnya **di bawah 10 MB**

4. **Rigging & animasi** (menu Animate / Rig, pilih karakter **humanoid**)
   Kalau diminta menandai titik tubuh, ikuti petunjuk Meshy (dagu, pergelangan, siku, lutut, selangkangan).
   Animasi yang dibutuhkan kiosk:
   | Nama file | Kapan dipakai |
   |---|---|
   | `idle` | diam menunggu pelanggan (bernapas, sedikit bergoyang) |
   | `wave` | menyapa saat pelanggan mendekat |
   | `talk` | saat Gareng bicara (gerak tangan menjelaskan) |
   | `think` | saat AI sedang memproses |
   | `happy` | pesanan berhasil / pembayaran lunas |

5. **Export**: pilih **GLB** untuk setiap animasi (atau satu GLB berisi semua animasi kalau Meshy menyediakan), lalu simpan ke folder ini.

## Catatan penting
- **Auto-rig Meshy tidak menggerakkan wajah/mulut.** Untuk gerak mulut saat bicara (lip-sync), nanti ada dua pilihan:
  (a) menambah *shape key* mulut di Blender, atau (b) trik di sisi web (kepala mengangguk, cahaya emblem berdenyut mengikuti suara).
  Kirim GLB-nya ke aku dulu, nanti aku cek mana yang paling pas.
- Ciri asli Gareng (tangan bengkok, kaki pincang) sengaja diperhalus supaya ramah pelanggan dan mudah di-rig.
  Ciri khas yang dipertahankan: hidung bulat besar, mata sedikit juling, dan kuncung.
