<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$activity = DB::table('activities')->where('id', '1VFD25')->first();

if ($activity) {
    echo "Activity: " . $activity->name . "\n";
    echo "---------------------------------\n";
    foreach ((array)$activity as $key => $value) {
        if ($key == 'column_settings' || $key == 'mandatory_profile_fields') {
            echo "$key: " . $value . "\n";
        }
    }
    
    // Check for custom fields in the pivot table
    $pivotCount = DB::table('activity_custom_field')->where('activity_id', '1VFD25')->count();
    echo "Custom Fields (Pivot): $pivotCount\n";
    
    // Check if there are any responses for this activity that might indicate custom data
    $responsesCount = DB::table('activity_users')->where('activity_id', '1VFD25')->whereNotNull('custom_data')->count();
    if ($responsesCount == 0 && Schema::hasColumn('activity_users', 'custom_data')) {
         // check if custom_data exists but might be empty array
         $responsesCount = DB::table('activity_users')->where('activity_id', '1VFD25')->count();
    }
    echo "Participants Count: " . DB::table('activity_users')->where('activity_id', '1VFD25')->count() . "\n";
} else {
    echo "Not Found\n";
}
