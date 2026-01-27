<?php

$activity = App\Models\Activity::where('name', 'like', '%RAKORNAS%')->first();

if (!$activity) {
    // Fallback to taking the first one if not found, or maybe just list them better
    $activity = App\Models\Activity::latest()->first();
}

if ($activity) {
    echo "Using Activity ID: " . $activity->id . " Name: " . $activity->name . "\n";
    
    $settings = App\Models\CardSettings::where('activity_id', $activity->id)->get();
    echo "Found " . $settings->count() . " settings rows.\n";
    
    foreach($settings as $s) {
        $batchId = $s->activity_batch_id ?? 'NULL';
        $content = json_decode(json_encode($s->card_setting), true);
        if (is_string($content)) $content = json_decode($content, true);
        
        $keys = is_array($content) ? array_keys($content) : [];
        $elementCount = 0;
        foreach($keys as $k) {
            if ($k !== 'card') $elementCount++;
        }
        
        echo " - Row ID: {$s->id} | Batch: {$batchId} | Elements: {$elementCount} | Keys: " . implode(', ', $keys) . "\n";
    }

} else {
    echo "No activity found.\n";
}
