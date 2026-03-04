<?php

namespace App\Http\Middleware;

use App\Models\PerformanceLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PerformanceLogger
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        // Skip asset/static paths to avoid noise
        if ($request->is('assets/*') || $request->is('css/*') || $request->is('js/*') || $request->is('storage/*')) {
            return $next($request);
        }

        // Di production nonaktifkan agar tidak menambah query + INSERT tiap request (bikin lemot)
        if (! config('app.debug') && ! config('logging.performance_logging', false)) {
            return $next($request);
        }

        $start = microtime(true);
        DB::connection()->enableQueryLog();

        $response = $next($request);

        $durationMs = (microtime(true) - $start) * 1000;
        $queries = DB::connection()->getQueryLog();
        DB::connection()->disableQueryLog();

        $queryCount = is_array($queries) ? count($queries) : 0;
        $queryTimeMs = 0.0;
        if (is_array($queries)) {
            foreach ($queries as $q) {
                $queryTimeMs += isset($q['time']) ? (float) $q['time'] : 0.0;
            }
        }

        $route = $request->route();
        $routeName = $route ? $route->getName() : null;
        $userId = Auth::check() ? Auth::id() : null;

        try {
            PerformanceLog::create([
                'route_name' => $routeName,
                'method' => $request->getMethod(),
                'uri' => $request->path(),
                'status_code' => method_exists($response, 'getStatusCode') ? $response->getStatusCode() : null,
                'duration_ms' => (int) round($durationMs),
                'query_count' => $queryCount,
                'query_time_ms' => (int) round($queryTimeMs),
                'memory_mb' => round(memory_get_peak_usage(true) / (1024 * 1024), 2),
                'user_id' => $userId,
            ]);
        } catch (\Throwable $e) {
            // Fail silently to avoid impacting request flow
        }

        return $response;
    }
}
