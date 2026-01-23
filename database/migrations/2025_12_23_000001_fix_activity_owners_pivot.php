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
        Schema::table('activity_owners', function (Blueprint $table) {
            // If table still has an 'id' primary column created by previous migration,
            // drop that primary and the column, then set composite primary.
            // Note: dropping primary key may fail on some DBs if foreign keys reference it.
            try {
                $table->dropPrimary();
            } catch (\Throwable $e) {
                // ignore if primary can't be dropped directly
            }

            if (Schema::hasColumn('activity_owners', 'id')) {
                try {
                    $table->dropColumn('id');
                } catch (\Throwable $e) {
                    // ignore; some DB engines may require raw statements
                }
            }

            // Ensure composite primary exists
            try {
                $table->primary(['activity_id', 'user_id']);
            } catch (\Throwable $e) {
                // ignore if already primary
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_owners', function (Blueprint $table) {
            // Revert: remove composite primary and add back id char primary.
            try {
                $table->dropPrimary();
            } catch (\Throwable $e) {
            }

            if (! Schema::hasColumn('activity_owners', 'id')) {
                $table->char('id', 6)->primary();
            }
        });
    }
};
