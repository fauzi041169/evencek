# Script membuat 1 file ZIP produksi - format standar Windows (bisa di-extract)
# Output: eventcekserver-deploy.zip

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$zipName = "eventcekserver-deploy.zip"
$zipPath = Join-Path (Split-Path $projectRoot -Parent) $zipName
$tmpDir = Join-Path $env:TEMP "eventcekserver_deploy_$(Get-Random)"

Write-Host "`n=== Membuat ZIP Produksi (format Windows) ===" -ForegroundColor Cyan
Write-Host "Output: $zipPath`n" -ForegroundColor Gray

# Hapus zip lama
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }

# Folder/file yang TIDAK disertakan
$excludeDirs = @('node_modules', '.git', 'vendor', 'storage\logs', 'storage\framework\sessions', 
    'storage\framework\cache', 'storage\framework\views', 'storage\framework\testing', 
    'storage\debugbar', 'public\hot', 'public\storage', 'public\storage_old', 'public\D_', 
    'public\cgi-bin', '.idea', '.vscode', '.cursor', 'dist_temp', 'dist_production')
$excludeDirNames = @('node_modules', '.git', 'vendor', 'logs', 'sessions', 'cache', 'views', 
    'testing', 'debugbar', 'hot', 'storage_old', 'D_', 'cgi-bin', '.idea', '.vscode', '.cursor')
$excludeFiles = @('.env', '*.log', '*.sql', '*.sqlite', 'Homestead.json', 'Homestead.yaml', 
    '.phpunit.result.cache', 'npm-debug.log', 'yarn-error.log', 'find_method.php', '*.zip')

function Should-ExcludePath {
    param($relPath)
    if (!$relPath) { return $false }
    # Exclude by folder name in path
    foreach ($d in $excludeDirNames) {
        if ($relPath -like "*\$d\*" -or $relPath -like "*\$d") { return $true }
    }
    # Exclude public/storage (symlink), storage_old, storage_backup_*, D_, cgi-bin
    if ($relPath -like "public\storage_*" -or $relPath -eq "public\storage") { return $true }
    if ($relPath -like "public\D_*" -or $relPath -like "public\cgi-bin*") { return $true }
    # Exclude storage subdirs
    if ($relPath -like "storage\logs*" -or $relPath -like "storage\framework\sessions*") { return $true }
    if ($relPath -like "storage\framework\cache*" -or $relPath -like "storage\framework\views*") { return $true }
    if ($relPath -like "storage\framework\testing*" -or $relPath -like "storage\debugbar*") { return $true }
    if ($relPath -like "public\hot*") { return $true }
    return $false
}

function Should-ExcludeFile {
    param($name)
    if ($name -eq '.env' -or $name -like '.env.*') { return $true }
    if ($name -match '\.(log|sql|sqlite)$') { return $true }
    if ($name -in @('Homestead.json', 'Homestead.yaml', '.phpunit.result.cache', 'find_method.php')) { return $true }
    if ($name -like '*.zip') { return $true }
    return $false
}

try {
    Write-Host "Menyalin file ke folder sementara..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null

    $count = 0
    Get-ChildItem -Path $projectRoot -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
        $rel = $_.FullName.Substring($projectRoot.Length + 1)
        if (Should-ExcludePath $rel) { return }
        if ($_.PSIsContainer) {
            $dest = Join-Path $tmpDir $rel
            if (!(Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
        } else {
            if (Should-ExcludeFile $_.Name) { return }
            $dest = Join-Path $tmpDir $rel
            $destDir = Split-Path $dest -Parent
            if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
            Copy-Item $_.FullName $dest -Force -ErrorAction SilentlyContinue
            $count++
            if ($count % 500 -eq 0) { Write-Host "  $count file..." -ForegroundColor Gray }
        }
    }

    Write-Host "Membuat ZIP (Compress-Archive)..." -ForegroundColor Yellow
    Compress-Archive -Path "$tmpDir\*" -DestinationPath $zipPath -CompressionLevel Optimal -Force

    if (Test-Path $zipPath) {
        $size = (Get-Item $zipPath).Length / 1MB
        Write-Host "`nBerhasil!" -ForegroundColor Green
        Write-Host "File  : $zipPath" -ForegroundColor Green
        Write-Host "Ukuran: $([math]::Round($size, 2)) MB" -ForegroundColor Green
        Write-Host "`nFormat ZIP standar - bisa di-extract dengan Windows Explorer" -ForegroundColor Gray
    }
} catch {
    Write-Host "`nError: $_" -ForegroundColor Red
    exit 1
} finally {
    if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue }
}
