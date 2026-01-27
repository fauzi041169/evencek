<?php

$id = 'D69I6B';
$activity = App\Models\Activity::find($id);

if (!$activity) {
    echo "Activity with ID $id not found.\n";
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
    // Decode if string
    if (is_string($cs)) $cs = json_decode($cs, true);
    
    // Check elements
    if (is_array($cs)) {
        // Count keys other than 'card'
        $elementKeys = array_filter(array_keys($cs), function($k) { return $k !== 'card'; });
        echo "   Content Keys: " . implode(', ', array_keys($cs)) . "\n";
        echo "   Element Count: " . count($elementKeys) . "\n";
        
        if (count($elementKeys) > 0) {
            echo "   First Element: " . $elementKeys[0] . "\n";
        }
    } else {
        echo "   Invalid setting format (not array/json)\n";
    }
}
