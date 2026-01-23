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
        Schema::table('profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('profiles', 'other_province')) {
                $table->string('other_province')->nullable()->after('district_id');
            }
            if (!Schema::hasColumn('profiles', 'other_regency')) {
                $table->string('other_regency')->nullable()->after('other_province');
            }
            if (!Schema::hasColumn('profiles', 'other_district')) {
                $table->string('other_district')->nullable()->after('other_regency');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $columnsToDrop = [];
            foreach (['other_province', 'other_regency', 'other_district'] as $column) {
                if (Schema::hasColumn('profiles', $column)) {
                    $columnsToDrop[] = $column;
                }
            }

            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
