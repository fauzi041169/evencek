<?php

namespace App\Providers;

use App\Models\PersonalAccessToken;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\ForeignIdColumnDefinition;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Share favicon with all views
        try {
            // Self-healing: Ensure storage directories exist
            $storageDirs = [
                storage_path('framework/views'),
                storage_path('framework/sessions'),
                storage_path('framework/cache'),
                storage_path('framework/testing'),
                storage_path('logs'),
            ];
            
            foreach ($storageDirs as $dir) {
                if (!file_exists($dir)) {
                    @mkdir($dir, 0755, true);
                }
            }

            if (Schema::hasTable('settings')) {
                $favicon = \App\Models\Setting::get('app_favicon');
                $faviconUrl = $favicon ? (str_starts_with($favicon, 'http') ? $favicon : (str_starts_with($favicon, 'storage/') || str_starts_with($favicon, 'assets/') ? asset($favicon) : asset('storage/' . $favicon))) : asset('favicon.ico');
                View::share('appFavicon', $faviconUrl);
            }
        } catch (\Throwable $e) {
            // Ignore if DB not ready
        }

        // Use custom PersonalAccessToken model for Sanctum
        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);

        Schema::defaultStringLength(191);
        Paginator::useBootstrapFive();

        Blueprint::macro('foreignCustomUid', function ($column) {
            /** @var Blueprint $this */
            $definition = new ForeignIdColumnDefinition($this, [
                'type' => 'char',
                'name' => $column,
                'length' => 6,
            ]);

            return $this->addColumnDefinition($definition);
        });

        Blueprint::macro('customUid', function ($column = 'id') {
            /** @var Blueprint $this */
            return $this->char($column, 6)->primary();
        });

        // Force HTTPS hanya bila benar-benar dibutuhkan dan terdeteksi aman
        // Hindari loop redirect pada hosting/proxy (mis. Cloudflare Flexible SSL)
        try {
            $forceHttps = (bool) config('app.force_https');
            $forwardedProto = request()->headers->get('X-Forwarded-Proto');
            $isSecure = request()->isSecure();
            $appUrl = config('app.url');
            $appUrlScheme = is_string($appUrl) ? parse_url($appUrl, PHP_URL_SCHEME) : null;
            $shouldForce =
                $forceHttps
                || ($forwardedProto === 'https')
                || ($isSecure)
                || ($appUrlScheme === 'https' && app()->environment('production') && $forwardedProto !== 'http');
            if ($shouldForce) {
                URL::forceScheme('https');
            }
        } catch (\Throwable $e) {
            // Abaikan jika request context belum tersedia (mis. saat CLI)
        }

        // Tambahkan header keamanan minimum untuk production
        if (app()->environment('production')) {
            \Illuminate\Support\Facades\Response::macro('secure', function ($content = '', $status = 200, array $headers = []) {
                $response = \response($content, $status, $headers);
                $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
                $response->headers->set('X-Content-Type-Options', 'nosniff');
                $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
                // Enable HSTS only when running behind HTTPS
                $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

                return $response;
            });
        }
    }
}
