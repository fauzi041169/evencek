<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            if (Schema::hasTable('activity_chats') && ! Schema::hasColumn('activity_chats', 'is_read')) {
                Schema::table('activity_chats', function (Blueprint $table) {
                    $table->boolean('is_read')->default(false);
                });
            }

            return;
        }

        if (Schema::hasTable('activity_chats')) {
            // Table exists, check and fix column types
            try {
                // Drop foreign keys first
                DB::statement('ALTER TABLE `activity_chats` DROP FOREIGN KEY IF EXISTS `activity_chats_activity_id_foreign`');
                DB::statement('ALTER TABLE `activity_chats` DROP FOREIGN KEY IF EXISTS `activity_chats_user_id_foreign`');
                DB::statement('ALTER TABLE `activity_chats` DROP FOREIGN KEY IF EXISTS `activity_chats_sender_id_foreign`');
            } catch (\Exception $e) {
                // Ignore if foreign keys don't exist
            }

            // Check and modify activity_id
            $activityIdType = DB::select("SHOW COLUMNS FROM `activity_chats` WHERE Field = 'activity_id'");
            if (! empty($activityIdType) && strpos($activityIdType[0]->Type, 'char') === false) {
                DB::statement('ALTER TABLE `activity_chats` MODIFY `activity_id` CHAR(6) NOT NULL');
            }

            // Check and modify user_id
            $userIdType = DB::select("SHOW COLUMNS FROM `activity_chats` WHERE Field = 'user_id'");
            if (! empty($userIdType) && strpos($userIdType[0]->Type, 'char') === false) {
                DB::statement('ALTER TABLE `activity_chats` MODIFY `user_id` CHAR(6) NOT NULL');
            }

            // Check and modify sender_id
            $senderIdType = DB::select("SHOW COLUMNS FROM `activity_chats` WHERE Field = 'sender_id'");
            if (! empty($senderIdType) && strpos($senderIdType[0]->Type, 'char') === false) {
                DB::statement('ALTER TABLE `activity_chats` MODIFY `sender_id` CHAR(6) NOT NULL');
            }

            // Ensure is_read column exists
            if (! Schema::hasColumn('activity_chats', 'is_read')) {
                // Check if message column exists to determine where to place is_read
                if (Schema::hasColumn('activity_chats', 'message')) {
                    Schema::table('activity_chats', function (Blueprint $table) {
                        $table->boolean('is_read')->default(false)->after('message');
                    });
                } elseif (Schema::hasColumn('activity_chats', 'sender_id')) {
                    // If message doesn't exist, add after sender_id
                    Schema::table('activity_chats', function (Blueprint $table) {
                        $table->boolean('is_read')->default(false)->after('sender_id');
                    });
                } else {
                    // Fallback: add without after clause
                    Schema::table('activity_chats', function (Blueprint $table) {
                        $table->boolean('is_read')->default(false);
                    });
                }
            }

            // Recreate foreign keys
            try {
                DB::statement('ALTER TABLE `activity_chats` ADD CONSTRAINT `activity_chats_activity_id_foreign` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE');
                DB::statement('ALTER TABLE `activity_chats` ADD CONSTRAINT `activity_chats_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE');
                DB::statement('ALTER TABLE `activity_chats` ADD CONSTRAINT `activity_chats_sender_id_foreign` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE');
            } catch (\Exception $e) {
                // Foreign key might already exist, that's okay
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Don't reverse this migration as it fixes a critical issue
        // If needed, the original migration can be re-run
    }
};
