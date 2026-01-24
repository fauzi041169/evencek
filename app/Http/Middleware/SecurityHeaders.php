<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SecurityHeaders
{
    /**
     * Handle an incoming request and append security headers to the response.
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // Frame protection - Allow same-origin in development for testing
        $frameOption = app()->environment(['local', 'development']) ? 'SAMEORIGIN' : 'DENY';
        $response->headers->set('X-Frame-Options', $frameOption);

        // MIME sniffing protection
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // Basic referrer policy (lebih ketat & modern)
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Cross-origin policies
        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin');
        $response->headers->set('Cross-Origin-Resource-Policy', 'same-origin');

        // Permissions Policy: allow camera for profile photo upload, restrict others
        // Allow camera for same-origin (localhost/127.0.0.1) to enable profile photo capture
        $response->headers->set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');

        $csp = "default-src 'self'; "
             ."img-src 'self' data: blob: https:; "
             ."style-src 'self' 'unsafe-inline' https:; "
             ."script-src 'self' 'unsafe-inline' 'unsafe-eval' https: https://app.midtrans.com https://app.sandbox.midtrans.com https://*.midtrans.com; "
             ."font-src 'self' data: https:; "
             ."connect-src 'self' https:; "
             ."frame-src 'self' https://app.midtrans.com https://app.sandbox.midtrans.com https://*.midtrans.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://view.officeapps.live.com; "
             ."child-src 'self' https://app.midtrans.com https://app.sandbox.midtrans.com https://*.midtrans.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://view.officeapps.live.com; "
             ."frame-ancestors 'none';";

        $path = $request->path();
        $isSensitive = str_starts_with($path, 'midtrans/') || str_starts_with($path, 'subscriptions/') || str_starts_with($path, 'payments/');

        // Allow iframe embedding for material serve route (untuk PDF viewer)
        $isMaterialServe = str_contains($path, '/materials/') && str_ends_with($path, '/serve');

        if ($isSensitive && app()->environment('production')) {
            $csp = "default-src 'self'; "
                 ."img-src 'self' data: blob: https:; "
                 ."style-src 'self' 'unsafe-inline' https:; "
                 ."script-src 'self' 'unsafe-inline' 'unsafe-eval' https://code.jquery.com https://cdn.jsdelivr.net https://cdn.tailwindcss.com https://app.midtrans.com https://app.sandbox.midtrans.com https://*.midtrans.com; "
                 ."font-src 'self' data: https:; "
                 ."connect-src 'self' https:; "
                 ."frame-src 'self' https://app.midtrans.com https://app.sandbox.midtrans.com https://*.midtrans.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://view.officeapps.live.com; "
                 ."child-src 'self' https://app.midtrans.com https://app.sandbox.midtrans.com https://*.midtrans.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://view.officeapps.live.com; "
                 ."frame-ancestors 'none';";
        } elseif ($isMaterialServe) {
            // Allow iframe embedding untuk material serve (PDF viewer)
            $csp = "default-src 'self'; "
                 ."img-src 'self' data: blob: https:; "
                 ."style-src 'self' 'unsafe-inline' https:; "
                 ."script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; "
                 ."font-src 'self' data: https:; "
                 ."connect-src 'self' https:; "
                 ."frame-src 'self' https://app.midtrans.com https://app.sandbox.midtrans.com https://*.midtrans.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://view.officeapps.live.com; "
                 ."child-src 'self' https://app.midtrans.com https://app.sandbox.midtrans.com https://*.midtrans.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://view.officeapps.live.com; "
                 ."frame-ancestors 'self';";

            // Allow X-Frame-Options untuk material serve
            $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        }

        // In local/dev, allow Vite dev server assets and HMR websocket
        if (app()->environment(['local', 'development'])) {
            // For development, use permissive policy with localhost and 127.0.0.1
            // Note: CSP doesn't support IPv6 bracket notation [::1], so we use broader rules
            $csp = "default-src 'self'; "
                 ."img-src 'self' data: blob: https: http:; "
                 ."style-src 'self' 'unsafe-inline' https: http: localhost:* 127.0.0.1:* 10.10.115.108:*; "
                 ."script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: localhost:* 127.0.0.1:* 10.10.115.108:*; "
                 ."font-src 'self' data: https: http:; "
                 ."connect-src 'self' https: http: ws: wss: localhost:* 127.0.0.1:* 10.10.115.108:*; "
                 ."frame-src 'self' https://app.midtrans.com https://app.sandbox.midtrans.com https://*.midtrans.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://view.officeapps.live.com; "
                 ."child-src 'self' https://app.midtrans.com https://app.sandbox.midtrans.com https://*.midtrans.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://view.officeapps.live.com; "
                 ."frame-ancestors 'self';";
        }
        $response->headers->set('Content-Security-Policy', $csp);
        if (app()->environment('production') && ($request->isSecure() || $request->headers->get('X-Forwarded-Proto') === 'https')) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }

        return $response;
    }
}
