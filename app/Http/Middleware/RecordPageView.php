<?php

namespace App\Http\Middleware;

use App\Models\View;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class RecordPageView
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

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
            return $response;
        }

        $path = $request->path();
        $userId = auth()->id();
        $ip = $request->ip();
        $throttleKey = 'pageview:'.($userId ? ('u:'.$userId) : ('ip:'.$ip)).':'.md5($path);
        app()->terminating(function () use ($path, $userId, $ip, $throttleKey) {
            try {
                if (! Cache::add($throttleKey, 1, now()->addSeconds(60))) {
                    return;
                }
                View::create([
                    'page_id' => $path,
                    'user_id' => $userId,
                    'ip_address' => $ip,
                ]);
            } catch (\Throwable $e) {
            }
        });

        return $response;
    }
}
