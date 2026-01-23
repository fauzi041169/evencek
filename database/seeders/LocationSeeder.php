<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LocationSeeder extends Seeder
{
    private function generateCustomUid()
    {
        $letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $numbers = '0123456789';
        $randomLetters = '';
        for ($i = 0; $i < 3; $i++) {
            $randomLetters .= $letters[rand(0, strlen($letters) - 1)];
        }
        $randomNumbers = '';
        for ($i = 0; $i < 3; $i++) {
            $randomNumbers .= $numbers[rand(0, strlen($numbers) - 1)];
        }
        $combined = str_split($randomLetters.$randomNumbers);
        shuffle($combined);

        return implode('', $combined);
    }

    public function run()
    {
        // Insert province
        $provinceId = $this->generateCustomUid();
        DB::table('provinces')->insert([
            'id' => $provinceId,
            'name' => 'Provinsi Default',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Insert regency (kabupaten/kota)
        $regencyId = $this->generateCustomUid();
        DB::table('regencies')->insert([
            'id' => $regencyId,
            'province_id' => $provinceId,
            'name' => 'Kota/kabupaten Default',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Insert districts (kecamatan)
        DB::table('districts')->insert([
            [
                'id' => $this->generateCustomUid(),
                'regency_id' => $regencyId,
                'name' => 'Kecamatan 1',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => $this->generateCustomUid(),
                'regency_id' => $regencyId,
                'name' => 'Kecamatan 2',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
