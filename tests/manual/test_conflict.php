<?php

use App\Http\Controllers\PaymentController;
use App\Models\Activity;
use App\Models\ActivityUser;
use App\Models\Category;
use App\Models\Payment;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;

$root = dirname(__DIR__, 2);

require $root.'/vendor/autoload.php';
$app = require_once $root.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

function setupUser($email)
{
    // Delete existing
    $u = User::where('email', $email)->first();
    if ($u) {
        DB::table('payments')->where('user_id', $u->id)->delete();
        DB::table('activitiusers')->where('user_id', $u->id)->delete();
        if ($u->profile) {
            $u->profile->delete();
        }
        $u->delete();
    }
    // Create
    $u = User::create([
        'name' => 'Test User',
        'email' => $email,
        'password' => bcrypt('x'),
        'role' => 'user',
    ]);
    Profile::create(['user_id' => $u->id, 'no_hp' => '0888', 'jenis_kelamin' => 'L', 'alamat' => 'x', 'foto' => 'x']);

    return $u;
}

echo "=== CONFLICT TEST ===\n";

// Setup
// Ensure at least one random user exists for Activity Creator
$admin = User::first();
if (! $admin) {
    $admin = User::create(['name' => 'Admin', 'email' => 'admin@test.com', 'password' => 'x', 'role' => 'admin']);
}

$cat = Category::firstOrCreate(['name' => 'Test Cat'], ['slug' => 'test-cat']);
$activity = Activity::create([
    'uid' => uniqid(),
    'name' => 'CONFLICT_TEST',
    'activity_type' => 'offline',
    'user_id' => $admin->id,
    'price' => 50000,
    'payment_method_type' => 'manual',
    'category_id' => $cat->id,
    'date' => now()->addDays(20),
    'start_time' => now(), 'end_time' => now(), 'location' => 'loc',
]);

// 1. Member Registers & Pays Mandiri (APPROVED)
$member = setupUser('member_conflict@example.com');
$leader = setupUser('leader_conflict@example.com');

// Member Enroll
ActivityUser::create([
    'user_id' => $member->id,
    'activity_id' => $activity->id,
    'status' => 1, // Active/Approved
]);

// Member Payment Approved
$pm = \App\Models\PaymentMethod::first();
$pmId = $pm ? $pm->id : 1;
// If no payment method exists, create one
if (! $pm) {
    $pmId = \App\Models\PaymentMethod::create(['name' => 'Bank Test', 'is_active' => true])->id;
}

$memberPay = Payment::create([
    'user_id' => $member->id,
    'activity_id' => $activity->id,
    'payment_method_id' => $pmId,
    'amount' => 50000,
    'proof_of_payment' => 'member_proof.jpg',
    'status' => 'approved', // ALREADY APPROVED
    'verified_by' => $admin->id, // Use valid ID
    'verified_at' => now(),
]);

echo "Initial State: Member Payment is APPROVED.\n";

// 2. Leader Includes Member in Bulk Payment
Auth::login($leader);
$bulkData = [
    'pending_user_ids' => [$member->id],
    'allowed_count' => 1,
    'gross_amount' => 50000,
    'successfully_imported_count' => 1,
];
Session::put('import_bulk_payment', $bulkData);
Session::save(); // Try to persist

// 3. Leader Uploads Proof (Triggering Distribution in Store)
$file = UploadedFile::fake()->image('group_proof.jpg');
$request = Request::create(route('payments.store', ['activity' => $activity->id, 'is_bulk' => 1]), 'POST', [
    'payment_method_id' => $pmId,
    'proof_of_payment' => $file,
    'sender_name' => 'Leader',
    'amount' => 50000,
    'is_bulk' => 1, // trigger bulk logic in store
    'notes' => 'Bulk note',
]);
$request->setUserResolver(fn () => $leader);

$controller = new PaymentController;
// Mocking session getting in controller is hard, so we assume session persists or logic relies on boolean check
// Wait, Controller relies on `session('import_bulk_payment')`.
// If `store` runs, it will execute logic.

// To ensure session works, we might need to manually inject it or rely on global state.
// Let's TRY running it.
try {
    $controller->store($request, $activity);
} catch (\Exception $e) {
    if (! str_contains($e->getMessage(), 'session')) {
        // ignore redirect exceptions
    }
}

// 4. Verify Member Payment Status
$memberPay->refresh();
echo 'Final State: Member Payment Status is '.strtoupper($memberPay->status)."\n";
echo 'Final Proof: '.$memberPay->proof_of_payment."\n";

if ($memberPay->status === 'pending' && str_contains($memberPay->proof_of_payment, 'payment_bulk')) {
    echo "[ALERT] CONFLICT DETECTED: Approved individual payment was OVERWRITTEN by Bulk Payment!\n";
} else {
    echo "[OK] Individual payment preserved (or test failed to trigger overwrite).\n";
}
