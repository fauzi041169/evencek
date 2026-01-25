<?php

use App\Models\ActivityUser;

$activityId = 'D69I6B';

$users = ActivityUser::where('activity_id', $activityId)
    ->where('custom_data', 'like', '%importer_id%')
    ->get();

$importers = [];
foreach($users as $u) {
    $data = is_string($u->custom_data) ? json_decode($u->custom_data, true) : $u->custom_data;
    $imp = $data['importer_id'] ?? 'unknown';
    if (!isset($importers[$imp])) {
        $importers[$imp] = 0;
    }
    $importers[$imp]++;
}

print_r($importers);
