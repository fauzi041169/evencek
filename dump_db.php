<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Activity;

try {
    $activities = Activity::limit(5)->get();
    $data = "Total activities: " . Activity::count() . "\n";
    foreach ($activities as $a) {
        $data .= "ID: " . $a->id . " | UID: " . ($a->uid ?? 'N/A') . " | Name: " . $a->name . "\n";
    }
    
    $target = Activity::where('id', '1VFD25')->first() ?? Activity::where('uid', '1VFD25')->first();
    if ($target) {
        $data .= "\nTarget Found!\n";
        $data .= "ID: " . $target->id . " | Name: " . $target->name . "\n";
        $customFields = $target->customFields;
        $data .= "Custom Fields Count: " . $customFields->count() . "\n";
        foreach ($customFields as $field) {
            $data .= "- " . $field->label . " (" . $field->key . ")\n";
        }
    } else {
        $data .= "\nTarget NOT found (searched id and uid columns)\n";
    }
    
    file_put_contents('db_dump.txt', $data);
} catch (\Exception $e) {
    file_put_contents('db_dump.txt', "Error: " . $e->getMessage());
}
