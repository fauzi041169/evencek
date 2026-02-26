<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Daerah tugas/layanan untuk panitia dengan jabatan PIC.
     */
    public function up(): void
    {
        Schema::table('activity_committee_structures', function (Blueprint $table) {
            $table->string('daerah_layanan')->nullable()->after('order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_committee_structures', function (Blueprint $table) {
            $table->dropColumn('daerah_layanan');
        });
    }
};
