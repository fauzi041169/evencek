<?php

namespace Database\Seeders;

use App\Models\FinancialSetting;
use Illuminate\Database\Seeder;

class FinancialSettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Ensure there is only one setting row
        if (FinancialSetting::count() === 0) {
            FinancialSetting::create([
                'admin_fee_percent' => 0,
                'admin_fee_flat' => 0,
                'admin_fee_type' => 'flat',
                'auto_fixed_deduction' => 0,
                'min_auto_price' => 10000, // Default minimum 10k for auto payments
            ]);
        }
    }
}
