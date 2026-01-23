<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RegionSeeder extends Seeder
{
    protected $apiUrl = 'https://www.emsifa.com/api-wilayah-indonesia/api';

    public function run()
    {
        try {
            $this->command->info('Memulai import data wilayah Indonesia...');

            // Get provinces data (disable SSL verification untuk development)
            $provinces = Http::withoutVerifying()
                ->get($this->apiUrl.'/provinces.json')
                ->json();

            $this->command->info('Mengimport '.count($provinces).' provinsi...');

            foreach ($provinces as $province) {
                try {
                    DB::beginTransaction();

                    // Insert atau update province dengan ID asli dari API
                    DB::table('provinces')->updateOrInsert(
                        ['id' => $province['id']],
                        [
                            'name' => $province['name'],
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]
                    );

                    $this->command->info("Importing kabupaten/kota untuk provinsi: {$province['name']}");

                    // Get regencies data
                    $regencies = Http::withoutVerifying()
                        ->get($this->apiUrl.'/regencies/'.$province['id'].'.json')
                        ->json();

                    foreach ($regencies as $regency) {
                        // Insert atau update regency dengan ID asli dari API
                        DB::table('regencies')->updateOrInsert(
                            ['id' => $regency['id']],
                            [
                                'province_id' => $province['id'],
                                'name' => $regency['name'],
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]
                        );

                        // Get districts data
                        $districts = Http::withoutVerifying()
                            ->get($this->apiUrl.'/districts/'.$regency['id'].'.json')
                            ->json();

                        foreach ($districts as $district) {
                            // Insert atau update district dengan ID asli dari API
                            DB::table('districts')->updateOrInsert(
                                ['id' => $district['id']],
                                [
                                    'regency_id' => $regency['id'],
                                    'name' => $district['name'],
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ]
                            );
                        }

                        $this->command->info("  ✓ Imported: {$regency['name']} with ".count($districts).' districts');
                    }

                    DB::commit();
                    $this->command->info("✓ Selesai import data untuk provinsi: {$province['name']}");

                } catch (\Exception $e) {
                    DB::rollBack();
                    Log::error("Error pada provinsi {$province['name']}: ".$e->getMessage());
                    $this->command->error("Gagal import data untuk provinsi: {$province['name']} - ".$e->getMessage());
                }

                // Delay between provinces to avoid rate limiting
                sleep(1);
            }

            $this->command->info('Selesai import semua data wilayah Indonesia!');

        } catch (\Exception $e) {
            Log::error('Error pada RegionSeeder: '.$e->getMessage());
            $this->command->error('Gagal menjalankan seeder: '.$e->getMessage());
        }
    }
}
