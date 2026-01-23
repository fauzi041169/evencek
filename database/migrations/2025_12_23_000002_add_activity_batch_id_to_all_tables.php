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
        $tables = [
            'certificate_settings',
            'activity_committee_structures',
            'activity_rundowns',
            'activity_divisions',
            'activitirecords',
            'activity_materials',
            'activitiusers',
            'attendances',
            'activity_hotel_rooms',
            'activity_hotel_room_assignments',
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    if (! Schema::hasColumn($tableName, 'activity_batch_id')) {
                        $table->char('activity_batch_id', 6)->nullable()->after('activity_id')->index();
                        $table->foreign('activity_batch_id')->references('id')->on('activity_batches')->nullOnDelete();
                    }
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = [
            'certificate_settings',
            'activity_committee_structures',
            'activity_rundowns',
            'activity_divisions',
            'activitirecords',
            'activity_materials',
            'activitiusers',
            'attendances',
            'activity_hotel_rooms',
            'activity_hotel_room_assignments',
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    if (Schema::hasColumn($tableName, 'activity_batch_id')) {
                        $table->dropForeign(['activity_batch_id']);
                        $table->dropColumn('activity_batch_id');
                    }
                });
            }
        }
    }
};
