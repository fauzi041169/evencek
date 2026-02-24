<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class Role
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        if (! auth()->check()) {
            return redirect('login');
        }

        $userRole = strtolower(trim((string) auth()->user()->role));
        $allowedRoles = array_map(fn ($r) => strtolower(trim((string) $r)), $roles);

        if (in_array($userRole, $allowedRoles, true)) {
            return $next($request);
        }

        return redirect()->back()->with('error', 'Unauthorized action.');
    }
}
