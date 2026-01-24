<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceSetting;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class MaintenanceController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
        $this->middleware('role:superadmin');
    }

    /**
     * Show maintenance settings page
     */
    public function index()
    {
        $setting = MaintenanceSetting::getCurrent();

        // Get APK List
        $apkDir = public_path('assets/apk');
        $apkList = [];
        if (File::exists($apkDir)) {
            $files = File::files($apkDir);
            foreach ($files as $file) {
                $name = $file->getFilename();
                // Expected format: eventcekapp_VERSION.apk
                if (preg_match('/^eventcekapp_(.+)\.apk$/', $name, $matches)) {
                    $version = $matches[1];
                    $apkList[] = [
                        'name' => $name,
                        'version' => $version,
                        'path' => 'assets/apk/'.$name,
                        'size' => $file->getSize(),
                        'created_at' => $file->getMTime(),
                    ];
                }
            }
        }
        // Sort by version descending
        usort($apkList, function ($a, $b) {
            return version_compare($b['version'], $a['version']);
        });

        return Inertia::render('Settings/Maintenance', [
            'setting' => $setting,
            'apkList' => $apkList,
        ]);
    }

    /**
     * Upload APK
     */
    public function uploadApk(Request $request)
    {
        $request->validate([
            'app_apk' => 'required|file|mimetypes:application/vnd.android.package-archive,application/octet-stream,application/zip,application/x-zip-compressed,application/x-zip,application/java-archive|max:200000',
        ]);

        $apkInfo = null;

        DB::transaction(function () use ($request, &$apkInfo) {
            $result = $this->handleApkUpload($request->file('app_apk'));

            $sizeBytes = @filesize(public_path($result['path']));
            $uploadedTs = @filemtime(public_path($result['path']));
            $apkInfo = [
                'name' => $result['name'],
                'path' => $result['path'],
                'size_bytes' => $sizeBytes ?: null,
                'uploaded_at' => $uploadedTs ? date('c', $uploadedTs) : null,
                'version' => $result['version'],
            ];
        });

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'APK versi '.$apkInfo['version'].' berhasil diunggah',
                'apk' => $apkInfo,
            ]);
        }

        return redirect()->back()->with('success', 'APK versi '.$apkInfo['version'].' berhasil diunggah');
    }

    /**
     * Toggle APK Visibility
     */
    public function toggleApkVisibility(Request $request)
    {
        $request->validate([
            'visible' => 'required|boolean',
        ]);

        Setting::set('app_apk_visible', $request->visible, 'boolean', 'general', 'Status visibilitas APK');

        return response()->json([
            'success' => true,
            'message' => 'Visibilitas APK berhasil diperbarui',
            'visible' => $request->visible,
        ]);
    }

    /**
     * Clear application logs
     */
    public function clearLogs()
    {
        $logFile = storage_path('logs/laravel.log');
        if (File::exists($logFile)) {
            File::put($logFile, '');
        }

        return redirect()->back()->with('success', 'Log aplikasi berhasil dibersihkan.');
    }

    /**
     * Delete APK Version
     */
    public function deleteApk(Request $request)
    {
        $request->validate([
            'filename' => 'required|string',
        ]);

        $filename = $request->filename;
        $apkPath = public_path('assets/apk/'.$filename);

        // Security check: prevent directory traversal
        if (strpos($filename, '..') !== false || strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
            return response()->json(['success' => false, 'message' => 'Filename tidak valid'], 400);
        }

        if (File::exists($apkPath)) {
            File::delete($apkPath);

            // Check if we deleted the currently active APK
            $currentApkPath = Setting::get('app_apk_path');
            if ($currentApkPath && basename($currentApkPath) === $filename) {
                // Find the next latest APK to set as active, or clear setting
                $apkDir = public_path('assets/apk');
                $files = File::files($apkDir);
                $latestApk = null;
                $latestVersion = null;

                foreach ($files as $file) {
                    $name = $file->getFilename();
                    if (preg_match('/^eventcekapp_(.+)\.apk$/', $name, $matches)) {
                        $version = $matches[1];
                        if (! $latestVersion || version_compare($version, $latestVersion, '>')) {
                            $latestVersion = $version;
                            $latestApk = 'assets/apk/'.$name;
                        }
                    }
                }

                if ($latestApk) {
                    Setting::set('app_apk_path', $latestApk, 'file', 'general', 'File APK aplikasi');
                    Setting::set('app_apk_version', $latestVersion, 'string', 'general', 'Versi APK aplikasi');
                } else {
                    Setting::set('app_apk_path', '', 'file', 'general', 'File APK aplikasi');
                    Setting::set('app_apk_version', '0.1.0', 'string', 'general', 'Versi APK aplikasi');
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'File APK berhasil dihapus',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'File tidak ditemukan',
        ], 404);
    }

    /**
     * Update Application from GitHub
     */
    public function updateApp()
    {
        try {
            $basePath = base_path();
            
            // 1. Git Pull
            $gitCommand = "cd {$basePath} && git pull origin main 2>&1";
            $gitOutput = [];
            $gitReturn = 0;
            exec($gitCommand, $gitOutput, $gitReturn);
            
            $output = "Git Pull Output:\n" . implode("\n", $gitOutput) . "\n\n";

            if ($gitReturn !== 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal melakukan git pull.',
                    'output' => $output
                ], 500);
            }

            // 2. Migrate
            $migrateCommand = "cd {$basePath} && php artisan migrate --force 2>&1";
            $migrateOutput = [];
            $migrateReturn = 0;
            exec($migrateCommand, $migrateOutput, $migrateReturn);
            
            $output .= "Migrate Output:\n" . implode("\n", $migrateOutput) . "\n\n";
            
            // 3. NPM Build (Optional - might timeout)
            // $npmCommand = "cd {$basePath} && npm run build 2>&1";
            // exec($npmCommand, $npmOutput, $npmReturn);
            // $output .= "NPM Build Output:\n" . implode("\n", $npmOutput);

            return response()->json([
                'success' => true,
                'message' => 'Aplikasi berhasil diupdate (Git Pull & Migrate).',
                'output' => $output
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Run NPM Build
     */
    public function npmRunBuild()
    {
        try {
            // Increase time limit for build process
            set_time_limit(300); // 5 minutes

            $basePath = base_path();
            
            // Check if npm is available
            $npmVersion = shell_exec('npm -v');
            if (empty($npmVersion)) {
                return response()->json([
                    'success' => false,
                    'message' => 'NPM tidak ditemukan di server.',
                ], 500);
            }

            $command = "cd {$basePath} && npm run build 2>&1";
            $output = [];
            $returnVar = 0;
            
            exec($command, $output, $returnVar);
            
            $outputString = implode("\n", $output);

            if ($returnVar !== 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal menjalankan npm run build.',
                    'output' => $outputString
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Build berhasil selesai.',
                'output' => $outputString
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function handleApkUpload($file)
    {
        $apkDir = public_path('assets/apk');
        if (! File::exists($apkDir)) {
            File::makeDirectory($apkDir, 0755, true);
        }

        // Determine next version
        // Default to 0.1.0 so next is 0.1.1
        $currentVersion = Setting::get('app_apk_version', '0.1.0');
        $newVersion = $this->incrementVersion($currentVersion);

        // Generate filename: eventcekapp_0.1.1.apk
        $apkName = "eventcekapp_{$newVersion}.apk";

        $file->move($apkDir, $apkName);
        $apkPath = 'assets/apk/'.$apkName;

        // Save settings
        Setting::set('app_apk_path', $apkPath, 'file', 'general', 'File APK aplikasi');
        Setting::set('app_apk_version', $newVersion, 'string', 'general', 'Versi APK aplikasi');

        return [
            'path' => $apkPath,
            'version' => $newVersion,
            'name' => $apkName,
        ];
    }

    private function incrementVersion($version)
    {
        $parts = explode('.', $version);
        if (count($parts) < 3) {
            return $version.'.1';
        }
        $parts[count($parts) - 1]++;

        return implode('.', $parts);
    }

    /**
     * Enable maintenance mode
     */
    public function enable(Request $request)
    {
        $request->validate([
            'maintenance_message' => 'nullable|string|max:1000',
            'allowed_ips' => 'nullable|string|max:500',
            'maintenance_start' => 'nullable|date',
            'maintenance_end' => 'nullable|date|after:maintenance_start',
        ]);

        try {
            $setting = MaintenanceSetting::enableMaintenance(
                $request->maintenance_message,
                $request->maintenance_start,
                $request->maintenance_end
            );

            if ($request->allowed_ips) {
                $setting->update(['allowed_ips' => $request->allowed_ips]);
            }

            Log::info('Maintenance mode enabled by user: '.auth()->user()->name);

            return response()->json([
                'success' => true,
                'message' => 'Maintenance mode berhasil diaktifkan',
                'setting' => $setting,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to enable maintenance mode: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengaktifkan maintenance mode: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Disable maintenance mode
     */
    public function disable()
    {
        try {
            MaintenanceSetting::disableMaintenance();

            Log::info('Maintenance mode disabled by user: '.auth()->user()->name);

            return response()->json([
                'success' => true,
                'message' => 'Maintenance mode berhasil dinonaktifkan',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to disable maintenance mode: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal menonaktifkan maintenance mode: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get current maintenance status
     */
    public function status()
    {
        $setting = MaintenanceSetting::getCurrent();

        return response()->json([
            'is_maintenance_mode' => $setting->is_maintenance_mode,
            'message' => $setting->maintenance_message,
            'start_time' => $setting->maintenance_start,
            'end_time' => $setting->maintenance_end,
            'allowed_ips' => $setting->allowed_ips,
        ]);
    }

    /**
     * Update maintenance settings
     */
    public function update(Request $request)
    {
        $request->validate([
            'maintenance_message' => 'nullable|string|max:1000',
            'allowed_ips' => 'nullable|string|max:500',
            'maintenance_start' => 'nullable|date',
            'maintenance_end' => 'nullable|date|after:maintenance_start',
        ]);

        try {
            $setting = MaintenanceSetting::getCurrent();
            $setting->update($request->only([
                'maintenance_message',
                'allowed_ips',
                'maintenance_start',
                'maintenance_end',
            ]));

            Log::info('Maintenance settings updated by user: '.auth()->user()->name);

            return response()->json([
                'success' => true,
                'message' => 'Pengaturan maintenance berhasil diperbarui',
                'setting' => $setting,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update maintenance settings: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal memperbarui pengaturan maintenance: '.$e->getMessage(),
            ], 500);
        }
    }

    public function artisanMigrate()
    {
        return $this->runArtisan('migrate', ['--force' => true]);
    }

    public function artisanMigrateRefresh()
    {
        return $this->runArtisan('migrate:refresh', ['--force' => true]);
    }

    public function artisanSeed()
    {
        return $this->runArtisan('db:seed', ['--force' => true]);
    }

    public function artisanOptimizeClear()
    {
        return $this->runArtisan('optimize:clear');
    }

    public function artisanCacheClear()
    {
        return $this->runArtisan('cache:clear');
    }

    public function artisanConfigClear()
    {
        return $this->runArtisan('config:clear');
    }

    public function artisanRouteClear()
    {
        return $this->runArtisan('route:clear');
    }

    public function artisanViewClear()
    {
        return $this->runArtisan('view:clear');
    }

    public function artisanConfigCache()
    {
        return $this->runArtisan('config:cache');
    }

    public function artisanRouteCache()
    {
        return $this->runArtisan('route:cache');
    }

    public function artisanStorageLink()
    {
        return $this->runArtisan('storage:link');
    }

    public function artisanClearAll()
    {
        $commands = [
            ['optimize:clear', []],
            ['cache:clear', []],
            ['config:clear', []],
            ['route:clear', []],
            ['view:clear', []],
        ];
        $combined = '';
        foreach ($commands as [$cmd, $params]) {
            try {
                Artisan::call($cmd, $params);
                $combined .= Artisan::output()."\n";
            } catch (\Throwable $e) {
                $combined .= '[ERROR '.$cmd.'] '.$e->getMessage()."\n";
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Semua cache dan optimisasi dibersihkan',
            'output' => $combined,
        ]);
    }

    public function cleanupStorage()
    {
        $targets = [
            ['label' => 'storage/logs', 'path' => storage_path('logs')],
            ['label' => 'storage/framework/cache', 'path' => storage_path('framework/cache')],
            ['label' => 'storage/framework/sessions', 'path' => storage_path('framework/sessions')],
            ['label' => 'storage/framework/views', 'path' => storage_path('framework/views')],
            ['label' => 'storage/clockwork', 'path' => storage_path('clockwork')],
            ['label' => 'bootstrap/cache', 'path' => base_path('bootstrap/cache')],
        ];

        $summary = [];
        $deleted = 0;
        $failed = 0;

        foreach ($targets as $target) {
            $path = $target['path'];
            $label = $target['label'];

            if (! File::exists($path)) {
                $summary[] = $label.': not found';
                continue;
            }

            $count = 0;
            foreach (File::allFiles($path) as $file) {
                if ($file->getFilename() === '.gitignore') {
                    continue;
                }
                try {
                    File::delete($file->getPathname());
                    $count++;
                } catch (\Throwable $e) {
                    $failed++;
                }
            }

            $deleted += $count;
            $summary[] = $label.': deleted '.$count.' file(s)';
        }

        return response()->json([
            'success' => $failed === 0,
            'message' => $failed === 0
                ? 'Pembersihan file runtime selesai'
                : 'Pembersihan selesai dengan beberapa kegagalan',
            'output' => implode("\n", $summary),
            'deleted' => $deleted,
            'failed' => $failed,
        ]);
    }

    public function cleanupClockwork()
    {
        $path = storage_path('clockwork');
        $label = 'storage/clockwork';
        $summary = [];
        $deleted = 0;
        $failed = 0;

        if (! File::exists($path)) {
            return response()->json([
                'success' => true,
                'message' => 'Folder Clockwork tidak ditemukan',
                'output' => 'storage/clockwork: not found',
                'deleted' => 0,
                'failed' => 0,
            ]);
        }

        foreach (File::allFiles($path) as $file) {
            if ($file->getFilename() === '.gitignore') {
                continue;
            }
            try {
                File::delete($file->getPathname());
                $deleted++;
            } catch (\Throwable $e) {
                $failed++;
            }
        }

        return response()->json([
            'success' => $failed === 0,
            'message' => $failed === 0
                ? 'Pembersihan Clockwork selesai'
                : 'Pembersihan selesai dengan beberapa kegagalan',
            'output' => "Deleted $deleted files from storage/clockwork",
            'deleted' => $deleted,
            'failed' => $failed,
        ]);
    }

    public function logs(Request $request)
    {
        $lines = (int) ($request->query('lines', 200));
        if ($lines < 1) {
            $lines = 200;
        }
        if ($lines > 2000) {
            $lines = 2000;
        }
        $level = strtolower(trim((string) $request->query('level', '')));
        $path = storage_path('logs/laravel.log');
        if (! File::exists($path)) {
            return response()->json([
                'success' => false,
                'message' => 'Log file tidak ditemukan',
                'entries' => [],
            ], 404);
        }
        $content = '';
        $size = @filesize($path) ?: 0;
        $chunk = 1024 * 64;
        $fh = @fopen($path, 'rb');
        if ($fh === false) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak bisa membaca log',
                'entries' => [],
            ], 500);
        }
        $buffer = '';
        $pos = $size;
        $newlineCount = 0;
        while ($pos > 0 && $newlineCount <= ($lines + 1)) {
            $readSize = ($pos - $chunk) >= 0 ? $chunk : $pos;
            $pos -= $readSize;
            fseek($fh, $pos);
            $piece = fread($fh, $readSize);
            $buffer = $piece.$buffer;
            $newlineCount += substr_count($piece, PHP_EOL);
        }
        fclose($fh);
        $entries = explode(PHP_EOL, $buffer);
        if (count($entries) > $lines) {
            $entries = array_slice($entries, -$lines);
        }
        if ($level !== '') {
            $entries = array_values(array_filter($entries, function ($line) use ($level) {
                $l = strtolower($line);
                if ($level === 'error') {
                    return str_contains($l, ' error');
                }
                if ($level === 'warning' || $level === 'warn') {
                    return str_contains($l, ' warning');
                }
                if ($level === 'info') {
                    return str_contains($l, ' info');
                }
                if ($level === 'debug') {
                    return str_contains($l, ' debug');
                }

                return true;
            }));
        }
        $entries = array_values(array_filter($entries, function ($line) {
            return trim($line) !== '';
        }));
        $safe = array_map(function ($line) {
            return mb_substr($line, 0, 4000);
        }, $entries);

        return response()->json([
            'success' => true,
            'count' => count($safe),
            'lines' => $lines,
            'level' => $level ?: null,
            'entries' => $safe,
            'updated_at' => @date('c', @filemtime($path)) ?: null,
        ]);
    }

    public function logsDownload()
    {
        $path = storage_path('logs/laravel.log');
        if (! File::exists($path)) {
            return response()->json([
                'success' => false,
                'message' => 'Log file tidak ditemukan',
            ], 404);
        }
        $name = 'laravel.log';

        return response()->download($path, $name, [
            'Content-Type' => 'text/plain',
        ]);
    }

    public function logsClear()
    {
        $path = storage_path('logs/laravel.log');
        if (! File::exists($path)) {
            File::put($path, '');

            return response()->json([
                'success' => true,
                'message' => 'Log berhasil dikosongkan',
            ]);
        }
        try {
            File::put($path, '');

            return response()->json([
                'success' => true,
                'message' => 'Log berhasil dikosongkan',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    // Duplicate npmRunBuild removed


    private function runArtisan(string $command, array $params = [])
    {
        try {
            Artisan::call($command, $params);

            return response()->json([
                'success' => true,
                'message' => 'Perintah berhasil dijalankan',
                'output' => Artisan::output(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
