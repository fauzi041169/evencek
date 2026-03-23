<?php

$root = dirname(__DIR__, 2);

require $root.'/vendor/autoload.php';
$app = require_once $root.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $count = \DB::table('activities')->count();
    echo 'Count: '.$count."\n";
} catch (\Exception $e) {
    echo 'Error: '.$e->getMessage()."\n";
}
