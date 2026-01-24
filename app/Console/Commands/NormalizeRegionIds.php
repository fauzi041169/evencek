<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class NormalizeRegionIds extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'normalize:regions {sql_path : Path to the SQL dump file containing old region UIDs}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Normalize region IDs in profiles table from old random UIDs to standard BPS codes using SQL dump for mapping';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $sqlPath = $this->argument('sql_path');

        if (!File::exists($sqlPath)) {
            $this->error("File not found: $sqlPath");
            return 1;
        }

        $this->info("Reading SQL file to build mapping...");

        // Mappings: OldUID => Name
        $oldProvinces = [];
        $oldRegencies = [];
        $oldDistricts = [];

        $handle = fopen($sqlPath, "r");
        if ($handle) {
            $currentTable = null;
            $nameIndex = 1;

            while (($line = fgets($handle)) !== false) {
                $line = trim($line);

                // Detect start of INSERT block
                if (str_starts_with($line, "INSERT INTO `provinces`")) {
                    $currentTable = 'provinces';
                    $nameIndex = 1; // ('ID', 'NAME', ...)
                } elseif (str_starts_with($line, "INSERT INTO `regencies`")) {
                    $currentTable = 'regencies';
                    $nameIndex = 2; // ('ID', 'PROV_ID', 'NAME', ...)
                } elseif (str_starts_with($line, "INSERT INTO `districts`")) {
                    $currentTable = 'districts';
                    $nameIndex = 2; // ('ID', 'REG_ID', 'NAME', ...)
                } elseif (str_ends_with($line, ");")) {
                    // End of block, verify if we should parse this last line
                    if ($currentTable) {
                        if ($currentTable == 'provinces') {
                            $this->parseValueLine($line, $oldProvinces, $nameIndex);
                        } elseif ($currentTable == 'regencies') {
                            $this->parseValueLine($line, $oldRegencies, $nameIndex);
                        } else {
                            $this->parseValueLine($line, $oldDistricts, $nameIndex);
                        }
                    }
                    $currentTable = null;
                } elseif ($currentTable && (str_starts_with($line, "(") || str_ends_with($line, "),"))) {
                    // This is a value line
                    if ($currentTable == 'provinces') {
                        $this->parseValueLine($line, $oldProvinces, $nameIndex);
                    } elseif ($currentTable == 'regencies') {
                        $this->parseValueLine($line, $oldRegencies, $nameIndex);
                    } else {
                        $this->parseValueLine($line, $oldDistricts, $nameIndex);
                    }
                }
            }
            fclose($handle);
        }

        $this->info("Found " . count($oldProvinces) . " old provinces.");
        $this->info("Found " . count($oldRegencies) . " old regencies.");
        $this->info("Found " . count($oldDistricts) . " old districts.");

        if (count($oldProvinces) === 0) {
            $this->error("No province data found in SQL file. Check the format.");
            return 1;
        }

        $this->info("Fetching standard regions from database (ensure RegionSeeder has been run)...");

        // Map Name => NewID
        $newProvinces = DB::table('provinces')->pluck('id', 'name')->mapWithKeys(fn($id, $name) => [strtoupper($name) => $id])->toArray();
        $newRegencies = DB::table('regencies')->pluck('id', 'name')->mapWithKeys(fn($id, $name) => [strtoupper($name) => $id])->toArray();
        $newDistricts = DB::table('districts')->pluck('id', 'name')->mapWithKeys(fn($id, $name) => [strtoupper($name) => $id])->toArray();

        if (empty($newProvinces)) {
            $this->error("Provinces table is empty. Please run 'php artisan db:seed --class=RegionSeeder' first.");
            return 1;
        }

        $this->info("Starting normalization...");
        
        DB::beginTransaction();
        try {
            // Disable Foreign Key Checks
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');

            // 1. Update Provinces in Profiles
            $this->normalizeTable('profiles', 'province_id', $oldProvinces, $newProvinces);

            // 2. Update Regencies in Profiles
            $this->normalizeTable('profiles', 'regency_id', $oldRegencies, $newRegencies);

            // 3. Update Districts in Profiles
            $this->normalizeTable('profiles', 'district_id', $oldDistricts, $newDistricts);

            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            DB::commit();
            $this->info("Normalization completed successfully!");
            
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("Error: " . $e->getMessage());
            return 1;
        }

        return 0;
    }

    private function parseValueLine($line, &$map, $nameIndex = 1)
    {
        // Simple regex to capture values inside ('...', '...', ...)
        if (preg_match_all('/\((.*?)\)/', $line, $matches)) {
            foreach ($matches[1] as $row) {
                // Split by comma, handling quotes
                $parts = str_getcsv($row, ",", "'");
                if (count($parts) > $nameIndex) {
                    $uid = $parts[0];
                    $name = strtoupper(trim($parts[$nameIndex])); // Normalize name to uppercase
                    $map[$uid] = $name;
                }
            }
        }
    }

    private function normalizeTable($table, $column, $oldMap, $newMap)
    {
        $this->info("Updating $table.$column...");
        $count = 0;
        
        // Chunk to avoid memory issues if table is huge, but here we loop through OLD IDs which is finite
        foreach ($oldMap as $oldUid => $name) {
            if (isset($newMap[$name])) {
                $newId = $newMap[$name];
                
                // Perform update
                $affected = DB::table($table)
                    ->where($column, $oldUid)
                    ->update([$column => $newId]);
                
                if ($affected > 0) {
                    $count += $affected;
                    // $this->line("  Mapped $name: $oldUid -> $newId ($affected rows)");
                }
            } else {
                // $this->warn("  No standard ID found for region: $name (Old ID: $oldUid)");
            }
        }
        
        $this->info("Updated $count rows in $table.$column.");
    }
}
