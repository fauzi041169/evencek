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
        if (! Schema::hasColumn('activity_committee_structures', 'committee_type_id')) {
            Schema::table('activity_committee_structures', function (Blueprint $table) {
                $table->string('committee_type_id')->nullable()->after('activity_division_id');
                $table->foreign('committee_type_id')->references('id')->on('activity_committee_types')->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_committee_structures', function (Blueprint $table) {
            $table->dropForeign(['committee_type_id']);
            $table->dropColumn('committee_type_id');
        });
    }
};
