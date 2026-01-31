<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $count = \DB::table('activities')->count();
    echo "Count: " . $count . "\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
