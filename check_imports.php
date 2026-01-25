<?php

use App\Models\ActivityUser;

$activityId = 'D69I6B';
$targetUserId = '7O5KP6'; // Inda Siregar

$users = ActivityUser::where('activity_id', $activityId)
    ->where('custom_data', 'like', '%importer_id%')
    ->get();

$count = 0;
foreach($users as $u) {
    $data = is_string($u->custom_data) ? json_decode($u->custom_data, true) : $u->custom_data;
    if (($data['importer_id'] ?? null) == $targetUserId) {
        $count++;
    }
}

echo "Imported Count for Inda ({$targetUserId}): " . $count . PHP_EOL;

// Check super karyawan as well
$superId = 'EF862U';
$countSuper = 0;
foreach($users as $u) {
    $data = is_string($u->custom_data) ? json_decode($u->custom_data, true) : $u->custom_data;
    if (($data['importer_id'] ?? null) == $superId) {
        $countSuper++;
    }
}
echo "Imported Count for Super Karyawan ({$superId}): " . $countSuper . PHP_EOL;
