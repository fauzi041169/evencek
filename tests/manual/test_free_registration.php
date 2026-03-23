<?php

use App\Http\Controllers\ActivityEnrollmentController;
use App\Models\Activity;
use App\Models\ActivityUser;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

$root = dirname(__DIR__, 2);

require $root.'/vendor/autoload.php';
$app = require_once $root.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== TEST: FREE ACTIVITY REGISTRATION ===\n";

// Setup User
$user = User::where('email', 'test_free@example.com')->first();
if (! $user) {
    $user = User::create(['name' => 'Free User', 'email' => 'test_free@example.com', 'password' => bcrypt('x'), 'role' => 'user']);
    $user->profile()->create(['no_hp' => '000', 'jenis_kelamin' => 'L', 'alamat' => 'Set', 'foto' => 'x.jpg']);
}
Auth::login($user);

// Setup Free Activity
$activity = Activity::where('name', 'TEST_FREE')->first();
if (! $activity) {
    $activity = Activity::create([
        'uid' => uniqid(),
        'name' => 'TEST_FREE',
        'activity_type' => 'offline',
        'user_id' => User::first()->id,
        'price' => 0, // FREE
        'payment_method_type' => 'manual',
        'category_id' => \App\Models\Category::first()->id ?? 1,
        'date' => now(),
        'start_time' => now(),
        'end_time' => now(),
        'location' => 'Test Loc',
    ]);
}

// Clear previous enrollment
ActivityUser::where('user_id', $user->id)->where('activity_id', $activity->id)->delete();

// Run Enrollment
$request = Request::create(route('activity.enroll', $activity->id), 'POST', ['activity_id' => $activity->id]);
$request->setUserResolver(fn () => $user);

try {
    $controller = new ActivityEnrollmentController;
    $controller->enroll($request, $activity->id);

    // Check Result
    $au = ActivityUser::where('user_id', $user->id)->where('activity_id', $activity->id)->first();

    if ($au) {
        // Status 1 = Active (Expected for Free)
        // Status 3 = Pending (Waiting Payment)
        echo 'Enrollment Status: '.$au->status."\n";

        if ($au->status == 1) {
            echo "[PASS] User enrolled in Free Activity with ACTIVE status.\n";
        } else {
            echo "[FAIL] User status is not Active (Got {$au->status}).\n";
        }
    } else {
        echo "[FAIL] Enrollment record not found.\n";
    }

    // Ensure NO Payment record
    $pay = Payment::where('user_id', $user->id)->where('activity_id', $activity->id)->exists();
    if (! $pay) {
        echo "[PASS] No payment record created for Free activity.\n";
    } else {
        echo "[FAIL] Payment record erroneously created for Free activity.\n";
    }

} catch (\Exception $e) {
    echo '[ERROR] '.$e->getMessage()."\n";
}
