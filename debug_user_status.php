<?php

use App\Models\User;
use App\Models\Activity;
use App\Models\ActivityUser;
use App\Models\Payment;

$emailPart = 'edsahejghmail'; 
$activityId = '1VFD25'; // This is actually the ID, not UID

$user = User::where('email', 'like', '%' . $emailPart . '%')->first();
$activity = Activity::find($activityId);

if ($activity) {
    echo "Activity found: {$activity->name} (ID: {$activity->id})\n";
    
    if ($user) {
        echo "User found: {$user->name} (ID: {$user->id}) Email: {$user->email}\n";

        $au = ActivityUser::where('user_id', $user->id)
            ->where('activity_id', $activity->id)
            ->first();

        if ($au) {
            echo "ActivityUser Status: {$au->status}\n";
            echo "ActivityParticipantGroup ID: {$au->activity_participant_group_id}\n";
        } else {
            echo "ActivityUser NOT FOUND for this user and activity.\n";
        }

        $payments = Payment::where('user_id', $user->id)
            ->where('activity_id', $activity->id)
            ->get();
        
        echo "Direct Payments: " . $payments->count() . "\n";
        foreach ($payments as $p) {
            echo "- Payment ID: {$p->id} | Status: {$p->status} | Amount: {$p->amount}\n";
            echo "  Notes: {$p->notes}\n";
        }

        // Check for Group Payments
        echo "Checking for Group Payments mentioning this user...\n";
        // Optimized search: search in notes column for user ID using LIKE
        $groupPayments = Payment::where('activity_id', $activity->id)
            ->where('notes', 'like', '%' . $user->id . '%')
            ->get();
            
        foreach ($groupPayments as $p) {
            echo "- Mentioned in Payment ID: {$p->id} (User ID: {$p->user_id}) | Status: {$p->status}\n";
            echo "  Notes: {$p->notes}\n";
        }

    } else {
        echo "User with email like '$emailPart' not found.\n";
    }

} else {
    echo "Activity with ID $activityId not found.\n";
}
