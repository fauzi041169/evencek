<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        $viteManifest = public_path('build/manifest.json');
        if (is_file($viteManifest)) {
            return md5_file($viteManifest) ?: parent::version($request);
        }

        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        if ($user) {
            $user->loadMissing('profile'); // Hindari lazy-load terpisah saat akses profile_photo_url
        }

        return array_merge(parent::share($request), [
            'csrf_token' => fn () => csrf_token(),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role ?? 'user',
                    'is_admin' => (method_exists($user, 'isAdmin') && $user->isAdmin()) ? true : false,
                    'is_superadmin' => (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) ? true : false,
                    'profile_photo_url' => $user->profile_photo_url ?? null,
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'message' => fn () => $request->session()->get('message'),
                'show_import_bulk_payment_once' => fn () => $request->session()->get('show_import_bulk_payment_once'),
            ],
            'appSettings' => function () {
                $cacheKey = 'inertia_app_settings';
                $ttl = 300; // 5 menit – kurangi query DB tiap request
                $dbReachable = true;
                if (config('database.default') === 'mysql') {
                    $host = (string) config('database.connections.mysql.host');
                    $port = (int) (config('database.connections.mysql.port') ?: 3306);
                    $dbReachable = false;
                    if ($host !== '') {
                        $candidates = [$host];
                        if (strtolower($host) === 'localhost') {
                            $candidates[] = '127.0.0.1';
                        }
                        foreach (array_values(array_unique($candidates)) as $candidate) {
                            $fp = @fsockopen($candidate, $port, $errno, $errstr, 0.35);
                            if (is_resource($fp)) {
                                fclose($fp);
                                $dbReachable = true;
                                break;
                            }
                        }
                    }
                }

                if (! $dbReachable) {
                    return [
                        'app_name' => config('app.name', 'EVENTCEK'),
                        'app_logo' => '/assets/images/logo.png',
                        'hero_animation_style' => 'circles',
                        'hero_background_1' => null,
                        'hero_background_2' => null,
                        'hero_background_3' => null,
                        'hero_slide3_right_image' => null,
                        'navbar_opacity' => '1',
                        'subscription_service_enabled' => false,
                        'colors' => [],
                        'isLocal' => app()->environment(['local', 'development']),
                    ];
                }
                try {
                    return Cache::remember($cacheKey, $ttl, function () {
                        return [
                        'app_name' => \App\Models\Setting::get('app_name') ?? config('app.name', 'EVENTCEK'),
                        'app_logo' => self::formatAssetUrl(\App\Models\Setting::get('app_logo') ?? '/assets/images/logo.png'),
                        'hero_animation_style' => \App\Models\Setting::get('hero_animation_style', 'circles'),
                        'hero_background_1' => self::formatAssetUrl(\App\Models\Setting::get('home_hero_background_1') ?? \App\Models\Setting::get('home_hero_background')),
                        'hero_background_2' => self::formatAssetUrl(\App\Models\Setting::get('home_hero_background_2')),
                        'hero_background_3' => self::formatAssetUrl(\App\Models\Setting::get('home_hero_background_3')),
                        'hero_slide3_right_image' => self::formatAssetUrl(\App\Models\Setting::get('home_hero_slide3_right_image')),
                        'home_hero_badge' => \App\Models\Setting::get('home_hero_badge'),
                        'home_hero_title_before' => \App\Models\Setting::get('home_hero_title_before'),
                        'home_hero_title_accent' => \App\Models\Setting::get('home_hero_title_accent'),
                        'home_hero_title_after' => \App\Models\Setting::get('home_hero_title_after'),
                        'home_hero_desc' => \App\Models\Setting::get('home_hero_desc'),
                        'home_hero_cta_primary' => \App\Models\Setting::get('home_hero_cta_primary'),
                        'home_hero_cta_secondary' => \App\Models\Setting::get('home_hero_cta_secondary'),
                        'home_hero_overlay' => \App\Models\Setting::get('home_hero_overlay', '0.45'),
                        'home_hero_bg_opacity' => \App\Models\Setting::get('home_hero_bg_opacity', '0.75'),
                        'home_hero_bg_brightness' => \App\Models\Setting::get('home_hero_bg_brightness', '1'),
                        'navbar_opacity' => \App\Models\Setting::get('navbar_opacity', '1'),
                        'subscription_service_enabled' => \App\Models\Setting::get('subscription_service_enabled', '0') === '1',
                        'colors' => \App\Models\Setting::getColors(),
                        'isLocal' => app()->environment(['local', 'development']),
                    ];
                    });
                } catch (\Throwable $e) {
                    return [
                        'app_name' => config('app.name', 'EVENTCEK'),
                        'app_logo' => '/assets/images/logo.png',
                        'hero_animation_style' => 'circles',
                        'hero_background_1' => null,
                        'hero_background_2' => null,
                        'hero_background_3' => null,
                        'hero_slide3_right_image' => null,
                        'home_hero_badge' => null,
                        'home_hero_title_before' => null,
                        'home_hero_title_accent' => null,
                        'home_hero_title_after' => null,
                        'home_hero_desc' => null,
                        'home_hero_cta_primary' => null,
                        'home_hero_cta_secondary' => null,
                        'home_hero_overlay' => '0.45',
                        'home_hero_bg_opacity' => '0.75',
                        'home_hero_bg_brightness' => '1',
                        'navbar_opacity' => '1',
                        'subscription_service_enabled' => false,
                        'colors' => [],
                        'isLocal' => app()->environment(['local', 'development']),
                    ];
                }
            },
        ]);

    }

    private static function formatAssetUrl($path)
    {
        if (! $path) {
            return null;
        }
        if (str_starts_with($path, 'http')) {
            return $path;
        }
        if (str_starts_with($path, 'assets/')) {
            return '/'.$path;
        }
        if (str_starts_with($path, '/assets/')) {
            return $path;
        }
        if (str_starts_with($path, 'storage/')) {
            return '/'.$path;
        }
        if (str_starts_with($path, '/storage/')) {
            return $path;
        }

        // Assume storage path if not matching above
        return '/storage/'.$path;
    }
}
