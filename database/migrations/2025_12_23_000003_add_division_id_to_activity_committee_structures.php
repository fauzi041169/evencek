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
        Schema::table('activity_committee_structures', function (Blueprint $table) {
            $table->foreignCustomUid('activity_division_id')->nullable()->constrained('activity_divisions')->nullOnDelete()->after('activity_batch_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_committee_structures', function (Blueprint $table) {
            if (Schema::hasColumn('activity_committee_structures', 'activity_division_id')) {
                $table->dropForeign(['activity_division_id']);
                $table->dropColumn('activity_division_id');
            }
        });
    }
};
