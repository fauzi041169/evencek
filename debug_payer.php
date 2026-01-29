<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Activity;
use App\Models\ActivityUser;
use App\Models\Payment;

$payerId = 'FI1H61'; // From previous output
$activityId = '1VFD25'; 

echo "DEBUGGING PAYER STATUS ($payerId)...\n";

$au = ActivityUser::where('user_id', $payerId)
    ->where('activity_id', $activityId)
    ->first();

if ($au) {
    echo "Payer ActivityParticipantGroup ID: {$au->activity_participant_group_id}\n";
} else {
    echo "Payer ActivityUser NOT FOUND.\n";
}
