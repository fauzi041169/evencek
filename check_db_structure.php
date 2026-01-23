<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== CHECKING DATABASE STRUCTURE FOR DUPLICATION/INCONSISTENCY ===\n\n";

// 1. Check for table duplication (activity_users vs activitiusers)
$tables = DB::select('SHOW TABLES');
$tableNames = array_map(fn($t) => array_values((array)$t)[0], $tables);

echo "1. Checking Pivot Table Names:\n";
$pivotTables = array_filter($tableNames, fn($t) => in_array($t, ['activity_users', 'activitiusers']));
foreach ($pivotTables as $t) {
    $count = DB::table($t)->count();
    echo "   - Table '$t' EXISTS. Rows: $count\n";
}

if (count($pivotTables) > 1) {
    echo "   [WARNING] MULTIPLE PIVOT TABLES DETECTED! Data might be split or duplicated.\n";
    // Check for overlapping data
    $t1 = 'activity_users';
    $t2 = 'activitiusers';
    $duplicates = DB::table($t1)
        ->join($t2, function($join) use ($t1, $t2) {
            $join->on("$t1.user_id", '=', "$t2.user_id")
                 ->on("$t1.activity_id", '=', "$t2.activity_id");
        })
        ->count();
    echo "   - Overlapping (duplicate) user+activity pairs between tables: $duplicates\n";
    
    // Check for unique data
    $uniqueT1 = DB::table($t1)
        ->leftJoin($t2, function($join) use ($t1, $t2) {
            $join->on("$t1.user_id", '=', "$t2.user_id")
                 ->on("$t1.activity_id", '=', "$t2.activity_id");
        })
        ->whereNull("$t2.id")
        ->count();
        
    $uniqueT2 = DB::table($t2)
        ->leftJoin($t1, function($join) use ($t1, $t2) {
            $join->on("$t2.user_id", '=', "$t1.user_id")
                 ->on("$t2.activity_id", '=', "$t1.activity_id");
        })
        ->whereNull("$t1.id")
        ->count();
        
    echo "   - Unique rows in $t1: $uniqueT1\n";
    echo "   - Unique rows in $t2: $uniqueT2\n";
    
} else {
    echo "   [OK] Only one pivot table active.\n";
}

echo "\n2. Checking 'profiles' table columns:\n";
$profileColumns = Schema::getColumnListing('profiles');
echo "   Columns: " . implode(', ', $profileColumns) . "\n";
// Check if user_id is unique
$duplicateProfiles = DB::table('profiles')
    ->select('user_id', DB::raw('count(*) as total'))
    ->groupBy('user_id')
    ->having('total', '>', 1)
    ->get();

if ($duplicateProfiles->isNotEmpty()) {
    echo "   [WARNING] Duplicate profiles found for single user_id!\n";
    foreach($duplicateProfiles->take(5) as $dup) {
        echo "   - User ID {$dup->user_id}: {$dup->total} profiles\n";
    }
} else {
    echo "   [OK] No duplicate profiles for users.\n";
}

echo "\n3. Checking 'activity_users' (or active pivot) Content Duplication:\n";
// Use the table that has data
$activeTable = 'activity_users';
if (in_array('activitiusers', $pivotTables) && DB::table('activitiusers')->count() > DB::table('activity_users')->count()) {
    $activeTable = 'activitiusers';
}

echo "   Modeling with table: $activeTable\n";

// Check for duplicate user_id + activity_id in standard columns
$dupRegistrations = DB::table($activeTable)
    ->select('user_id', 'activity_id', DB::raw('count(*) as total'))
    ->groupBy('user_id', 'activity_id')
    ->having('total', '>', 1)
    ->get();

if ($dupRegistrations->isNotEmpty()) {
    echo "   [WARNING] Duplicate registrations found (same user in same activity multiple times):\n";
    foreach($dupRegistrations->take(5) as $dup) {
        echo "   - User {$dup->user_id} in Activity {$dup->activity_id}: {$dup->total} times\n";
    }
} else {
    echo "   [OK] No duplicate user+activity pairs.\n";
}

echo "\n4. Checking custom_data vs standard columns Shadowing:\n";
// Check if custom_data contains keys that are also column names (e.g. 'province', 'phone')
// efficiently checking a sample
$samples = DB::table($activeTable)->whereNotNull('custom_data')->limit(20)->get();
$shadowingIssues = 0;
foreach($samples as $row) {
    if (!$row->custom_data) continue;
    $data = json_decode($row->custom_data, true);
    if (!is_array($data)) continue;
    
    $keysToCheck = ['province', 'regency', 'district', 'instansi', 'pekerjaan', 'jabatan', 'no_hp', 'nik'];
    foreach ($keysToCheck as $key) {
        if (isset($data[$key]) || isset($data[ucfirst($key)])) {
            // Check if profile has this data empty
            $user = DB::table('users')->find($row->user_id);
            if ($user) {
                $profile = DB::table('profiles')->where('user_id', $user->id)->first();
                // Determine profile column mapping
                $profileCol = match($key) {
                   'no_hp' => 'no_hp',
                   'province' => 'province_id', 
                   default => $key
                };
                
                $dataValue = $data[$key] ?? $data[ucfirst($key)];
                $profileValue = $profile ? ($profile->$profileCol ?? 'NULL') : 'NO PROFILE';
                
                if (is_string($profileValue) && (empty($profileValue) || $profileValue == 'NULL') && !empty($dataValue)) {
                     // Data exists in custom_data but NOT in profile
                     // This is "separated" data
                     if ($shadowingIssues < 5) {
                        echo "   [INFO] Data Separation Detected for User {$row->user_id}:\n";
                        echo "          Field '$key' exists in custom_data ('$dataValue') but EMPTY in profile table.\n";
                     }
                     $shadowingIssues++;
                }
            }
        }
    }
}

if ($shadowingIssues > 0) {
    echo "   -> Found at least $shadowingIssues instances where data is in 'custom_data' JSON but MISSING from reference tables.\n";
    echo "      This confirms 'data is separated' (ada di JSON tapi tidak masuk ke kolom tabel).\n";
} else {
    echo "   [OK] Data appears consistent between JSON and Profile tables (or no overlapping keys found in sample).\n";
}

echo "\nDone.\n";
