<?php

namespace App\Http\Middleware;

use Closure;

class AdminMiddleware
{
    public function handle($request, Closure $next)
    {
        // Cek apakah user sudah login
        if (! auth()->check()) {
            return redirect('login')->with('error', 'Silakan login terlebih dahulu.');
        }

        // Cek role user
        if (auth()->user()->role !== 'admin') {
            return redirect()->back()->with('error', 'Anda tidak memiliki akses ke halaman ini.');
        }

        return $next($request);
    }
}
