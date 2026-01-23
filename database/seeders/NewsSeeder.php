<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\News;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class NewsSeeder extends Seeder
{
    public function run()
    {
        // Pastikan ada user dan kategori
        $users = User::all();
        $categories = Category::all();

        if ($users->isEmpty() || $categories->isEmpty()) {
            $this->command->error('Pastikan ada user dan kategori terlebih dahulu!');

            return;
        }

        // Data berita dummy
        $newsData = [
            [
                'title' => 'Peningkatan Kualitas Pendidikan di Era Digital',
                'slug' => Str::slug('Peningkatan Kualitas Pendidikan di Era Digital'),
                'content' => 'Konten tentang peningkatan kualitas pendidikan...',
                'status' => 'published',
                'author_id' => $users->random()->id,
                'category_id' => $categories->random()->id,
                'published_at' => Carbon::now(),
                'views_count' => rand(50, 1000),
            ],
            [
                'title' => 'Workshop Pengembangan Kompetensi Guru',
                'slug' => Str::slug('Workshop Pengembangan Kompetensi Guru'),
                'content' => 'Konten tentang workshop pengembangan guru...',
                'status' => 'published',
                'author_id' => $users->random()->id,
                'category_id' => $categories->random()->id,
                'published_at' => Carbon::now(),
                'views_count' => rand(50, 1000),
            ],
            [
                'title' => 'Seminar Nasional Pendidikan 2024',
                'slug' => Str::slug('Seminar Nasional Pendidikan 2024'),
                'content' => 'Konten tentang seminar nasional...',
                'status' => 'published',
                'author_id' => $users->random()->id,
                'category_id' => $categories->random()->id,
                'published_at' => Carbon::now(),
                'views_count' => rand(50, 1000),
            ],
            [
                'title' => 'Implementasi Kurikulum Merdeka',
                'slug' => Str::slug('Implementasi Kurikulum Merdeka'),
                'content' => 'Konten tentang implementasi kurikulum...',
                'status' => 'draft',
                'author_id' => $users->random()->id,
                'category_id' => $categories->random()->id,
                'published_at' => null,
                'views_count' => 0,
            ],
            [
                'title' => 'Program Beasiswa Unggulan',
                'slug' => Str::slug('Program Beasiswa Unggulan'),
                'content' => 'Konten tentang program beasiswa...',
                'status' => 'published',
                'author_id' => $users->random()->id,
                'category_id' => $categories->random()->id,
                'published_at' => Carbon::now(),
                'views_count' => rand(50, 1000),
            ],
            [
                'title' => 'Inovasi Pembelajaran Berbasis Teknologi',
                'slug' => Str::slug('Inovasi Pembelajaran Berbasis Teknologi'),
                'content' => 'Konten tentang inovasi pembelajaran...',
                'status' => 'published',
                'author_id' => $users->random()->id,
                'category_id' => $categories->random()->id,
                'published_at' => Carbon::now(),
                'views_count' => rand(50, 1000),
            ],
            [
                'title' => 'Prestasi Siswa di Kompetisi Internasional',
                'slug' => Str::slug('Prestasi Siswa di Kompetisi Internasional'),
                'content' => 'Konten tentang prestasi siswa...',
                'status' => 'published',
                'author_id' => $users->random()->id,
                'category_id' => $categories->random()->id,
                'published_at' => Carbon::now(),
                'views_count' => rand(50, 1000),
            ],
            [
                'title' => 'Pengembangan Infrastruktur',
                'slug' => Str::slug('Pengembangan Infrastruktur'),
                'content' => 'Konten tentang infrastruktur sekolah...',
                'status' => 'draft',
                'author_id' => $users->random()->id,
                'category_id' => $categories->random()->id,
                'published_at' => null,
                'views_count' => 0,
            ],
            [
                'title' => 'Kolaborasi Pendidikan dengan Industri',
                'slug' => Str::slug('Kolaborasi Pendidikan dengan Industri'),
                'content' => 'Konten tentang kolaborasi pendidikan...',
                'status' => 'published',
                'author_id' => $users->random()->id,
                'category_id' => $categories->random()->id,
                'published_at' => Carbon::now(),
                'views_count' => rand(50, 1000),
            ],
            [
                'title' => 'Program Pertukaran Pelajar',
                'slug' => Str::slug('Program Pertukaran Pelajar'),
                'content' => 'Konten tentang pertukaran pelajar...',
                'status' => 'published',
                'author_id' => $users->random()->id,
                'category_id' => $categories->random()->id,
                'published_at' => Carbon::now(),
                'views_count' => rand(50, 1000),
            ],
            [
                'title' => 'Pelatihan Digital Skills untuk Guru',
                'slug' => Str::slug('Pelatihan Digital Skills untuk Guru'),
                'content' => 'Konten tentang pelatihan digital...',
                'status' => 'published',
                'author_id' => $users->random()->id,
                'category_id' => $categories->random()->id,
                'published_at' => Carbon::now(),
                'views_count' => rand(50, 1000),
            ],
            [
                'title' => 'Evaluasi Sistem Pendidikan Nasional',
                'slug' => Str::slug('Evaluasi Sistem Pendidikan Nasional'),
                'content' => 'Konten tentang evaluasi sistem...',
                'status' => 'draft',
                'author_id' => $users->random()->id,
                'category_id' => $categories->random()->id,
                'published_at' => null,
                'views_count' => 0,
            ],
        ];

        foreach ($newsData as $news) {
            News::create($news);
        }
    }
}
