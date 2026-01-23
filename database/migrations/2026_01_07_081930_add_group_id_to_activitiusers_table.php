<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $tableName = 'activity_users';

        if (Schema::hasTable($tableName)) {
            // Drop column if exists (cleanup from failed migration)
            if (Schema::hasColumn($tableName, 'activity_participant_group_id')) {
                Schema::table($tableName, function (Blueprint $table) {
                    // Drop column directly
                    $table->dropColumn('activity_participant_group_id');
                });
            }

            // Add column with Index but WITHOUT FK constraint to avoid environment issues
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignCustomUid('activity_participant_group_id')->nullable()->index();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tableName = 'activity_users';

        if (Schema::hasTable($tableName)) {
            Schema::table($tableName, function (Blueprint $table) {
                if (Schema::hasColumn($table->getTable(), 'activity_participant_group_id')) {
                    $table->dropColumn('activity_participant_group_id');
                }
            });
        }
    }
};
