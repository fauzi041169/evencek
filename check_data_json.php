<?php

use App\Models\User;
use App\Models\Profile;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$emails = [
    'pgrisialingan@gmail.com',
    'nurhasanumar18@gmail.com',
    'aminsukendar@gmail.com',
    'juli.suprijadi@gmail.com',
    'pgrikabkaranganyar@gmail.com',
    'mrnirat@gmail.com'
];

$results = [];

foreach ($emails as $email) {
    $user = User::where('email', $email)->first();
    if (!$user) {
        $results[$email] = ['error' => 'User not found'];
        continue;
    }

    $profile = $user->profile;
    if (!$profile) {
        $results[$email] = ['user_id' => $user->id, 'error' => 'Profile not found'];
        continue;
    }

    $results[$email] = [
        'user_id' => $user->id,
        'profile_id' => $profile->id,
        'province_id' => $profile->province_id,
        'regency_id' => $profile->regency_id,
        'district_id' => $profile->district_id,
        'province_name' => $profile->province ? $profile->province->name : null,
        'regency_name' => $profile->regency ? $profile->regency->name : null,
        'district_name' => $profile->district ? $profile->district->name : null,
        'has_province_relation' => (bool)$profile->province,
        'has_regency_relation' => (bool)$profile->regency,
    ];
}

echo json_encode($results, JSON_PRETTY_PRINT);
