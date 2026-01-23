<?php

namespace App\Console\Commands;

use App\Models\MaintenanceSetting;
use Illuminate\Console\Command;

class MaintenanceStatus extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'maintenance:status';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check maintenance mode status';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        try {
            $setting = MaintenanceSetting::getCurrent();

            $this->info('=== STATUS MAINTENANCE MODE ===');
            $this->newLine();

            $status = $setting->is_maintenance_mode ? 'AKTIF' : 'NONAKTIF';
            $statusColor = $setting->is_maintenance_mode ? 'red' : 'green';

            $this->line("Status: <fg={$statusColor}>{$status}</>");
            $this->line('Pesan: '.($setting->maintenance_message ?: 'Tidak ada pesan'));

            if ($setting->maintenance_start) {
                $this->line('Mulai: '.$setting->maintenance_start->format('d M Y H:i:s'));
            }

            if ($setting->maintenance_end) {
                $this->line('Selesai: '.$setting->maintenance_end->format('d M Y H:i:s'));
            }

            if ($setting->allowed_ips) {
                $this->line('IP yang diizinkan: '.$setting->allowed_ips);
            }

            $this->line('Terakhir diperbarui: '.$setting->updated_at->format('d M Y H:i:s'));

            $this->newLine();
            $this->info('=== COMMAND YANG TERSEDIA ===');
            $this->line('php artisan maintenance:enable    - Aktifkan maintenance mode');
            $this->line('php artisan maintenance:disable   - Nonaktifkan maintenance mode');
            $this->line('php artisan maintenance:status    - Cek status (command ini)');

            return 0;

        } catch (\Exception $e) {
            $this->error('❌ Error: '.$e->getMessage());

            return 1;
        }
    }
}
