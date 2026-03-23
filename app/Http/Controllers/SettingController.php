<?php

namespace App\Http\Controllers;

use App\Helpers\ImageHelper;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SettingController extends Controller
{
    public function index()
    {
        $this->ensureMissingNavbarColorKeys();
        $colors = Setting::where('group', 'colors')->get();
        $general = Setting::where('group', 'general')->get();

        // Group colors by category
        $colorGroups = [
            'Primary' => $colors->whereIn('key', ['color_primary', 'color_secondary', 'color_success', 'color_danger', 'color_warning', 'color_info']),
            'Navbar' => $colors->whereIn('key', [
                'color_navbar_bg_start',
                'color_navbar_bg_end',
                'color_navbar_cap_start',
                'color_navbar_cap_end',
                'color_navbar_start',
                'color_navbar_end',
                'color_navbar_brand_text',
                'color_navbar_link_text',
                'color_navbar_link_hover_bg',
                'color_navbar_link_active_card',
                'color_navbar_link_active_border',
            ]),
            'Hero' => $colors->whereIn('key', ['color_hero_start', 'color_hero_end']),
            'Cards' => $colors->whereIn('key', ['color_card_blue', 'color_card_pink', 'color_card_green']),
        ];

        $appName = Setting::get('app_name', 'ADZKIATEKNO');
        $appLogo = Setting::get('app_logo', 'assets/images/logo.png');
        $appFavicon = Setting::get('app_favicon', 'assets/images/logo.png');

        $heroBackgrounds = [
            [
                'key' => 'hero_background_1',
                'label' => 'Gambar 1',
                'path' => Setting::get('home_hero_background_1')
                    ?? Setting::get('home_hero_background', 'assets/images/hero/defoult.webp'),
            ],
            [
                'key' => 'hero_background_2',
                'label' => 'Gambar 2',
                'path' => Setting::get('home_hero_background_2') ?? 'assets/images/hero/defoult.webp',
            ],
            [
                'key' => 'hero_background_3',
                'label' => 'Gambar 3',
                'path' => Setting::get('home_hero_background_3') ?? 'assets/images/hero/defoult.webp',
            ],
        ];

        $heroBackgrounds = array_map(function ($item) {
            $path = $item['path'] ?? 'assets/images/hero/defoult.webp';

            // If path doesn't start with assets/ or storage/, and it's not a URL, it's likely a storage path
            if (! Str::startsWith($path, ['assets/', 'storage/', 'http://', 'https://'])) {
                $item['url'] = asset('storage/'.$path);
            } else {
                $item['url'] = asset($path);
            }

            return $item;
        }, $heroBackgrounds);

        // Slide 3 right panel image (optional)
        $slide3RightPath = \App\Models\Setting::get('home_hero_slide3_right_image');
        if ($slide3RightPath) {
            if (! Str::startsWith($slide3RightPath, ['assets/', 'storage/', 'http://', 'https://'])) {
                $slide3RightUrl = asset('storage/'.$slide3RightPath);
            } else {
                $slide3RightUrl = asset($slide3RightPath);
            }
        } else {
            $slide3RightUrl = null;
        }

        $logoFallback = file_exists(public_path('assets/images/logo_1762164536.png'))
            ? asset('assets/images/logo_1762164536.png')
            : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect fill=%22%23f0f0f0%22 width=%2280%22 height=%2280%22/%3E%3C/svg%3E';
        $faviconFallback = file_exists(public_path('assets/images/logo_1762164536.png'))
            ? asset('assets/images/logo_1762164536.png')
            : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22%3E%3Crect fill=%22%23f0f0f0%22 width=%2248%22 height=%2248%22/%3E%3C/svg%3E';

        $appLogoUrl = (string) $appLogo;
        if ($appLogoUrl !== '') {
            if (Str::startsWith($appLogoUrl, 'assets/')) {
                $appLogoUrl = File::exists(public_path($appLogoUrl)) ? asset($appLogoUrl) : $logoFallback;
            } elseif (Str::startsWith($appLogoUrl, 'storage/')) {
                $appLogoUrl = asset($appLogoUrl);
            } else {
                // Assume it's a storage path without prefix
                $appLogoUrl = asset('storage/'.$appLogoUrl);
            }
        } else {
            $appLogoUrl = $logoFallback;
        }
        $appFaviconUrl = (string) $appFavicon;
        if ($appFaviconUrl !== '') {
            if (Str::startsWith($appFaviconUrl, 'assets/')) {
                $appFaviconUrl = File::exists(public_path($appFaviconUrl)) ? asset($appFaviconUrl) : $faviconFallback;
            } elseif (Str::startsWith($appFaviconUrl, 'storage/')) {
                $appFaviconUrl = asset($appFaviconUrl);
            } else {
                // Assume it's a storage path without prefix
                $appFaviconUrl = asset('storage/'.$appFaviconUrl);
            }
        } else {
            $appFaviconUrl = $faviconFallback;
        }

        $navbarOpacity = Setting::get('color_navbar_opacity', '1');
        $heroAnimationStyle = Setting::get('hero_animation_style', 'circles');

        $colorGroupsPayload = [];
        foreach ($colorGroups as $groupName => $groupColors) {
            $colorGroupsPayload[$groupName] = $groupColors->values()->map(function ($setting) {
                return [
                    'key' => $setting->key,
                    'value' => $setting->value,
                    'description' => $setting->description,
                ];
            })->toArray();
        }

        return Inertia::render('Settings/Index', [
            'colorGroups' => $colorGroupsPayload,
            'appName' => $appName,
            'appLogoUrl' => $appLogoUrl,
            'appFaviconUrl' => $appFaviconUrl,
            'heroBackgrounds' => $heroBackgrounds,
            'heroAnimationStyle' => $heroAnimationStyle,
            'navbarOpacity' => $navbarOpacity,
            'heroSlide3RightImageUrl' => $slide3RightUrl,
        ]);
    }

    private function ensureMissingNavbarColorKeys()
    {
        try {
            $defaults = [
                'color_navbar_bg_start' => '#1e293b',
                'color_navbar_bg_end' => '#0f172a',
                'color_navbar_cap_start' => '#1f2937',
                'color_navbar_cap_end' => '#111827',
                'color_navbar_start' => '#4973ec',
                'color_navbar_end' => '#6600ff',
                'color_navbar_brand_text' => '#000000',
                'color_navbar_link_text' => '#330000',
                'color_navbar_link_hover_bg' => '#db0a99',
                'color_navbar_link_active_card' => '#fa9200',
                'color_navbar_link_active_border' => '#ffcf66',
            ];
            foreach ($defaults as $key => $value) {
                if (! Setting::where('key', $key)->exists()) {
                    Setting::set($key, $value, 'color', 'colors');
                }
            }
        } catch (\Throwable $e) {
        }
    }

    public function update(Request $request)
    {
        $request->validate([
            'colors' => 'nullable|array',
            'colors.*' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'colors_text' => 'nullable|array',
            'colors_text.*' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'app_name' => 'nullable|string|max:100',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'favicon' => 'nullable|file|mimes:jpeg,png,jpg,gif,svg,ico,webp|max:1024',
            'hero_background' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'hero_background_1' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'hero_background_2' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'hero_background_3' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'hero_slide3_right_image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'navbar_opacity' => 'nullable|numeric|min:0|max:1',
            'hero_animation_style' => 'nullable|string|in:circles,rain,waves,particles,parallax,clean',
        ]);

        DB::transaction(function () use ($request) {
            // Update colors - prioritize colors_text if available (from text input), fallback to colors (from color picker)
            $colorsToUpdate = [];
            if ($request->has('colors_text')) {
                foreach ($request->colors_text as $key => $value) {
                    if ($value && preg_match('/^#[0-9A-Fa-f]{6}$/', $value)) {
                        $colorsToUpdate[$key] = $value;
                    }
                }
            }
            if ($request->has('colors')) {
                foreach ($request->colors as $key => $value) {
                    if ($value && preg_match('/^#[0-9A-Fa-f]{6}$/', $value)) {
                        // Only use if not already set from colors_text
                        if (! isset($colorsToUpdate[$key])) {
                            $colorsToUpdate[$key] = $value;
                        }
                    }
                }
            }
            // Apply all color updates
            foreach ($colorsToUpdate as $key => $value) {
                Setting::set($key, $value, 'color', 'colors');
            }

            // Update app name
            if ($request->has('app_name')) {
                Setting::set('app_name', $request->app_name, 'string', 'general', 'Nama aplikasi');
            }
            if ($request->has('navbar_opacity')) {
                $opacity = (string) min(max((float) $request->navbar_opacity, 0.0), 1.0);
                Setting::set('color_navbar_opacity', $opacity, 'string', 'colors', 'Opacity navbar');
            }
            if ($request->has('hero_animation_style')) {
                $style = (string) $request->hero_animation_style;
                $allowed = ['circles', 'rain', 'waves', 'particles', 'parallax', 'clean'];
                if (! in_array($style, $allowed, true)) {
                    $style = 'circles';
                }
                Setting::set('hero_animation_style', $style, 'string', 'general', 'Model animasi hero');
            }

            // Handle logo upload
            if ($request->hasFile('logo')) {
                $logo = $request->file('logo');
                $logoPath = ImageHelper::saveCompressedPublicImage($logo, 'assets/images', 'logo', [
                    'max_width' => 800,
                    'max_height' => 800,
                    'quality' => 85,
                    'format' => 'webp',
                ]);

                // Delete old logo if exists and different
                $oldLogo = Setting::get('app_logo');
                if ($oldLogo && $oldLogo !== $logoPath && File::exists(public_path($oldLogo))) {
                    File::delete(public_path($oldLogo));
                }

                Setting::set('app_logo', $logoPath, 'file', 'general', 'Logo aplikasi');
            }

            // Handle favicon upload
            if ($request->hasFile('favicon')) {
                $favicon = $request->file('favicon');
                $path = $favicon->store('settings', 'public');
                $faviconPath = $path; // Save without storage/ prefix

                // Delete old favicon if exists and different
                $oldFavicon = Setting::get('app_favicon');
                if ($oldFavicon && $oldFavicon !== $faviconPath) {
                    // Normalize path for deletion
                    $storagePath = Str::replaceFirst('storage/', '', $oldFavicon);
                    if (Storage::disk('public')->exists($storagePath)) {
                        Storage::disk('public')->delete($storagePath);
                    } elseif (File::exists(public_path($oldFavicon))) {
                        File::delete(public_path($oldFavicon));
                    }
                }

                Setting::set('app_favicon', $faviconPath, 'file', 'general', 'Favicon aplikasi');
            }

            // Handle hero background uploads (support 3 different images for home slider)
            // Map expected fields
            $heroFields = [
                'hero_background_1' => 'home_hero_background_1',
                'hero_background_2' => 'home_hero_background_2',
                'hero_background_3' => 'home_hero_background_3',
                'hero_slide3_right_image' => 'home_hero_slide3_right_image',
            ];

            // If legacy single upload exists, treat as first image
            if ($request->hasFile('hero_background') && ! $request->hasFile('hero_background_1')) {
                $request->files->set('hero_background_1', $request->file('hero_background'));
            }

            foreach ($heroFields as $inputName => $settingKey) {
                if ($request->hasFile($inputName)) {
                    $hero = $request->file($inputName);
                    $path = ImageHelper::storeCompressedUploadedImage($hero, 'settings/hero', 'public', [
                        'max_width' => 2500,
                        'max_height' => 2500,
                        'quality' => 80,
                        'format' => 'webp',
                    ]);
                    $heroPath = $path; // Save without storage/ prefix

                    // Delete old file if exists and different
                    $oldHero = Setting::get($settingKey);
                    if ($oldHero && $oldHero !== $heroPath) {
                        // Normalize path for deletion
                        $storagePath = Str::replaceFirst('storage/', '', $oldHero);
                        if (Storage::disk('public')->exists($storagePath)) {
                            Storage::disk('public')->delete($storagePath);
                        } elseif (File::exists(public_path($oldHero))) {
                            File::delete(public_path($oldHero));
                        }
                    }

                    $description = $inputName === 'hero_slide3_right_image'
                        ? 'Gambar panel kanan slide 3'
                        : ('Background hero beranda '.substr($inputName, -1));
                    Setting::set($settingKey, $heroPath, 'file', 'general', $description);
                }
            }
        });

        // Regenerate CSS if colors or navbar opacity updated
        if ($request->has('colors') || $request->has('colors_text') || $request->has('navbar_opacity')) {
            $this->regenerateColorCSS();
        }

        return redirect()->route('settings.index')
            ->with('success', 'Pengaturan berhasil diperbarui!');
    }

    public function downloadApk()
    {
        // Check visibility setting unless user is admin/superadmin
        $isVisible = Setting::get('app_apk_visible', '1') === '1';
        $user = auth()->user();
        $isPrivileged = $user && ($user->role === 'admin' || $user->role === 'superadmin');

        if (! $isVisible && ! $isPrivileged) {
            return redirect()->back()->with('error', 'Download APK sedang dinonaktifkan.');
        }

        $path = Setting::get('app_apk_path');
        if (! $path) {
            return redirect()->back()->with('error', 'File APK belum diunggah.');
        }
        $full = public_path($path);
        if (! file_exists($full)) {
            return redirect()->back()->with('error', 'File APK tidak ditemukan.');
        }

        // Use original filename for download
        return response()->download($full, basename($full));
    }

    private function regenerateColorCSS()
    {
        $colors = Setting::getColors();

        // Also include navbar opacity if it exists
        $navbarOpacity = Setting::get('color_navbar_opacity', '1');
        if ($navbarOpacity !== null) {
            $colors['color_navbar_opacity'] = $navbarOpacity;
        }

        $css = ":root {\n";
        foreach ($colors as $key => $value) {
            $cssVar = str_replace('color_', '--color-', $key);
            $cssVar = str_replace('_', '-', $cssVar);
            $css .= "    {$cssVar}: {$value};\n";
        }
        $css .= "}\n";

        // Write to CSS file
        $cssPath = public_path('css/color-variables.css');
        if (! file_exists(dirname($cssPath))) {
            mkdir(dirname($cssPath), 0755, true);
        }
        file_put_contents($cssPath, $css);
    }
}
