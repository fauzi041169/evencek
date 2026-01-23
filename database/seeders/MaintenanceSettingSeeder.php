<?php

namespace Database\Seeders;

use App\Models\MaintenanceSetting;
use Illuminate\Database\Seeder;

class MaintenanceSettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        MaintenanceSetting::create([
            'is_maintenance_mode' => false,
            'maintenance_message' => 'Sistem sedang dalam pemeliharaan untuk meningkatkan layanan kami. Silakan coba lagi dalam beberapa saat.',
            'allowed_ips' => null,
            'maintenance_start' => null,
            'maintenance_end' => null,
        ]);
    }
}
