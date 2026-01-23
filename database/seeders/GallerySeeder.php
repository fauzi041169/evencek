<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GallerySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Gallery images disimpan tanpa prefix 'gallery/' karena sudah di folder gallery
        $galleries = [
            [
                'activity_id' => '1', // Will be replaced
                'image' => 'activity1-1.jpg',
                'caption' => 'Students participating in the workshop',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'activity_id' => '1',
                'image' => 'activity1-2.jpg',
                'caption' => 'Group discussion session',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'activity_id' => '2',
                'image' => 'activity2-1.jpg',
                'caption' => 'Practical demonstration',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'activity_id' => '2',
                'image' => 'activity2-2.jpg',
                'caption' => 'Team building exercise',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        // Fetch valid activity IDs
        $activities = DB::table('activities')->pluck('id')->toArray();
        if (empty($activities)) {
            return;
        }

        foreach ($galleries as $index => $gallery) {
            // Assign valid activity ID
            $gallery['activity_id'] = $activities[$index % count($activities)];
            $gallery['id'] = $this->generateCustomUid();
            DB::table('galleries')->insert($gallery);
        }
    }

    private function generateCustomUid()
    {
        $letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $numbers = '0123456789';

        do {
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
            $uid = implode('', $combined);
        } while (DB::table('galleries')->where('id', $uid)->exists());

        return $uid;
    }
}
