<?php

use App\Models\User;
use App\Models\ActivityUser;
use App\Models\Activity;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$email = 'pgrisialingan@gmail.com';
$user = User::where('email', $email)->first();

if (!$user) {
    echo json_encode(['error' => 'User not found']);
    exit;
}

$activityUsers = ActivityUser::where('user_id', $user->id)->get();

$data = [
    'user' => [
        'id' => $user->id,
        'name' => $user->name,
        'email' => $user->email,
        'profile_exists' => (bool)$user->profile,
        'profile_province_id' => $user->profile?->province_id,
        'profile_province_relation' => $user->profile?->province?->name,
    ],
    'activity_registrations' => []
];

foreach ($activityUsers as $au) {
    if ($au->user) {
         // Force load
        $au->load('user.profile.province');
    }

    $data['activity_registrations'][] = [
        'activity_id' => $au->activity_id,
        'activity_uid' => $au->activity?->uid,
        'status' => $au->status,
        'relation_check' => [
             'user_loaded' => (bool)$au->user,
             'profile_loaded' => (bool)$au->user?->profile,
             'province_loaded' => (bool)$au->user?->profile?->province,
             'province_name' => $au->user?->profile?->province?->name,
        ]
    ];
}

echo json_encode($data, JSON_PRETTY_PRINT);
