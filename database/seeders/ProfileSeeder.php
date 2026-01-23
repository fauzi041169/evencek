<?php

namespace Database\Seeders;

use App\Models\District;
use App\Models\Profile;
use App\Models\Province;
use App\Models\Regency;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProfileSeeder extends Seeder
{
    public function run()
    {
        // Ambil semua user yang belum memiliki profile
        $users = User::doesntHave('profile')->get();

        foreach ($users as $user) {
            // Pilih provinsi secara random
            $province = Province::inRandomOrder()->first();

            // Pilih kabupaten yang sesuai dengan provinsi terpilih
            $regency = $province ? Regency::where('province_id', $province->id)
                ->inRandomOrder()
                ->first() : null;

            // Pilih kecamatan yang sesuai dengan kabupaten terpilih
            $district = $regency ? District::where('regency_id', $regency->id)
                ->inRandomOrder()
                ->first() : null;

            Profile::create([
                'user_id' => $user->id,
                'no_hp' => '08'.rand(1000000000, 9999999999),
                'alamat' => 'Jalan Sample No. '.rand(1, 100),
                'pekerjaan' => ['Guru', 'Staff', 'Admin'][rand(0, 2)],
                'jabatan' => ['Manager', 'Supervisor', 'Staff'][rand(0, 2)],
                'jenis_kelamin' => ['Laki-laki', 'Perempuan'][rand(0, 1)],
                'province_id' => $province ? $province->id : null,
                'regency_id' => $regency ? $regency->id : null,
                'district_id' => $district ? $district->id : null,
            ]);
        }
    }
}
