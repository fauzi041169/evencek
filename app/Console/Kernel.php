<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

require_once __DIR__.'/Commands/MigrateLegacyData.php';

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Sinkronisasi status pembayaran Midtrans secara berkala agar tidak bergantung pada halaman dibuka
        // Catatan: Ini adalah fallback jika webhook Midtrans tidak dapat menjangkau server (mis. lingkungan lokal)
        $schedule->command('midtrans:sync-payments')->everyFiveMinutes();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }

    protected $commands = [
        // ... existing commands ...
        \App\Console\Commands\StorageLogsCommand::class,
        // Commands\GenerateTestImportFile::class,
        Commands\GenerateUserTemplate::class,
        \App\Console\Commands\NormalizeUserRoles::class,
        \App\Console\Commands\AuditRoles::class,
        \App\Console\Commands\CleanupUnusedFiles::class,
        \App\Console\Commands\SyncMidtransPayments::class,
        \App\Console\Commands\SyncMidtransSubscriptions::class,
        // \App\Console\Commands\FixLegacyIds::class,
        // \App\Console\Commands\CheckActivityMapping::class,
        // \App\Console\Commands\InspectHotelData::class,
        \App\Console\Commands\ImportSqlDump::class,
        \App\Console\Commands\MigrateLegacyData::class,
        // \App\Console\Commands\SetupDemo::class,
    ];
}
