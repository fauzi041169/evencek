<?php

use App\Models\ActivityCommitteeStructure;
use App\Models\Activity;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Ambil activity pertama
$activity = Activity::first();
if (!$activity) {
    echo "No activity found.\n";
    exit;
}
$activityId = $activity->id;

echo "Checking committee stats for activity ID: $activityId\n";

if (Schema::hasTable('activity_committee_structures')) {
    $committees = ActivityCommitteeStructure::where('activity_id', $activityId)
        ->with(['user.profile'])
        ->get();

    $userIds = $committees->pluck('user_id')->filter()->unique();
    echo "Found " . $committees->count() . " committee members.\n";

    // ... (Logika perhitungan disederhanakan untuk fokus ke foto) ...
    
    // Count registrations by payment sender_name (NEW LOGIC)
    $paymentCounts = [];
    if (Schema::hasTable('payments') && Schema::hasColumn('payments', 'sender_name')) {
        $committeeNames = $committees->map(function($member) {
            return strtolower(trim((string)($member->user ? $member->user->name : $member->name)));
        })->filter()->unique()->values();

        $paymentCounts = DB::table('payments')
            ->where('activity_id', $activityId)
            ->where('status', 'success')
            ->whereIn(DB::raw('LOWER(sender_name)'), $committeeNames)
            ->select(DB::raw('LOWER(sender_name) as name'), DB::raw('count(*) as total'))
            ->groupBy(DB::raw('LOWER(sender_name)'))
            ->pluck('total', 'name')
            ->toArray();
    }
    
    // Simulate mapping
    $committee_stats = $committees->map(function ($member) use ($paymentCounts) {
        $userId = $member->user_id;
        $name = $member->user ? $member->user->name : $member->name;
        $normalizedName = strtolower(trim((string)$name));
        
        $payCount = ($paymentCounts[$normalizedName] ?? 0);
        $aksesCount = $member->lama_akses ?? 0;

        // Determine profile photo URL
        $profilePhotoUrl = null;
        if ($member->user) {
            if ($member->user->profile && $member->user->profile->foto_url) {
                $profilePhotoUrl = $member->user->profile->foto_url;
            } elseif ($member->user->avatar) {
                $profilePhotoUrl = $member->user->avatar;
            } else {
                 $profilePhotoUrl = 'https://ui-avatars.com/api/?name='.urlencode($name).'&color=7F9CF5&background=EBF4FF';
            }
        } else {
             $profilePhotoUrl = 'https://ui-avatars.com/api/?name='.urlencode($name).'&color=7F9CF5&background=EBF4FF';
        }

        return [
            'name' => $name,
            'akses' => $aksesCount,
            'pay_count' => $payCount,
            'profile_photo_url' => $profilePhotoUrl,
            'has_user' => (bool)$member->user,
            'has_profile' => $member->user ? (bool)$member->user->profile : false,
        ];
    })->sortByDesc('akses')->values()->take(5);

    foreach ($committee_stats as $stat) {
        echo "Name: " . $stat['name'] . "\n";
        echo "Has User: " . ($stat['has_user'] ? 'Yes' : 'No') . "\n";
        echo "Has Profile: " . ($stat['has_profile'] ? 'Yes' : 'No') . "\n";
        echo "Photo URL: " . $stat['profile_photo_url'] . "\n";
        echo "Pay Count: " . $stat['pay_count'] . "\n";
        echo "Akses: " . $stat['akses'] . "\n";
        echo "------------------------\n";
    }
} else {
    echo "Table activity_committee_structures not found.\n";
}
