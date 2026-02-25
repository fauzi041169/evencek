# Server Troubleshooting Guide - EventCek

## 1. Error: "Provinsi tidak valid" atau "No regencies found"
**Penyebab:** Database server kehilangan data wilayah (Provinsi, Kabupaten, Kecamatan).
**Solusi:** Jalankan seeder untuk mengisi ulang data.

Langkah-langkah:
1. Masuk ke terminal server / SSH.
2. Masuk ke direktori project.
3. Jalankan perintah berikut:

```bash
# Mengisi data Provinsi (Cepat & Wajib untuk fix error save)
php artisan db:seed --class=ProvinceSeeder

# Mengisi data Kabupaten/Kecamatan (Lama & Butuh Internet)
# Perintah ini mengambil data dari API eksternal, bisa memakan waktu lama.
php artisan db:seed --class=RegionSeeder
```

## 2. Error: Foto Profil Gagal Upload / 500 Server Error
**Penyebab:** Masalah izin folder (permission) atau symlink storage belum dibuat.
**Solusi:** Perbaiki permission dan link storage.

Langkah-langkah:
```bash
# 1. Pastikan folder storage bisa ditulis
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# 2. Buat symlink storage (agar file bisa diakses publik)
php artisan storage:link

# 3. Bersihkan cache aplikasi
php artisan optimize:clear
```

## 3. Error: Tampilan / Aset Berantakan (CSS/JS)
**Penyebab:** Cache browser atau aset build belum terupdate.
**Solusi:**
1. Pastikan `npm run build` sudah dijalankan di lokal dan dipush.
2. Di server, lakukan `git pull`.
3. Clear cache di browser pengguna.

## 4. Gambar Kegiatan / Berita / Bukti Transfer Tidak Tampil di Hosting (Di Local Normal)

**Penyebab umum:** Di local gambar tampil karena symlink `public/storage` ada dan file upload ada di `storage/app/public/`. Di hosting sering terjadi:

1. **Symlink storage belum dibuat**  
   URL seperti `/storage/activities/xxx.jpg` mengarah ke `public/storage`. Folder `public/storage` **tidak** ikut Git (ada di `.gitignore`), jadi harus dibuat di server dengan perintah berikut.

2. **File upload tidak ikut deploy**  
   Gambar yang di-upload di komputer Anda disimpan di `storage/app/public/activities/` (dan folder sejenis). Isi folder `storage/` **tidak** di-push ke Git. Jadi file yang di-upload hanya ada di local, tidak otomatis ada di server.

**Solusi:**

```bash
# 1. Wajib: buat symlink agar /storage/* bisa diakses browser
php artisan storage:link

# 2. Pastikan permission benar (Linux)
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
# (ganti www-data dengan user web server Anda jika beda)

# 3. Clear cache
php artisan config:clear
php artisan cache:clear
```

**Cek symlink sudah ada:**

```bash
ls -la public/storage
# Harus tampil: public/storage -> ../storage/app/public
```

**Error: "The [public/storage] link already exists"**

Artisan menolak membuat link karena sudah ada yang namanya `public/storage`. Sering kali itu **bukan** symlink melainkan **folder biasa** (misalnya ikut upload dari Windows). Kalau iya, file di `storage/app/public` tidak terbaca lewat web.

Perbaikan di server:

```bash
cd ~/public_html/mtkeven   # sesuaikan path project Anda

# 1. Cek apakah yang ada symlink atau folder
ls -la public/storage
# Jika tampil "storage -> ../storage/app/public" = symlink (OK).
# Jika tampil "drwxr-xr-x ... storage" = folder biasa (harus diganti).

# 2. Hapus public/storage yang sekarang (backup dulu jika isinya penting)
rm -rf public/storage

# 3. Buat symlink yang benar
php artisan storage:link

# 4. Cek lagi
ls -la public/storage
# Harus: public/storage -> ../storage/app/public
```

**Error: "Call to undefined function ... exec()"**

Hosting sering mematikan fungsi PHP `exec()` untuk keamanan. Artisan `storage:link` memakai `exec()` jadi gagal.

**Solusi: buat symlink manual lewat SSH**

Jalankan dari **root project** (mis. `~/public_html/mtkeven`):

```bash
cd ~/public_html/mtkeven
ln -s ../storage/app/public public/storage
```

Lalu cek:

```bash
ls -la public/storage
# Harus tampil: public/storage -> ../storage/app/public
```

Jika `public/storage` sudah ada (folder biasa), hapus dulu lalu buat link:

```bash
rm -rf public/storage
ln -s ../storage/app/public public/storage
```

**Error: "bash: fork: retry: Resource temporarily unavailable"**

Artinya server tidak bisa membuat proses baru (limit proses atau memori habis). Perintah di SSH bisa gagal atau tidak jalan.

- **Coba lagi nanti** saat lalu lintas rendah (mis. dini hari).
- **Buat symlink lewat File Manager** (cPanel / panel hosting): masuk ke `public_html/mtkeven/public`, hapus folder `storage` jika ada, lalu buat **Symbolic Link** dengan target `../storage/app/public` (nama link: `storage`). Cara tepat tergantung panel; jika tidak ada opsi symlink, minta bantuan support hosting.
- **Hubungi support hosting** untuk cek limit proses/user atau agar mereka yang membuatkan symlink `public/storage` → `storage/app/public`.

**Jika gambar tetap tidak ada di server:**

- Gambar yang di-upload **hanya di local** tidak ikut ke hosting. Pilihan:
  - **Upload ulang** gambar kegiatan/berita/bukti transfer lewat aplikasi di situs production, atau
  - **Salin file** dari local ke server (rsync/scp) ke folder yang sama, misalnya:
    - `storage/app/public/activities/`
    - `storage/app/public/news/images/`
    - dll sesuai path yang dipakai aplikasi.

**Pastikan di server (.env):**

- `APP_URL` sama dengan URL asli situs (mis. `https://eventcek.com`) — tanpa slash di akhir.

---

## 5. Debugging Log
Jika masih error, cek log error detail di:
`storage/logs/laravel.log`
