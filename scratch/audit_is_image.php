<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\ActivityMaterial;

$materials = ActivityMaterial::where('name', 'like', '%WhatsApp Image%')->get();
foreach ($materials as $m) {
    echo "ID: " . $m->id . " | Name: " . $m->name . " | Type: " . ($m->file_type ?? 'NULL') . " | isImage: " . ($m->isImage() ? 'YES' : 'NO') . "\n";
}
