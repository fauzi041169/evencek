<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$activity = DB::table('activities')->where('id', '1VFD25')->orWhere('uid', '1VFD25')->first();

if ($activity) {
    echo "Activity Found: " . $activity->name . "\n";
    echo "Column Settings: " . ($activity->column_settings ? $activity->column_settings : 'Empty') . "\n";
    
    // Check if it has any custom fields via the relationship table too (just to be sure)
    $customFields = DB::table('activity_custom_field')
        ->where('activity_id', $activity->id)
        ->count();
    echo "Custom Fields Relationship Count: " . $customFields . "\n";
} else {
    echo "Activity Not Found\n";
}
