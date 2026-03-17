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
            if (! Schema::hasColumn('activity_owners', 'id')) {
                return;
            }

            try {
                $table->index('activity_id');
            } catch (\Throwable $e) {
            }

            try {
                $table->index('user_id');
            } catch (\Throwable $e) {
            }

            $table->dropPrimary();
            $table->dropColumn('id');
            $table->primary(['activity_id', 'user_id']);
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
                $table->index('activity_id');
            } catch (\Throwable $e) {
            }

            try {
                $table->index('user_id');
            } catch (\Throwable $e) {
            }

            $table->dropPrimary();

            if (! Schema::hasColumn('activity_owners', 'id')) {
                $table->char('id', 6)->primary();
            }
        });
    }
};
