
$ErrorActionPreference = "Stop"
$source = Get-Location
$dest = "$source\dist_temp"
$zipFile = "$source\eventcek_production.zip"

Write-Host "Cleaning up previous build..."
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
if (Test-Path $zipFile) { Remove-Item $zipFile -Force }

Write-Host "Creating temp directory..."
New-Item -ItemType Directory -Path $dest | Out-Null

# Folders to copy completely
$folders = @("app", "bootstrap", "config", "database", "resources", "routes", "vendor", "lang")
foreach ($folder in $folders) {
    if (Test-Path "$source\$folder") {
        Write-Host "Copying $folder..."
        Copy-Item "$source\$folder" -Destination "$dest" -Recurse
    }
}

# Root files to copy
$files = @(
    "artisan", "composer.json", "composer.lock", "package.json", "package-lock.json",
    "vite.config.js", "vite.config.ts", "vite.config.mjs",
    "tailwind.config.js", "tailwind.config.cjs", "tailwind.config.mjs",
    "postcss.config.js", "postcss.config.cjs", "postcss.config.mjs",
    ".env.example", ".env.production.example"
)
foreach ($file in $files) {
    if (Test-Path "$source\$file") {
        Write-Host "Copying $file..."
        Copy-Item "$source\$file" -Destination "$dest"
    }
}

# Setup Storage (Structure only)
Write-Host "Setting up storage..."
$storageDirs = @(
    "storage\app\public",
    "storage\framework\cache",
    "storage\framework\sessions",
    "storage\framework\testing",
    "storage\framework\views",
    "storage\logs"
)
foreach ($dir in $storageDirs) {
    $path = "$dest\$dir"
    New-Item -ItemType Directory -Path $path -Force | Out-Null
    # Create .gitignore to keep dir
    Set-Content -Path "$path\.gitignore" -Value "*`r`n!.gitignore"
}

# Setup Public
Write-Host "Setting up public..."
New-Item -ItemType Directory -Path "$dest\public" | Out-Null
$publicItems = @("build", "assets", "css", "js", "images", "fonts")
foreach ($item in $publicItems) {
    if (Test-Path "$source\public\$item") {
        Copy-Item "$source\public\$item" -Destination "$dest\public" -Recurse
    }
}
$publicFiles = @("index.php", ".htaccess", "robots.txt", "favicon.ico")
foreach ($file in $publicFiles) {
    if (Test-Path "$source\public\$file") {
        Copy-Item "$source\public\$file" -Destination "$dest\public"
    }
}

# Create Zip
Write-Host "Zipping files..."
Set-Location $dest
tar -a -c -f $zipFile *
Set-Location $source

Write-Host "Cleaning up temp directory..."
Remove-Item $dest -Recurse -Force

Write-Host "Done! File created at: $zipFile"
