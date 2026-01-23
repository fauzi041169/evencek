<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class SetUserRole extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'audit:set-user-role {--email=audit@example.com} {--role=superadmin}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Set the role for a given user (default: audit@example.com to superadmin).';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = $this->option('email');
        $role = $this->option('role');

        $user = User::where('email', $email)->first();
        if (! $user) {
            $this->error("User not found: {$email}. Create it first with audit:create-test-user.");

            return self::FAILURE;
        }

        $user->role = $role;
        $user->save();

        $this->info("Role updated: {$email} -> {$role}");

        return self::SUCCESS;
    }
}
