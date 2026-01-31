<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$activity = App\Models\Activity::where('id', '1VFD25')->orWhere('uid', '1VFD25')->first();
if (!$activity) die("Activity not found\n");
$usersWithCustomData = App\Models\ActivityUser::where('activity_id', $activity->id)
    ->whereNotNull('custom_data')
    ->get();

echo "Activity: " . $activity->name . "\n";
echo "Users with custom data: " . $usersWithCustomData->count() . "\n";
if ($usersWithCustomData->count() > 0) {
    echo "Sample custom data from first user:\n";
    print_r($usersWithCustomData->first()->custom_data);
}
