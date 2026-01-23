<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    /**
     * Health check endpoint - test database connection
     */
    public function check()
    {
        try {
            // Test database connection
            DB::connection()->getPdo();

            // Test simple query
            $result = DB::select('SELECT 1 as test');

            return response()->json([
                'success' => true,
                'status' => 'healthy',
                'database' => [
                    'connected' => true,
                    'driver' => config('database.default'),
                    'host' => config('database.connections.'.config('database.default').'.host'),
                    'database' => config('database.connections.'.config('database.default').'.database'),
                ],
                'message' => 'Database connection successful',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'status' => 'unhealthy',
                'database' => [
                    'connected' => false,
                    'driver' => config('database.default'),
                    'host' => config('database.connections.'.config('database.default').'.host'),
                    'database' => config('database.connections.'.config('database.default').'.database'),
                    'error' => $e->getMessage(),
                ],
                'message' => 'Database connection failed',
                'troubleshooting' => [
                    '1. Pastikan MySQL/MariaDB service berjalan',
                    '2. Periksa konfigurasi di file .env',
                    '3. Pastikan database sudah dibuat',
                    '4. Periksa username dan password database',
                ],
            ], 503);
        }
    }

    /**
     * Get database configuration (without sensitive data)
     */
    public function config()
    {
        $dbConfig = config('database.connections.'.config('database.default'));

        return response()->json([
            'success' => true,
            'config' => [
                'driver' => $dbConfig['driver'] ?? null,
                'host' => $dbConfig['host'] ?? null,
                'port' => $dbConfig['port'] ?? null,
                'database' => $dbConfig['database'] ?? null,
                'username' => $dbConfig['username'] ? '***' : null, // Hide username for security
                'charset' => $dbConfig['charset'] ?? null,
                'collation' => $dbConfig['collation'] ?? null,
            ],
        ], 200);
    }
}
