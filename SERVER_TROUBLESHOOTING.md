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

## 4. Debugging Log
Jika masih error, cek log error detail di:
`storage/logs/laravel.log`
