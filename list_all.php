<?php
echo "Activity List:\n";
$activities = App\Models\Activity::all();
foreach($activities as $a) {
    echo "ID: {$a->id} | UID: {$a->uid} | Name: {$a->name}\n";
}
