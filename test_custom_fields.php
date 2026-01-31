<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$activity = App\Models\Activity::where('id', '1VFD25')->orWhere('uid', '1VFD25')->first();
if (!$activity) die("Activity not found\n");

echo "Activity: " . $activity->name . "\n";
echo "Activity ID: " . $activity->id . "\n\n";

// Test the custom_fields attribute
echo "=== Custom Fields (via attribute) ===\n";
$customFields = $activity->custom_fields;
echo "Count: " . count($customFields) . "\n";
foreach ($customFields as $field) {
    echo "- {$field['label']} (key: {$field['key']}, type: {$field['type']}, required: " . ($field['is_required'] ? 'yes' : 'no') . ")\n";
}

echo "\n=== Column Settings ===\n";
$columnSettings = $activity->column_settings ?? [];
$customCols = array_filter($columnSettings, function($key) {
    return str_starts_with($key, 'col-custom-');
}, ARRAY_FILTER_USE_KEY);
echo "Custom columns enabled: " . count($customCols) . "\n";
foreach ($customCols as $key => $enabled) {
    echo "- $key: " . ($enabled ? 'enabled' : 'disabled') . "\n";
}

echo "\n=== Sample Participant Custom Data ===\n";
$participant = App\Models\ActivityUser::where('activity_id', $activity->id)
    ->whereNotNull('custom_data')
    ->first();
if ($participant) {
    echo "Custom data keys: " . implode(', ', array_keys($participant->custom_data)) . "\n";
}
