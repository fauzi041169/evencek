<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class EnsureActivityChatsTable extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'chat:ensure-table';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Ensure activity_chats table exists in database';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking activity_chats table...');

        if (Schema::hasTable('activity_chats')) {
            $this->info('✓ Table activity_chats already exists');

            $needsFix = false;

            // Check if activity_id column exists
            if (! Schema::hasColumn('activity_chats', 'activity_id')) {
                $this->warn('Column activity_id does not exist. Adding...');
                try {
                    DB::statement('ALTER TABLE `activity_chats` ADD COLUMN `activity_id` CHAR(6) NOT NULL AFTER `id`');
                    $this->info('✓ Column activity_id added successfully');
                    $needsFix = true;
                } catch (\Exception $e) {
                    $this->error('Failed to add activity_id column: '.$e->getMessage());

                    return 1;
                }
            } else {
                $this->info('✓ Column activity_id exists');
            }

            // Check if user_id column exists
            if (! Schema::hasColumn('activity_chats', 'user_id')) {
                $this->warn('Column user_id does not exist. Adding...');
                try {
                    DB::statement('ALTER TABLE `activity_chats` ADD COLUMN `user_id` CHAR(6) NOT NULL AFTER `activity_id`');
                    $this->info('✓ Column user_id added successfully');
                    $needsFix = true;
                } catch (\Exception $e) {
                    $this->error('Failed to add user_id column: '.$e->getMessage());

                    return 1;
                }
            } else {
                $this->info('✓ Column user_id exists');
            }

            // Check if sender_id column exists
            if (! Schema::hasColumn('activity_chats', 'sender_id')) {
                $this->warn('Column sender_id does not exist. Adding...');
                try {
                    DB::statement('ALTER TABLE `activity_chats` ADD COLUMN `sender_id` CHAR(6) NOT NULL AFTER `user_id`');
                    $this->info('✓ Column sender_id added successfully');
                    $needsFix = true;
                } catch (\Exception $e) {
                    $this->error('Failed to add sender_id column: '.$e->getMessage());

                    return 1;
                }
            } else {
                $this->info('✓ Column sender_id exists');
            }

            // Check if message column exists
            if (! Schema::hasColumn('activity_chats', 'message')) {
                $this->warn('Column message does not exist. Adding...');
                try {
                    DB::statement('ALTER TABLE `activity_chats` ADD COLUMN `message` TEXT NOT NULL AFTER `sender_id`');
                    $this->info('✓ Column message added successfully');
                    $needsFix = true;
                } catch (\Exception $e) {
                    $this->error('Failed to add message column: '.$e->getMessage());

                    return 1;
                }
            } else {
                $this->info('✓ Column message exists');
            }

            // Check if is_read column exists
            if (! Schema::hasColumn('activity_chats', 'is_read')) {
                $this->warn('Column is_read does not exist. Adding...');
                try {
                    DB::statement('ALTER TABLE `activity_chats` ADD COLUMN `is_read` TINYINT(1) NOT NULL DEFAULT 0 AFTER `message`');
                    $this->info('✓ Column is_read added successfully');
                    $needsFix = true;
                } catch (\Exception $e) {
                    $this->error('Failed to add is_read column: '.$e->getMessage());

                    return 1;
                }
            } else {
                $this->info('✓ Column is_read exists');
            }

            // Check if is_read_by_user column exists
            if (! Schema::hasColumn('activity_chats', 'is_read_by_user')) {
                $this->warn('Column is_read_by_user does not exist. Adding...');
                try {
                    DB::statement('ALTER TABLE `activity_chats` ADD COLUMN `is_read_by_user` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_read`');
                    $this->info('✓ Column is_read_by_user added successfully');
                    $needsFix = true;
                } catch (\Exception $e) {
                    $this->warn('Warning: Could not add is_read_by_user column: '.$e->getMessage());
                }
            } else {
                $this->info('✓ Column is_read_by_user exists');
            }

            // Check if is_read_by_committee column exists
            if (! Schema::hasColumn('activity_chats', 'is_read_by_committee')) {
                $this->warn('Column is_read_by_committee does not exist. Adding...');
                try {
                    DB::statement('ALTER TABLE `activity_chats` ADD COLUMN `is_read_by_committee` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_read_by_user`');
                    $this->info('✓ Column is_read_by_committee added successfully');
                    $needsFix = true;
                } catch (\Exception $e) {
                    $this->warn('Warning: Could not add is_read_by_committee column: '.$e->getMessage());
                }
            } else {
                $this->info('✓ Column is_read_by_committee exists');
            }

            // Check if timestamps exist
            if (! Schema::hasColumn('activity_chats', 'created_at')) {
                $this->warn('Column created_at does not exist. Adding...');
                try {
                    DB::statement('ALTER TABLE `activity_chats` ADD COLUMN `created_at` TIMESTAMP NULL DEFAULT NULL');
                    $this->info('✓ Column created_at added successfully');
                    $needsFix = true;
                } catch (\Exception $e) {
                    $this->warn('Warning: Could not add created_at column: '.$e->getMessage());
                }
            } else {
                $this->info('✓ Column created_at exists');
            }

            if (! Schema::hasColumn('activity_chats', 'updated_at')) {
                $this->warn('Column updated_at does not exist. Adding...');
                try {
                    DB::statement('ALTER TABLE `activity_chats` ADD COLUMN `updated_at` TIMESTAMP NULL DEFAULT NULL');
                    $this->info('✓ Column updated_at added successfully');
                    $needsFix = true;
                } catch (\Exception $e) {
                    $this->warn('Warning: Could not add updated_at column: '.$e->getMessage());
                }
            } else {
                $this->info('✓ Column updated_at exists');
            }

            // If we added columns, try to add foreign keys
            if ($needsFix) {
                $this->warn('Adding foreign keys...');
                try {
                    // Drop existing foreign keys if they exist (MySQL 8.0+ syntax)
                    try {
                        DB::statement('ALTER TABLE `activity_chats` DROP FOREIGN KEY `activity_chats_activity_id_foreign`');
                    } catch (\Exception $e) {
                        // Foreign key doesn't exist, that's okay
                    }
                    try {
                        DB::statement('ALTER TABLE `activity_chats` DROP FOREIGN KEY `activity_chats_user_id_foreign`');
                    } catch (\Exception $e) {
                        // Foreign key doesn't exist, that's okay
                    }
                    try {
                        DB::statement('ALTER TABLE `activity_chats` DROP FOREIGN KEY `activity_chats_sender_id_foreign`');
                    } catch (\Exception $e) {
                        // Foreign key doesn't exist, that's okay
                    }

                    // Add foreign keys
                    DB::statement('ALTER TABLE `activity_chats` ADD CONSTRAINT `activity_chats_activity_id_foreign` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE');
                    DB::statement('ALTER TABLE `activity_chats` ADD CONSTRAINT `activity_chats_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE');
                    DB::statement('ALTER TABLE `activity_chats` ADD CONSTRAINT `activity_chats_sender_id_foreign` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE');

                    $this->info('✓ Foreign keys added successfully');
                } catch (\Exception $e) {
                    $this->warn('Warning: Could not add foreign keys: '.$e->getMessage());
                    $this->warn('This might be okay if foreign keys already exist or tables are not ready');
                }
            }

            return 0;
        }

        $this->warn('Table activity_chats does not exist. Creating...');

        try {
            DB::statement("
                CREATE TABLE IF NOT EXISTS `activity_chats` (
                  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
                  `activity_id` char(6) COLLATE utf8mb4_unicode_ci NOT NULL,
                  `user_id` char(6) COLLATE utf8mb4_unicode_ci NOT NULL,
                  `sender_id` char(6) COLLATE utf8mb4_unicode_ci NOT NULL,
                  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
                  `is_read` tinyint(1) NOT NULL DEFAULT '0',
                  `is_read_by_user` tinyint(1) NOT NULL DEFAULT '0',
                  `is_read_by_committee` tinyint(1) NOT NULL DEFAULT '0',
                  `created_at` timestamp NULL DEFAULT NULL,
                  `updated_at` timestamp NULL DEFAULT NULL,
                  PRIMARY KEY (`id`),
                  KEY `activity_chats_activity_id_foreign` (`activity_id`),
                  KEY `activity_chats_user_id_foreign` (`user_id`),
                  KEY `activity_chats_sender_id_foreign` (`sender_id`),
                  KEY `activity_chats_activity_id_user_id_index` (`activity_id`,`user_id`),
                  CONSTRAINT `activity_chats_activity_id_foreign` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE,
                  CONSTRAINT `activity_chats_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
                  CONSTRAINT `activity_chats_sender_id_foreign` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");

            $this->info('✓ Table activity_chats created successfully');

            return 0;
        } catch (\Exception $e) {
            $this->error('Failed to create table: '.$e->getMessage());
            $this->error('Please run the migration manually: php artisan migrate');

            return 1;
        }
    }
}
