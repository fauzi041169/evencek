# Fitur Pengisian Jenis Kelamin Otomatis

Fitur ini memungkinkan Anda untuk mengisi jenis kelamin peserta yang masih kosong berdasarkan nama mereka menggunakan AI.

## Cara Penggunaan

### 1. Melalui Command Line (Artisan)

Anda dapat menggunakan command artisan untuk mengisi jenis kelamin secara batch:

```bash
# Isi semua jenis kelamin yang kosong
php artisan gender:fill

# Isi jenis kelamin untuk activity tertentu
php artisan gender:fill --activity=KODE_ACTIVITY

# Batasi jumlah record yang diproses
php artisan gender:fill --limit=100

# Dry run (tidak menyimpan perubahan, hanya melihat hasil prediksi)
php artisan gender:fill --dry-run

# Kombinasi
php artisan gender:fill --activity=KODE_ACTIVITY --limit=50 --dry-run
```

### 2. Melalui Web Interface (API)

Anda dapat memanggil endpoint API untuk mengisi jenis kelamin peserta dalam suatu activity:

**Endpoint:** `POST /activity/{activityId}/participants/fill-gender`

**Headers:**
- `Authorization: Bearer {token}` (jika menggunakan API token)
- `X-CSRF-TOKEN: {csrf_token}` (jika menggunakan web session)

**Response:**
```json
{
  "success": true,
  "message": "Berhasil mengisi 45 jenis kelamin dari 50 peserta yang kosong.",
  "stats": {
    "success": 45,
    "failed": 5,
    "skipped": 100,
    "total": 50
  }
}
```

## Konfigurasi AI

Fitur ini menggunakan AI untuk prediksi jenis kelamin. Untuk mengaktifkan AI, tambahkan konfigurasi berikut di file `.env`:

```env
# Aktifkan AI Gender Prediction
AI_GENDER_ENABLED=true

# API Key (OpenAI atau compatible API)
AI_GENDER_API_KEY=your-api-key-here

# API URL (default: OpenAI)
AI_GENDER_API_URL=https://api.openai.com/v1/chat/completions

# Model yang digunakan
AI_GENDER_MODEL=gpt-3.5-turbo
```

Jika AI tidak diaktifkan atau gagal, sistem akan menggunakan prediksi lokal berdasarkan database nama Indonesia.

## Cara Kerja

1. Sistem mencari semua peserta dengan jenis kelamin kosong
2. Untuk setiap peserta, sistem mengambil nama dari data user
3. Nama dikirim ke AI (jika diaktifkan) atau diproses dengan algoritma lokal
4. Hasil prediksi (L untuk Laki-laki, P untuk Perempuan) disimpan ke database
5. Sistem memberikan laporan statistik hasil pengisian

## Catatan Penting

- Prediksi tidak 100% akurat, terutama untuk nama yang ambigu
- Sistem akan melewati (skip) peserta yang sudah memiliki jenis kelamin
- Hanya admin, superadmin, dan creator activity yang dapat menggunakan fitur ini
- Gunakan `--dry-run` untuk melihat hasil prediksi tanpa menyimpan perubahan

## Troubleshooting

### AI tidak berfungsi
- Pastikan `AI_GENDER_ENABLED=true` di file `.env`
- Pastikan API key valid
- Cek log di `storage/logs/laravel.log` untuk error detail

### Prediksi tidak akurat
- Sistem menggunakan database nama Indonesia untuk prediksi lokal
- Untuk nama asing atau tidak umum, hasil mungkin kurang akurat
- Anda dapat mengedit manual setelah prediksi otomatis

### Permission denied
- Pastikan user yang menjalankan memiliki role admin, superadmin, atau creator activity
- Untuk command artisan, tidak ada pembatasan permission
