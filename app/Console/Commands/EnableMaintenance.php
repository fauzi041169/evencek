<?php

namespace App\Console\Commands;

use App\Models\MaintenanceSetting;
use Illuminate\Console\Command;

class EnableMaintenance extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'maintenance:enable 
                            {--message= : Custom maintenance message}
                            {--start= : Maintenance start time (Y-m-d H:i:s)}
                            {--end= : Maintenance end time (Y-m-d H:i:s)}
                            {--ips= : Allowed IPs (comma separated)}
                            {--force : Force enable without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Enable maintenance mode';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        try {
            $setting = MaintenanceSetting::getCurrent();

            $this->info('Status Maintenance Mode saat ini: '.($setting->is_maintenance_mode ? 'AKTIF' : 'NONAKTIF'));

            if ($setting->is_maintenance_mode) {
                $this->warn('Maintenance mode sudah aktif.');

                return 0;
            }

            if (! $this->option('force')) {
                if (! $this->confirm('Apakah Anda yakin ingin mengaktifkan maintenance mode?')) {
                    $this->info('Operasi dibatalkan.');

                    return 0;
                }
            }

            // Ambil parameter
            $message = $this->option('message') ?? 'Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti.';
            $start = $this->option('start') ? \Carbon\Carbon::parse($this->option('start')) : null;
            $end = $this->option('end') ? \Carbon\Carbon::parse($this->option('end')) : null;
            $ips = $this->option('ips');

            // Aktifkan maintenance mode
            $setting = MaintenanceSetting::enableMaintenance($message, $start, $end);

            if ($ips) {
                $setting->update(['allowed_ips' => $ips]);
            }

            $this->info('✅ Maintenance mode berhasil diaktifkan!');
            $this->info('Pesan: '.$message);

            if ($start) {
                $this->info('Mulai: '.$start->format('d M Y H:i'));
            }
            if ($end) {
                $this->info('Selesai: '.$end->format('d M Y H:i'));
            }
            if ($ips) {
                $this->info('IP yang diizinkan: '.$ips);
            }

            return 0;

        } catch (\Exception $e) {
            $this->error('❌ Error: '.$e->getMessage());

            return 1;
        }
    }
}
