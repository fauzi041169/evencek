<?php

namespace App\Http\Middleware;

use App\Models\MaintenanceSetting;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Inertia\Inertia;

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
