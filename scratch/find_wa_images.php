<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\ActivityMaterial;

$materials = ActivityMaterial::where('name', 'like', '%WhatsApp Image%')->get();
foreach ($materials as $m) {
    echo "Activity ID: " . $m->activity_id . " | UID: " . $m->uid . " | Name: " . $m->name . " | Type: " . ($m->file_type ?? 'NULL') . "\n";
}
