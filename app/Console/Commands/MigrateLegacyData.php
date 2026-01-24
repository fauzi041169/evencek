<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Str;
use SplFileObject;

class MigrateLegacyData extends Command
{
    protected $signature = 'db:migrate-legacy {path : Path to SQL dump file}';
    protected $description = 'Import legacy SQL dump and migrate to normalized schema';

    protected $userIdMap = [];

    public function handle()
    {
        $path = $this->argument('path');
        if (!file_exists($path)) {
            $this->error("File not found: $path");
            return 1;
        }

        $this->info("Setting up temporary database connection...");
        
        // Configure temp connection
        Config::set('database.connections.temp_migration', [
            'driver' => 'mysql',
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '3306'),
            'database' => 'eventcek_migration_temp',
            'username' => env('DB_USERNAME', 'forge'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'strict' => false,
            'engine' => null,
        ]);

        // Verify connection
        try {
            DB::connection('temp_migration')->getPdo();
            $this->info("Connected to temporary database.");
        } catch (\Exception $e) {
            $this->error("Could not connect to temporary database: " . $e->getMessage());
            return 1;
        }

        // Import SQL Dump
        $this->info("Importing SQL dump to temporary database...");
        if (!$this->importSqlDump($path)) {
            $this->error("Failed to import SQL dump.");
            return 1;
        }

        // Migrate Data
        $this->info("Migrating data to main database...");
        $this->migrateData();

        $this->info("Migration completed successfully.");
        return 0;
    }

    protected function importSqlDump($path)
    {
        DB::connection('temp_migration')->statement('SET FOREIGN_KEY_CHECKS=0');
        
        // Drop all tables in temp DB to ensure clean state
        $tables = DB::connection('temp_migration')->select('SHOW TABLES');
        $dbName = Config::get('database.connections.temp_migration.database');
        $key = "Tables_in_" . $dbName;
        
        foreach ($tables as $table) {
            $tableName = $table->$key;
            DB::connection('temp_migration')->statement("DROP TABLE IF EXISTS `$tableName`");
        }

        $file = new SplFileObject($path);
        $statement = '';
        $count = 0;

        while (!$file->eof()) {
            $line = $file->fgets();
            if ($line === false) break;
            
            $trimmed = trim($line);
            
            if ($trimmed === '' || str_starts_with($trimmed, '--') || str_starts_with($trimmed, '/*')) {
                continue;
            }

            $statement .= $line;

            if (str_ends_with(trim($statement), ';')) {
                try {
                    DB::connection('temp_migration')->unprepared($statement);
                    $count++;
                    if ($count % 100 === 0) {
                        $this->output->write('.');
                    }
                } catch (\Exception $e) {
                    $this->warn("\nError executing statement: " . $e->getMessage());
                }
                $statement = '';
            }
        }
        
        DB::connection('temp_migration')->statement('SET FOREIGN_KEY_CHECKS=1');
        $this->newLine();
        return true;
    }

    protected function migrateData()
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        // Migrate Users first to build mapping
        $this->migrateUsers();

        $tablesToMigrate = [
            'profiles' => 'profiles',
            'categories' => 'categories',
            'activities' => 'activities',
            'activity_batches' => 'activity_batches',
            'activitirecords' => 'activity_records',
            'activitiusers' => 'activity_users',
            'activity_users' => 'activity_users', // Check both
            'idcardbegrounds' => 'id_card_backgrounds',
            'attendances' => 'attendances',
            'payments' => 'payments',
            'payment_methods' => 'payment_methods',
            'certificate_backgrounds' => 'certificate_backgrounds',
            'certificate_settings' => 'certificate_settings',
            'card_settings' => 'card_settings',
            'activity_rundowns' => 'activity_rundowns',
            'activity_materials' => 'activity_materials',
            'activity_speakers' => 'activity_speakers',
            'activity_participant_groups' => 'activity_participant_groups',
            'activity_committee_structures' => 'activity_committee_structures',
            'activity_divisions' => 'activity_divisions',
            'activity_division_requirements' => 'activity_division_requirements',
            'activity_chats' => 'activity_chats',
            'activity_owners' => 'activity_owners',
            'activity_hotel_rooms' => 'activity_hotel_rooms',
            'activity_hotel_room_assignments' => 'activity_hotel_room_assignments',
            'galleries' => 'galleries',
            'comments' => 'comments',
            'news' => 'news',
            'partners' => 'partners',
        ];

        foreach ($tablesToMigrate as $sourceTable => $targetTable) {
            if ($sourceTable === 'users') continue; // Already done
            $this->migrateTable($sourceTable, $targetTable);
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    protected function migrateUsers()
    {
        $this->info("Migrating users...");
        $sourceTable = 'users';
        $targetTable = 'users';

        if (!Schema::connection('temp_migration')->hasTable($sourceTable)) return;

        $columns = array_intersect(
            DB::connection('temp_migration')->getSchemaBuilder()->getColumnListing($sourceTable),
            Schema::getColumnListing($targetTable)
        );

        foreach (DB::connection('temp_migration')->table($sourceTable)->cursor() as $row) {
            $data = [];
            foreach ($columns as $col) $data[$col] = $row->$col;
            $this->cleanData($data);

            $oldId = $row->id;
            $email = $row->email;

            $existingUser = DB::table($targetTable)->where('email', $email)->first();

            if (!$existingUser && !empty($row->google_id)) {
                 $existingUser = DB::table($targetTable)->where('google_id', $row->google_id)->first();
            }

            if ($existingUser) {
                // Map old ID to existing ID
                if ($oldId !== $existingUser->id) {
                    $this->userIdMap[$oldId] = $existingUser->id;
                    $this->info("Mapped user $oldId -> $existingUser->id ($email)");
                }
            } else {
                // Check for ID collision
                $existingId = DB::table($targetTable)->where('id', $oldId)->first();
                if ($existingId) {
                    // ID exists but email differs. Generate new ID.
                    $newId = $this->generateUniqueId($targetTable);
                    $data['id'] = $newId;
                    $this->userIdMap[$oldId] = $newId;
                    $this->info("ID Collision: Mapped user $oldId -> $newId");
                    
                    try {
                        DB::table($targetTable)->insert($data);
                    } catch (\Exception $e) {
                        $this->warn("Failed to insert remapped user: " . $e->getMessage());
                    }
                } else {
                    // Clean insert
                    try {
                        DB::table($targetTable)->insert($data);
                    } catch (\Exception $e) {
                        $this->warn("Failed to insert user $oldId: " . $e->getMessage());
                    }
                }
            }
        }
    }

    protected function migrateTable($sourceTable, $targetTable)
    {
        // Skip irrelevant tables
        $skippedTables = [
            'performance_logs', 'jobs', 'failed_jobs', 'sessions', 'cache', 'migrations', 
            'password_reset_tokens', 'personal_access_tokens'
        ];
        if (in_array($targetTable, $skippedTables)) return;

        if (!Schema::connection('temp_migration')->hasTable($sourceTable)) {
            $this->warn("Source table '$sourceTable' does not exist in dump. Skipping.");
            return;
        }

        $this->info("Migrating '$sourceTable' to '$targetTable'...");

        $sourceColumns = DB::connection('temp_migration')->getSchemaBuilder()->getColumnListing($sourceTable);
        $targetColumns = Schema::getColumnListing($targetTable);
        $columnsToMigrate = array_intersect($sourceColumns, $targetColumns);
        
        if (empty($columnsToMigrate)) {
            $this->warn("No matching columns for '$targetTable'. Skipping.");
            return;
        }

        foreach (DB::connection('temp_migration')->table($sourceTable)->cursor() as $row) {
            $data = [];
            foreach ($columnsToMigrate as $col) {
                $data[$col] = $row->$col;
            }

            // Remap User IDs
            $this->remapRow($data);
            $this->cleanData($data);

            // Insert or Update
            if (isset($data['id'])) {
                DB::table($targetTable)->updateOrInsert(
                    ['id' => $data['id']],
                    $data
                );
            } else {
                // Special handling for pivot tables without ID
                // e.g. activity_owners (activity_id, user_id)
                if ($targetTable === 'activity_owners') {
                     DB::table($targetTable)->updateOrInsert(
                        ['activity_id' => $data['activity_id'], 'user_id' => $data['user_id']],
                        $data
                    );
                } else {
                    try {
                        DB::table($targetTable)->insert($data);
                    } catch (\Exception $e) {
                        // Ignore duplicate entry
                    }
                }
            }
        }
        $this->output->write(" Done.\n");
    }

    protected function remapRow(&$data) {
        if (isset($data['user_id']) && isset($this->userIdMap[$data['user_id']])) {
            $data['user_id'] = $this->userIdMap[$data['user_id']];
        }
        foreach (['sender_id', 'verified_by', 'uploaded_by', 'author_id'] as $col) {
            if (isset($data[$col]) && isset($this->userIdMap[$data[$col]])) {
                $data[$col] = $this->userIdMap[$data[$col]];
            }
        }
    }

    protected function generateUniqueId($table) {
        do {
            $id = strtoupper(Str::random(6));
        } while (DB::table($table)->where('id', $id)->exists());
        return $id;
    }

    protected function cleanData(&$data) {
        foreach ($data as $key => $value) {
            if ($value === '0000-00-00 00:00:00' || $value === '0000-00-00') {
                $data[$key] = null;
            }
        }
    }
}
