<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class TestEmailCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'mail:test {email}';

    protected $description = 'Test sending email';

    public function handle()
    {
        $email = $this->argument('email');
        $this->info("Sending test email to $email...");

        try {
            \Mail::raw('This is a test email from Artisan Command.', function ($message) use ($email) {
                $message->to($email)
                    ->subject('Test Email');
            });
            $this->info('Email sent successfully!');
        } catch (\Exception $e) {
            $this->error('Failed to send email: '.$e->getMessage());
        }
    }
}
