# Script membuat FOLDER siap upload - TANPA ZIP, langsung copy
# Hasil: eventcekserver-SIAP-UPLOAD (folder yang bisa langsung di-upload ke server)
# Tidak perlu extract - langsung upload folder ini via FTP/File Manager

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$outDir = Join-Path (Split-Path $projectRoot -Parent) "eventcekserver-SIAP-UPLOAD"

Write-Host "`n=== Membuat Folder Siap Upload (tanpa ZIP) ===" -ForegroundColor Cyan
Write-Host "Output: $outDir`n" -ForegroundColor Gray

# Hapus folder lama
if (Test-Path $outDir) {
    Write-Host "Menghapus folder lama..." -ForegroundColor Gray
    Remove-Item $outDir -Recurse -Force
}

# Folder/file yang TIDAK disertakan
$excludeDirNames = @('node_modules', '.git', 'vendor', 'logs', 'sessions', 'cache', 'views', 
    'testing', 'debugbar', 'hot', 'storage_old', 'D_', 'cgi-bin', '.idea', '.vscode', '.cursor')

function Should-ExcludePath {
    param($relPath)
    if (!$relPath) { return $false }
    foreach ($d in $excludeDirNames) {
        if ($relPath -like "*\$d\*" -or $relPath -like "*\$d") { return $true }
    }
    if ($relPath -like "public\storage_*" -or $relPath -eq "public\storage") { return $true }
    if ($relPath -like "public\D_*" -or $relPath -like "public\cgi-bin*") { return $true }
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
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    Write-Host "Menyalin file (hanya program, tanpa sampah)..." -ForegroundColor Yellow

    $count = 0
    Get-ChildItem -Path $projectRoot -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
        $rel = $_.FullName.Substring($projectRoot.Length + 1)
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
            if ($count % 2000 -eq 0 -and $count -gt 0) { Write-Host "  $count file..." -ForegroundColor Gray }
        }
    }

    $sizeMB = [math]::Round((Get-ChildItem -Path $outDir -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
    Write-Host "`nBerhasil!" -ForegroundColor Green
    Write-Host "Folder: $outDir" -ForegroundColor Green
    Write-Host "Ukuran: $sizeMB MB | $count file" -ForegroundColor Green
    Write-Host "`nCara upload ke server:" -ForegroundColor Yellow
    Write-Host "  1. Buka File Manager / FTP" -ForegroundColor Gray
    Write-Host "  2. Upload isi folder ini (bukan folder sendiri) ke public_html/mtkeven/" -ForegroundColor Gray
    Write-Host "  3. Atau zip folder ini manual, lalu upload zip" -ForegroundColor Gray
    Write-Host "`nTidak perlu extract - folder sudah siap!" -ForegroundColor Cyan
} catch {
    Write-Host "`nError: $_" -ForegroundColor Red
    exit 1
}
