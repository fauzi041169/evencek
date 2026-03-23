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
                    $fp = @fsockopen($candidate, $port, $errno, $errstr, 0.2);
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
