<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;

class SubscriptionPlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Paket Basic',
                'slug' => 'basic',
                'description' => 'Paket untuk pengguna individu dan tim kecil',
                'price' => 299000,
                'max_activities' => 5,
                'max_users' => 5,
                'max_news' => 5,
                'max_participants_per_activity' => 50,
                'max_committees_per_activity' => 5,
                'has_analytics' => true, // Dashboard acara lengkap
                'has_custom_branding' => false,
                'has_api_access' => false,
                'has_priority_support' => false,
                'has_white_label' => false,
                'features' => [
                    'Manajemen Kartu Digital',
                ],
                'trial_days' => 14,
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Paket Pro',
                'slug' => 'pro',
                'description' => 'Paket untuk organisasi menengah dengan kebutuhan lebih',
                'price' => 599000,
                'max_activities' => 50,
                'max_users' => 20,
                'max_news' => 200,
                'max_participants_per_activity' => 250,
                'max_committees_per_activity' => 20,
                'has_analytics' => true,
                'has_custom_branding' => false,
                'has_api_access' => false,
                'has_priority_support' => false,
                'has_white_label' => false,
                'features' => [
                    'Pembayaran otomatis',
                    'Absen berbasis QR code',
                    'Multi-lokasi & divisi kegiatan',
                    'Manajemen Kartu Digital',
                ],
                'trial_days' => 14,
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Paket Enterprise',
                'slug' => 'enterprise',
                'description' => 'Paket untuk organisasi besar dengan kebutuhan tak terbatas',
                'price' => 1299000,
                'max_activities' => null, // Unlimited
                'max_users' => null, // Unlimited
                'max_news' => null, // Unlimited
                'max_participants_per_activity' => null, // Unlimited
                'max_committees_per_activity' => null, // Unlimited
                'has_analytics' => true,
                'has_custom_branding' => false,
                'has_api_access' => false,
                'has_priority_support' => true,
                'has_white_label' => false,
                'features' => [
                    'Pembayaran otomatis',
                    'Absen berbasis QR code',
                    'Multi-lokasi & divisi kegiatan',
                    'Manajemen Kartu Digital',
                    'Manajemen Sertifikat Digital',
                    'Backup data harian',
                    'Pelatihan tim & onboarding',
                    'Dukungan 24/7 via chat & telepon',
                    'Dedicated account manager',
                ],
                'trial_days' => 14,
                'is_active' => true,
                'sort_order' => 3,
            ],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::updateOrCreate(
                ['slug' => $plan['slug']],
                $plan
            );
        }
    }
}
