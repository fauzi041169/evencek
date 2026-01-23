<?php

namespace Database\Seeders;

use App\Models\District;
use App\Models\Regency;
use Illuminate\Database\Seeder;

class DistrictSeeder extends Seeder
{
    public function run()
    {
        $simeulue = Regency::where('name', 'KABUPATEN SIMEULUE')->first();

        if ($simeulue) {
            $districts = [
                'TELUK DALAM',
                'SIMEULUE CUT',
                'SALANG',
                'SIMEULUE BARAT',
                'ALAFAN',
            ];

            foreach ($districts as $district) {
                District::create([
                    'regency_id' => $simeulue->id,
                    'name' => $district,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
}
