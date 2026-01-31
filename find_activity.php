<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$activity = DB::table('activities')->where('id', '1VFD25')->orWhere('uid', '1VFD25')->first();

if ($activity) {
    echo "Activity Found: " . $activity->name . " (ID: " . $activity->id . ")\n";
    
    // Check custom fields
    $customFields = DB::table('activity_custom_field')
        ->join('custom_fields', 'activity_custom_field.custom_field_id', '=', 'custom_fields.id')
        ->where('activity_custom_field.activity_id', $activity->id)
        ->select('custom_fields.*', 'activity_custom_field.is_required')
        ->get();
        
    echo "Custom Fields Count: " . $customFields->count() . "\n";
    foreach ($customFields as $field) {
        echo "- " . $field->label . " (" . $field->key . ") [Type: " . $field->type . "]\n";
    }
} else {
    echo "Activity 1VFD25 Not Found\n";
    // Show some existing IDs
    $ids = DB::table('activities')->pluck('id', 'uid');
    echo "Available IDs/UIDs:\n";
    foreach ($ids as $uid => $id) {
        echo "ID: $id | UID: $uid\n";
    }
}
