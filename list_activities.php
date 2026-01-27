<?php

echo "Listing Activities:\n";
try {
    $activities = App\Models\Activity::all();
    foreach($activities as $a) {
        $uid = $a->uid ?? 'NO_UID';
        echo "ID: {$a->id} | UID: {$uid} | Name: {$a->name}\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
