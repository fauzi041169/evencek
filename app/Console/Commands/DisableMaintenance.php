<?php

namespace App\Console\Commands;

use App\Models\MaintenanceSetting;
use Illuminate\Console\Command;

class DisableMaintenance extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'maintenance:disable {--force : Force disable without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Disable maintenance mode';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        try {
            $setting = MaintenanceSetting::getCurrent();

            $this->info('Status Maintenance Mode saat ini: '.($setting->is_maintenance_mode ? 'AKTIF' : 'NONAKTIF'));

            if (! $setting->is_maintenance_mode) {
                $this->warn('Maintenance mode sudah nonaktif.');

                return 0;
            }

            if (! $this->option('force')) {
                if (! $this->confirm('Apakah Anda yakin ingin menonaktifkan maintenance mode?')) {
                    $this->info('Operasi dibatalkan.');

                    return 0;
                }
            }

            // Nonaktifkan maintenance mode
            MaintenanceSetting::disableMaintenance();

            $this->info('✅ Maintenance mode berhasil dinonaktifkan!');
            $this->info('Sistem sekarang dapat diakses kembali.');

            return 0;

        } catch (\Exception $e) {
            $this->error('❌ Error: '.$e->getMessage());

            return 1;
        }
    }
}
