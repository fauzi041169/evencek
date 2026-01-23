<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class LogNewsRequests
{
    public function handle(Request $request, Closure $next)
    {
        if (strpos($request->path(), 'news') !== false) {
            \Log::info('News Request:', [
                'path' => $request->path(),
                'method' => $request->method(),
                'parameters' => $request->route()->parameters(),
                'user' => auth()->id() ?? 'guest',
            ]);
        }

        return $next($request);
    }
}
