<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    /**
     * Health check endpoint - minimal public status (no infra details).
     */
    public function check()
    {
        try {
            DB::connection()->getPdo();
            DB::select('SELECT 1 as test');

            return response()->json([
                'success' => true,
                'status' => 'healthy',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'status' => 'unhealthy',
            ], 503);
        }
    }
}
