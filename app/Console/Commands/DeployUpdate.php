<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Symfony\Component\Process\Process;

class DeployUpdate extends Command
{
    protected $signature = 'deploy:update {--no-composer} {--migrate}';

    protected $description = 'Update dependencies and rebuild caches for production deployment';

    public function handle(): int
    {
        try {
            Artisan::call('down');
        } catch (\Throwable $e) {
        }

        $skipComposer = (bool) $this->option('no-composer');

        if (! $skipComposer) {
            $cmd = ['composer', 'update', '--no-dev', '--prefer-dist', '--no-interaction', '--optimize-autoloader'];
            $process = new Process($cmd, base_path());
            $process->setTimeout(900);
            $process->run(function ($type, $buffer) {
                $this->output->write($buffer);
            });
            if (! $process->isSuccessful()) {
                $this->error('Composer update failed');
                try {
                    Artisan::call('up');
                } catch (\Throwable $e) {
                }

                return self::FAILURE;
            }
        }

        try {
            Artisan::call('package:discover');
            Artisan::call('optimize:clear');
            Artisan::call('config:cache');
            Artisan::call('route:cache');
            Artisan::call('view:cache');
        } catch (\Throwable $e) {
            $this->error('Cache rebuild failed: '.$e->getMessage());
        }

        if ((bool) $this->option('migrate')) {
            try {
                Artisan::call('migrate', ['--force' => true]);
            } catch (\Throwable $e) {
                $this->error('Migration failed: '.$e->getMessage());
            }
        }

        try {
            Artisan::call('up');
        } catch (\Throwable $e) {
        }

        $this->info('Deployment update finished');

        return self::SUCCESS;
    }
}
