# Script membuat deployment dalam beberapa ZIP (masing-masing di bawah 500 MB)
# Untuk upload ke server dengan limit file size

$projectRoot = $PSScriptRoot
$outDir = Split-Path $projectRoot -Parent
$maxSizeMB = 500

$excludeTar = @(
    'node_modules', '.git', 'vendor',
    'storage/logs', 'storage/framework/sessions', 'storage/framework/cache', 'storage/framework/views',
    '.env', '*.log'
)

function Get-TarExcludeArgs {
    return $excludeTar | ForEach-Object { "--exclude=$_" }
}

function Get-SizeMB { param($path) 
    if (Test-Path $path) { [math]::Round((Get-Item $path).Length / 1MB, 2) } else { 0 } 
}

Write-Host "`n=== Membuat ZIP Split (max $maxSizeMB MB per file) ===" -ForegroundColor Cyan
Write-Host "Output: $outDir`n" -ForegroundColor Gray

Set-Location $projectRoot

# --- Part 1: Core Laravel ---
Write-Host "[1/4] part1-core.zip (app, config, database, routes, dll)..." -ForegroundColor Yellow
$part1 = Join-Path $outDir "eventcekserver-part1-core.zip"
if (Test-Path $part1) { Remove-Item $part1 -Force }

$ex = Get-TarExcludeArgs
tar -a -c -f $part1 $ex `
    app bootstrap config database routes `
    storage .env.example artisan composer.json composer.lock `
    package.json package-lock.json phpunit.xml server.php `
    vite.config.js vite.config.ts tailwind.config.js postcss.config.js `
    DEPLOY_INSTRUKSI.md buat-zip-deploy.ps1 buat-zip-split.ps1 `
    .editorconfig .gitattributes .gitignore 2>$null

$s1 = Get-SizeMB $part1
Write-Host "      Selesai: $s1 MB" -ForegroundColor Green

# Part2: Exclude build, assets, storage* (folder besar - dipecah terpisah)
$publicExclude = @('build', 'assets', 'storage', 'storage_old', 'storage_backup_*', 'D_')

# --- Part 2a: Public base (index.php, images, js, css, templates) ---
Write-Host "[2a] part2a-public-base.zip..." -ForegroundColor Yellow
$part2a = Join-Path $outDir "eventcekserver-part2a-public-base.zip"
if (Test-Path $part2a) { Remove-Item $part2a -Force }

$tmpPublic = Join-Path $env:TEMP "public_base"
if (Test-Path $tmpPublic) { Remove-Item $tmpPublic -Recurse -Force }
New-Item -ItemType Directory -Path "$tmpPublic/public" -Force | Out-Null
Get-ChildItem -Path "public" | Where-Object { $publicExclude -notcontains $_.Name -and $_.Name -notlike "storage*" -and $_.Name -ne "D_" } | ForEach-Object {
    Copy-Item $_.FullName "$tmpPublic/public/" -Recurse -Force
}
tar -a -c -f $part2a $ex -C $tmpPublic public 2>$null
Remove-Item $tmpPublic -Recurse -Force -ErrorAction SilentlyContinue

$s2a = Get-SizeMB $part2a
Write-Host "      Selesai: $s2a MB" -ForegroundColor Green

# --- Part 2b: Public Build (split jika > 500 MB) ---
if (Test-Path "public/build") {
    $buildSize = (Get-ChildItem -Path "public/build" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $buildSizeMB = [math]::Round($buildSize / 1MB, 2)
    $part2bList = @()

    if ($buildSizeMB -le $maxSizeMB) {
        Write-Host "[2b/5] part2b-public-build.zip (public/build/)..." -ForegroundColor Yellow
        $part2b = Join-Path $outDir "eventcekserver-part2b-public-build.zip"
        if (Test-Path $part2b) { Remove-Item $part2b -Force }
        tar -a -c -f $part2b $ex -C $projectRoot public/build 2>$null
        $part2bList = @($part2b)
        Write-Host "      Selesai: $buildSizeMB MB" -ForegroundColor Green
    } else {
        # Split by size: kelompokkan file hingga ~450 MB per part
        $assetFiles = Get-ChildItem -Path "public/build/assets" -File -ErrorAction SilentlyContinue | Sort-Object Name
        $manifestPath = "public/build/manifest.json"
        $maxBytes = 450 * 1MB
        $chunks = @(); $current = @(); $currentSize = 0
        foreach ($f in $assetFiles) {
            if (($currentSize + $f.Length) -gt $maxBytes -and $current.Count -gt 0) {
                $chunks += ,@($current); $current = @(); $currentSize = 0
            }
            $current += $f; $currentSize += $f.Length
        }
        if ($current.Count -gt 0) { $chunks += ,@($current) }

        $partNum = 1
        foreach ($c in $chunks) {
            $p2b = Join-Path $outDir "eventcekserver-part2b-build-$partNum.zip"
            if (Test-Path $p2b) { Remove-Item $p2b -Force }
            Write-Host "[2b-$partNum] part2b-build-$partNum.zip..." -ForegroundColor Yellow
            $tmpDir = Join-Path $env:TEMP "build_part$partNum"
            if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
            New-Item -ItemType Directory -Path "$tmpDir/public/build/assets" -Force | Out-Null
            $c | ForEach-Object { Copy-Item $_.FullName "$tmpDir/public/build/assets/" -Force }
            if ($partNum -eq 1 -and (Test-Path $manifestPath)) {
                Copy-Item $manifestPath "$tmpDir/public/build/" -Force
            }
            tar -a -c -f $p2b $ex -C $tmpDir public 2>$null
            Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
            $part2bList += $p2b
            Write-Host "      Selesai: $(Get-SizeMB $p2b) MB" -ForegroundColor Green
            $partNum++
        }
    }
} else {
    $part2bList = @()
    Write-Host "[2b] public/build tidak ada, dilewati" -ForegroundColor Gray
}

# --- Part 2c: Public assets (jika ada, split jika > 500 MB) ---
$part2cList = @()
if (Test-Path "public/assets") {
    $assetSize = (Get-ChildItem -Path "public/assets" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $assetSizeMB = [math]::Round($assetSize / 1MB, 2)
    if ($assetSizeMB -le $maxSizeMB) {
        Write-Host "[2c] part2c-public-assets.zip..." -ForegroundColor Yellow
        $p2c = Join-Path $outDir "eventcekserver-part2c-public-assets.zip"
        if (Test-Path $p2c) { Remove-Item $p2c -Force }
        tar -a -c -f $p2c $ex -C $projectRoot public/assets 2>$null
        $part2cList = @($p2c)
        Write-Host "      Selesai: $assetSizeMB MB" -ForegroundColor Green
    } else {
        $assetFiles = Get-ChildItem -Path "public/assets" -Recurse -File -ErrorAction SilentlyContinue
        $maxBytes = 450 * 1MB
        $chunks = @(); $cur = @(); $curSz = 0
        foreach ($f in $assetFiles) {
            if (($curSz + $f.Length) -gt $maxBytes -and $cur.Count -gt 0) {
                $chunks += ,@($cur); $cur = @(); $curSz = 0
            }
            $cur += $f; $curSz += $f.Length
        }
        if ($cur.Count -gt 0) { $chunks += ,@($cur) }
        $pn = 1
        foreach ($c in $chunks) {
            $p2c = Join-Path $outDir "eventcekserver-part2c-assets-$pn.zip"
            if (Test-Path $p2c) { Remove-Item $p2c -Force }
            Write-Host "[2c-$pn] part2c-assets-$pn.zip..." -ForegroundColor Yellow
            $tmpD = Join-Path $env:TEMP "assets_part$pn"
            if (Test-Path $tmpD) { Remove-Item $tmpD -Recurse -Force }
            New-Item -ItemType Directory -Path "$tmpD/public/assets" -Force | Out-Null
            $assetsBase = (Resolve-Path "public/assets").Path
            $c | ForEach-Object {
                $rel = $_.FullName.Substring($assetsBase.Length + 1)
                $dest = Join-Path "$tmpD/public/assets" $rel
                $destDir = Split-Path $dest -Parent
                if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
                Copy-Item $_.FullName $dest -Force
            }
            tar -a -c -f $p2c $ex -C $tmpD public 2>$null
            Remove-Item $tmpD -Recurse -Force -ErrorAction SilentlyContinue
            $part2cList += $p2c
            Write-Host "      Selesai: $(Get-SizeMB $p2c) MB" -ForegroundColor Green
            $pn++
        }
    }
}

# --- Part 3: Resources ---
Write-Host "[3/5] part3-resources.zip (resources/)..." -ForegroundColor Yellow
$part3 = Join-Path $outDir "eventcekserver-part3-resources.zip"
if (Test-Path $part3) { Remove-Item $part3 -Force }

tar -a -c -f $part3 $ex -C $projectRoot resources
$s3 = Get-SizeMB $part3
Write-Host "      Selesai: $s3 MB" -ForegroundColor Green

# --- Part 4: Lainnya (tests, lang, dll) ---
Write-Host "[4/5] part4-lainnya.zip (tests, lang, dll)..." -ForegroundColor Yellow
$part4 = Join-Path $outDir "eventcekserver-part4-lainnya.zip"
if (Test-Path $part4) { Remove-Item $part4 -Force }

$extra = @()
if (Test-Path "tests") { $extra += "tests" }
if (Test-Path "lang") { $extra += "lang" }
# File root lainnya (kecuali yang sudah di part1)
$rootFiles = @('Procfile','webpack.mix.js','mix-manifest.json','vercel.json')
foreach ($f in $rootFiles) { if (Test-Path $f) { $extra += $f } }

if ($extra.Count -gt 0) {
    tar -a -c -f $part4 $ex $extra 2>$null
    $s4 = Get-SizeMB $part4
    Write-Host "      Selesai: $s4 MB" -ForegroundColor Green
} else {
    # Part4 kosong - buat file placeholder
    $placeholder = Join-Path $env:TEMP "PART4_KOSONG.txt"
    "Part 4 tidak berisi file tambahan. Extract part 1-3 saja sudah cukup." | Out-File $placeholder
    Compress-Archive -Path $placeholder -DestinationPath $part4 -Force
    Remove-Item $placeholder -Force -ErrorAction SilentlyContinue
    $s4 = Get-SizeMB $part4
    Write-Host "      Selesai: $s4 MB (kosong - opsional)" -ForegroundColor Gray
}

# --- Cek ukuran ---
$all = @($part1,$part2a) + $part2bList + $part2cList + @($part3,$part4) | Where-Object { Test-Path $_ }
$over = $all | Where-Object { (Get-Item $_).Length -gt ($maxSizeMB * 1MB) }

if ($over.Count -gt 0) {
    Write-Host "`nPERINGATAN: File berikut melebihi $maxSizeMB MB:" -ForegroundColor Red
    $over | ForEach-Object { Write-Host "  - $_ ($(Get-SizeMB $_) MB)" -ForegroundColor Red }
} else {
    Write-Host "`nSemua file di bawah $maxSizeMB MB." -ForegroundColor Green
}

$total = ($all | ForEach-Object { (Get-Item $_).Length } | Measure-Object -Sum).Sum / 1MB
Write-Host "`nTotal: $([math]::Round($total, 2)) MB" -ForegroundColor Cyan
Write-Host "File: $outDir\eventcekserver-part*.zip" -ForegroundColor Cyan
Write-Host "`nCara extract di server:" -ForegroundColor Yellow
Write-Host "  1. Upload semua part ke folder (misal mtkeven)"
Write-Host "  2. unzip -o eventcekserver-part1-core.zip"
Write-Host "  3. unzip -o eventcekserver-part2a-public-base.zip"
Write-Host "  4. unzip -o eventcekserver-part2b*.zip"
Write-Host "  5. unzip -o eventcekserver-part2c*.zip  (jika ada)"
Write-Host "  6. unzip -o eventcekserver-part3-resources.zip"
Write-Host "  7. unzip -o eventcekserver-part4-lainnya.zip"
Write-Host "  8. Jalankan: composer install, cp .env.example .env, php artisan key:generate, dll."
Write-Host ""
