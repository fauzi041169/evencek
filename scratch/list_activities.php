<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Activity;

foreach(Activity::all() as $a) {
    echo $a->uid . ' | ' . $a->name . "\n";
}
