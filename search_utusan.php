<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$customFields = DB::table('custom_fields')->where('label', 'LIKE', '%utusan%')->orWhere('key', 'LIKE', '%utusan%')->get();

echo "Custom Fields matching 'utusan': " . $customFields->count() . "\n";
foreach ($customFields as $field) {
    echo "- ID: " . $field->id . " | Label: " . $field->label . " | Key: " . $field->key . "\n";
    // Check if this field is linked to activity 1VFD25
    $linked = DB::table('activity_custom_field')
        ->where('custom_field_id', $field->id)
        ->where('activity_id', '1VFD25')
        ->first();
    echo "  Linked to 1VFD25: " . ($linked ? 'YES' : 'NO') . "\n";
}

// Also check activity_users for 1VFD25 participants to see if utusan is in custom_data
$participant = DB::table('activity_users')
    ->where('activity_id', '1VFD25')
    ->whereNotNull('custom_data')
    ->first();

if ($participant) {
    echo "\nSample Custom Data for participant in 1VFD25:\n";
    echo $participant->custom_data . "\n";
} else {
    echo "\nNo custom_data found for participants in 1VFD25\n";
}
