<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ref_positions', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        // Seed default positions
        $defaults = [
            'Ketua Panitia',
            'Wakil Ketua Panitia',
            'Sekretaris',
            'Wakil Sekretaris',
            'Bendahara',
            'Wakil Bendahara',
            'Koordinator Acara',
            'Anggota Acara',
            'Koordinator Logistik',
            'Anggota Logistik',
            'Koordinator Dokumentasi',
            'Anggota Dokumentasi',
            'Koordinator Konsumsi',
            'Anggota Konsumsi',
            'Koordinator Perlengkapan',
            'Anggota Perlengkapan',
            'Koordinator Humas',
            'Anggota Humas',
            'Koordinator IT',
            'Anggota IT',
        ];

        foreach ($defaults as $name) {
            DB::table('ref_positions')->insertOrIgnore([
                'name' => $name,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ref_positions');
    }
};
