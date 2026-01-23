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
        if (Schema::hasTable('idcardbegrounds') && ! Schema::hasColumn('idcardbegrounds', 'activity_id')) {
            Schema::table('idcardbegrounds', function (Blueprint $table) {
                $table->foreignCustomUid('activity_id')->nullable()->after('id')->constrained('activities')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('idcardbegrounds') && Schema::hasColumn('idcardbegrounds', 'activity_id')) {
            Schema::table('idcardbegrounds', function (Blueprint $table) {
                $table->dropForeign(['activity_id']);
                $table->dropColumn('activity_id');
            });
        }
    }
};
