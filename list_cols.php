<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Schema;

$data = "activity_users: " . implode(', ', Schema::getColumnListing('activity_users')) . "\n\n";
$data .= "profiles: " . implode(', ', Schema::getColumnListing('profiles')) . "\n";
file_put_contents('cols_output.txt', $data);
