<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Models\Activity;
use App\Models\User;
use App\Models\ActivityUser;
use App\Models\Payment;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== COMPREHENSIVE DATABASE ANALYSIS ===\n";
echo "Time: " . now() . "\n\n";

// 1. Table Counts & Structure
echo "--- 1. Table Overview ---\n";
$tables = ['users', 'profiles', 'activities', 'activity_batches', 'payments', 'payment_methods', 'activitiusers', 'activity_users'];
foreach ($tables as $t) {
    if (Schema::hasTable($t)) {
        $count = DB::table($t)->count();
        echo str_pad($t, 20) . ": $count rows\n";
    } else {
        echo str_pad($t, 20) . ": [MISSING]\n";
    }
}

// 2. Activity Configuration Analysis (Focus on 'Rakernas' or similar)
echo "\n--- 2. Activity Configuration ---\n";
$activities = Activity::with('batches')->get();
foreach ($activities as $act) {
    echo "ID: {$act->id} | Name: {$act->name}\n";
    echo "   - Price: " . number_format($act->price) . "\n";
    echo "   - Creator ID: {$act->user_id}\n";
    echo "   - Batches: " . $act->batches->count() . "\n";
    foreach ($act->batches as $b) {
        echo "     > Batch ID: {$b->id} | Name: {$b->name} | Price: " . ($b->price === null ? 'NULL (Follow Activity)' : number_format($b->price)) . "\n";
    }
}

// 3. User & Profile Consistency
echo "\n--- 3. User & Profile Consistency ---\n";
$usersWithoutProfile = User::doesntHave('profile')->count();
echo "Users without profile: $usersWithoutProfile\n";

$profilesWithoutUser = DB::table('profiles')
    ->leftJoin('users', 'profiles.user_id', '=', 'users.id')
    ->whereNull('users.id')
    ->count();
echo "Orphaned Profiles: $profilesWithoutUser\n";

// 4. Payment Analysis
echo "\n--- 4. Payment Analysis ---\n";
$paymentStats = Payment::select('status', DB::raw('count(*) as total'))
    ->groupBy('status')
    ->pluck('total', 'status');

echo "Payment Status Breakdown:\n";
foreach ($paymentStats as $status => $count) {
    echo "   - " . str_pad($status, 15) . ": $count\n";
}

// Check for payments with NO proof
$noProof = Payment::whereNull('proof_of_payment')->where('amount', '>', 0)->count();
echo "Payments requiring proof but empty: $noProof\n";

// Check for bulk payments
$bulkPayments = Payment::where('notes', 'like', '%bulk_import%')->count();
echo "Bulk Payments detected: $bulkPayments\n";

// 5. Pivot Table Confusion Check
echo "\n--- 5. Enrollment Table Check (activitiusers vs activity_users) ---\n";
$au1 = 'activity_users';
$au2 = 'activitiusers'; // This seems to be the active one based on previous checks

$count1 = Schema::hasTable($au1) ? DB::table($au1)->count() : 0;
$count2 = Schema::hasTable($au2) ? DB::table($au2)->count() : 0;

echo "Table '$au1': $count1 rows\n";
echo "Table '$au2': $count2 rows (Likely ACTIVE)\n";

if ($count1 > 0 && $count2 > 0) {
    echo "WARNING: Both enrollment tables have data! This is a major consistency risk.\n";
} elseif ($count2 > 0) {
    echo "OK: System seems to be using '$au2' consistently.\n";
}

echo "\n--- Analysis Complete. ---\n";
