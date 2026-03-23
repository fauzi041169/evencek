<?php

namespace Database\Seeders;

use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;

class PaymentMethodSeeder extends Seeder
{
    public function run()
    {
        $methods = [
            [
                'name' => 'Transfer Bank BCA',
                'account_number' => '1234567890',
                'account_name' => 'IVEN-HUB',
                'is_active' => true,
            ],
            [
                'name' => 'Transfer Bank Mandiri',
                'account_number' => '0987654321',
                'account_name' => 'IVEN-HUB',
                'is_active' => true,
            ],
            [
                'name' => 'Transfer Bank BRI',
                'account_number' => '1234-5678-9012',
                'account_name' => 'IVEN-HUB',
                'is_active' => true,
            ],
            [
                'name' => 'Transfer Bank BNI',
                'account_number' => '0123456789',
                'account_name' => 'IVEN-HUB',
                'is_active' => true,
            ],
        ];

        foreach ($methods as $method) {
            PaymentMethod::firstOrCreate(
                ['name' => $method['name']],
                $method
            );
        }

        PaymentMethod::firstOrCreate(
            ['name' => 'Default Method'],
            [
                'account_number' => '0000000000',
                'account_name' => 'Default',
                'is_active' => true,
            ]
        );
    }
}
