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
            $table->integer('jumlah_akses')->default(0)->after('order');
            $table->integer('lama_akses')->default(0)->after('jumlah_akses'); // dalam menit
            $table->timestamp('last_access_at')->nullable()->after('lama_akses');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_committee_structures', function (Blueprint $table) {
            $table->dropColumn(['jumlah_akses', 'lama_akses', 'last_access_at']);
        });
    }
};
