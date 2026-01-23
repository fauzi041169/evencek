<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        $columnsToFix = [
            'activitirecords' => ['activity_id', 'activity_batch_id'],
            'activitiusers' => ['activity_id', 'activity_batch_id', 'certificate_id'],
            'activity_batches' => ['activity_id'],
            'activity_committee_structures' => ['activity_batch_id'],
            'activity_divisions' => ['activity_batch_id'],
            'activity_hotel_room_assignments' => ['activity_id', 'activity_batch_id', 'room_id', 'user_id'],
            'activity_hotel_rooms' => ['activity_id', 'activity_batch_id'],
            'activity_materials' => ['activity_batch_id'],
            'activity_rundowns' => ['activity_batch_id'],
            'attendances' => ['activity_id', 'activity_batch_id'],
            'card_settings' => ['activity_id', 'activity_batch_id'],
            'certificate_settings' => ['activity_batch_id'],
            'payments' => ['activity_id', 'activity_batch_id'],
            'performance_logs' => ['user_id'],
        ];

        foreach ($columnsToFix as $table => $columns) {
            if (Schema::hasTable($table)) {
                foreach ($columns as $column) {
                    if (Schema::hasColumn($table, $column)) {
                        try {
                            // Using direct SQL to avoid Doctrine limitations with enum/etc if any
                            DB::statement("ALTER TABLE `$table` MODIFY `$column` CHAR(6) NULL");
                        } catch (\Exception $e) {
                            echo "Error modifying $table.$column: ".$e->getMessage()."\n";
                        }
                    }
                }
            }
        }

        // Polymorphic columns - convert to VARCHAR(36) to be safe
        $polyColumns = [
            'comments' => ['commentable_id'],
            'model_has_permissions' => ['model_id'],
            'model_has_roles' => ['model_id'],
            'personal_access_tokens' => ['tokenable_id'],
        ];

        foreach ($polyColumns as $table => $columns) {
            if (Schema::hasTable($table)) {
                foreach ($columns as $column) {
                    if (Schema::hasColumn($table, $column)) {
                        try {
                            DB::statement("ALTER TABLE `$table` MODIFY `$column` VARCHAR(36) NOT NULL");
                        } catch (\Exception $e) {
                            echo "Error modifying $table.$column: ".$e->getMessage()."\n";
                        }
                    }
                }
            }
        }
    }

    public function down()
    {
        // No down needed as we are fixing types
    }
};
