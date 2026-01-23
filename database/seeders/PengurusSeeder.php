<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PengurusSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $pengurus = [
            [
                'nama' => 'Dr. Budi Santoso',
                'kode' => 'SLCC',
                'gelar' => 'S.H., M.H., Ph.D',
                'jabatan' => 'Ketua',
                'foto' => 'pengurus/ketua.jpg',
                'deskripsi' => 'Berpengalaman lebih dari 20 tahun dalam bidang hukum dan pendidikan. Aktif dalam pengembangan lembaga pendidikan di Indonesia.',
                'periode' => '2024-2029',
                'linkedin_url' => 'https://linkedin.com/in/budisantoso',
                'twitter_url' => 'https://twitter.com/budisantoso',
                // 'npa' removed
                'telepon' => '081234567890',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nama' => 'Dr. Siti Aminah',
                'kode' => 'SLCC',
                'gelar' => 'M.Pd., Ph.D',
                'jabatan' => 'Wakil Ketua',
                'foto' => 'pengurus/wakil-ketua.jpg',
                'deskripsi' => 'Pakar pendidikan dengan fokus pada pengembangan kurikulum dan manajemen pendidikan.',
                'periode' => '2024-2029',
                'linkedin_url' => 'https://linkedin.com/in/sitiaminah',
                'twitter_url' => 'https://twitter.com/sitiaminah',
                // 'npa' removed
                'telepon' => '081234567891',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nama' => 'Ahmad Fauzi',
                'kode' => 'SLCC',
                'gelar' => 'S.E., M.M.',
                'jabatan' => 'Sekretaris',
                'foto' => 'pengurus/sekretaris.jpg',
                'deskripsi' => 'Memiliki keahlian dalam administrasi dan manajemen organisasi pendidikan.',
                'periode' => '2024-2029',
                'linkedin_url' => 'https://linkedin.com/in/ahmadfauzi',
                'twitter_url' => 'https://twitter.com/ahmadfauzi',
                // 'npa' removed
                'telepon' => '081234567892',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nama' => 'Maya Wijaya',
                'kode' => 'SLCC',
                'gelar' => 'S.E., M.Ak.',
                'jabatan' => 'Bendahara',
                'foto' => 'pengurus/bendahara.jpg',
                'deskripsi' => 'Ahli dalam manajemen keuangan dan akuntansi pendidikan.',
                'periode' => '2024-2029',
                'linkedin_url' => 'https://linkedin.com/in/mayawijaya',
                'twitter_url' => 'https://twitter.com/mayawijaya',
                // 'npa' removed
                'telepon' => '081234567893',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nama' => 'Dr. Rudi Hartono',
                'kode' => 'SLCC',
                'gelar' => 'M.Si.',
                'jabatan' => 'Kepala Bidang A',
                'foto' => 'pengurus/kabid-a.jpg',
                'deskripsi' => 'Spesialis dalam pengembangan program pendidikan dan kurikulum.',
                'periode' => '2024-2029',
                'linkedin_url' => 'https://linkedin.com/in/rudihartono',
                'twitter_url' => 'https://twitter.com/rudihartono',
                // 'npa' removed
                'telepon' => '081234567894',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nama' => 'Dewi Susanti',
                'kode' => 'SLCC',
                'gelar' => 'M.Pd.',
                'jabatan' => 'Kepala Bidang B',
                'foto' => 'pengurus/kabid-b.jpg',
                'deskripsi' => 'Ahli dalam bidang pengembangan SDM dan manajemen pendidikan.',
                'periode' => '2024-2029',
                'linkedin_url' => 'https://linkedin.com/in/dewisusanti',
                'twitter_url' => 'https://twitter.com/dewisusanti',
                // 'npa' removed
                'telepon' => '081234567895',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nama' => 'Hendra Kusuma',
                'kode' => 'SLCC',
                'gelar' => 'M.T.',
                'jabatan' => 'Kepala Bidang C',
                'foto' => 'pengurus/kabid-c.jpg',
                'deskripsi' => 'Pakar dalam pengembangan infrastruktur dan teknologi pendidikan.',
                'periode' => '2024-2029',
                'linkedin_url' => 'https://linkedin.com/in/hendrakusuma',
                'twitter_url' => 'https://twitter.com/hendrakusuma',
                // 'npa' removed
                'telepon' => '081234567896',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nama' => 'Nina Pratiwi',
                'kode' => 'SLCC',
                'gelar' => 'M.Kom.',
                'jabatan' => 'Kepala Bidang D',
                'foto' => 'pengurus/kabid-d.jpg',
                'deskripsi' => 'Spesialis dalam pengembangan sistem informasi pendidikan.',
                'periode' => '2024-2029',
                'linkedin_url' => 'https://linkedin.com/in/ninapratiwi',
                'twitter_url' => 'https://twitter.com/ninapratiwi',
                // 'npa' removed
                'telepon' => '081234567897',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nama' => 'Eko Prasetyo',
                'kode' => 'SLCC',
                'gelar' => 'M.Pd.',
                'jabatan' => 'Kepala Bidang E',
                'foto' => 'pengurus/kabid-e.jpg',
                'deskripsi' => 'Ahli dalam bidang kerjasama dan hubungan masyarakat.',
                'periode' => '2024-2029',
                'linkedin_url' => 'https://linkedin.com/in/ekoprasetyo',
                'twitter_url' => 'https://twitter.com/ekoprasetyo',
                // 'npa' removed
                'telepon' => '081234567898',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($pengurus as $p) {
            $p['id'] = $this->generateCustomUid();
            DB::table('pengurus')->insert($p);
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
        } while (DB::table('pengurus')->where('id', $uid)->exists());

        return $uid;
    }
}
