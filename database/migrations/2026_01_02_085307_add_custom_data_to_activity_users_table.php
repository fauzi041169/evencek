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
        if (Schema::hasTable('activity_users')) {
            Schema::table('activity_users', function (Blueprint $table) {
                if (! Schema::hasColumn('activity_users', 'custom_data')) {
                    $table->json('custom_data')->nullable()->after('status');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('activity_users')) {
            Schema::table('activity_users', function (Blueprint $table) {
                if (Schema::hasColumn('activity_users', 'custom_data')) {
                    $table->dropColumn('custom_data');
                }
            });
        }
    }
};
