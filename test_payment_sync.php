<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Activity;
use App\Models\ActivityUser;
use App\Models\ActivityParticipantGroup;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Http\Controllers\PaymentController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

echo "=== PAYMENT SYNC TEST ===\n";

// Cleanup
DB::table('payments')->truncate();
DB::table('activities')->truncate();
DB::table('activity_participant_groups')->truncate();
DB::table('users')->where('email', 'like', 'test%@example.com')->delete();

// Setup
$user1 = User::create(['name' => 'Leader', 'email' => 'testleader@example.com', 'password' => bcrypt('password'), 'role' => 'user']);
$user2 = User::create(['name' => 'Member', 'email' => 'testmember@example.com', 'password' => bcrypt('password'), 'role' => 'user']);
$activity = Activity::create(['name' => 'Test Activity', 'user_id' => $user1->id, 'uid' => 'TEST001', 'price' => 100000]); // Created by User 1
$group = ActivityParticipantGroup::create([
    'activity_id' => $activity->id,
    'name' => 'Test Group',
    'code' => 'GRP001'
]);

// Assign users to group
$au1 = ActivityUser::create([
    'user_id' => $user1->id,
    'activity_id' => $activity->id,
    'activity_participant_group_id' => $group->id, // Explicit group
    'status' => 'verification'
]);
$au2 = ActivityUser::create([
    'user_id' => $user2->id,
    'activity_id' => $activity->id,
    'activity_participant_group_id' => $group->id, // Explicit group
    'status' => 'verification'
]);

// Create Payment for Leader
$method = PaymentMethod::where('is_active', true)->first();
if (!$method) $method = PaymentMethod::create(['name' => 'Bank Transfer', 'is_active' => true]);

$payment = Payment::create([
    'user_id' => $user1->id,
    'activity_id' => $activity->id,
    'payment_method_id' => $method->id,
    'amount' => 100000,
    'status' => 'pending',
    'notes' => 'Test Payment' // No user_ids meta, relying on explicit group
]);

echo "Initial Payment Amount: " . $payment->amount . "\n";
echo "Group ID: " . $group->id . "\n";

// Auth Login for gates
Auth::login($user1); 

// Call Update
$controller = new PaymentController();
$request = Request::create('/payments/'.$payment->id, 'PUT', [
    'amount' => 200000,
    'notes' => 'Updated Amount'
]);
$request->setUserResolver(function () use ($user1) {
    return $user1;
});

try {
    $response = $controller->update($request, $payment);
    echo "Update Response Status: " . $response->getStatusCode() . "\n";
} catch (\Exception $e) {
    echo "Update Failed: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}

// Verify User 2 Payment
$p2 = Payment::where('user_id', $user2->id)->where('activity_id', $activity->id)->first();

if ($p2) {
    echo "User 2 Payment Found!\n";
    echo "Amount: " . $p2->amount . " (Expected: 200000)\n";
    echo "Notes: " . $p2->notes . "\n";
} else {
    echo "User 2 Payment NOT Found.\n";
}

// Check 'registration_method' via lookup
$reqLookup = Request::create('/api/lookup', 'GET', [
    'activity_id' => $activity->id,
    'user_id' => $user1->id
]);
$reqLookup->setUserResolver(function () use ($user1) { return $user1; });

try {
    $json = $controller->lookupByActivityUser($reqLookup);
    $data = $json->getData(true);
    echo "Registration Method: " . ($data['payment']['registration_method'] ?? 'N/A') . "\n";
} catch (\Exception $e) {
    echo "Lookup Failed: " . $e->getMessage() . "\n";
}
