<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Activity;
use App\Models\ActivityUser;

echo "--- Debugging Activity Participants Data Integrity ---\n";

$activity = Activity::where('name', 'like', '%Rakernas%')->first();
$participants = ActivityUser::where('activity_id', $activity->id)
    ->with('user')
    ->limit(10)
    ->get();

echo "Checking first 10 participants:\n";
foreach ($participants as $p) {
    echo "ID: " . $p->id . " | UserID: " . $p->user_id . " | User Loaded: " . ($p->user ? 'YES (' . $p->user->name . ')' : 'NO') . "\n";
}

$countWithUser = ActivityUser::where('activity_id', $activity->id)->has('user')->count();
echo "Total participants with valid user: $countWithUser\n";
