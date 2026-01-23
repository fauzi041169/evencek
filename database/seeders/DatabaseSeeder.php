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
        // Disable foreign key checks
        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        // Hanya truncate tabel yang ada
        $tables = [
            'activities',
            'news',
            'categories',
            'locations',
            'provinces',
            'regions',
            'profiles',
            'users',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                DB::table($table)->truncate();
            }
        }

        $seeders = [
            UserSeeder::class,
            RolePermissionSeeder::class,
            CategorySeeder::class,
            NewsSeeder::class,
        ];

        if (env('SEED_DEMO_ACTIVITIES', false)) {
            $seeders[] = ActivitySeeder::class;
        }

        $seeders = array_merge($seeders, [
            ProfileSeeder::class,
            RegionSeeder::class,
            ProvinceSeeder::class,
            RegencySeeder::class,
            DistrictSeeder::class,
            LocationSeeder::class,
            PengurusSeeder::class,
            PaymentMethodSeeder::class,
            PartnerSeeder::class,
            MitraSeeder::class,
            ActivityContentSeeder::class,
            GallerySeeder::class,
            SubscriptionPlanSeeder::class,
        ]);

        $this->call($seeders);

        // Enable foreign key checks
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }
}
