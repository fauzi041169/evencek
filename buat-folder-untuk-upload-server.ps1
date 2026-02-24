# Script membuat folder "Untuk Upload Server" - berisi file dan folder untuk upload pertama ke server
# Jalankan: .\buat-folder-untuk-upload-server.ps1

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$outDir = Join-Path $projectRoot "Untuk Upload Server"

Write-Host "`n=== Membuat Folder 'Untuk Upload Server' ===" -ForegroundColor Cyan
Write-Host "Output: $outDir`n" -ForegroundColor Gray

# Hapus folder lama. Jika terkunci (file dipakai), output ke parent folder
if (Test-Path $outDir) {
    Write-Host "Menghapus folder lama..." -ForegroundColor Gray
    Remove-Item $outDir -Recurse -Force -ErrorAction SilentlyContinue
    if (Test-Path $outDir) {
        $outDir = Join-Path (Split-Path $projectRoot -Parent) "Untuk Upload Server"
        Write-Host "Folder lama terkunci. Output dialihkan ke: $outDir" -ForegroundColor Yellow
        if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force -ErrorAction SilentlyContinue }
    }
}

# Folder/file yang TIDAK disertakan (tidak perlu di-upload ke server)
$excludeDirNames = @('node_modules', '.git', 'vendor', 'logs', 'sessions', 'cache', 'views', 
    'testing', 'debugbar', 'hot', 'storage_old', 'D_', 'cgi-bin', '.idea', '.vscode', '.cursor', 
    'Untuk Upload Server', 'dist_temp', 'dist_production', 'tests', '.github', 'coverage', 
    'storage_backup', 'storage_backup_old')

function Should-ExcludePath {
    param($relPath)
    if (!$relPath) { return $false }
    foreach ($d in $excludeDirNames) {
        if ($relPath -eq $d -or $relPath -like "$d\*" -or $relPath -like "*\$d\*" -or $relPath -like "*\$d") { return $true }
    }
    if ($relPath -like "public\storage_*" -or $relPath -eq "public\storage") { return $true }
    if ($relPath -like "public\D_*" -or $relPath -like "public\cgi-bin*") { return $true }
    if ($relPath -like "storage\logs*" -or $relPath -like "storage\framework\sessions*") { return $true }
    if ($relPath -like "storage\framework\cache*" -or $relPath -like "storage\framework\views*") { return $true }
    if ($relPath -like "storage\framework\testing*" -or $relPath -like "storage\debugbar*") { return $true }
    if ($relPath -like "public\hot*") { return $true }
    if ($relPath -like "storage_backup*" -or $relPath -like "*\storage_backup\*" -or $relPath -like "*\storage_backup") { return $true }
    return $false
}

function Should-ExcludeFile {
    param($name)
    if ($name -eq '.env' -or $name -like '.env.*') { return $true }
    if ($name -match '\.(log|sql|sqlite)$') { return $true }
    if ($name -in @('Homestead.json', 'Homestead.yaml', '.phpunit.result.cache', 'find_method.php', 'phpunit.xml', '.gitignore')) { return $true }
    if ($name -in @('STRUKTUR_BARU.md', '.editorconfig', 'Thumbs.db', '.DS_Store')) { return $true }
    if ($name -like '*.zip') { return $true }
    if ($name -like '*.ps1') { return $true }
    if ($name -like 'test_*.php') { return $true }
    return $false
}

try {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    Write-Host "Menyalin file dan folder yang diperlukan..." -ForegroundColor Yellow

    $count = 0
    Get-ChildItem -Path $projectRoot -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
        $rel = $_.FullName.Substring($projectRoot.Length + 1)
        if ($rel -like "Untuk Upload Server*") { return }
        if (Should-ExcludePath $rel) { return }
        if ($_.PSIsContainer) {
            $dest = Join-Path $outDir $rel
            if (!(Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
        } else {
            if (Should-ExcludeFile $_.Name) { return }
            $dest = Join-Path $outDir $rel
            $destDir = Split-Path $dest -Parent
            if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
            Copy-Item $_.FullName $dest -Force -ErrorAction SilentlyContinue
            $count++
            if ($count % 500 -eq 0 -and $count -gt 0) { Write-Host "  $count file..." -ForegroundColor Gray }
        }
    }

    # Tambahkan .env.example jika ada (untuk referensi di server)
    if (Test-Path (Join-Path $projectRoot ".env.example")) {
        Copy-Item (Join-Path $projectRoot ".env.example") (Join-Path $outDir ".env.example") -Force
    }

    # Buat README panduan upload
    $readmeContent = @"
================================================================================
PANDUAN UPLOAD KE SERVER (Deploy Pertama)
================================================================================

ISI FOLDER INI yang perlu di-upload ke server (bukan folder "Untuk Upload Server" sendiri).
Upload ke: public_html/ atau /var/www/html/

LANGKAH SETELAH UPLOAD:
1. cp .env.example .env   (lalu edit .env - database, APP_KEY, dll)
2. composer install --no-dev --optimize-autoloader
3. php artisan key:generate
4. php artisan storage:link
5. php artisan config:cache
6. php artisan route:cache
7. php artisan view:cache
8. chmod -R 775 storage bootstrap/cache
9. Arahkan document root ke folder public/

YANG TIDAK DISERTAKAN (buat di server):
- vendor/    -> composer install
- .env       -> cp .env.example .env
- public/storage -> php artisan storage:link

Lihat DEPLOY_INSTRUKSI.md untuk detail lengkap.
"@
    $readmeContent | Out-File -FilePath (Join-Path $outDir "README-UPLOAD.txt") -Encoding UTF8

    $sizeMB = [math]::Round((Get-ChildItem -Path $outDir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
    Write-Host "`nBerhasil!" -ForegroundColor Green
    Write-Host "Folder: $outDir" -ForegroundColor Green
    Write-Host "Ukuran: $sizeMB MB | $count file" -ForegroundColor Green
    Write-Host "`n--- Yang DISERTAKAN ---" -ForegroundColor Yellow
    Write-Host "  - app, bootstrap, config, database, public, resources, routes" -ForegroundColor Gray
    Write-Host "  - storage (struktur folder, tanpa sessions/cache/views/logs)" -ForegroundColor Gray
    Write-Host "  - artisan, composer.json, composer.lock, package.json, vite.config.js" -ForegroundColor Gray
    Write-Host "  - .env.example (rename jadi .env di server)" -ForegroundColor Gray
    Write-Host "  - public/build (file hasil npm run build)" -ForegroundColor Gray
    Write-Host "`n--- Yang TIDAK disertakan (buat di server) ---" -ForegroundColor Yellow
    Write-Host "  - vendor (jalankan: composer install --no-dev)" -ForegroundColor Gray
    Write-Host "  - node_modules (tidak perlu di server jika public/build sudah ada)" -ForegroundColor Gray
    Write-Host "  - .env (buat dari .env.example)" -ForegroundColor Gray
    Write-Host "  - public/storage (jalankan: php artisan storage:link)" -ForegroundColor Gray
    Write-Host "`n--- Cara upload ke server ---" -ForegroundColor Cyan
    Write-Host "  1. Upload ISI folder 'Untuk Upload Server' ke public_html/ atau /var/www/html/" -ForegroundColor Gray
    Write-Host "  2. Di server: cp .env.example .env lalu edit .env" -ForegroundColor Gray
    Write-Host "  3. Di server: composer install --no-dev --optimize-autoloader" -ForegroundColor Gray
    Write-Host "  4. Di server: php artisan key:generate" -ForegroundColor Gray
    Write-Host "  5. Di server: php artisan storage:link" -ForegroundColor Gray
    Write-Host "  6. Arahkan document root ke folder public/" -ForegroundColor Gray
} catch {
    Write-Host "`nError: $_" -ForegroundColor Red
    exit 1
}
