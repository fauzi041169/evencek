<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo(Request $request): ?string
    {
        return $request->expectsJson() ? null : route('login');
    }

    protected function unauthenticated($request, array $guards)
    {
        // Always return JSON for API routes, but exclude Inertia requests
        if (($request->is('api/*') || $request->expectsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest') && ! $request->header('X-Inertia')) {
            return response()->json([
                'success' => false,
                'message' => 'Silakan login terlebih dahulu.',
                'require_login' => true,
            ], 401);
        }

        if ($request->query('login') === 'true') {
            // For activity routes, redirect to detail page with login modal
            if ($request->is('activity/*') && ! $request->is('activity/*/detail')) {
                // Extract activity ID from path
                $pathParts = explode('/', trim($request->path(), '/'));
                if (count($pathParts) >= 2 && $pathParts[0] === 'activity') {
                    $activityId = $pathParts[1];

                    return redirect()->route('activity.detail', $activityId)
                        ->with('show_login_modal', true);
                }
            }

            $query = $request->query();
            unset($query['login']);
            $intended = $request->url();
            if (! empty($query)) {
                $intended .= '?'.http_build_query($query);
            }
            $request->session()->flash('show_login_modal', true);
            $request->session()->put('post_login_redirect', $intended);

            return Inertia::render('Auth/Overlay', ['message' => 'Silakan login untuk melanjutkan.']);
        }

        $current = $request->fullUrl();
        $separator = str_contains($current, '?') ? '&' : '?';
        $target = $current.$separator.'login=true';

        return redirect()->to($target)
            ->with('show_login_modal', true)
            ->with('post_login_redirect', $current);
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  string[]  ...$guards
     * @return mixed
     */
    public function handle($request, \Closure $next, ...$guards)
    {
        // Allow local-only access to preview PDF routes for performance testing
        if (app()->environment('local')) {
            if ($request->is('activity/*/preview-cards-pdf') || $request->is('activity/*/preview-certificates-pdf')) {
                return $next($request);
            }
        }

        // Allow access to activity.show route if batch_id is present (will show login modal)
        if (! Auth::check() && $request->is('activity/*') && ! $request->is('activity/*/detail') && $request->has('batch_id')) {
            // Set flag to show login modal in controller
            $request->attributes->set('show_login_modal', true);

            return $next($request);
        }

        // Allow access to activity.show route if login=true is present (will redirect to detail with login modal)
        if (! Auth::check() && $request->is('activity/*') && ! $request->is('activity/*/detail') && $request->query('login') === 'true') {
            // Set flag to show login modal in controller
            $request->attributes->set('show_login_modal', true);

            return $next($request);
        }

        // Check if user is authenticated
        if (! Auth::check()) {
            return $this->unauthenticated($request, $guards);
        }

        return $next($request);
    }
}
