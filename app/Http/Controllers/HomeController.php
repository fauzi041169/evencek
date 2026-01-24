<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\ActivityRecord;
use App\Models\ActivityUser;
use App\Models\Partner;
use App\Models\News;
use App\Models\Payment;
use App\Models\Pengurus;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Models\Setting;

class HomeController extends Controller
{
    public function index(Request $request)
    {
        try {
            $resolvePublicImage = function (?string $path, string $fallback, ?string $defaultFolder = null): string {
                if (! $path) {
                    return $fallback;
                }

                if (str_starts_with($path, 'http')) {
                    return $path;
                }

                $normalized = ltrim($path, '/');
                if (str_starts_with($normalized, 'storage/')) {
                    $normalized = substr($normalized, 8);
                }
                if (str_starts_with($normalized, 'public/')) {
                    $normalized = substr($normalized, 7);
                }
                if ($defaultFolder && ! str_contains($normalized, '/')) {
                    $normalized = $defaultFolder . '/' . $normalized;
                }

                // Simply return the storage URL without checking existence to avoid permission/symlink issues
                return asset('storage/' . $normalized);
            };

            // Get activities with private status for the slider (legacy logic kept for fallback)
            $specialActivities = Activity::where('status', 'private')
                ->latest()
                ->take(3)
                ->get();

            // Get latest activities for the activities section
            $latestActivities = Activity::with('category')
                ->where('status', 'public')
                ->latest()
                ->take(6)
                ->get()
                ->map(function ($activity) use ($resolvePublicImage) {
                    $activity->image = $resolvePublicImage($activity->image, asset('assets/images/hero/defoult.webp'), 'activities');
                    return $activity;
                });

            // Get latest news
            $latestNews = News::with('category')
                ->where(function ($query) {
                    $query->whereNotNull('published_at')
                        ->where('published_at', '<=', now())
                        ->orWhereNull('published_at');
                })
                ->latest()
                ->take(4)
                ->get()
                ->map(function ($news) use ($resolvePublicImage) {
                    $news->image = $resolvePublicImage($news->image, asset('assets/images/hero/defoult.webp'));
                    return $news;
                });

            // Get partner list for homepage section
            $partners = Partner::latest()->take(20)->get()
                ->map(function ($partner) use ($resolvePublicImage) {
                    $partner->logo = $resolvePublicImage($partner->logo, asset('assets/images/logo.png'));
                    return $partner;
                });

            // Get statistics for dashboard
            $stats = [
                'totalActivities' => Activity::count(),
                'totalParticipants' => ActivityUser::count(),
                'totalUsers' => User::count(),
                'totalCreators' => User::where('role', 'creator')->count(),
                'totalPanitia' => Pengurus::count(),
                'totalPayments' => Payment::count(),
                'totalAttendanceRecords' => ActivityRecord::count(),
                'upcomingActivities' => Activity::where('date', '>=', now())->count(),
            ];

            // Prepare Hero Slides
            $heroSlides = [];
            
            // Prioritize pinned activities
            $pinnedActivities = Activity::where('hero_pinned', true)
                ->where('status', 'public') // Ensure only public activities are shown
                ->latest()
                ->take(5)
                ->get();

            if ($pinnedActivities->isNotEmpty()) {
                $defaultHeroSetting = Setting::get('home_hero_background');
                $defaultHero = $defaultHeroSetting ? asset($defaultHeroSetting) : asset('assets/images/hero/defoult.webp');

                foreach ($pinnedActivities as $activity) {
                    $heroSlides[] = [
                        'type' => 'activity',
                        'image' => $resolvePublicImage($activity->image, $defaultHero, 'activities'),
                        'title' => $activity->name,
                        'description' => Str::limit(strip_tags($activity->description), 150),
                        'id' => $activity->id,
                        'date' => $activity->date ? $activity->date->format('d M Y') : null,
                        'location' => $activity->location,
                        'price' => $activity->price > 0 ? 'Rp ' . number_format($activity->price, 0, ',', '.') : 'Gratis',
                    ];
                }
            } else {
                // Fallback to manual settings
                $cfg1 = Setting::get('home_hero_background_1') ?? Setting::get('home_hero_background');
                $cfg2 = Setting::get('home_hero_background_2');
                $cfg3 = Setting::get('home_hero_background_3');
                
                foreach ([$cfg1, $cfg2, $cfg3] as $img) {
                    if (!empty($img) && file_exists(public_path($img))) {
                        $heroSlides[] = [
                            'type' => 'static',
                            'image' => asset($img),
                            'title' => 'Platform Manajemen Event Digital Profesional',
                            'description' => 'Kelola pendaftaran, peserta, panitia, pembayaran, absensi, kartu, dan sertifikat dalam satu platform terintegrasi yang aman dan modern.',
                            'link' => '/activity',
                            'link_text' => 'Mulai Kelola Event'
                        ];
                    }
                }

                // Fallback if no settings
                if (empty($heroSlides)) {
                     // Check special private activities (legacy fallback)
                    if ($specialActivities->isNotEmpty()) {
                        $defaultHeroSetting = Setting::get('home_hero_background');
                        $defaultHero = $defaultHeroSetting ? asset($defaultHeroSetting) : asset('assets/images/hero/defoult.webp');
                        
                        foreach ($specialActivities as $activity) {
                             $heroSlides[] = [
                                'type' => 'activity',
                                'image' => $resolvePublicImage($activity->image, $defaultHero, 'activities'),
                                'title' => $activity->name,
                                'description' => Str::limit(strip_tags($activity->description), 150),
                                'id' => $activity->id
                            ];
                        }
                    } else {
                        $heroSlides[] = [
                            'type' => 'static',
                            'image' => asset('assets/images/hero/defoult.webp'),
                            'title' => 'Platform Manajemen Event Digital Profesional',
                            'description' => 'Kelola pendaftaran, peserta, panitia, pembayaran, absensi, kartu, dan sertifikat dalam satu platform terintegrasi yang aman dan modern.',
                            'link' => '/activity',
                            'link_text' => 'Mulai Kelola Event'
                        ];
                    }
                }
            }

        } catch (\Illuminate\Database\QueryException $e) {
            // Jika database tidak tersedia, gunakan data kosong
            $heroSlides = [asset('assets/images/hero/defoult.webp')];
            $specialActivities = collect([]);
            $latestActivities = collect([]);
            $latestNews = collect([]);
            $partners = collect([]);
            $stats = [
                'totalActivities' => 0,
                'totalParticipants' => 0,
                'totalUsers' => 0,
                'totalCreators' => 0,
                'totalPanitia' => 0,
                'totalPayments' => 0,
                'totalAttendanceRecords' => 0,
                'upcomingActivities' => 0,
            ];
        } catch (\Exception $e) {
            // Handle other exceptions
            $heroSlides = [asset('assets/images/hero/defoult.webp')];
            $specialActivities = collect([]);
            $latestActivities = collect([]);
            $latestNews = collect([]);
            $partners = collect([]);
            $stats = [
                'totalActivities' => 0,
                'totalParticipants' => 0,
                'totalUsers' => 0,
                'totalCreators' => 0,
                'totalPanitia' => 0,
                'totalPayments' => 0,
                'totalAttendanceRecords' => 0,
                'upcomingActivities' => 0,
            ];
        }

        return Inertia::render('Home', [
            'heroSlides' => $heroSlides,
            'stats' => $stats,
            'partners' => $partners,
            'specialActivities' => $specialActivities,
            'latestActivities' => $latestActivities,
            'latestNews' => $latestNews,
        ]);
    }
}
