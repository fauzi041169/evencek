<?php

namespace Database\Seeders;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class UserSeeder extends Seeder
{
    private function generateCustomUid()
    {
        $letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $numbers = '0123456789';
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

        return implode('', $combined);
    }

    public function run()
    {
        Schema::disableForeignKeyConstraints();
        // Clear existing users
        User::truncate();
        Schema::enableForeignKeyConstraints();

        // Super Admin
        User::create([
            'id' => $this->generateCustomUid(),
            'name' => 'Fauzi Super',
            'email' => 'officeadmin@adzkiatekno.com',
            'password' => Hash::make('1234567890'),
            'role' => 'superadmin',
            'email_verified_at' => Carbon::now(),
        ]);

        // Admin
        User::create([
            'id' => $this->generateCustomUid(),
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('2345678901'),
            'role' => 'admin',
            'email_verified_at' => Carbon::now(),
        ]);

        // Creator
        User::create([
            'id' => $this->generateCustomUid(),
            'name' => 'Creator',
            'email' => 'creator@example.com',
            'password' => Hash::make('password'),
            'role' => 'creator',
            'email_verified_at' => Carbon::now(),
        ]);

        // Regular users
        for ($i = 1; $i <= 15; $i++) {
            User::create([
                'id' => $this->generateCustomUid(),
                'name' => "User {$i}",
                'email' => "user{$i}@example.com",
                'password' => Hash::make('password'),
                'role' => 'user',
                'email_verified_at' => Carbon::now(),
            ]);
        }
    }
}
