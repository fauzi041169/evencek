<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;

class CleanupUnusedFiles extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'cleanup:production
        {--force : Hapus file secara nyata (default hanya dry-run)}
        {--days=14 : Hapus log lebih lama dari N hari}
        {--all-logs : Hapus semua file log tanpa batas hari}
        {--include-node : Sertakan penghapusan node_modules}
        {--prune-dev-sources : Hapus sumber dev (tests, resources js/css) bila aman}';

    /**
     * The console command description.
     */
    protected $description = 'Membersihkan file tidak terpakai dan artefak dev untuk produksi, dengan opsi dry-run.';

    public function handle(): int
    {
        $force = (bool) $this->option('force');
        $days = (int) $this->option('days');
        $allLogs = (bool) $this->option('all-logs');
        $includeNode = (bool) $this->option('include-node');
        $pruneDevSources = (bool) $this->option('prune-dev-sources');

        $this->info($force ? 'Mode EKSEKUSI (file akan dihapus).' : 'Mode DRY-RUN (simulasi, tanpa menghapus file).');

        $toDelete = [];
        $bytes = 0;

        // Target direktori yang aman untuk dibersihkan
        $targets = [
            ['label' => 'Clockwork (dev)', 'path' => storage_path('clockwork'), 'type' => 'dir'],
            ['label' => 'Purifier cache', 'path' => storage_path('app/purifier'), 'type' => 'dir'],
            ['label' => 'Framework cache', 'path' => storage_path('framework/cache'), 'type' => 'dir'],
            ['label' => 'Compiled views', 'path' => storage_path('framework/views'), 'type' => 'dir'],
        ];

        foreach ($targets as $t) {
            $path = $t['path'];
            if (File::exists($path)) {
                foreach (File::allFiles($path) as $file) {
                    $toDelete[] = [
                        'path' => $file->getPathname(),
                        'size' => $file->getSize(),
                        'label' => $t['label'],
                    ];
                    $bytes += $file->getSize();
                }
            }
        }

        // Optional: hapus node_modules jika diminta
        if ($includeNode) {
            $nodeDir = base_path('node_modules');
            if (File::isDirectory($nodeDir)) {
                foreach (File::allFiles($nodeDir) as $file) {
                    $toDelete[] = [
                        'path' => $file->getPathname(),
                        'size' => $file->getSize(),
                        'label' => 'node_modules',
                    ];
                    $bytes += $file->getSize();
                }
            }
        }

        // Artefak dev/tes di root
        $rootArtifacts = [
            base_path('cert_error.json'),
            base_path('cookies.txt'),
            base_path('.phpunit.result.cache'),
        ];
        foreach ($rootArtifacts as $artifact) {
            if (File::exists($artifact) && File::isFile($artifact)) {
                $size = File::size($artifact);
                $toDelete[] = ['path' => $artifact, 'size' => $size, 'label' => 'Root artifact'];
                $bytes += $size;
            }
        }

        // Logs
        $logsDir = storage_path('logs');
        if (File::exists($logsDir)) {
            foreach (File::files($logsDir) as $file) {
                $delete = $allLogs;
                if (! $delete) {
                    $lastModified = Carbon::createFromTimestamp($file->getMTime());
                    if ($lastModified->lt(now()->subDays($days))) {
                        $delete = true;
                    }
                }
                if ($delete) {
                    $toDelete[] = [
                        'path' => $file->getPathname(),
                        'size' => $file->getSize(),
                        'label' => 'Log file',
                    ];
                    $bytes += $file->getSize();
                }
            }
        }

        // Optional: prune dev sources bila aman
        if ($pruneDevSources) {
            // Hanya jika sudah ada build assets publik (asumsi Vite)
            $publicBuild = public_path('build');
            if (File::isDirectory($publicBuild)) {
                $devDirs = [
                    ['label' => 'Tests', 'path' => base_path('tests')],
                    ['label' => 'Dev etc/nginx', 'path' => base_path('etc/nginx')],
                    ['label' => 'Resources JS', 'path' => resource_path('js')],
                    ['label' => 'Resources CSS', 'path' => resource_path('css')],
                ];
                foreach ($devDirs as $d) {
                    if (File::isDirectory($d['path'])) {
                        foreach (File::allFiles($d['path']) as $file) {
                            $toDelete[] = [
                                'path' => $file->getPathname(),
                                'size' => $file->getSize(),
                                'label' => $d['label'],
                            ];
                            $bytes += $file->getSize();
                        }
                    }
                }
            } else {
                $this->warn('Lewati prune-dev-sources: public/build tidak ditemukan, menjaga agar sumber tetap ada.');
            }
        }

        // Tampilkan ringkasan
        if (empty($toDelete)) {
            $this->info('Tidak ada file yang memenuhi kriteria pembersihan.');
        } else {
            $this->line('Daftar target pembersihan:');
            foreach ($toDelete as $item) {
                $this->line(sprintf('- [%s] %s (%.2f MB)', $item['label'], $item['path'], $item['size'] / (1024 * 1024)));
            }
            $this->info(sprintf('Total ukuran kandidat: %.2f MB', $bytes / (1024 * 1024)));
        }

        // Eksekusi penghapusan jika --force
        if ($force && ! empty($toDelete)) {
            foreach ($toDelete as $item) {
                try {
                    File::delete($item['path']);
                } catch (\Throwable $e) {
                    $this->error('Gagal menghapus: '.$item['path'].' | '.$e->getMessage());
                }
            }
            $this->info('Penghapusan selesai.');
        }

        // Bersihkan cache Laravel (aman untuk produksi)
        try {
            Artisan::call('cache:clear');
            Artisan::call('view:clear');
            Artisan::call('route:clear');
            Artisan::call('config:clear');
            $this->info('Cache Laravel dibersihkan (cache, view, route, config).');
        } catch (\Throwable $e) {
            $this->error('Gagal membersihkan cache: '.$e->getMessage());
        }

        return self::SUCCESS;
    }
}
