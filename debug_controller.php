<?php

use App\Models\ActivityUser;
use App\Models\Activity;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Adjust Activity ID as needed, based on previous findings it is "D69I6B"
// But ActivityUser uses the integer ID usually, checking the UID mapping
$activityUid = 'D69I6B';
$activity = Activity::where('uid', $activityUid)->first();

if (!$activity) {
    echo "Activity not found\n";
    exit;
}

echo "Activity ID: " . $activity->id . "\n";

$query = ActivityUser::where('activity_id', $activity->id);
$participants = $query->orderBy('created_at', 'desc')->paginate(15);

echo "Participants found: " . $participants->count() . "\n";

try {
    $participants->load([
        'user.profile.province',
        'user.profile.regency',
        'user.profile.district',
        'batch',
        'participantGroup'
    ]);
    echo "Load successful\n";
    
    // Check first item
    if ($participants->isNotEmpty()) {
        $p = $participants->first();
        echo "First User: " . ($p->user ? $p->user->name : 'NULL') . "\n";
        echo "Profile: " . ($p->user->profile ? 'YES' : 'NO') . "\n";
        echo "Province: " . ($p->user->profile->province ? $p->user->profile->province->name : 'NULL') . "\n";
        echo "Regency: " . ($p->user->profile->regency ? $p->user->profile->regency->name : 'NULL') . "\n";
    }

} catch (\Exception $e) {
    echo "Load failed: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
