<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RedirectIfAuthenticated
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$guards): Response
    {
        $guards = empty($guards) ? [null] : $guards;

        foreach ($guards as $guard) {
            if (Auth::guard($guard)->check()) {
                $user = Auth::user();

                // Check if session is still valid
                $lastActivity = session('last_activity');
                $sessionLifetime = config('session.lifetime', 120) * 60;

                if ($lastActivity && (time() - $lastActivity) > $sessionLifetime) {
                    // Session expired, logout user
                    Auth::logout();
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();

                    return $next($request);
                }

                // Redirect based on role
                if ($user->role == 'admin') {
                    return redirect('/dashboard/admin');
                } else {
                    return redirect('/dashboard/user');
                }
            }
        }

        return $next($request);
    }
}
