<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class LogNewsRequests
{
    public function handle(Request $request, Closure $next)
    {
        if (strpos($request->path(), 'news') !== false) {
            $route = $request->route();
            $params = $route ? $route->parameters() : [];
            $throttleKey = 'log:news:'.$request->ip().':'.md5($request->method().'|'.$request->path().'|'.json_encode($params));
            if (Cache::add($throttleKey, 1, now()->addSeconds(60))) {
                \Log::info('News Request:', [
                    'path' => $request->path(),
                    'method' => $request->method(),
                    'parameters' => $params,
                    'user' => auth()->id() ?? 'guest',
                ]);
            }
        }

        return $next($request);
    }
}
