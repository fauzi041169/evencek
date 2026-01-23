<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ActivityLogger
{
    /**
     * Handle an incoming request.
     *
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        // Update last activity for authenticated users
        if (Auth::check()) {
            session(['last_activity' => time()]);

            // Bersihkan: tidak lagi mencatat debug aktivitas pengguna di production
        }

        return $next($request);
    }
}
