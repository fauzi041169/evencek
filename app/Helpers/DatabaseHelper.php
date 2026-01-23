<?php

namespace App\Helpers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DatabaseHelper
{
    /**
     * Check if database connection is available
     */
    public static function isConnected(): bool
    {
        try {
            DB::connection()->getPdo();

            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get database connection status with details
     */
    public static function getConnectionStatus(): array
    {
        try {
            DB::connection()->getPdo();

            return [
                'connected' => true,
                'message' => 'Database connection successful',
                'driver' => config('database.default'),
                'host' => config('database.connections.'.config('database.default').'.host'),
            ];
        } catch (\Exception $e) {
            return [
                'connected' => false,
                'message' => 'Database connection failed: '.$e->getMessage(),
                'error' => $e->getMessage(),
                'driver' => config('database.default'),
                'host' => config('database.connections.'.config('database.default').'.host'),
            ];
        }
    }

    /**
     * Execute query safely with fallback
     */
    public static function safeQuery(callable $query, $fallback = null)
    {
        try {
            return $query();
        } catch (\Exception $e) {
            Log::error('Database query failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return $fallback;
        }
    }
}
