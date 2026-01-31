<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Activity;

$activity = Activity::where('id', '1VFD25')->first();

if ($activity) {
    echo "Activity: " . $activity->name . "\n";
    echo "Column Settings:\n";
    $settings = $activity->column_settings;
    if (is_array($settings)) {
        foreach ($settings as $key => $value) {
            if ($value === true && strpos($key, 'col-custom-') === 0) {
                echo "- " . str_replace('col-custom-', '', $key) . "\n";
            }
        }
    } else {
        echo "No array settings found.\n";
    }
    
    // Check first participant for all keys in custom_data
    $participant = $activity->participants()->whereNotNull('custom_data')->first();
    if ($participant && $participant->custom_data) {
        echo "\nKeys found in participant custom_data:\n";
        foreach ($participant->custom_data as $key => $val) {
             echo "- " . $key . "\n";
        }
    }
}
