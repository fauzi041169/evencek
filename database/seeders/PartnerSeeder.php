<?php

namespace Database\Seeders;

use App\Models\Partner;
use Illuminate\Database\Seeder;

class PartnerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $partners = [
            [
                'name' => 'Google',
                'logo' => 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png',
                'description' => 'Google adalah perusahaan teknologi multinasional yang berfokus pada layanan dan produk internet, termasuk teknologi pencarian, komputasi web, perangkat lunak, dan periklanan online.',
                'website_url' => 'https://www.google.com',
                // 'npa' removed
                'phone' => '+1-650-253-0000',
                'address' => '1600 Amphitheatre Parkway, Mountain View, CA 94043, United States',
                'status' => 'active',
            ],
            [
                'name' => 'Microsoft',
                'logo' => 'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE1Mu3b?ver=5c31',
                'description' => 'Microsoft adalah perusahaan teknologi multinasional yang mengembangkan, memproduksi, dan menjual perangkat lunak komputer, elektronik konsumen, dan komputer pribadi.',
                'website_url' => 'https://www.microsoft.com',
                // 'npa' removed
                'phone' => '+1-425-882-8080',
                'address' => 'One Microsoft Way, Redmond, WA 98052, United States',
                'status' => 'active',
            ],
        ];

        foreach ($partners as $partner) {
            Partner::create($partner);
        }
    }
}
