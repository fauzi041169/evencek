<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Drop existing foreign key
        Schema::table('activity_custom_field', function (Blueprint $table) {
            // Drop foreign key using array syntax which guesses the name 'activity_custom_field_activity_id_foreign'
            $table->dropForeign(['activity_id']);
        });

        // 2. Modify column type to CHAR(6) to match activities.id
        // We use DB::statement because ->change() requires doctrine/dbal which might not be installed
        DB::statement("ALTER TABLE activity_custom_field MODIFY activity_id CHAR(6) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL");

        // 3. Re-add foreign key constraint
        Schema::table('activity_custom_field', function (Blueprint $table) {
            $table->foreign('activity_id')
                  ->references('id')
                  ->on('activities')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_custom_field', function (Blueprint $table) {
            $table->dropForeign(['activity_id']);
        });

        // Revert to BIGINT UNSIGNED
        DB::statement("ALTER TABLE activity_custom_field MODIFY activity_id BIGINT UNSIGNED NOT NULL");

        Schema::table('activity_custom_field', function (Blueprint $table) {
            $table->foreign('activity_id')
                  ->references('id')
                  ->on('activities')
                  ->onDelete('cascade');
        });
    }
};
