<?php

use App\Models\ActivityUser;
use App\Models\Activity;
use App\Models\User;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Find the activity by UID D69I6B
$activity = Activity::where('uid', 'D69I6B')->first();
if (!$activity) {
    // Try finding by ID directly if it's the ID
    $activity = Activity::find('D69I6B');
}

if (!$activity) {
    echo "Activity 'D69I6B' not found via UID or ID.\n";
    // List first 5 activities to see format
    echo "Available Activities:\n";
    foreach(Activity::take(5)->get() as $act) {
        echo " - ID: {$act->id}, UID: {$act->uid}, Name: {$act->name}\n";
    }
    exit;
}

echo "Found Activity: {$activity->name} (ID: {$activity->id}, UID: {$activity->uid})\n";

// Get participants
$participants = ActivityUser::where('activity_id', $activity->id)
    ->orderBy('created_at', 'desc')
    ->take(5) // Just take 5 for test
    ->get();

echo "Participants count: " . $participants->count() . "\n";

if ($participants->isEmpty()) {
    exit;
}

// Test loading relations EXACTLY as in controller
try {
    echo "Attempting eager load...\n";
    $participants->load([
        'user.profile.province',
        'user.profile.regency',
        'user.profile.district',
        'batch',
        'participantGroup'
    ]);
    echo "Eager load SUCCESS.\n";
    
    foreach ($participants as $p) {
        $userName = $p->user ? $p->user->name : 'NO USER';
        $profile = $p->user ? $p->user->profile : null;
        $prov = $profile ? ($profile->province ? $profile->province->name : 'NO PROV REL') : 'NO PROFILE';
        $reg = $profile ? ($profile->regency ? $profile->regency->name : 'NO REG REL') : 'NO PROFILE';
        
        echo "User: $userName | Prov: $prov | Reg: $reg\n";
        
        if ($profile && !$profile->province) {
            echo "  Debug Profile Province ID: " . $profile->province_id . "\n";
            // Check if Province exists
            if ($profile->province_id) {
                $actualProv = \App\Models\Province::find($profile->province_id);
                echo "  Actual Province in DB: " . ($actualProv ? $actualProv->name : 'NOT FOUND') . "\n";
            }
        }
    }

} catch (\Exception $e) {
    echo "Eager load FAILED: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
