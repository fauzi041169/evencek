<?php

use App\Models\User;
use App\Models\Profile;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$email = 'pgrisialingan@gmail.com';
$user = User::where('email', $email)->first();

if (!$user) {
    echo "User not found: $email\n";
    exit;
}

echo "User found: {$user->name} (ID: {$user->id})\n";

$profile = $user->profile;

if (!$profile) {
    echo "Profile not found for user ID {$user->id}\n";
} else {
    echo "Profile found (ID: {$profile->id}):\n";
    echo "  Province ID: " . ($profile->province_id ?? 'NULL') . "\n";
    echo "  Regency ID: " . ($profile->regency_id ?? 'NULL') . "\n";
    echo "  District ID: " . ($profile->district_id ?? 'NULL') . "\n";
    echo "  Jenis Kelamin: " . ($profile->jenis_kelamin ?? 'NULL') . "\n";
    echo "  Alamat: " . ($profile->alamat ?? 'NULL') . "\n";
    
    if ($profile->province) {
        echo "  Province Name: " . $profile->province->name . "\n";
    } else {
        echo "  Province Relation: NULL\n";
    }

    if ($profile->regency) {
        echo "  Regency Name: " . $profile->regency->name . "\n";
    } else {
        echo "  Regency Relation: NULL\n";
    }
}
