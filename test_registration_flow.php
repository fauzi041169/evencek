<?php

use App\Models\User;
use App\Models\Profile;
use App\Models\Activity;
use App\Models\ActivityBatch;
use App\Models\ActivityUser;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Http\Controllers\ActivityEnrollmentController;
use App\Http\Controllers\PaymentController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// --- HELPERS ---
function asUser($user) {
    Auth::login($user);
}

function clearTestUser($email) {
    $user = User::where('email', $email)->first();
    if ($user) {
        DB::table('payments')->where('user_id', $user->id)->delete();
        DB::table('activitiusers')->where('user_id', $user->id)->delete();
        // Delete profile
        if ($user->profile) $user->profile->delete();
        $user->delete();
    }
}

// ----------------
echo "=== 1. SETUP ===\n";

// Create Test Activity
$activityUid = 'TESTACT' . time(); // Unique ID
$activity = Activity::where('name', 'TEST_REG_FLOW')->first();

if (!$activity) {
    $admin = User::first(); // Assuming first user is admin/creator
    $cat = \App\Models\Category::first();
    $catId = $cat ? $cat->id : 1;

    $activity = Activity::create([
        'uid' => $activityUid,
        'name' => 'TEST_REG_FLOW',
        'activity_type' => 'offline',
        'description' => 'Test Activity',
        'user_id' => $admin->id,
        'status' => 'published',
        'pendaftaran' => 1, // Open
        'price' => 50000,
        'payment_method_type' => 'manual',
        'category_id' => $catId,
        'date' => now()->addDays(10),
        'start_time' => now()->addDays(10)->setTime(00, 00, 00),
        'end_time' => now()->addDays(10)->setTime(23, 59, 59),
        'location' => 'Test Location',
    ]);
    
    // Create Batch
    $batch = ActivityBatch::create([
        'activity_id' => $activity->id,
        'name' => 'Batch 1',
        'code' => 'B1',
        'is_active' => true
    ]);
} else {
    $batch = $activity->activeBatch;
}

echo "Activity: {$activity->name} (ID: {$activity->id})\n";

// Clean previous test users
clearTestUser('test_mandiri@example.com');
clearTestUser('test_leader@example.com');
clearTestUser('test_member1@example.com');
clearTestUser('test_member2@example.com');

// Create Users with Profiles (Mandatory for registration)
$users = [];
foreach (['test_mandiri', 'test_leader', 'test_member1', 'test_member2'] as $role) {
    $u = User::create([
        'name' => ucfirst(str_replace('_', ' ', $role)),
        'email' => "$role@example.com",
        'password' => bcrypt('password'),
        'role' => 'user'
    ]);
    // Create profile
    Profile::create([
        'user_id' => $u->id,
        'no_hp' => '08123456789',
        'jenis_kelamin' => 'L',
        'alamat' => 'Test Address',
        'foto' => 'default.jpg' 
    ]);
    // Reload to get relations
    $u->refresh();
    $users[$role] = $u;
}

echo "Users Created.\n";

// --- SCENARIO 1: MANDIRI REGISTRATION ---
echo "\n=== 2. TEST SCENARIO: MANDIRI REGISTRATION ===\n";
try {
    asUser($users['test_mandiri']);
    
    // Simulate Request
    $enrollRequest = Request::create(route('activity.enroll', $activity->id), 'POST', [
        'activity_id' => $activity->id,
    ]);
    // Mock user for request (Laravel usually handles this via middleware, but in script we must force)
    $enrollRequest->setUserResolver(fn() => $users['test_mandiri']);
    
    $enrollController = new ActivityEnrollmentController();
    $response = $enrollController->enroll($enrollRequest, $activity->id);
    
    // Verify Enrollment
    $au = ActivityUser::where('user_id', $users['test_mandiri']->id)
        ->where('activity_id', $activity->id)
        ->first();
        
    if ($au && $au->status == 3) { // 3 = Pending
        echo "[PASS] Enrollment Created (Status: Pending)\n";
    } else {
        echo "[FAIL] Enrollment Missing or Wrong Status (" . ($au->status ?? 'null') . ")\n";
        exit;
    }
    
    // Verify Payment Record Created
    $pay = Payment::where('user_id', $users['test_mandiri']->id)
        ->where('activity_id', $activity->id)
        ->first();
        
    if ($pay && $pay->amount == 50000 && $pay->status == 'pending') {
        echo "[PASS] Payment Record Created (Amount: 50000)\n";
    } else {
        echo "[FAIL] Payment Record Missing or Wrong Amount\n";
        exit;
    }
    
    // Simulate Upload Proof
    // We mock the file upload manually or check logic.
    // PaymentController::store handles the upload.
    echo "Simulating Proof Upload...\n";
    
    // Mock File
    $file = UploadedFile::fake()->image('proof.jpg');
    
    $uploadRequest = Request::create(route('payments.store', $activity->id), 'POST', [
        'payment_method_id' => 1, // Assume ID 1 exists
        'amount' => 50000,
        'proof_of_payment' => $file,
        'sender_name' => 'Test Sender'
    ]);
    $uploadRequest->setUserResolver(fn() => $users['test_mandiri']);
    
    $payController = new PaymentController();
    $payController->store($uploadRequest, $activity);
    
    $pay->refresh();
    if ($pay->proof_of_payment && $pay->sender_name == 'Test Sender') {
        echo "[PASS] Proof Uploaded Successfully.\n";
    } else {
        echo "[FAIL] Proof Upload Failed.\n";
        print_r($pay->toArray());
    }

} catch (\Exception $e) {
    echo "[ERROR] Mandiri Flow Failed: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}

// --- SCENARIO 2: GROUP/BULK REGISTRATION ---
echo "\n=== 3. TEST SCENARIO: GROUP (BULK) REGISTRATION ===\n";
// Workflow: Leader imports members -> Leader pays for all
try {
    asUser($users['test_leader']);
    
    // Simulate Session Data for Bulk Import (As if coming from ImportController)
    $bulkData = [
        'pending_user_ids' => [
            $users['test_member1']->id,
            $users['test_member2']->id
        ],
        'allowed_count' => 2,
        'gross_amount' => 100000, // 50k * 2
        'successfully_imported_count' => 2
    ];
    Session::put('import_bulk_payment', $bulkData);
    
    // Step 1: Visit Payment Create Page (This triggers the distribution logic in PaymentController::create)
    echo "Simulating Visit to Payment Page by Leader (Triggering Bulk Logic)...\n";
    $createRequest = Request::create(route('payments.create', ['activity' => $activity->id, 'is_bulk' => 1]), 'GET', [
        'is_bulk' => 1
    ]);
    $createRequest->setUserResolver(fn() => $users['test_leader']);
    
    // We need to capture the side-effects of 'create' method
    $payController = new PaymentController();
    $payController->create($activity); // This should process the Session data
    
    // Verify Leader Payment Updated to Bulk
    $leaderPay = Payment::where('user_id', $users['test_leader']->id)
        ->where('activity_id', $activity->id)
        ->first();
        
    // Note: ActivityEnrollment probably wasn't called for Leader yet in this flow?
    // Wait, usually Leader enrolls FIRST, then imports?
    // Let's assume Leader MUST enroll first.
    if (!$leaderPay) {
        // Auto-enroll leader using Enrollment Controller
        echo "Auto-enrolling Leader first...\n";
        $enrollReq = Request::create(route('activity.enroll', $activity->id), 'POST');
        $enrollReq->setUserResolver(fn() => $users['test_leader']);
        $enrollController->enroll($enrollReq, $activity->id);
        
        // Call Create again
        $payController->create($activity);
        
        $leaderPay = Payment::where('user_id', $users['test_leader']->id)
            ->where('activity_id', $activity->id)
            ->first();
    }
    
    if ($leaderPay) {
        $notes = json_decode($leaderPay->notes, true);
        if (isset($notes['bulk_import']) && count($notes['user_ids']) >= 2) {
             echo "[PASS] Leader Payment marked as Bulk. Covering members: " . implode(',', $notes['user_ids']) . "\n";
        } else {
             echo "[FAIL] Leader Payment NOT converted to Bulk.\n";
             print_r($notes);
        }
    } else {
        echo "[FAIL] Leader Payment Record Not Found.\n";
    }
    
    // Verify Members Enrolled & Payment Created
    foreach (['test_member1', 'test_member2'] as $k) {
        $u = $users[$k];
        $au = ActivityUser::where('user_id', $u->id)->where('activity_id', $activity->id)->first();
        if ($au) {
            echo "[PASS] Member $k enrolled automatically.\n";
        } else {
            echo "[FAIL] Member $k NOT enrolled.\n";
        }
        
        // Members typically get a payment record created linked to the leader? 
        // Based on logic read: Payment::updateOrCreate ... 'proof_of_payment' => $uniquePathRelative
        // But verification only happens after Leader uploads proof.
        // Currently, they should have a Payment record created by the distribution logic.
        $mPay = Payment::where('user_id', $u->id)->where('activity_id', $activity->id)->first();
        if ($mPay) {
             echo "[PASS] Member $k has payment record.\n";
        } else {
             echo "[FAIL] Member $k payment record missing.\n";
        }
    }
    
    // Step 2: Leader Uploads Proof
    echo "Simulating Leader Uploading Bulk Proof...\n";
    $file = UploadedFile::fake()->image('bulk_proof.jpg');
    
    $bulkUploadRequest = Request::create(route('payments.store', ['activity' => $activity->id, 'is_bulk' => 1]), 'POST', [
        'payment_method_id' => 1,
        'amount' => 100000,
        'proof_of_payment' => $file,
        'sender_name' => 'Leader Sender',
        'is_bulk' => 1
    ]);
    $bulkUploadRequest->setUserResolver(fn() => $users['test_leader']);
    
    // Note: PaymentController::store logic for bulk?
    // We need to inspect `store` logic again. 
    // It calls `store` -> ... -> update payment.
    $payController->store($bulkUploadRequest, $activity);
    
    $leaderPay->refresh();
    if ($leaderPay->proof_of_payment) {
        echo "[PASS] Leader Bulk Proof Uploaded.\n";
        echo "       Proof Path: " . $leaderPay->proof_of_payment . "\n";
    } else {
        echo "[FAIL] Leader Bulk Proof Upload Failed.\n";
    }
    
    // Verify Members Payment Updated with Proof?
    // In `PaymentController`, `store` does NOT seem to automatically distribute the "Uploaded Proof" to members in the `store` method itself.
    // Wait, let's re-read `create` method logic I pasted earlier.
    // The `create` method (which handles the view) has the `foreach ($validUids as $uid)` loop.
    // Inside that loop: 
    //    $proofPath = $existingPayment->proof_of_payment;
    //    if ($proofPath) { ... copies proof to member ... }
    
    // SO, the distribution of proof happens when the Leader VISITS the `create` page AGAIN (e.g. after upload, or checking status).
    // Let's Simulate Leader visiting `create` page again.
    echo "Simulating Leader Visiting Payment Page AGAIN to trigger Proof Distribution...\n";
    
    // Ensure session is set (it might have been cleared, but existing payment has notes)
    // The logic checks `$existingPayment` notes.
    $payController->create($activity);
    
    // Now Check Members
    foreach (['test_member1', 'test_member2'] as $k) {
        $u = $users[$k];
        $mPay = Payment::where('user_id', $u->id)->where('activity_id', $activity->id)->first();
        if ($mPay && $mPay->proof_of_payment) {
             echo "[PASS] Member $k Payment updated with Distributed Proof.\n";
        } else {
             echo "[FAIL] Member $k Payment Proof missing (Not distributed).\n";
        }
    }

} catch (\Exception $e) {
    echo "[ERROR] Group Flow Failed: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}

echo "\n=== END TEST ===\n";
