<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ActivitySeeder extends Seeder
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
        // Pastikan ada kategori terlebih dahulu
        if (! Category::exists()) {
            Category::create([
                'id' => $this->generateCustomUid(),
                'name' => 'Umum',
                'description' => 'Kategori umum',
            ]);
        }

        // Cari superadmin untuk dijadikan pemilik default
        $superadmin = User::where('role', 'superadmin')->first();
        // Jika tidak ada superadmin, coba cari user pertama
        if (! $superadmin) {
            $superadmin = User::first();
        }
        $userId = $superadmin ? $superadmin->id : null;

        $activities = [
            [
                'name' => 'Seminar Teknologi AI',
                'description' => 'Seminar mendalam tentang perkembangan AI dan implementasinya',
                'date' => Carbon::now()->addDays(5),
                'start_time' => '09:00',
                'end_time' => '12:00',
                'location' => 'Gedung Serbaguna Lt. 3',
                'price' => 150000,
                'status' => 'public',
                'image' => 'activities/seminar-ai.jpg',
            ],
            [
                'name' => 'Workshop Data Science',
                'description' => 'Workshop intensif pengolahan data dan analisis statistik',
                'date' => Carbon::now()->addDays(7),
                'start_time' => '09:00',
                'end_time' => '16:00',
                'location' => 'Lab Komputer A',
                'price' => 500000,
                'status' => 'private',
                'image' => 'data-science.jpg',
            ],
            [
                'name' => 'Pelatihan Public Speaking',
                'description' => 'Tingkatkan kemampuan berbicara di depan umum',
                'date' => Carbon::now()->addDays(10),
                'start_time' => '13:30',
                'end_time' => '15:30',
                'location' => 'Aula Utama',
                'price' => 200000,
                'status' => 'public',
                'image' => 'activities/public-speaking.jpg',
            ],
            [
                'name' => 'Kompetisi Matematika',
                'description' => 'Olimpiade matematika tingkat nasional',
                'date' => Carbon::now()->addDays(14),
                'start_time' => '08:00',
                'end_time' => '12:00',
                'location' => 'Gedung B',
                'price' => 75000,
                'status' => 'public',
                'image' => 'activities/math.jpg',
            ],
            [
                'name' => 'Kelas Melukis Digital',
                'description' => 'Belajar digital art menggunakan tablet grafis',
                'date' => Carbon::now()->addDays(15),
                'start_time' => '15:00',
                'end_time' => '17:00',
                'location' => 'Studio Digital',
                'price' => 350000,
                'status' => 'private',
                'image' => 'activities/digital-art.jpg',
            ],
            [
                'name' => 'Webinar Investasi Saham',
                'description' => 'Strategi investasi saham untuk pemula',
                'date' => Carbon::now()->addDays(20),
                'start_time' => '10:00',
                'end_time' => '12:00',
                'location' => 'Zoom Meeting',
                'price' => 100000,
                'status' => 'public',
                'image' => 'activities/investment.jpg',
            ],
            [
                'name' => 'Bootcamp Programming',
                'description' => 'Intensive coding bootcamp selama 2 hari',
                'date' => Carbon::now()->addDays(25),
                'start_time' => '09:00',
                'end_time' => '17:00',
                'location' => 'Tech Hub',
                'price' => 1500000,
                'status' => 'private',
                'image' => 'activities/bootcamp.jpg',
            ],
            [
                'name' => 'Workshop Fotografi',
                'description' => 'Teknik fotografi landscape dan portrait',
                'date' => Carbon::now()->addDays(30),
                'start_time' => '14:00',
                'end_time' => '18:00',
                'location' => 'Studio Foto',
                'price' => 300000,
                'status' => 'public',
                'image' => 'activities/photography.jpg',
            ],
            [
                'name' => 'Seminar Kesehatan Mental',
                'description' => 'Pentingnya menjaga kesehatan mental di era digital',
                'date' => Carbon::now()->addDays(35),
                'start_time' => '13:00',
                'end_time' => '15:00',
                'location' => 'Aula Kesehatan',
                'price' => 50000,
                'status' => 'public',
                'image' => 'activities/mental-health.jpg',
            ],
            [
                'name' => 'Kelas Memasak',
                'description' => 'Belajar memasak masakan internasional',
                'date' => Carbon::now()->addDays(40),
                'start_time' => '10:00',
                'end_time' => '14:00',
                'location' => 'Dapur Edukasi',
                'price' => 450000,
                'status' => 'private',
                'image' => 'activities/cooking.jpg',
            ],
            [
                'name' => 'Workshop UI/UX Design',
                'description' => 'Prinsip desain dan prototyping aplikasi',
                'date' => Carbon::now()->addDays(45),
                'start_time' => '09:00',
                'end_time' => '16:00',
                'location' => 'Design Studio',
                'price' => 750000,
                'status' => 'private',
                'image' => 'activities/uiux.jpg',
            ],
            [
                'name' => 'Seminar Digital Marketing',
                'description' => 'Strategi pemasaran di era digital',
                'date' => Carbon::now()->addDays(50),
                'start_time' => '10:00',
                'end_time' => '12:00',
                'location' => 'Marketing Center',
                'price' => 200000,
                'status' => 'public',
                'image' => 'activities/digital-marketing.jpg',
            ],
            [
                'name' => 'Yoga dan Meditasi',
                'description' => 'Kelas yoga untuk pemula',
                'date' => Carbon::now()->addDays(55),
                'start_time' => '07:00',
                'end_time' => '08:30',
                'location' => 'Yoga Studio',
                'price' => 100000,
                'status' => 'public',
                'image' => 'activities/yoga.jpg',
            ],
            [
                'name' => 'Workshop Menulis Kreatif',
                'description' => 'Teknik menulis cerita pendek dan novel',
                'date' => Carbon::now()->addDays(60),
                'start_time' => '14:00',
                'end_time' => '16:00',
                'location' => 'Perpustakaan',
                'price' => 150000,
                'status' => 'private',
                'image' => 'activities/writing.jpg',
            ],
            [
                'name' => 'Seminar Blockchain',
                'description' => 'Pengenalan teknologi blockchain dan cryptocurrency',
                'date' => Carbon::now()->addDays(65),
                'start_time' => '13:00',
                'end_time' => '16:00',
                'location' => 'Tech Center',
                'price' => 250000,
                'status' => 'private',
                'image' => 'activities/blockchain.jpg',
            ],
            [
                'name' => 'Workshop 3D Modeling',
                'description' => 'Belajar modeling 3D menggunakan Blender',
                'date' => Carbon::now()->addDays(70),
                'start_time' => '09:00',
                'end_time' => '15:00',
                'location' => '3D Studio',
                'price' => 400000,
                'status' => 'pribadi',
                'image' => 'activities/3d-modeling.jpg',
            ],
            [
                'name' => 'Kelas Musik',
                'description' => 'Belajar gitar untuk pemula',
                'date' => Carbon::now()->addDays(75),
                'start_time' => '16:00',
                'end_time' => '18:00',
                'location' => 'Musik Studio',
                'price' => 200000,
                'status' => 'public',
                'image' => 'activities/music.jpg',
            ],
            [
                'name' => 'Seminar Entrepreneurship',
                'description' => 'Membangun startup dari nol',
                'date' => Carbon::now()->addDays(80),
                'start_time' => '10:00',
                'end_time' => '13:00',
                'location' => 'Business Center',
                'price' => 300000,
                'status' => 'public',
                'image' => 'activities/startup.jpg',
            ],
            [
                'name' => 'Workshop SEO',
                'description' => 'Optimasi website untuk mesin pencari',
                'date' => Carbon::now()->addDays(85),
                'start_time' => '09:00',
                'end_time' => '12:00',
                'location' => 'Digital Lab',
                'price' => 350000,
                'status' => 'khusus',
                'image' => 'activities/seo.jpg',
            ],
            [
                'name' => 'Kelas Bahasa Jepang',
                'description' => 'Belajar bahasa Jepang dasar',
                'date' => Carbon::now()->addDays(90),
                'start_time' => '15:00',
                'end_time' => '17:00',
                'location' => 'Language Center',
                'price' => 250000,
                'status' => 'public',
                'image' => 'activities/japanese.jpg',
            ],
            [
                'name' => 'Workshop Video Editing',
                'description' => 'Editing video profesional dengan Adobe Premiere',
                'date' => Carbon::now()->addDays(95),
                'start_time' => '10:00',
                'end_time' => '16:00',
                'location' => 'Creative Studio',
                'price' => 500000,
                'status' => 'pribadi',
                'image' => 'activities/video-editing.jpg',
            ],
            [
                'name' => 'Seminar Cyber Security',
                'description' => 'Keamanan siber untuk perusahaan',
                'date' => Carbon::now()->addDays(100),
                'start_time' => '09:00',
                'end_time' => '12:00',
                'location' => 'Security Center',
                'price' => 400000,
                'status' => 'khusus',
                'image' => 'activities/cyber-security.jpg',
            ],
            [
                'name' => 'Kelas Desain Interior',
                'description' => 'Dasar-dasar desain interior rumah',
                'date' => Carbon::now()->addDays(105),
                'start_time' => '13:00',
                'end_time' => '16:00',
                'location' => 'Design Hub',
                'price' => 300000,
                'status' => 'public',
                'image' => 'activities/interior-design.jpg',
            ],
            [
                'name' => 'Workshop IoT',
                'description' => 'Membuat proyek Internet of Things',
                'date' => Carbon::now()->addDays(110),
                'start_time' => '09:00',
                'end_time' => '15:00',
                'location' => 'IoT Lab',
                'price' => 600000,
                'status' => 'khusus',
                'image' => 'activities/iot.jpg',
            ],
            [
                'name' => 'Seminar Personal Branding',
                'description' => 'Membangun personal brand di media sosial',
                'date' => Carbon::now()->addDays(115),
                'start_time' => '10:00',
                'end_time' => '12:00',
                'location' => 'Social Media Center',
                'price' => 150000,
                'status' => 'public',
                'image' => 'activities/personal-branding.jpg',
            ],
            [
                'name' => 'Workshop Mobile Photography',
                'description' => 'Tips dan trik foto profesional dengan smartphone',
                'date' => Carbon::now()->addDays(120),
                'start_time' => '14:00',
                'end_time' => '17:00',
                'location' => 'Photo Studio',
                'price' => 200000,
                'status' => 'public',
                'image' => 'activities/mobile-photography.jpg',
            ],
        ];

        foreach ($activities as $activity) {
            $name = $activity['name'];
            $categoryName = 'Umum';

            if (str_starts_with(strtolower($name), 'seminar')) {
                $categoryName = 'Seminar';
            } elseif (str_starts_with(strtolower($name), 'workshop')) {
                $categoryName = 'Workshop';
            } elseif (str_starts_with(strtolower($name), 'pelatihan')) {
                $categoryName = 'Pelatihan';
            } elseif (str_starts_with(strtolower($name), 'webinar')) {
                $categoryName = 'Webinar';
            } elseif (str_starts_with(strtolower($name), 'bootcamp')) {
                $categoryName = 'Bootcamp';
            } elseif (str_starts_with(strtolower($name), 'kompetisi')) {
                $categoryName = 'Kompetisi';
            } elseif (str_starts_with(strtolower($name), 'kelas')) {
                $categoryName = 'Kelas';
            } elseif (str_starts_with(strtolower($name), 'rapat')) {
                $categoryName = 'Rapat Kerja';
            }

            $category = Category::where('name', $categoryName)->first();
            if (! $category) {
                $category = Category::create([
                    'id' => $this->generateCustomUid(),
                    'name' => $categoryName,
                    'description' => 'Kategori otomatis',
                ]);
            }

            // Pastikan tidak duplikat: gunakan nama sebagai kunci unik untuk seed contoh
            $existingActivity = DB::table('activities')->where('name', $activity['name'])->first();

            if (! $existingActivity) {
                DB::table('activities')->insert([
                    'id' => $this->generateCustomUid(),
                    'name' => $activity['name'],
                    'description' => $activity['description'],
                    'category_id' => $category->id,
                    'user_id' => $userId, // Set pemilik default
                    'date' => $activity['date'],
                    'start_time' => $activity['start_time'],
                    'end_time' => $activity['end_time'],
                    'location' => $activity['location'],
                    'price' => $activity['price'],
                    'payment_method_type' => 'automatic',
                    'status' => $activity['status'],
                    'image' => $activity['image'],
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ]);
            } else {
                DB::table('activities')->where('id', $existingActivity->id)->update([
                    'description' => $activity['description'],
                    'category_id' => $category->id,
                    'user_id' => $userId, // Set pemilik default
                    'date' => $activity['date'],
                    'start_time' => $activity['start_time'],
                    'end_time' => $activity['end_time'],
                    'location' => $activity['location'],
                    'price' => $activity['price'],
                    'payment_method_type' => 'automatic',
                    'status' => $activity['status'],
                    'image' => $activity['image'],
                    'updated_at' => Carbon::now(),
                ]);
            }
        }

        // --- SEED TEST CASES FOR SINGLE VS MULTI BATCH ---

        // 1. Single Activity (No Batches)
        $singleActivityId = DB::table('activities')->where('name', 'Seminar Teknologi AI')->value('id');
        if ($singleActivityId) {
            // Register Users 1-5
            $users = User::where('role', 'user')->take(5)->get();
            foreach ($users as $user) {
                $existing = DB::table('activity_users')
                    ->where('user_id', $user->id)
                    ->where('activity_id', $singleActivityId)
                    ->first();

                if (! $existing) {
                    DB::table('activity_users')->insert([
                        'id' => $this->generateCustomUid(),
                        'user_id' => $user->id,
                        'activity_id' => $singleActivityId,
                        'status' => 1, // Active
                        'activity_batch_id' => null, // No batch
                        'created_at' => Carbon::now(),
                        'updated_at' => Carbon::now(),
                    ]);
                }
            }
        }

        // 2. Multi-Batch Activity
        $multiBatchActivityId = DB::table('activities')->where('name', 'Workshop Mobile Photography')->value('id');
        if ($multiBatchActivityId) {
            // Create Batch 1
            $batch1Id = $this->generateCustomUid();
            DB::table('activity_batches')->insert([
                'id' => $batch1Id,
                'activity_id' => $multiBatchActivityId,
                'name' => 'Batch 1',
                'start_date' => Carbon::now()->addDays(120),
                'end_date' => Carbon::now()->addDays(120),
                'start_time' => '14:00:00',
                'end_time' => '17:00:00',
                'quota' => 50,
                'price' => 200000,
                'is_active' => false, // Not active currently
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);

            // Create Batch 2 (Active)
            $batch2Id = $this->generateCustomUid();
            DB::table('activity_batches')->insert([
                'id' => $batch2Id,
                'activity_id' => $multiBatchActivityId,
                'name' => 'Batch 2',
                'start_date' => Carbon::now()->addDays(121),
                'end_date' => Carbon::now()->addDays(121),
                'start_time' => '14:00:00',
                'end_time' => '17:00:00',
                'quota' => 50,
                'price' => 250000,
                'is_active' => true, // Active
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);

            // Register Users 6-10 to Batch 1
            $usersBatch1 = User::where('role', 'user')->skip(5)->take(5)->get();
            foreach ($usersBatch1 as $user) {
                $existing = DB::table('activity_users')
                    ->where('user_id', $user->id)
                    ->where('activity_id', $multiBatchActivityId)
                    ->first();

                if (! $existing) {
                    DB::table('activity_users')->insert([
                        'id' => $this->generateCustomUid(),
                        'user_id' => $user->id,
                        'activity_id' => $multiBatchActivityId,
                        'activity_batch_id' => $batch1Id,
                        'status' => 1,
                        'created_at' => Carbon::now(),
                        'updated_at' => Carbon::now(),
                    ]);
                }
            }

            // Register Users 11-15 to Batch 2
            $usersBatch2 = User::where('role', 'user')->skip(10)->take(5)->get();
            foreach ($usersBatch2 as $user) {
                $existing = DB::table('activity_users')
                    ->where('user_id', $user->id)
                    ->where('activity_id', $multiBatchActivityId)
                    ->first();

                if (! $existing) {
                    DB::table('activity_users')->insert([
                        'id' => $this->generateCustomUid(),
                        'user_id' => $user->id,
                        'activity_id' => $multiBatchActivityId,
                        'activity_batch_id' => $batch2Id,
                        'status' => 1,
                        'created_at' => Carbon::now(),
                        'updated_at' => Carbon::now(),
                    ]);
                }
            }
        }
    }
}
