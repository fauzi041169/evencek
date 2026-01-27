<?php

$activity = App\Models\Activity::where('name', 'like', '%BPLP PGRI%')->first();

if ($activity) {
    echo "Found Activity: " . $activity->name . " (ID: " . $activity->id . ")\n";
    $settings = App\Models\CardSettings::where('activity_id', $activity->id)->get();
    echo "Settings count: " . $settings->count() . "\n";
    foreach($settings as $s) {
         echo " - Setting ID: " . $s->id . " | Batch: " . ($s->activity_batch_id ?? 'NULL') . "\n";
         $data = $s->card_setting;
         if (is_string($data)) $data = json_decode($data, true);
         echo "   Data Keys: " . implode(', ', array_keys($data ?? [])) . "\n";
    }
} else {
    echo "Activity with 'BPLP PGRI' not found.\n";
}
