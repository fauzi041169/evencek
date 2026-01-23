<?php
use App\Models\Province;
use App\Models\Profile;
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$p = Province::first();
echo "Province ID Type: " . gettype($p->id) . "\n";
echo "Province ID Value: " . $p->id . "\n";

$profile = Profile::whereNotNull('province_id')->first();
if ($profile) {
    echo "Profile Province ID Type: " . gettype($profile->province_id) . "\n";
    echo "Profile Province ID Value: " . $profile->province_id . "\n";
    
    // Check Relation
    $rel = $profile->province;
    if ($rel) {
        echo "Relation Works! Found: " . $rel->name . "\n";
    } else {
        echo "Relation FAILED.\n";
        // Manual check
        $manual = Province::where('id', $profile->province_id)->first();
        if ($manual) {
            echo "Manual Lookup Works. Found: " . $manual->name . "\n";
            echo "Likely mismatch in types? Province ID is " . $manual->id . " vs Profile stored " . $profile->province_id . "\n";
        } else {
            echo "Manual Lookup ALSO Failed. Invalid ID stored in profile.\n";
        }
    }
} else {
    echo "No profiles with province_id found.\n";
}
