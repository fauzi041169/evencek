<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Rename activitirecords to activity_records
        if (Schema::hasTable('activitirecords') && ! Schema::hasTable('activity_records')) {
            Schema::rename('activitirecords', 'activity_records');
        }

        // 2. Rename idcardbegrounds to id_card_backgrounds
        if (Schema::hasTable('idcardbegrounds') && ! Schema::hasTable('id_card_backgrounds')) {
            Schema::rename('idcardbegrounds', 'id_card_backgrounds');
        }

        // 3. Handle activitiusers vs activity_users
        if (Schema::hasTable('activitiusers')) {
            if (! Schema::hasTable('activity_users')) {
                // Simple rename if target doesn't exist
                Schema::rename('activitiusers', 'activity_users');
            } else {
                // Both exist. Merge data from typo table to correct table.
                $rows = DB::table('activitiusers')->get();
                foreach ($rows as $row) {
                    $data = (array) $row;
                    try {
                        DB::table('activity_users')->insert($data);
                    } catch (\Exception $e) {
                        // Ignore duplicates or incompatible columns
                    }
                }

                // Drop the typo table after merging
                Schema::drop('activitiusers');
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('activity_records') && ! Schema::hasTable('activitirecords')) {
            Schema::rename('activity_records', 'activitirecords');
        }

        if (Schema::hasTable('id_card_backgrounds') && ! Schema::hasTable('idcardbegrounds')) {
            Schema::rename('id_card_backgrounds', 'idcardbegrounds');
        }
    }
};
