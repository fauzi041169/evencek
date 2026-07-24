<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Matikan FK selama truncate/seed agar tidak bentrok antar tabel terkait
        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        $tables = [
            'activity_users',
            'activities',
            'news',
            'categories',
            'districts',
            'regencies',
            'provinces',
            'profiles',
            'users',
            'role_permissions',
            'payment_methods',
            'payment_channels',
            'partners',
            'pengurus',
            'financial_settings',
            'activity_contents',
            'galleries',
            'subscription_plans',
            'subscriptions',
            'maintenance_settings',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                DB::table($table)->truncate();
            }
        }

        // RegionSeeder sudah mengisi provinces/regencies/districts lengkap dari API.
        // Jangan panggil ProvinceSeeder/RegencySeeder/DistrictSeeder/LocationSeeder
        // karena mereka truncate/duplikasi dan memicu error FK.
        $seeders = [
            UserSeeder::class,
            RolePermissionSeeder::class,
            CategorySeeder::class,
            NewsSeeder::class,
            ProfileSeeder::class,
            RegionSeeder::class,
            PengurusSeeder::class,
            PaymentMethodSeeder::class,
            PartnerSeeder::class,
            PaymentChannelSeeder::class,
            FinancialSettingSeeder::class,
            ActivityContentSeeder::class,
            GallerySeeder::class,
            SubscriptionPlanSeeder::class,
            MaintenanceSettingSeeder::class,
        ];

        if (env('SEED_DEMO_ACTIVITIES', true)) {
            array_splice($seeders, 4, 0, [ActivitySeeder::class]);
        }

        $this->call($seeders);

        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }
}
