<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');
        $name = env('ADMIN_NAME', 'Super Admin');

        if (! $email || ! $password) {
            $this->command?->warn('Lewati SuperAdminSeeder: ADMIN_EMAIL atau ADMIN_PASSWORD belum diset di env.');

            return;
        }

        $user = User::where('email', $email)->first();

        if (! $user) {
            $user = new User;
            $user->email = $email;
        }

        $user->name = $name;
        $user->password = Hash::make($password);
        $user->role = 'superadmin';
        $user->email_verified_at = now();
        // Pastikan remember_token ada agar login mulus
        if (! $user->remember_token) {
            $user->remember_token = Str::random(60);
        }

        $user->save();

        $this->command?->info("Superadmin siap: {$user->name} <{$user->email}>");
    }
}
