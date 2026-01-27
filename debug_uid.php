<?php

$uid = 'D69I6B';
$activity = App\Models\Activity::where('uid', $uid)->first();

if (!$activity) {
    echo "Activity with UID $uid not found.\n";
    exit;
}

echo "Activity Found: {$activity->name} (ID: {$activity->id})\n";

// Check Batches
$batches = App\Models\ActivityBatch::where('activity_id', $activity->id)->get();
echo "Batches (" . $batches->count() . "):\n";
foreach($batches as $b) {
    echo " - Batch ID: {$b->id} | Name: {$b->name}\n";
}

// Check Card Settings
$settings = App\Models\CardSettings::where('activity_id', $activity->id)->get();
echo "Card Settings (" . $settings->count() . "):\n";

if ($settings->isEmpty()) {
    echo "NO CARD SETTINGS FOUND FOR THIS ACTIVITY!\n";
}

foreach($settings as $s) {
    echo " - Setting ID: {$s->id} | Batch ID: " . ($s->activity_batch_id ?? 'NULL') . "\n";
    
    $cs = $s->card_setting;
    if (is_string($cs)) $cs = json_decode($cs, true);
    
    if (is_array($cs)) {
        echo "   Content Keys: " . implode(', ', array_keys($cs ?? [])) . "\n";
        // Check if 'card' key exists and if other keys exist
        $hasElements = false;
        foreach($cs as $k => $v) {
            if ($k !== 'card') $hasElements = true;
        }
        echo "   Has key 'card': " . (isset($cs['card']) ? 'YES' : 'NO') . "\n";
        echo "   Has other elements: " . ($hasElements ? 'YES' : 'NO') . "\n";
    } else {
        echo "   Content is not an array (Request format logic might be wrong)\n";
    }
}
