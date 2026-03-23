<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class MaintenanceSetting extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $fillable = [
        'is_maintenance_mode',
        'maintenance_message',
        'allowed_ips',
        'maintenance_start',
        'maintenance_end',
    ];

    protected $casts = [
        'is_maintenance_mode' => 'boolean',
        'maintenance_start' => 'datetime',
        'maintenance_end' => 'datetime',
    ];

    public const MAINTENANCE_CACHE_KEY = 'maintenance_setting_current';

    public const MAINTENANCE_CACHE_TTL_SECONDS = 30;

    /**
     * Get the current maintenance setting (cached 30s to reduce DB hits per request)
     */
    public static function getCurrent()
    {
        try {
            return Cache::remember(static::MAINTENANCE_CACHE_KEY, static::MAINTENANCE_CACHE_TTL_SECONDS, function () {
                return static::first() ?? static::create([
                    'is_maintenance_mode' => false,
                    'maintenance_message' => 'Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti.',
                ]);
            });
        } catch (\Exception $e) {
            Cache::forget(static::MAINTENANCE_CACHE_KEY);

            // Jika database tidak tersedia, return default setting object
            return new static([
                'is_maintenance_mode' => false,
                'maintenance_message' => 'Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti.',
            ]);
        }
    }

    /**
     * Check if maintenance mode is active
     */
    public static function isMaintenanceMode()
    {
        try {
            $setting = static::getCurrent();

            return $setting->is_maintenance_mode ?? false;
        } catch (\Exception $e) {
            // Jika database tidak tersedia, anggap maintenance mode tidak aktif
            return false;
        }
    }

    /**
     * Enable maintenance mode
     */
    public static function enableMaintenance($message = null, $start = null, $end = null)
    {
        try {
            $setting = static::first();

            if (! $setting) {
                $setting = static::create([
                    'is_maintenance_mode' => true,
                    'maintenance_message' => $message ?? 'Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti.',
                    'maintenance_start' => $start,
                    'maintenance_end' => $end,
                ]);
            } else {
                $setting->update([
                    'is_maintenance_mode' => true,
                    'maintenance_message' => $message ?? 'Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti.',
                    'maintenance_start' => $start,
                    'maintenance_end' => $end,
                ]);
            }

            Cache::forget(static::MAINTENANCE_CACHE_KEY);

            return $setting;
        } catch (\Exception $e) {
            // Log error jika mungkin (jika database tersedia untuk logging)
            try {
                \Log::error('Error enabling maintenance mode', ['error' => $e->getMessage()]);
            } catch (\Exception $logException) {
                // Ignore jika logging juga gagal
            }
            throw $e;
        }
    }

    /**
     * Disable maintenance mode
     */
    public static function disableMaintenance()
    {
        try {
            $setting = static::first();

            if (! $setting) {
                $setting = static::create([
                    'is_maintenance_mode' => false,
                    'maintenance_message' => 'Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti.',
                ]);
            } else {
                $setting->update([
                    'is_maintenance_mode' => false,
                    'maintenance_start' => null,
                    'maintenance_end' => null,
                ]);
            }

            Cache::forget(static::MAINTENANCE_CACHE_KEY);

            return $setting;
        } catch (\Exception $e) {
            // Log error jika mungkin (jika database tersedia untuk logging)
            try {
                \Log::error('Error disabling maintenance mode', ['error' => $e->getMessage()]);
            } catch (\Exception $logException) {
                // Ignore jika logging juga gagal
            }
            throw $e;
        }
    }

    /**
     * Check if current IP is allowed during maintenance
     */
    public function isIpAllowed($ip = null)
    {
        try {
            if (! $this->allowed_ips) {
                return false;
            }

            $allowedIps = explode(',', $this->allowed_ips);
            $currentIp = $ip ?? (request() ? request()->ip() : null);

            if (! $currentIp) {
                return false;
            }

            return in_array(trim($currentIp), array_map('trim', $allowedIps));
        } catch (\Exception $e) {
            // Jika error, anggap IP tidak diizinkan
            return false;
        }
    }
}
