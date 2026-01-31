<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Activity;

$activity = Activity::where('id', '1VFD25')->first();

if ($activity) {
    echo "Activity: " . $activity->name . "\n";
    echo "Custom Fields Relationship (Count: " . $activity->customFields()->count() . "):\n";
    foreach ($activity->customFields as $field) {
        echo "- Label: " . $field->label . " | Key: " . $field->key . "\n";
    }
    
    echo "\nColumn Settings:\n";
    echo json_encode($activity->column_settings, JSON_PRETTY_PRINT) . "\n";
    
    echo "\nMandatory Profile Fields:\n";
    echo json_encode($activity->mandatory_profile_fields, JSON_PRETTY_PRINT) . "\n";
} else {
    echo "Not Found\n";
}
