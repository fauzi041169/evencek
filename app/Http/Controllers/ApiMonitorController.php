<?php

namespace App\Http\Controllers;

use App\Models\PerformanceLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

class ApiMonitorController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        if (! $user || ! (method_exists($user, 'isSuperAdmin') ? $user->isSuperAdmin() : ($user->role === 'superadmin'))) {
            abort(403, 'Hanya superadmin yang dapat mengakses halaman ini');
        }

        $hours = (int) ($request->input('hours', 24));
        if ($hours < 1) {
            $hours = 24;
        }
        if ($hours > 720) {
            $hours = 720;
        }

        $method = strtoupper(trim((string) $request->input('method', '')));
        $routeLike = trim((string) $request->input('route', ''));

        $since = now()->subHours($hours);

        $base = PerformanceLog::query()->where('created_at', '>=', $since);
        if ($method !== '' && in_array($method, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            $base->where('method', $method);
        }
        if ($routeLike !== '') {
            $base->where(function ($q) use ($routeLike) {
                $q->where('route_name', 'like', '%'.$routeLike.'%')
                    ->orWhere('uri', 'like', '%'.$routeLike.'%');
            });
        }

        $summary = $base->clone()
            ->selectRaw('COUNT(*) as hits, AVG(duration_ms) as avg_dur, MAX(duration_ms) as max_dur, AVG(query_time_ms) as avg_q_ms, AVG(query_count) as avg_q_count, SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_hits')
            ->first();

        $byRoute = $base->clone()
            ->selectRaw('COALESCE(route_name, uri) as route_key, method, COUNT(*) as hits, AVG(duration_ms) as avg_dur, MAX(duration_ms) as max_dur, AVG(query_time_ms) as avg_q_ms, AVG(query_count) as avg_q_count')
            ->groupBy('route_key', 'method')
            ->orderByDesc(DB::raw('AVG(duration_ms)'))
            ->paginate(10)
            ->withQueryString();

        $logs = $base->clone()
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        // Build API routes list for testing
        $allRoutes = Route::getRoutes();
        $allow = [
            'api/health',
            'api/auth/register',
            'api/auth/login',
            'api/auth/user',
            'api/auth/logout',
            'api/auth/refresh',
            'api/profile',
            'api/activities',
            'api/activities/my',
            'api/activities/{id}',
            'api/activities/{id}/status',
            'api/activities/{id}/register',
            'api/activities/{id}/unregister',
        ];
        $apiMap = [];
        foreach ($allRoutes as $r) {
            $uri = method_exists($r, 'uri') ? $r->uri() : $r->uri;
            if (in_array($uri, $allow)) {
                $methods = array_values(array_filter($r->methods(), function ($m) {
                    return $m !== 'HEAD';
                }));
                if (! isset($apiMap[$uri])) {
                    $apiMap[$uri] = [
                        'uri' => $uri,
                        'methods' => [],
                        'name' => $r->getName(),
                    ];
                }
                $apiMap[$uri]['methods'] = array_values(array_unique(array_merge($apiMap[$uri]['methods'], $methods)));
            }
        }
        $apiRoutes = array_values($apiMap);
        usort($apiRoutes, function ($a, $b) {
            return strcmp($a['uri'], $b['uri']);
        });

        return Inertia::render('ApiMonitor/Index', [
            'apiRoutes' => $apiRoutes,
            'summary' => $summary,
            'byRoute' => $byRoute,
            'logs' => $logs,
            'filters' => [
                'hours' => $hours,
                'method' => $method,
                'route' => $routeLike,
            ],
        ]);
    }
}
