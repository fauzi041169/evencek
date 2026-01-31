<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Simulate what the edit controller does
$activity = App\Models\Activity::where('id', '1VFD25')->orWhere('uid', '1VFD25')->first();
if (!$activity) die("Activity not found\n");

// This is what gets called in the controller
$activity->append('custom_fields');

echo "=== EDIT PAGE DATA ===\n";
echo "Activity: {$activity->name}\n";
echo "ID: {$activity->id}\n\n";

echo "Custom Fields (as would appear in edit page):\n";
$customFields = $activity->custom_fields;
echo "Total: " . count($customFields) . "\n\n";

if (count($customFields) > 0) {
    foreach ($customFields as $index => $field) {
        echo ($index + 1) . ". {$field['label']}\n";
        echo "   Key: {$field['key']}\n";
        echo "   Type: {$field['type']}\n";
        echo "   Required: " . ($field['is_required'] ? 'Yes' : 'No') . "\n";
        echo "   Optional: " . ($field['is_optional'] ? 'Yes' : 'No') . "\n";
        if (!empty($field['options'])) {
            echo "   Options: {$field['options']}\n";
        }
        echo "\n";
    }
} else {
    echo "No custom fields found.\n";
}

echo "\n=== VERIFICATION ===\n";
echo "✓ Custom fields loaded from relationship: " . 
    App\Models\CustomField::whereHas('activities', function($q) use ($activity) {
        $q->where('activities.id', $activity->id);
    })->count() . "\n";

echo "✓ Custom columns in column_settings: " . 
    count(array_filter($activity->column_settings ?? [], function($key) {
        return str_starts_with($key, 'col-custom-');
    }, ARRAY_FILTER_USE_KEY)) . "\n";

echo "\n✅ Edit page should display " . count($customFields) . " custom field(s)\n";
