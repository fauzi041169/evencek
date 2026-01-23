<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateAuditUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'audit:create-test-user {--email=audit@example.com} {--password=Password123!} {--name="Audit User"}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create or update a test user for performance auditing.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = $this->option('email');
        $password = $this->option('password');
        $name = $this->option('name');

        $user = User::where('email', $email)->first();
        if ($user) {
            $user->name = $name;
            $user->password = Hash::make($password);
            $user->email_verified_at = now();
            $user->save();
            $this->info("Updated existing user: {$email}");
        } else {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($password),
                'email_verified_at' => now(),
            ]);
            $this->info("Created user: {$email}");
        }

        $this->line("Login credentials -> email: {$email}, password: {$password}");

        return self::SUCCESS;
    }
}
