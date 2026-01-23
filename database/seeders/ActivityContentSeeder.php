<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ActivityContentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $contents = [
            [
                'activity_id' => '1', // Needs valid ID, using string '1' but it might fail if activity ID is random char(6).
                // Wait, ActivitySeeder generates random IDs. I cannot use '1' or '2'.
                // I need to fetch actual activity IDs.
                'title' => 'Introduction to Programming',
                'body' => 'Learn the basics of programming concepts and logic.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'activity_id' => '1',
                'title' => 'Variables and Data Types',
                'body' => 'Understanding different types of variables and how to use them.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'activity_id' => '2',
                'title' => 'Control Structures',
                'body' => 'Learn about loops, conditionals, and program flow control.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        // Fetch valid activity IDs
        $activities = DB::table('activities')->pluck('id')->toArray();
        if (empty($activities)) {
            return;
        }

        foreach ($contents as $index => $content) {
            // Assign valid activity ID
            // Using modulo to distribute content among available activities
            $content['activity_id'] = $activities[$index % count($activities)];
            $content['id'] = $this->generateCustomUid();
            DB::table('activity_contents')->insert($content);
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
        } while (DB::table('activity_contents')->where('id', $uid)->exists());

        return $uid;
    }
}
