<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Activity;

try {
    $activity = Activity::where('uid', '1VFD25')->first();
    if ($activity) {
        $data = "Activity Found: " . $activity->name . "\n";
        $customFields = $activity->customFields;
        $data .= "Custom Fields Count: " . $customFields->count() . "\n";
        foreach ($customFields as $field) {
            $data .= "- " . $field->label . " (" . $field->key . ")\n";
        }
    } else {
        $data = "Activity Not Found\n";
    }
    file_put_contents('debug_output.txt', $data);
} catch (\Exception $e) {
    file_put_contents('debug_output.txt', "Error: " . $e->getMessage());
}
