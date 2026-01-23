<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class FixHostingCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:fix-hosting {--force : Force delete existing storage link}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix common hosting issues: symlink, permissions, cache';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🛠️  Starting EventCek Hosting Fixer...');

        // 1. FIX SYMLINK
        $this->info("\n[1/3] Fixing Storage Symlink...");
        $target = storage_path('app/public');
        $link = public_path('storage');

        if (! File::exists($target)) {
            File::makeDirectory($target, 0755, true);
            $this->info("Created storage directory: $target");
        }

        if (File::exists($link)) {
            if ($this->option('force')) {
                // Hapus jika force, tapi hati-hati jika itu direktori fisik
                if (is_link($link)) {
                    File::delete($link); // Hapus symlink
                    $this->info('Removed old symlink.');
                } else {
                    // Jika direktori fisik, rename saja demi keamanan
                    $backupName = $link.'_backup_'.time();
                    File::move($link, $backupName);
                    $this->warn("Existing 'storage' was a directory! Renamed to: ".basename($backupName));
                }
            } else {
                $this->warn('Storage link already exists. Use --force to recreate it.');
            }
        }

        if (! File::exists($link)) {
            try {
                $this->laravel->make('files')->link($target, $link);
                $this->info('✅ Symlink created successfully!');
            } catch (\Exception $e) {
                $this->error('❌ Failed to create symlink: '.$e->getMessage());
                // Fallback manual symlink
                try {
                    symlink($target, $link);
                    $this->info('✅ Symlink created via native PHP!');
                } catch (\Exception $e2) {
                    $this->error('❌ Native symlink also failed.');
                }
            }
        }

        // 2. CLEAR CACHE
        $this->info("\n[2/3] Clearing Application Cache...");
        $this->call('cache:clear');
        $this->call('config:clear');
        $this->call('route:clear');
        $this->call('view:clear');
        $this->info('✅ All caches cleared!');

        // 3. FIX PERMISSIONS (Best Effort)
        $this->info("\n[3/3] Fixing Directory Permissions...");
        $dirs = [
            storage_path(),
            storage_path('app/public'),
            storage_path('framework/views'),
            storage_path('framework/cache'),
            storage_path('framework/sessions'),
            storage_path('logs'),
            base_path('bootstrap/cache'),
        ];

        foreach ($dirs as $dir) {
            if (! File::exists($dir)) {
                File::makeDirectory($dir, 0755, true);
            }
            try {
                // Di hosting, user biasanya sama, jadi 755 sudah cukup.
                // chmod PHP mungkin diblokir di beberapa hosting.
                @chmod($dir, 0755);
                $this->line('Set 755 for: '.basename($dir));
            } catch (\Exception $e) {
                // Ignore permission errors
            }
        }

        $this->info("\n✨ DONE! System is ready for production.");

        return Command::SUCCESS;
    }
}
