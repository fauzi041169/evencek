<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * Dynamically adjust CSRF exceptions for local environment to enable testing.
     * Only preview PDF routes are excluded in local to allow stress tests.
     */
    public function handle($request, \Closure $next)
    {
        if (app()->environment('local')) {
            $this->except = array_merge($this->except, [
                'activity/*/preview-cards-pdf',
                'activity/*/preview-certificates-pdf',
            ]);
        }

        return parent::handle($request, $next);
    }

    /**
     * The URIs that should be excluded from CSRF verification.
     *
     * @var array<int, string>
     */
    protected $except = [
        'webhook/github', // GitHub webhook tidak memerlukan CSRF token
        'auth/logout',    // Logout tidak memerlukan CSRF token untuk menghindari mismatch saat sesi berakhir
        'logout',         // Alias logout juga dikecualikan
    ];
}
