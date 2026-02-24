# Script membuat folder PRODUKSI - siap upload ke server
# Berisi: vendor, public/build, semua file Laravel, dan panduan deploy
# Jalankan: .\buat-folder-produksi.ps1

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$outDir = Join-Path $projectRoot "produksi"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  MEMBUAT FOLDER PRODUKSI" -ForegroundColor Cyan
Write-Host "  Siap upload ke server" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Hapus folder produksi lama
if (Test-Path $outDir) {
    Write-Host "Menghapus folder produksi lama..." -ForegroundColor Yellow
    Remove-Item $outDir -Recurse -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

# 1. Copy struktur file (exclude yang tidak perlu)
$excludeDirs = @('node_modules', '.git', 'vendor', 'produksi', 'tests', '.github', 
    'coverage', '.idea', '.vscode', '.cursor', 'dist_temp', 'dist_production',
    'storage\logs', 'storage\framework\sessions', 'storage\framework\cache\data',
    'storage\framework\views', 'storage\framework\testing', 'storage\debugbar')

$excludeFiles = @('.env', '.env.backup', '.env.production', '*.log', '*.sql', '*.sqlite',
    'Homestead.json', 'Homestead.yaml', '.phpunit.result.cache', 'npm-debug.log', 
    'yarn-error.log', 'Thumbs.db', '.DS_Store', 'find_method.php', '*.ps1')

function Get-RelativePath { param($full, $root)
    return $full.Substring($root.Length).TrimStart('\', '/')
}

function Should-Exclude {
    param($relPath, $isDir)
    foreach ($d in $excludeDirs) {
        if ($relPath -like "*\$d" -or $relPath -like "*\$d\*" -or $relPath -eq $d) { return $true }
    }
    if ($relPath -like "public\storage*" -or $relPath -like "public\hot*") { return $true }
    if ($relPath -like "public\cgi-bin*" -or $relPath -like "public\D_*") { return $true }
    if ($relPath -like "storage_backup*" -or $relPath -like "*\storage_backup\*") { return $true }
    return $false
}

Write-Host "[1/5] Menyalin file proyek..." -ForegroundColor Yellow
$count = 0
Get-ChildItem -Path $projectRoot -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
    $rel = Get-RelativePath $_.FullName $projectRoot
    if ($rel -like "produksi*") { return }
    if (Should-Exclude $rel $_.PSIsContainer) { return }
    
    if ($_.PSIsContainer) {
        $dest = Join-Path $outDir $rel
        if (!(Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
    } else {
        $excluded = $false
        foreach ($pat in $excludeFiles) {
            if ($_.Name -like $pat -or $_.Name -eq $pat) { $excluded = $true; break }
        }
        if ($excluded) { return }
        
        $dest = Join-Path $outDir $rel
        $destParent = Split-Path $dest -Parent
        if (!(Test-Path $destParent)) { New-Item -ItemType Directory -Path $destParent -Force | Out-Null }
        Copy-Item $_.FullName $dest -Force -ErrorAction SilentlyContinue
        $count++
        if ($count % 300 -eq 0 -and $count -gt 0) { Write-Host "    $count file..." -ForegroundColor Gray }
    }
}
Write-Host "    Selesai: $count file" -ForegroundColor Green

# 2. Composer install (vendor) di folder produksi
Write-Host "`n[2/5] Menjalankan composer install (no-dev)..." -ForegroundColor Yellow
Push-Location $outDir
try {
    & composer install --no-dev --optimize-autoloader --no-interaction 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Composer install gagal" }
    Write-Host "    Berhasil" -ForegroundColor Green
} catch {
    Write-Host "    GAGAL. Pastikan composer terpasang. Error: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# 3. NPM build (public/build) - build di folder asli lalu copy
Write-Host "`n[3/5] Build aset frontend (npm run build)..." -ForegroundColor Yellow
Push-Location $projectRoot
try {
    & npm run build 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "npm run build gagal" }
    if (Test-Path (Join-Path $projectRoot "public\build")) {
        $buildDest = Join-Path $outDir "public\build"
        if (Test-Path $buildDest) { Remove-Item $buildDest -Recurse -Force }
        Copy-Item (Join-Path $projectRoot "public\build") $buildDest -Recurse -Force
        Write-Host "    Berhasil (public/build disalin)" -ForegroundColor Green
    } else {
        Write-Host "    Peringatan: public/build tidak ditemukan" -ForegroundColor Yellow
    }
} catch {
    Write-Host "    GAGAL. Pastikan npm terpasang dan package.json valid. Error: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# 4. File .env untuk server
Write-Host "`n[4/5] Menyiapkan .env.example..." -ForegroundColor Yellow
$envExample = Join-Path $projectRoot ".env.production.example"
if (Test-Path $envExample) {
    Copy-Item $envExample (Join-Path $outDir ".env.example") -Force
} elseif (Test-Path (Join-Path $projectRoot ".env.example")) {
    Copy-Item (Join-Path $projectRoot ".env.example") (Join-Path $outDir ".env.example") -Force
}
Write-Host "    Berhasil" -ForegroundColor Green

# 5. Pastikan struktur storage & .gitkeep
Write-Host "`n[5/5] Membuat struktur storage..." -ForegroundColor Yellow
$storageDirs = @(
    "storage\app\public",
    "storage\framework\cache\data",
    "storage\framework\sessions",
    "storage\framework\views",
    "storage\logs",
    "bootstrap\cache"
)
foreach ($d in $storageDirs) {
    $fullPath = Join-Path $outDir $d
    if (!(Test-Path $fullPath)) { New-Item -ItemType Directory -Path $fullPath -Force | Out-Null }
    $gitkeep = Join-Path $fullPath ".gitkeep"
    if (!(Test-Path $gitkeep)) { "" | Out-File $gitkeep -Encoding ASCII }
}
Write-Host "    Berhasil" -ForegroundColor Green

# 6. Buat DEPLOY.md
$deployMd = @"
# Panduan Deploy ke Server

Folder **produksi** ini berisi semua file yang dibutuhkan. Upload seluruh isi folder ke server.

## Yang Sudah Ada
- vendor/ (dari composer install --no-dev)
- public/build/ (hasil npm run build)
- Semua file aplikasi Laravel
- .env.example (untuk di-copy ke .env)

## Langkah di Server (setelah upload)

### 1. Upload
Upload **isi folder produksi** ke server (misal: \`public_html/mtkeven\` atau \`/var/www/html/mtkeven\`)

### 2. Buat file .env
``````bash
cp .env.example .env
``````
Lalu edit \`.env\` dan isi:
- \`APP_KEY\` (jalan: \`php artisan key:generate\`)
- \`APP_URL\` (contoh: https://mtkn.adzkiatekno.com)
- \`DB_DATABASE\`, \`DB_USERNAME\`, \`DB_PASSWORD\`
- Lainnya sesuai hosting

### 3. Generate APP_KEY
``````bash
php artisan key:generate
``````

### 4. Storage link
``````bash
php artisan storage:link
``````

### 5. Permission
``````bash
chmod -R 775 storage bootstrap/cache
``````

### 6. Migrasi database (jika perlu)
``````bash
php artisan migrate --force
``````

### 7. Cache (opsional, untuk performa)
``````bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
``````

### 8. Document Root
**PENTING:** Arahkan document root ke folder **\`public\`**
- cPanel: Domains → Edit → Document Root: \`public_html/mtkeven/public\`
- Atau: \`/home/adzk1473/public_html/mtkeven/public\`

## Jika Masih Error 500
1. Set \`APP_DEBUG=true\` di .env sementara
2. Buka situs, lihat pesan error
3. Cek \`storage/logs/laravel.log\`
4. Pastikan PHP >= 8.2
5. Pastikan extension: openssl, pdo, mbstring, tokenizer, xml, ctype, json, fileinfo, gd, zip
"@
$deployMd | Out-File -FilePath (Join-Path $outDir "DEPLOY.md") -Encoding UTF8

# Ringkasan
$totalSize = [math]::Round((Get-ChildItem -Path $outDir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  SELESAI" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Folder : $outDir" -ForegroundColor White
Write-Host "Ukuran : $totalSize MB" -ForegroundColor White
Write-Host "`nLangkah selanjutnya:" -ForegroundColor Cyan
Write-Host "  1. Upload ISI folder 'produksi' ke server" -ForegroundColor Gray
Write-Host "  2. Di server: cp .env.example .env" -ForegroundColor Gray
Write-Host "  3. Edit .env (database, APP_URL)" -ForegroundColor Gray
Write-Host "  4. php artisan key:generate" -ForegroundColor Gray
Write-Host "  5. php artisan storage:link" -ForegroundColor Gray
Write-Host "  6. chmod -R 775 storage bootstrap/cache" -ForegroundColor Gray
Write-Host "  7. Arahkan document root ke folder public/" -ForegroundColor Gray
Write-Host "`nLihat DEPLOY.md di folder produksi untuk panduan lengkap.`n" -ForegroundColor Yellow
