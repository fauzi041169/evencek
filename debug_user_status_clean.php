<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Activity;
use App\Models\ActivityUser;
use App\Models\Payment;

$emailPart = 'edsahejghmail'; 
$activityId = '1VFD25'; 

echo "DEBUGGING USER STATUS...\n";

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
            // echo "  Notes: {$p->notes}\n"; // Skipping long notes
        }

        // Check for Group Payments
        echo "Checking for Group Payments mentioning this user...\n";
        $groupPayments = Payment::where('activity_id', $activity->id)
            ->get()
            ->filter(function($p) use ($user) {
                return str_contains($p->notes, (string)$user->id);
            });
            
        foreach ($groupPayments as $p) {
            echo "- Mentioned in Payment ID: {$p->id} (User ID: {$p->user_id}) | Status: {$p->status}\n";
             $notes = json_decode($p->notes, true);
             $uids = $notes['user_ids'] ?? ($notes['bulk_import']['user_ids'] ?? []);
             echo "  User IDs in notes: " . count($uids) . "\n";
             echo "  Allowed Count: " . ($notes['allowed_count'] ?? 'N/A') . "\n";
        }

    } else {
        echo "User with email like '$emailPart' not found.\n";
    }

} else {
    echo "Activity with ID $activityId not found.\n";
}
