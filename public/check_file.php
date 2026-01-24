<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

// Boot the application to load paths
$app->boot();

echo "Public Path: " . public_path() . "\n";
$filename = '1766884218.jpg';
$path = public_path('assets/images/profilefoto/' . $filename);
echo "Checking path: " . $path . "\n";
echo "File exists: " . (file_exists($path) ? 'YES' : 'NO') . "\n";
