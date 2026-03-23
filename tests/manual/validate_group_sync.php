<?php

use App\Http\Controllers\ActivityPreparationController;
use App\Http\Controllers\PaymentController;
use App\Models\Activity;
use App\Models\ActivityUser;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

$root = dirname(__DIR__, 2);

require $root.'/vendor/autoload.php';
$app = require_once $root.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// 1. Setup Context
$activityUid = 'D69I6B';
$activity = Activity::where('uid', $activityUid)->first();

if (! $activity) {
    echo "Activity $activityUid not found.\n";
    exit(1);
}

echo 'Activity Found: '.$activity->name.' (ID: '.$activity->id.")\n";

// Login as admin/creator to bypass permission checks in controllers
$admin = User::find($activity->user_id) ?? User::first();
Auth::login($admin);
echo 'Logged in as: '.$admin->name."\n";

// 2. Find a target Group (Implicit via Payment Notes)
$parentPayment = Payment::where('activity_id', $activity->id)
    ->where('notes', 'like', '%user_ids%')
    ->latest()
    ->first();

if (! $parentPayment) {
    echo "No implicit group payment found.\n";
    exit(1);
}

$notes = json_decode($parentPayment->notes, true);
$userIds = $notes['user_ids'] ?? ($notes['bulk_import']['user_ids'] ?? []);

if (empty($userIds)) {
    echo "Parent payment found but no user_ids in notes.\n";
    exit(1);
}

echo 'Group Found (Implicit) with '.count($userIds)." members.\n";
echo 'Member IDs: '.implode(', ', $userIds)."\n";

$targetUserId = $userIds[0];
$otherUserId = $userIds[1] ?? end($userIds); // Pick another one

if ($targetUserId == $otherUserId && count($userIds) > 1) {
    echo "Error picking distinct users.\n";
}

// ---------------------------------------------------------
// TEST 1: Toggle Participant Status
// ---------------------------------------------------------
echo "\n--- TEST 1: Toggle Participant Status ---\n";

// Get current status
$members = ActivityUser::where('activity_id', $activity->id)->whereIn('user_id', $userIds)->get();
$initialStatus = $members->first()->status;
echo "Initial Status: $initialStatus\n";

// Run Toggle Logic (Simulated by instantiating Controller)
$controller = new ActivityPreparationController;
$request = new Request;

try {
    // Call the method
    // Note: We can't easily call the controller method directly because it returns a RedirectResponse
    // But we can replicate the logic or mock the request.
    // Actually, calling it is fine, we just ignore the return value and check the DB.
    echo "Toggling status for User ID: $targetUserId...\n";
    $controller->toggleParticipantStatus($request, $activity->id, $targetUserId);

    // Check results
    $updatedMembers = ActivityUser::where('activity_id', $activity->id)->whereIn('user_id', $userIds)->get();
    $allChanged = true;
    foreach ($updatedMembers as $m) {
        if ($m->status == $initialStatus) {
            $allChanged = false;
            echo "FAILED: User {$m->user_id} did not change status.\n";
        }
    }

    if ($allChanged) {
        echo 'SUCCESS: All group members status changed to: '.$updatedMembers->first()->status."\n";
    }

    // Revert
    echo "Reverting status...\n";
    $controller->toggleParticipantStatus($request, $activity->id, $targetUserId);

} catch (\Exception $e) {
    echo 'Exception during Test 1: '.$e->getMessage()."\n";
    echo $e->getTraceAsString();
}

// ---------------------------------------------------------
// TEST 2: Payment Verification (Reject)
// ---------------------------------------------------------
echo "\n--- TEST 2: Payment Rejection Sync ---\n";

// Ensure payments exist for these users
$targetPayment = Payment::where('activity_id', $activity->id)->where('user_id', $targetUserId)->first();

if (! $targetPayment) {
    echo "No payment found for target user $targetUserId. Creating dummy pending payment...\n";
    $targetPayment = Payment::create([
        'activity_id' => $activity->id,
        'user_id' => $targetUserId,
        'amount' => 0,
        'status' => 'pending',
        'payment_method_id' => 1,
    ]);
}

// Ensure other member has payment
$otherPayment = Payment::where('activity_id', $activity->id)->where('user_id', $otherUserId)->first();
if (! $otherPayment) {
    echo "No payment found for other user $otherUserId. Creating dummy pending payment...\n";
    $otherPayment = Payment::create([
        'activity_id' => $activity->id,
        'user_id' => $otherUserId,
        'amount' => 0,
        'status' => 'pending',
        'payment_method_id' => 1,
    ]);
}

// Reset statuses to pending
Payment::where('activity_id', $activity->id)->whereIn('user_id', $userIds)->update(['status' => 'pending']);

echo "Initial Payment Status: pending\n";

$payController = new PaymentController;
$payRequest = new Request([
    'status' => 'rejected',
    'notes' => 'Testing bulk rejection',
]);

try {
    echo "Rejecting payment for User ID: $targetUserId...\n";
    // We need to inject the request data
    $payRequest->setMethod('POST');

    // Call verify
    // Note: The verify method uses $request->validate(), so we need to ensure the request has the data
    // validation might fail if we don't bind it correctly.
    // Let's manually invoke the logic if controller call is too hard, OR simpler:
    // construct a real request object and pass it.

    $payController->verify($payRequest, $targetPayment);

    // Check results
    $updatedPayments = Payment::where('activity_id', $activity->id)->whereIn('user_id', $userIds)->get();
    $allRejected = true;
    foreach ($updatedPayments as $p) {
        if ($p->status !== 'rejected') {
            $allRejected = false;
            echo "FAILED: Payment for User {$p->user_id} is {$p->status}, expected rejected.\n";
        }
    }

    if ($allRejected) {
        echo "SUCCESS: All group payments rejected.\n";
    }

    // Revert to pending
    Payment::where('activity_id', $activity->id)->whereIn('user_id', $userIds)->update(['status' => 'pending']);
    echo "Reverted payments to pending.\n";

} catch (\Exception $e) {
    echo 'Exception during Test 2: '.$e->getMessage()."\n";
    echo $e->getTraceAsString();
}
