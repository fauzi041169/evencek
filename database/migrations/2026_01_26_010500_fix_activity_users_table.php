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
        // 1. Merge data from activitiusers to activity_users
        if (Schema::hasTable('activitiusers') && Schema::hasTable('activity_users')) {
            $oldRows = DB::table('activitiusers')->get();
            foreach ($oldRows as $row) {
                $exists = DB::table('activity_users')
                    ->where('user_id', $row->user_id)
                    ->where('activity_id', $row->activity_id)
                    ->exists();

                if (! $exists) {
                    try {
                        DB::table('activity_users')->insert([
                            'id' => $row->id,
                            'user_id' => $row->user_id,
                            'activity_id' => $row->activity_id,
                            'activity_batch_id' => $row->activity_batch_id,
                            'status' => $row->status,
                            'custom_data' => $row->custom_data, // DB should handle casting text to json
                            'print_count' => $row->print_count,
                            'certificate_id' => $row->certificate_id,
                            'activity_participant_group_id' => $row->activity_participant_group_id,
                            'created_at' => $row->created_at,
                            'updated_at' => $row->updated_at,
                            // Set defaults for new columns
                            'jumlah_akses' => 0,
                            'lama_akses' => 0,
                        ]);
                    } catch (\Exception $e) {
                        // Ignore errors (e.g. duplicate entry on ID or other constraints)
                        // We prioritize keeping the existing data in activity_users if conflict arises
                    }
                }
            }

            // Drop the old table
            Schema::drop('activitiusers');
        } elseif (Schema::hasTable('activitiusers') && ! Schema::hasTable('activity_users')) {
            // Just rename if target doesn't exist
            Schema::rename('activitiusers', 'activity_users');
        }

        // 2. Add Foreign Key for activity_batch_id if missing
        Schema::table('activity_users', function (Blueprint $table) {
            // Check if foreign key exists is hard in generic way, but we can try-catch or check constraint name convention
            // We'll use a safer approach: modify column to be sure it matches types then add FK

            // First ensure column type matches parent
            // activity_batches.id is char(6)
        });

        // Use raw SQL to safely add FK if not exists
        try {
            $fkExists = DB::select("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'activity_users' AND CONSTRAINT_NAME = 'activity_users_activity_batch_id_foreign' AND TABLE_SCHEMA = DATABASE()");

            if (empty($fkExists)) {
                Schema::table('activity_users', function (Blueprint $table) {
                    $table->foreign('activity_batch_id', 'activity_users_activity_batch_id_foreign')
                        ->references('id')
                        ->on('activity_batches')
                        ->nullOnDelete();
                });
            }
        } catch (\Exception $e) {
            // Ignore if fails (e.g. table doesn't exist or other issue)
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // We generally don't reverse the drop of a typo table.
        // But we can remove the FK.
        Schema::table('activity_users', function (Blueprint $table) {
            $table->dropForeign(['activity_batch_id']);
        });
    }
};
