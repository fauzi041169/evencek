# Instruksi Deploy ke Server

## A. Deploy Pertama (Git Clone – direkomendasikan)

Lebih ringan dan cepat dibanding upload ZIP. Pastikan kode sudah di-push ke GitHub/GitLab.

### 1. Clone di server
```bash
cd /var/www/html   # atau folder web Anda

# Clone (shallow = hanya commit terakhir, lebih hemat)
git clone --depth 1 https://github.com/USERNAME/eventcekserver.git
cd eventcekserver
```

### 2. Setup di server
```bash
cd eventcekserver

# Install dependensi PHP
composer install --no-dev --optimize-autoloader

# Build frontend (jika ada Node.js) - atau skip jika public/build sudah di-commit
npm ci && npm run build

# Salin .env dan edit
cp .env.example .env
nano .env   # Sesuaikan DB, APP_KEY, dll

# Generate key
php artisan key:generate

# Buat symlink storage
php artisan storage:link

# Cache untuk production
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Permission
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

### 3. Document root
Arahkan document root ke folder **public** (misalnya `/var/www/html/eventcekserver/public`).

---

## A2. Upload ZIP Split (jika 1 file ZIP terlalu besar)

Jika hosting membatasi ukuran upload (misal max 500 MB), gunakan ZIP yang dipecah:

### Buat file split (di komputer)
```powershell
.\buat-zip-split.ps1
```
Hasilnya: `part1-core`, `part2a-public-base`, `part2b-public-build`, `part2c-public-assets` (atau part2c-assets-1, part2c-assets-2 jika dipecah), `part3-resources`, `part4-lainnya` — masing-masing di bawah 500 MB.

**Catatan:** `public/storage` dan `storage_old` tidak disertakan (biasanya dibuat di server dengan `php artisan storage:link`).

### Upload & extract di server
1. Upload semua file part ke folder (misal `public_html/mtkeven/`).
2. Extract berurutan:
```bash
cd public_html/mtkeven
unzip -o eventcekserver-part1-core.zip
unzip -o eventcekserver-part2a-public-base.zip
unzip -o eventcekserver-part2b*.zip
unzip -o eventcekserver-part2c*.zip
unzip -o eventcekserver-part3-resources.zip
unzip -o eventcekserver-part4-lainnya.zip
```
3. Setup seperti biasa (composer, .env, php artisan, dll).

---

## B. Repo Private?
- **HTTPS**: `git clone https://TOKEN@github.com/user/repo.git`
- **SSH**: `git clone git@github.com:user/repo.git` (perlu setup SSH key di server)

---

## C. Update dari GitHub (setelah pertama)

```bash
cd /var/www/html/eventcekserver

# Pull perubahan
git pull origin main

# Update dependensi
composer install --no-dev --optimize-autoloader
npm ci && npm run build

# Clear & rebuild cache
php artisan config:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## Checklist sebelum produksi
- [ ] `APP_ENV=production`
- [ ] `APP_DEBUG=false`
- [ ] Database credentials benar
- [ ] `php artisan storage:link` sudah dijalankan
- [ ] Cron untuk `php artisan schedule:run` (jika pakai scheduler)
