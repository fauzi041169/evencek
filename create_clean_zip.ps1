$source = Get-Location
$dest = "$source\dist_clean"
$zipFile = "$source\eventcek_production_ready_v2.zip"

# Clean up previous attempts
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
if (Test-Path $zipFile) { Remove-Item $zipFile -Force }

New-Item -ItemType Directory -Path $dest | Out-Null

# 1. Copy Core Folders (Including Vendor)
$folders = @("app", "bootstrap", "config", "database", "resources", "routes", "tests", "vendor")
foreach ($folder in $folders) {
    if (Test-Path "$source\$folder") {
        Write-Output "Copying $folder..."
        Copy-Item -Path "$source\$folder" -Destination "$dest\$folder" -Recurse -Force
    }
}

# 1b. CLEANUP bootstrap/cache (CRITICAL)
# Remove cached config files that might contain local paths
$bootstrapCache = "$dest\bootstrap\cache"
if (Test-Path $bootstrapCache) {
    Get-ChildItem -Path $bootstrapCache -File | Where-Object { $_.Name -ne ".gitignore" } | Remove-Item -Force
}

# 2. Copy Root Files
$files = @("artisan", "composer.json", "composer.lock", "package.json", "vite.config.js")
foreach ($file in $files) {
    if (Test-Path "$source\$file") {
        Copy-Item -Path "$source\$file" -Destination "$dest\$file" -Force
    }
}

# 3. Create Corrected .env File
$envContent = @"
APP_NAME=EVENCEK
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://m.eventcek.com
LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=info

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=
DB_USERNAME=
DB_PASSWORD=

BROADCAST_DRIVER=log
CACHE_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=database
SESSION_DRIVER=file
"@
Set-Content -Path "$dest\.env" -Value $envContent

# 4. Create Root .htaccess (Redirect to Public)
$htaccessContent = @"
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^(.*)$ public/$1 [L]
</IfModule>
"@
Set-Content -Path "$dest\.htaccess" -Value $htaccessContent

# 6. Handle Public Folder
New-Item -ItemType Directory -Path "$dest\public" | Out-Null
$publicFiles = @("index.php", ".htaccess", "robots.txt")
foreach ($file in $publicFiles) {
    if (Test-Path "$source\public\$file") {
        Copy-Item -Path "$source\public\$file" -Destination "$dest\public\$file" -Force
    }
}

# Copy public subdirectories except assets and storage
$publicDirs = Get-ChildItem -Path "$source\public" -Directory | Where-Object { $_.Name -notin @("assets", "storage", "storage_old") }
foreach ($dir in $publicDirs) {
    Copy-Item -Path $($dir.FullName) -Destination "$dest\public\$($dir.Name)" -Recurse -Force
}

# Handle public/assets
New-Item -ItemType Directory -Path "$dest\public\assets" | Out-Null
if (Test-Path "$source\public\assets\fonts") {
    Copy-Item -Path "$source\public\assets\fonts" -Destination "$dest\public\assets\fonts" -Recurse -Force
}
New-Item -ItemType Directory -Path "$dest\public\assets\images" | Out-Null

# Handle Images (Only Defaults)
$assetImagesDirs = Get-ChildItem -Path "$source\public\assets\images" -Directory
foreach ($dir in $assetImagesDirs) {
    $dirName = $dir.Name
    $destDir = "$dest\public\assets\images\$dirName"
    New-Item -ItemType Directory -Path $destDir | Out-Null
    
    if ($dirName -eq "profilefoto") {
        if (Test-Path "$($dir.FullName)\default-profile.png") {
            Copy-Item -Path "$($dir.FullName)\default-profile.png" -Destination "$destDir\default-profile.png" -Force
        }
    }
    elseif ($dirName -eq "profilecover") {
        if (Test-Path "$($dir.FullName)\default.png") {
            Copy-Item -Path "$($dir.FullName)\default.png" -Destination "$destDir\default.png" -Force
        }
    }
    else {
        Copy-Item -Path "$($dir.FullName)\*" -Destination "$destDir" -Recurse -Force
    }
}
# Root images in assets/images
Get-ChildItem -Path "$source\public\assets\images" -File | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination "$dest\public\assets\images" -Force
}

# 7. Create Storage Structure
$storageDirs = @(
    "storage\app\public",
    "storage\framework\cache\data",
    "storage\framework\sessions",
    "storage\framework\views",
    "storage\logs"
)
foreach ($dir in $storageDirs) {
    $fullPath = "$dest\$dir"
    New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
    Set-Content -Path "$fullPath\.gitignore" -Value "*`r`n!.gitignore"
}

# 8. Wait and Zip
Start-Sleep -Seconds 3
Write-Output "Zipping files..."
Compress-Archive -Path "$dest\*" -DestinationPath $zipFile -Force

$size = (Get-Item $zipFile).Length / 1MB
Write-Output "DONE. Zip created: $zipFile"
Write-Output "Size: $("{0:N2}" -f $size) MB"

# Cleanup
Remove-Item $dest -Recurse -Force
