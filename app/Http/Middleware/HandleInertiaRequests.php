<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
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
        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'role' => $request->user()->role ?? 'user',
                    'profile_photo_url' => $request->user()->profile_photo_url ?? null,
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'message' => fn () => $request->session()->get('message'),
                'show_import_bulk_payment_once' => fn () => $request->session()->get('show_import_bulk_payment_once'),
            ],
            'appSettings' => [
                'app_name' => \App\Models\Setting::get('app_name') ?? config('app.name', 'EVENTCEK'),
                'app_logo' => self::formatAssetUrl(\App\Models\Setting::get('app_logo') ?? '/assets/images/logo.png'),
                'hero_animation_style' => \App\Models\Setting::get('hero_animation_style', 'circles'),
                'hero_background_1' => self::formatAssetUrl(\App\Models\Setting::get('home_hero_background_1') ?? \App\Models\Setting::get('home_hero_background')),
                'hero_background_2' => self::formatAssetUrl(\App\Models\Setting::get('home_hero_background_2')),
                'hero_background_3' => self::formatAssetUrl(\App\Models\Setting::get('home_hero_background_3')),
                'hero_slide3_right_image' => self::formatAssetUrl(\App\Models\Setting::get('home_hero_slide3_right_image')),
                'navbar_opacity' => \App\Models\Setting::get('navbar_opacity', '1'),
                'subscription_service_enabled' => \App\Models\Setting::get('subscription_service_enabled', '0') === '1',
                'colors' => \App\Models\Setting::getColors(),
                'isLocal' => app()->environment(['local', 'development']),
            ],
        ]);


    }
    private static function formatAssetUrl($path)
    {
        if (!$path) return null;
        if (str_starts_with($path, 'http')) return $path;
        if (str_starts_with($path, 'assets/')) return '/' . $path;
        if (str_starts_with($path, '/assets/')) return $path;
        if (str_starts_with($path, 'storage/')) return '/' . $path;
        if (str_starts_with($path, '/storage/')) return $path;
        
        // Assume storage path if not matching above
        return '/storage/' . $path;
    }
}
