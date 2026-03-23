<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('activity_blocked_regions')) {
            return;
        }
        if (Schema::hasColumn('activity_blocked_regions', 'keterangan')) {
            return;
        }
        Schema::table('activity_blocked_regions', function (Blueprint $table) {
            $table->text('keterangan')->nullable()->after('district_id');
        });
    }

    public function down(): void
    {
        Schema::table('activity_blocked_regions', function (Blueprint $table) {
            $table->dropColumn('keterangan');
        });
    }
};
