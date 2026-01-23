<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('certificate_settings')) {
            Schema::table('certificate_settings', function (Blueprint $table) {
                if (! Schema::hasColumn('certificate_settings', 'additional_pages')) {
                    $table->json('additional_pages')->nullable()->after('print_settings');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('certificate_settings') && Schema::hasColumn('certificate_settings', 'additional_pages')) {
            Schema::table('certificate_settings', function (Blueprint $table) {
                $table->dropColumn('additional_pages');
            });
        }
    }
};

