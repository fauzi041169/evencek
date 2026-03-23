<?php

namespace App\Http\Middleware;

use App\Models\MaintenanceSetting;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class MaintenanceMode
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Always allow these critical paths
        if ($request->is('login') || $request->is('logout') || $request->is('admin/*') || $request->is('maintenance/*')) {
            return $next($request);
        }

        // 2. Skip maintenance check for superadmin
        if (auth()->check() && auth()->user()->isSuperAdmin()) {
            return $next($request);
        }

        $dbReachable = true;
        if (config('database.default') === 'mysql') {
            $host = (string) config('database.connections.mysql.host');
            $port = (int) (config('database.connections.mysql.port') ?: 3306);
            $dbReachable = false;
            if ($host !== '') {
                $candidates = [$host];
                if (strtolower($host) === 'localhost') {
                    $candidates[] = '127.0.0.1';
                }
                foreach (array_values(array_unique($candidates)) as $candidate) {
                    $fp = @fsockopen($candidate, $port, $errno, $errstr, 0.35);
                    if (is_resource($fp)) {
                        fclose($fp);
                        $dbReachable = true;
                        break;
                    }
                }
            }
        }

        if (! $dbReachable) {
            return $next($request);
        }

        try {
            // Check if maintenance mode is active
            if (MaintenanceSetting::isMaintenanceMode()) {
                $setting = MaintenanceSetting::getCurrent();

                // Check if current IP is allowed
                if ($setting && $setting->isIpAllowed()) {
                    return $next($request);
                }

                // Return maintenance page
                return Inertia::render('Maintenance', [
                    'message' => $setting->maintenance_message ?? 'Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti.',
                    'start_time' => $setting->maintenance_start ?? null,
                    'end_time' => $setting->maintenance_end ?? null,
                ])->rootView('maintenance_root')->toResponse($request)->setStatusCode(503);
            }
        } catch (\Exception $e) {
            // Jika terjadi error (misalnya database tidak tersedia),
            // log error dan biarkan request berjalan (tidak aktifkan maintenance mode)
            Log::error('Error checking maintenance mode', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            // Continue with request jika database tidak tersedia
        }

        return $next($request);
    }
}
