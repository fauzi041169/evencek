<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Models\Profile;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== REGION DATA ANALYSIS ===\n\n";

// 1. Check if Region Tables Exist
$tables = ['provinces', 'regencies', 'districts', 'villages'];
foreach ($tables as $t) {
    if (Schema::hasTable($t)) {
        $count = DB::table($t)->count();
        echo str_pad($t, 15) . ": $count rows\n";
    } else {
        echo str_pad($t, 15) . ": [MISSING]\n";
    }
}
echo "\n";

// 2. Analyze Profiles Region Data
$totalProfiles = Profile::count();
echo "Total Profiles: $totalProfiles\n\n";

$fields = [
    'province_id' => 'Province ID',
    'regency_id' => 'Regency ID',
    'district_id' => 'District ID',
    'other_province' => 'Other Prov',
    'other_regency' => 'Other Reg',
    'other_district' => 'Other Dist'
];

echo "Missing Data Breakdown:\n";
foreach ($fields as $col => $label) {
    if (Schema::hasColumn('profiles', $col)) {
        $filled = Profile::whereNotNull($col)->where($col, '!=', '')->count();
        $empty = $totalProfiles - $filled;
        $pct = $totalProfiles > 0 ? round(($filled / $totalProfiles) * 100, 1) : 0;
        echo str_pad($label, 15) . ": $filled filled ($pct%) | $empty empty\n";
    } else {
        echo str_pad($label, 15) . ": Column not found!\n";
    }
}

// 3. Sample Data Check
echo "\nSample Data (First 5 with any region info):\n";
$samples = Profile::whereNotNull('province_id')
    ->orWhereNotNull('other_province')
    ->take(5)->get();

foreach ($samples as $p) {
    echo "ID: {$p->id} | P: {$p->province_id} ({$p->other_province}) | R: {$p->regency_id} ({$p->other_regency})\n";
}

// 4. Check Relation Integrity
echo "\nChecking Relationship Integrity (Province)...\n";
$invalidProv = Profile::whereNotNull('province_id')
    ->whereDoesntHave('province')
    ->count();

echo "Profiles with Province ID but no matching Province record: $invalidProv\n";

// 5. Check if data is hidden in JSON 'additional_data'
echo "\nChecking 'additional_data' JSON...\n";
$jsonCheck = Profile::where('additional_data', 'like', '%provins%')
    ->orWhere('additional_data', 'like', '%kabupat%')
    ->count();
echo "Profiles with 'provinsi/kabupaten' text in JSON: $jsonCheck\n";

echo "\n=== END ANALYSIS ===\n";
