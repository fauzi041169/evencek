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
        if (!Schema::hasColumn('activity_users', 'activity_participation_type_id')) {
            Schema::table('activity_users', function (Blueprint $table) {
                $table->char('activity_participation_type_id', 6)->nullable()->after('activity_participant_group_id');
                $table->foreign('activity_participation_type_id')->references('id')->on('activity_participation_types')->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_users', function (Blueprint $table) {
            $table->dropForeign(['activity_participation_type_id']);
            $table->dropColumn('activity_participation_type_id');
        });
    }
};
