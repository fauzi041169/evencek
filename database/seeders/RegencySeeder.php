<?php

namespace Database\Seeders;

use App\Models\Province;
use App\Models\Regency;
use Illuminate\Database\Seeder;

class RegencySeeder extends Seeder
{
    public function run()
    {
        $aceh = Province::where('name', 'Aceh')->first();

        if ($aceh) {
            Regency::create([
                'province_id' => $aceh->id,
                'name' => 'KABUPATEN SIMEULUE',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
