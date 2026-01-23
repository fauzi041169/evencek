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
        if (Schema::hasTable('activities') && ! Schema::hasColumn('activities', 'column_settings')) {
            Schema::table('activities', function (Blueprint $table) {
                $table->json('column_settings')->nullable()->after('enable_comments');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('activities') && Schema::hasColumn('activities', 'column_settings')) {
            Schema::table('activities', function (Blueprint $table) {
                $table->dropColumn('column_settings');
            });
        }
    }
};
