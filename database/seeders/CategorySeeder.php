<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
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
        // Gunakan updateOrCreate agar idempotent saat seeding diulang
        $categories = [
            ['name' => 'Umum', 'description' => 'Kategori umum'],
            ['name' => 'Pengumuman', 'description' => 'Kategori untuk pengumuman'],
            ['name' => 'Seminar', 'description' => 'Kategori untuk acara seminar'],
            ['name' => 'Workshop', 'description' => 'Kategori untuk acara workshop'],
            ['name' => 'Rapat Kerja', 'description' => 'Kategori untuk rapat kerja organisasi/perusahaan'],
            ['name' => 'Pelatihan', 'description' => 'Kategori untuk kegiatan pelatihan'],
            ['name' => 'Webinar', 'description' => 'Kategori untuk acara webinar'],
            ['name' => 'Konferensi', 'description' => 'Kategori untuk acara konferensi'],
            ['name' => 'Kompetisi', 'description' => 'Kategori untuk lomba/kompetisi'],
            ['name' => 'Kelas', 'description' => 'Kategori untuk kelas/pembelajaran'],
            ['name' => 'Bootcamp', 'description' => 'Kategori untuk bootcamp intensif'],
        ];

        foreach ($categories as $data) {
            $category = Category::where('name', $data['name'])->first();
            if (! $category) {
                Category::create([
                    'id' => $this->generateCustomUid(),
                    'name' => $data['name'],
                    'description' => $data['description'],
                ]);
            } else {
                $category->update([
                    'description' => $data['description'],
                ]);
            }
        }
    }
}
