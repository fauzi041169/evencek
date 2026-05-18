<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\ActivityMaterial;
use App\Models\Activity;

$activityUid = '97P3HJ'; // The one from the user's report
$activity = Activity::where('uid', $activityUid)->first();

if (!$activity) {
    echo "Activity not found by UID $activityUid\n";
    // Try 3A8U8K from my previous search
    $activity = Activity::where('uid', '3A8U8K')->first();
}

if ($activity) {
    echo "Activity: " . $activity->name . " (ID: " . $activity->id . ", UID: " . $activity->uid . ")\n";
    $materials = ActivityMaterial::where('activity_id', $activity->id)->get();
    foreach ($materials as $m) {
        echo "UID: " . $m->uid . " | Name: " . $m->name . " | Type: " . ($m->file_type ?? 'NULL') . " | isImage: " . ($m->isImage() ? 'YES' : 'NO') . "\n";
    }
} else {
    echo "Activity not found.\n";
}
