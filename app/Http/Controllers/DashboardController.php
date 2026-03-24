<?php

namespace App\Http\Controllers;

use App\Helpers\ImageHelper;
use App\Models\Activity;
use App\Models\ActivityRecord;
use App\Models\ActivityUser;
use App\Models\Attendance;
use App\Models\Category;
use App\Models\Follower;
use App\Models\Gallery;
use App\Models\News;
use App\Models\Partner;
use App\Models\Payment;
use App\Models\Pengurus;
use App\Models\Profile;
use App\Models\Province;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\View;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        // Branch dashboard sesuai peran
        if (auth()->check()) {
            $role = auth()->user()->role;
            // Creator dan Admin melihat statistik aktivitas yang dibuat sendiri
            if (in_array($role, ['creator', 'admin'])) {
                return $this->creatorDashboard($request);
            }

            // User/Guest melihat "Aktivitas Saya" (kegiatan yang diikuti)
            if (in_array($role, ['user', 'guest'])) {
                return $this->userDashboard($request);
            }
            // Superadmin dan peran lain lanjut ke dashboard umum di bawah (tampilan sebelumnya)
        }

        $selectedActivity = $request->input('activity_id');
        $selectedProvince = $request->input('province_id');

        $provinces = Cache::remember('dashboard_provinces', 3600, function () {
            return Province::select('id', 'name')->orderBy('name')->get();
        });

        $activities = Cache::remember('dashboard_activities', 600, function () {
            return Activity::select('id', 'name')->orderBy('name')->get();
        });

        $userQuery = User::query();
        $activityQuery = Activity::query();
        $activityUserQuery = ActivityUser::query();

        if ($selectedProvince) {
            $userQuery->whereHas('profile', function ($q) use ($selectedProvince) {
                $q->where('province_id', $selectedProvince);
            });
            $activityQuery->whereHas('user.profile', function ($q) use ($selectedProvince) {
                $q->where('province_id', $selectedProvince);
            });
            $activityUserQuery->whereHas('user.profile', function ($q) use ($selectedProvince) {
                $q->where('province_id', $selectedProvince);
            });
        }

        if ($selectedActivity) {
            $activityQuery->where('id', $selectedActivity);
            $activityUserQuery->where('activity_id', $selectedActivity);
            $userQuery->whereHas('activities', function ($q) use ($selectedActivity) {
                $q->where('activities.id', $selectedActivity);
            });
        }

        // 0. Schema Checks (Cached globally as they rarely change)
        $schemaFlags = Cache::remember('dashboard_schema_flags', 86400, function () {
            return [
                'viewsExist' => Schema::hasTable('views'),
                'followersExist' => Schema::hasTable('followers'),
                'paymentsExist' => Schema::hasTable('payments'),
                'partnersExist' => Schema::hasTable('partners'),
                'pengurusExist' => Schema::hasTable('pengurus'),
                'galleriesExist' => Schema::hasTable('galleries'),
                'attendancesExist' => Schema::hasTable('attendances'),
                'attendanceRecordsExist' => Schema::hasTable('activity_records'),
                'subscriptionsExist' => Schema::hasTable('subscriptions'),
                'subscriptionPlansExist' => Schema::hasTable('subscription_plans'),
            ];
        });
        extract($schemaFlags);

        // 1. Global Stats (Not affected by filters)
        $globalStats = Cache::remember('dashboard_global_stats', 3600, function () use ($schemaFlags) {
            extract($schemaFlags);
            $now = now();
            $startCurrent = $now->copy()->startOfMonth();
            $startLast = $now->copy()->subMonth()->startOfMonth();

            // News
            $newsStats = News::selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as current_month,
                SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) as last_month
            ', [$startCurrent, $startLast, $startCurrent])->first();

            $totalNews = $newsStats->total ?? 0;
            $currentMonthNews = $newsStats->current_month ?? 0;
            $lastMonthNews = $newsStats->last_month ?? 0;
            $newsGrowth = $lastMonthNews > 0 ? round((($currentMonthNews - $lastMonthNews) / $lastMonthNews) * 100, 1) : 0;

            // Category
            $categoryStats = Category::selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as current_month,
                SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) as last_month
            ', [$startCurrent, $startLast, $startCurrent])->first();

            $totalCategory = $categoryStats->total ?? 0;
            $currentMonthCategory = $categoryStats->current_month ?? 0;
            $lastMonthCategory = $categoryStats->last_month ?? 0;
            $categoryGrowth = $lastMonthCategory > 0 ? round((($currentMonthCategory - $lastMonthCategory) / $lastMonthCategory) * 100, 1) : 0;

            // Partner
            $totalPartner = 0;
            $partnerGrowth = 0;
            if ($partnersExist) {
                $partnerStats = Partner::selectRaw('
                    COUNT(*) as total,
                    SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as current_month,
                    SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) as last_month
                ', [$startCurrent, $startLast, $startCurrent])->first();
                $totalPartner = $partnerStats->total ?? 0;
                $partnerGrowth = ($partnerStats->last_month ?? 0) > 0 ? round((($partnerStats->current_month - $partnerStats->last_month) / $partnerStats->last_month) * 100, 1) : 0;
            }

            // Pengurus
            $totalPengurus = 0;
            $pengurusGrowth = 0;
            if ($pengurusExist) {
                $pengurusStats = Pengurus::selectRaw('
                    COUNT(*) as total,
                    SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as current_month,
                    SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) as last_month
                ', [$startCurrent, $startLast, $startCurrent])->first();
                $totalPengurus = $pengurusStats->total ?? 0;
                $pengurusGrowth = ($pengurusStats->last_month ?? 0) > 0 ? round((($pengurusStats->current_month - $pengurusStats->last_month) / $pengurusStats->last_month) * 100, 1) : 0;
            }

            // Gallery
            $totalGallery = 0;
            $galleryGrowth = 0;
            if ($galleriesExist) {
                $galleryStats = Gallery::selectRaw('
                    COUNT(*) as total,
                    SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as current_month,
                    SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) as last_month
                ', [$startCurrent, $startLast, $startCurrent])->first();
                $totalGallery = $galleryStats->total ?? 0;
                $galleryGrowth = ($galleryStats->last_month ?? 0) > 0 ? round((($galleryStats->current_month - $galleryStats->last_month) / $galleryStats->last_month) * 100, 1) : 0;
            }

            // Attendance
            $totalAttendance = 0;
            $attendanceGrowth = 0;
            if ($attendancesExist) {
                $attendanceStats = Attendance::selectRaw('
                    COUNT(*) as total,
                    SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as current_month,
                    SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) as last_month
                ', [$startCurrent, $startLast, $startCurrent])->first();
                $totalAttendance = $attendanceStats->total ?? 0;
                $attendanceGrowth = ($attendanceStats->last_month ?? 0) > 0 ? round((($attendanceStats->current_month - $attendanceStats->last_month) / $attendanceStats->last_month) * 100, 1) : 0;
            }

            $totalAttendanceRecord = $attendanceRecordsExist ? ActivityRecord::count() : 0;

            // Subscription
            $subscriptionStats = [
                'total' => 0, 'active' => 0, 'pending' => 0,
                'cancelled' => 0, 'expired' => 0, 'inactive' => 0,
            ];
            $subscriptionByPlan = ['labels' => [], 'data' => []];

            if ($subscriptionsExist) {
                $subStats = Subscription::selectRaw('
                    COUNT(*) as total,
                    SUM(CASE WHEN status = "active" AND end_date >= NOW() THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = "cancelled" THEN 1 ELSE 0 END) as cancelled,
                    SUM(CASE WHEN end_date < NOW() AND status != "cancelled" THEN 1 ELSE 0 END) as expired
                ')->first();

                $subscriptionStats['total'] = $subStats->total ?? 0;
                $subscriptionStats['active'] = $subStats->active ?? 0;
                $subscriptionStats['pending'] = $subStats->pending ?? 0;
                $subscriptionStats['cancelled'] = $subStats->cancelled ?? 0;
                $subscriptionStats['expired'] = $subStats->expired ?? 0;
                $subscriptionStats['inactive'] = max(0, $subscriptionStats['total'] - $subscriptionStats['active']);
            }

            if ($subscriptionsExist && $subscriptionPlansExist) {
                $plans = SubscriptionPlan::orderBy('sort_order')->get();
                foreach ($plans as $plan) {
                    $subscriptionByPlan['labels'][] = $plan->name;
                    $subscriptionByPlan['data'][] = Subscription::where('subscription_plan_id', $plan->id)
                        ->where('status', 'active')
                        ->where('end_date', '>=', now())
                        ->count();
                }
            }

            // Payment
            $totalPayment = 0;
            $totalPaymentAmount = 0;
            $pendingPayment = 0;
            $verifiedPayment = 0;
            $rejectedPayment = 0;
            $paymentGrowth = 0;

            if ($paymentsExist) {
                $paymentStats = Payment::selectRaw('
                    COUNT(*) as total,
                    SUM(amount) as total_amount,
                    SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = "verified" THEN 1 ELSE 0 END) as verified,
                    SUM(CASE WHEN status = "rejected" THEN 1 ELSE 0 END) as rejected,
                    SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as current_month,
                    SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) as last_month
                ', [$startCurrent, $startLast, $startCurrent])->first();

                $totalPayment = $paymentStats->total ?? 0;
                $totalPaymentAmount = $paymentStats->total_amount ?? 0;
                $pendingPayment = $paymentStats->pending ?? 0;
                $verifiedPayment = $paymentStats->verified ?? 0;
                $rejectedPayment = $paymentStats->rejected ?? 0;

                $currentMonthPayment = $paymentStats->current_month ?? 0;
                $lastMonthPayment = $paymentStats->last_month ?? 0;
                $paymentGrowth = $lastMonthPayment > 0 ? round((($currentMonthPayment - $lastMonthPayment) / $lastMonthPayment) * 100, 1) : 0;
            }

            // Views & Followers
            $totalViews = $viewsExist ? View::count() : 0;
            $totalFollowers = $followersExist ? Follower::count() : 0;

            return compact(
                'totalNews', 'newsGrowth', 'totalCategory', 'categoryGrowth',
                'totalPartner', 'partnerGrowth', 'totalPengurus', 'pengurusGrowth',
                'totalGallery', 'galleryGrowth', 'totalAttendance', 'attendanceGrowth',
                'totalAttendanceRecord', 'totalPayment', 'paymentGrowth',
                'totalPaymentAmount', 'pendingPayment', 'verifiedPayment', 'rejectedPayment',
                'subscriptionStats', 'subscriptionByPlan', 'totalViews', 'totalFollowers'
            );
        });

        // 2. Filtered Stats (Dependent on activity_id and province_id)
        $cacheKey = 'dashboard_filtered_stats_'.md5(json_encode([
            'activity_id' => $selectedActivity,
            'province_id' => $selectedProvince,
        ]));

        $filteredStats = Cache::remember($cacheKey, 600, function () use ($selectedActivity, $selectedProvince, $userQuery, $activityUserQuery, $activityQuery) {
            $now = now();
            $startCurrent = $now->copy()->startOfMonth();
            $startLast = $now->copy()->subMonth()->startOfMonth();

            // Activity Stats
            $activityStats = $activityQuery->clone()->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as current_month,
                SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) as last_month
            ', [$startCurrent, $startLast, $startCurrent])->first();

            $totalActivity = $activityStats->total ?? 0;
            $currentMonthActivity = $activityStats->current_month ?? 0;
            $lastMonthActivity = $activityStats->last_month ?? 0;
            $activityGrowth = $lastMonthActivity > 0 ? round((($currentMonthActivity - $lastMonthActivity) / $lastMonthActivity) * 100, 1) : 0;

            // User Stats
            $userStats = $userQuery->clone()->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as current_month,
                SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) as last_month
            ', [$startCurrent, $startLast, $startCurrent])->first();

            $totalUsers = $userStats->total ?? 0;
            $currentMonthUsers = $userStats->current_month ?? 0;
            $lastMonthUsers = $userStats->last_month ?? 0;
            $usersGrowth = $lastMonthUsers > 0 ? round((($currentMonthUsers - $lastMonthUsers) / $lastMonthUsers) * 100, 1) : 0;

            // Participants growth
            $participantStats = $activityUserQuery->clone()->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as current_month,
                SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) as last_month
            ', [$startCurrent, $startLast, $startCurrent])->first();

            $totalParticipants = $participantStats->total ?? 0;
            $currentMonthParticipants = $participantStats->current_month ?? 0;
            $lastMonthParticipants = $participantStats->last_month ?? 0;
            $participantsGrowth = $lastMonthParticipants > 0 ? round((($currentMonthParticipants - $lastMonthParticipants) / $lastMonthParticipants) * 100, 1) : 0;

            return compact(
                'totalActivity', 'activityGrowth', 'totalUsers', 'usersGrowth',
                'totalParticipants', 'participantsGrowth'
            );
        });

        // Merge stats
        $stats = [
            'totalViews' => $globalStats['totalViews'],
            'viewsGrowth' => 12.5,
            'followers' => $globalStats['totalFollowers'],
            'followersGrowth' => 5.3,
            'newsCount' => $globalStats['totalNews'],
            'newsGrowth' => $globalStats['newsGrowth'],
            'engagementRate' => 15.8,
            'engagementGrowth' => -2.4,
            'totalActivity' => $filteredStats['totalActivity'],
            'activityGrowth' => $filteredStats['activityGrowth'],
            'totalNews' => $globalStats['totalNews'],
            'totalNewsGrowth' => $globalStats['newsGrowth'],
            'totalUsers' => $filteredStats['totalUsers'],
            'usersGrowth' => $filteredStats['usersGrowth'],
            'totalParticipants' => $filteredStats['totalParticipants'],
            'participantsGrowth' => $filteredStats['participantsGrowth'],
            'totalCategory' => $globalStats['totalCategory'],
            'categoryGrowth' => $globalStats['categoryGrowth'],
            'totalPartner' => $globalStats['totalPartner'],
            'partnerGrowth' => $globalStats['partnerGrowth'],
            'totalPengurus' => $globalStats['totalPengurus'],
            'pengurusGrowth' => $globalStats['pengurusGrowth'],
            'totalGallery' => $globalStats['totalGallery'],
            'galleryGrowth' => $globalStats['galleryGrowth'],
            'totalAttendance' => $globalStats['totalAttendance'],
            'attendanceGrowth' => $globalStats['attendanceGrowth'],
            'totalAttendanceRecord' => $globalStats['totalAttendanceRecord'],
            'totalPayment' => $globalStats['totalPayment'],
            'paymentGrowth' => $globalStats['paymentGrowth'],
            'totalPaymentAmount' => $globalStats['totalPaymentAmount'],
            'pendingPayment' => $globalStats['pendingPayment'],
            'verifiedPayment' => $globalStats['verifiedPayment'],
            'rejectedPayment' => $globalStats['rejectedPayment'],
        ];

        $subscriptionStats = $globalStats['subscriptionStats'];
        $subscriptionByPlan = $globalStats['subscriptionByPlan'];

        // Data Aktivitas Harian dengan data dummy jika tabel belum ada
        $pageViews = [];
        $userSessions = [];

        if ($viewsExist) {
            try {
                $pageViews = Cache::remember('dashboard_page_views', 3600, function () {
                    return View::select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
                        ->whereDate('created_at', '>=', now()->subDays(7))
                        ->groupBy('date')
                        ->orderBy('date')
                        ->pluck('count')
                        ->toArray();
                });
            } catch (Exception $e) {
                $pageViews = [0, 0, 0, 0, 0, 0, 0];
            }
        } else {
            $pageViews = [12000, 19000, 15000, 25000, 22000, 30000, 28000]; // Data dummy
        }

        $userSessionsKey = 'dashboard_user_sessions_'.md5(json_encode([
            'act' => $selectedActivity,
            'prov' => $selectedProvince,
        ]));

        $userSessions = Cache::remember($userSessionsKey, 3600, function () use ($userQuery) {
            try {
                return $userQuery->clone()
                    ->select(DB::raw('DATE(last_login_at) as date'), DB::raw('count(*) as count'))
                    ->whereDate('last_login_at', '>=', now()->subDays(7))
                    ->groupBy('date')
                    ->orderBy('date')
                    ->pluck('count')
                    ->toArray();
            } catch (Exception $e) {
                return [8000, 12000, 10000, 15000, 14000, 18000, 16000]; // Data dummy
            }
        });

        $activityData = [
            'labels' => ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
            'pageViews' => $pageViews,
            'userSessions' => $userSessions,
        ];
        $startDateInput = request()->query('start_date');
        $endDateInput = request()->query('end_date');
        $startMonth = $startDateInput ? \Carbon\Carbon::parse($startDateInput)->startOfMonth() : now()->subMonths(11)->startOfMonth();
        $endMonth = $endDateInput ? \Carbon\Carbon::parse($endDateInput)->endOfMonth() : now()->endOfMonth();
        if ($startMonth->gt($endMonth)) {
            $startMonth = $endMonth->copy()->subMonths(11)->startOfMonth();
        }
        $months = $startMonth->diffInMonths($endMonth) + 1;
        if ($months > 24) {
            $startMonth = $endMonth->copy()->subMonths(23)->startOfMonth();
            $months = 24;
        }
        $startDateStr = $startMonth->toDateString();
        $endDateStr = $endMonth->toDateString();

        // Aktivitas per bulan (12 bulan terakhir) - untuk tren kegiatan
        $activityTrendKey = 'dashboard_activity_trend_'.md5(json_encode([
            'act' => $selectedActivity,
            'prov' => $selectedProvince,
            'start' => $startDateStr,
            'end' => $endDateStr,
        ]));
        $activityTrend = Cache::remember($activityTrendKey, 3600, function () use ($activityQuery, $startMonth, $endMonth, $months) {
            $trend = [
                'labels' => [],
                'data' => [],
            ];
            $monthlyData = $activityQuery->clone()
                ->selectRaw('YEAR(created_at) as year, MONTH(created_at) as month, COUNT(*) as count')
                ->whereBetween('created_at', [$startMonth, $endMonth])
                ->groupBy('year', 'month')
                ->get()
                ->mapWithKeys(function ($item) {
                    return [$item->year.'-'.$item->month => $item->count];
                });
            for ($i = 0; $i < $months; $i++) {
                $date = $startMonth->copy()->addMonths($i);
                $key = $date->year.'-'.$date->month;
                $trend['labels'][] = $date->format('M Y');
                $trend['data'][] = $monthlyData[$key] ?? 0;
            }

            return $trend;
        });

        // Tren Kunjungan User per bulan (12 bulan terakhir) - menggunakan data aktual
        $userVisitTrendKey = 'dashboard_user_visit_trend_'.md5(json_encode([
            'act' => $selectedActivity,
            'prov' => $selectedProvince,
            'start' => $startDateStr,
            'end' => $endDateStr,
        ]));
        $userVisitTrend = Cache::remember($userVisitTrendKey, 3600, function () use ($viewsExist, $userQuery, $startMonth, $endMonth, $months) {
            $trend = [
                'labels' => [],
                'data' => [],
            ];

            $monthlyData = [];

            if ($viewsExist) {
                try {
                    $monthlyData = DB::table('views')
                        ->selectRaw('YEAR(created_at) as year, MONTH(created_at) as month, COUNT(DISTINCT user_id) as count')
                        ->whereBetween('created_at', [$startMonth, $endMonth])
                        ->whereNotNull('user_id')
                        ->groupBy('year', 'month')
                        ->get()
                        ->mapWithKeys(function ($item) {
                            return [$item->year.'-'.$item->month => $item->count];
                        });
                } catch (Exception $e) {
                }
            }

            if (empty($monthlyData) || $monthlyData->isEmpty()) {
                $monthlyData = $userQuery->clone()
                    ->selectRaw('YEAR(last_login_at) as year, MONTH(last_login_at) as month, COUNT(*) as count')
                    ->whereBetween('last_login_at', [$startMonth, $endMonth])
                    ->groupBy('year', 'month')
                    ->get()
                    ->mapWithKeys(function ($item) {
                        return [$item->year.'-'.$item->month => $item->count];
                    });
            }

            for ($i = 0; $i < $months; $i++) {
                $date = $startMonth->copy()->addMonths($i);
                $key = $date->year.'-'.$date->month;
                $trend['labels'][] = $date->format('M Y');
                $trend['data'][] = $monthlyData[$key] ?? 0;
            }

            return $trend;
        });

        // Jika semua data 0 atau kosong, gunakan activityTrend sebagai fallback
        $hasData = array_sum($userVisitTrend['data']) > 0;
        if (! $hasData) {
            // Fallback ke activityTrend jika userVisitTrend tidak ada data
            $userVisitTrend = $activityTrend;
        }

        // Trend ganda (Input vs Output) mengikuti desain: Input = Aktivitas per bulan, Output = Berita per bulan
        $trendDual = Cache::remember('dashboard_trend_dual_'.md5(json_encode([
            'act' => $selectedActivity ?: 'all',
            'start' => $startDateStr,
            'end' => $endDateStr,
        ])), 3600, function () use ($activityQuery, $startMonth, $endMonth, $months) {
            $trend = [
                'labels' => [],
                'input' => [],
                'output' => [],
            ];
            $activityData = $activityQuery->clone()
                ->selectRaw('YEAR(created_at) as year, MONTH(created_at) as month, COUNT(*) as count')
                ->whereBetween('created_at', [$startMonth, $endMonth])
                ->groupBy('year', 'month')
                ->get()
                ->mapWithKeys(function ($item) {
                    return [$item->year.'-'.$item->month => $item->count];
                });

            $newsData = News::selectRaw('YEAR(created_at) as year, MONTH(created_at) as month, COUNT(*) as count')
                ->whereBetween('created_at', [$startMonth, $endMonth])
                ->groupBy('year', 'month')
                ->get()
                ->mapWithKeys(function ($item) {
                    return [$item->year.'-'.$item->month => $item->count];
                });

            for ($i = 0; $i < $months; $i++) {
                $date = $startMonth->copy()->addMonths($i);
                $key = $date->year.'-'.$date->month;
                $trend['labels'][] = $date->format('M');
                $trend['input'][] = $activityData[$key] ?? 0;
                $trend['output'][] = $newsData[$key] ?? 0;
            }

            return $trend;
        });

        // Data Performa Berita
        $newsPerformance = Cache::remember('dashboard_news_performance', 3600, function () {
            try {
                $newsQuery = News::select('news.category_id', 'news_categories.name as category_name', DB::raw('count(*) as count'))
                    ->join('news_categories', 'news.category_id', '=', 'news_categories.id')
                    ->whereNotNull('news.category_id')
                    ->groupBy('news.category_id', 'news_categories.name')
                    ->orderBy('count', 'desc')
                    ->limit(4);
                $result = $newsQuery->get()->toArray();

                return empty($result) ? [] : $result;
            } catch (Exception $e) {
                return [
                    ['category_name' => 'Technology', 'count' => 35],
                    ['category_name' => 'Sports', 'count' => 25],
                    ['category_name' => 'Politics', 'count' => 20],
                    ['category_name' => 'Entertainment', 'count' => 20],
                ];
            }
        });

        // Data untuk grafik kategori - NOW FILTERED
        $categoryData = Cache::remember('dashboard_category_data_'.md5(json_encode(['act' => $selectedActivity, 'prov' => $selectedProvince])), 3600, function () use ($selectedActivity, $selectedProvince, $activityQuery) {
            $categoryQuery = Category::query();
            if ($selectedActivity || $selectedProvince) {
                $participatingActivityIds = $activityQuery->clone()->pluck('id');
                // Only show categories that have filtered activities
                $categoryQuery->whereHas('activities', function ($q) use ($participatingActivityIds) {
                    $q->whereIn('id', $participatingActivityIds);
                });
            }
            $categories = $categoryQuery->withCount(['activities' => function ($q) use ($activityQuery) {
                // The count should also be of filtered activities
                $q->whereIn('id', $activityQuery->clone()->pluck('id'));
            }])->get();

            return [
                'labels' => $categories->pluck('name')->toArray(),
                'data' => $categories->pluck('activities_count')->toArray(),
            ];
        });

        // Data untuk grafik status aktivitas - NOW FILTERED
        $statusData = Cache::remember('dashboard_status_data_'.md5(json_encode(['act' => $selectedActivity, 'prov' => $selectedProvince])), 3600, function () use ($activityQuery) {
            $statusQuery = $activityQuery->clone()->select('status', DB::raw('count(*) as total'))
                ->groupBy('status');
            $statusCounts = $statusQuery->get();

            return [
                'labels' => $statusCounts->pluck('status')->toArray(),
                'data' => $statusCounts->pluck('total')->toArray(),
            ];
        });

        // Data untuk aktivitas terbaru - NOW FILTERED
        $recentActivities = Cache::remember('dashboard_recent_activities_'.md5(json_encode(['act' => $selectedActivity, 'prov' => $selectedProvince])), 600, function () use ($activityQuery) {
            $recentActivitiesQuery = $activityQuery->clone()->with('category')
                ->withCount(['participants' => function ($query) {
                    $query->where('status', true);
                }]);

            return $recentActivitiesQuery->latest()->take(5)->get();
        });

        // Data Demografi Pengguna & Distribusi Global (Dummy Data)
        // No need to cache hardcoded arrays but for consistency keeping structure
        // Data Demografi Pengguna
        $demographics = [
            'labels' => ['18-24', '25-34', '35-44', '45-54', '55+'],
            'data' => [25, 35, 20, 15, 5],
        ];

        // Data Distribusi Pengguna Global
        $globalDistribution = [
            'labels' => ['Amerika Utara', 'Eropa', 'Asia', 'Amerika Selatan', 'Afrika'],
            'data' => [30, 25, 20, 15, 10],
        ];

        // Data untuk grafik partisipasi
        $participationData = Cache::remember('dashboard_participation_data_'.md5(json_encode(['act' => $selectedActivity, 'prov' => $selectedProvince])), 3600, function () use ($activityUserQuery) {
            return [
                $activityUserQuery->clone()->where('status', true)->count(),
                $activityUserQuery->clone()->where('status', false)->count(),
            ];
        });

        // Top 10 user teraktif + tren 30 hari (dibanding 30 hari sebelumnya)
        $topActiveUsers = Cache::remember('dashboard_top_active_users', 3600, function () {
            try {
                $tableName = Schema::hasTable('activity_users') ? 'activity_users' : 'activity_users';

                $now = now();
                $currentStart = $now->copy()->subDays(30)->startOfDay();
                $prevStart = $now->copy()->subDays(60)->startOfDay();
                $prevEnd = $now->copy()->subDays(30)->endOfDay();

                // Hitung partisipasi aktif 30 hari terakhir
                $currCounts = DB::table($tableName)
                    ->select('user_id', DB::raw('COUNT(*) as total'))
                    ->where('status', ActivityUser::STATUS_ACTIVE)
                    ->whereBetween('created_at', [$currentStart, $now])
                    ->groupBy('user_id')
                    ->get();

                // Hitung partisipasi aktif 30 hari sebelumnya
                $prevCounts = DB::table($tableName)
                    ->select('user_id', DB::raw('COUNT(*) as total'))
                    ->where('status', ActivityUser::STATUS_ACTIVE)
                    ->whereBetween('created_at', [$prevStart, $prevEnd])
                    ->groupBy('user_id')
                    ->get();

                $prevMap = $prevCounts->keyBy('user_id');

                // Ambil top 10 berdasarkan periode sekarang
                $topActiveUsersRaw = $currCounts->sortByDesc('total')->take(10)->values();

                $userMap = User::whereIn('id', $topActiveUsersRaw->pluck('user_id'))->with('profile')->get()->keyBy('id');

                return $topActiveUsersRaw->map(function ($row) use ($userMap, $prevMap) {
                    $user = $userMap->get($row->user_id);
                    $prev = (int) ($prevMap->get($row->user_id)->total ?? 0);
                    $delta = (int) $row->total - $prev;

                    return [
                        'name' => $user->name ?? ('User #'.$row->user_id),
                        'email' => $user->email ?? null,
                        'photo' => optional($user->profile)->foto,
                        'total' => (int) $row->total,
                        'previous' => $prev,
                        'delta' => $delta,
                    ];
                });
            } catch (Exception $e) {
                return collect();
            }
        });

        // Top 5 aktivitas dengan rating tertinggi
        $topRatedActivities = Cache::remember('dashboard_top_rated_activities', 3600, function () use ($activityQuery) {
            try {
                // Optimize: Use withAvg to calculate rating in DB query
                $activities = $activityQuery->clone()
                    ->select('id', 'name')
                    ->withCount(['participants' => function ($q) {
                        $q->where('status', true);
                    }])
                    ->withAvg(['allComments as average_rating' => function ($q) {
                        $q->whereNull('parent_id')->whereNotNull('rating');
                    }], 'rating')
                    ->orderByDesc('average_rating')
                    ->take(5)
                    ->get();

                return $activities->map(function ($act) {
                    return [
                        'name' => $act->name,
                        'rating' => $act->average_rating ? round((float) $act->average_rating, 1) : 0.0,
                    ];
                });
            } catch (Exception $e) {
                return collect();
            }
        });

        // Top 5 user teraktif harian (berdasarkan page views jika tersedia, fallback ke pendaftaran hari ini)
        $topDailyActiveUsers = Cache::remember('dashboard_top_daily_active_users', 600, function () use ($viewsExist) {
            try {
                $rows = collect();
                if ($viewsExist) {
                    $rows = DB::table('views')
                        ->select('user_id', DB::raw('COUNT(*) as total'))
                        ->whereDate('created_at', now()->toDateString())
                        ->whereNotNull('user_id')
                        ->groupBy('user_id')
                        ->orderByDesc('total')
                        ->take(10)
                        ->get();
                } else {
                    $tableName = Schema::hasTable('activity_users') ? 'activity_users' : 'activity_users';
                    $rows = DB::table($tableName)
                        ->select('user_id', DB::raw('COUNT(*) as total'))
                        ->whereDate('created_at', now()->toDateString())
                        ->groupBy('user_id')
                        ->orderByDesc('total')
                        ->take(10)
                        ->get();
                }

                if ($rows->isEmpty()) {
                    return collect();
                }

                $userMap = User::whereIn('id', $rows->pluck('user_id'))->with('profile')->get()->keyBy('id');

                return $rows->map(function ($row) use ($userMap) {
                    $u = $userMap->get($row->user_id);

                    return [
                        'name' => $u->name ?? ('User #'.$row->user_id),
                        'photo' => optional($u->profile)->foto,
                        'total' => (int) $row->total,
                    ];
                });
            } catch (Exception $e) {
                return collect();
            }
        });

        // Top 10 creator terbaik berdasarkan peserta aktif (prioritas) dan jumlah aktivitas
        // Sertakan sparkline tren 6 minggu terakhir
        $topCreators = Cache::remember('dashboard_top_creators', 600, function () {
            try {
                $tableName = Schema::hasTable('activity_users') ? 'activity_users' : 'activity_users';

                // Rangking awal: peserta aktif per creator
                $rankByParticipants = DB::table($tableName)
                    ->join('activities', 'activities.id', '=', $tableName.'.activity_id')
                    ->select('activities.user_id', DB::raw('COUNT(*) as active_participants'))
                    ->where($tableName.'.status', ActivityUser::STATUS_ACTIVE)
                    ->groupBy('activities.user_id')
                    ->orderByDesc('active_participants')
                    ->take(10)
                    ->get();

                if ($rankByParticipants->isEmpty()) {
                    return collect();
                }

                $creatorIds = $rankByParticipants->pluck('user_id');

                $creatorMap = User::whereIn('id', $creatorIds)
                    ->with('profile.province')
                    ->get()
                    ->keyBy('id');

                // Pre-fetch sparkline data for all top creators
                // Optimize: Single query instead of 60 queries (10 creators * 6 weeks)
                $sparklineStart = now()->subWeeks(6)->startOfWeek();
                $sparklineData = DB::table($tableName)
                    ->join('activities', 'activities.id', '=', $tableName.'.activity_id')
                    ->select(
                        'activities.user_id',
                        DB::raw('YEARWEEK('.$tableName.'.created_at, 3) as yearweek'),
                        DB::raw('COUNT(*) as count')
                    )
                    ->whereIn('activities.user_id', $creatorIds)
                    ->where($tableName.'.status', ActivityUser::STATUS_ACTIVE)
                    ->where($tableName.'.created_at', '>=', $sparklineStart)
                    ->groupBy('activities.user_id', 'yearweek')
                    ->get()
                    ->groupBy('user_id'); // Group by user_id for easy access

                // Pre-fetch total activities counts
                $activitiesCounts = Activity::whereIn('user_id', $creatorIds)
                    ->select('user_id', DB::raw('COUNT(*) as total'))
                    ->groupBy('user_id')
                    ->pluck('total', 'user_id');

                // Pre-fetch active activities counts
                $activeActivitiesCounts = Activity::whereIn('user_id', $creatorIds)
                    ->whereNotNull('date')
                    ->whereDate('date', '>=', now()->toDateString())
                    ->select('user_id', DB::raw('COUNT(*) as total'))
                    ->groupBy('user_id')
                    ->pluck('total', 'user_id');

                // Pre-fetch total participants counts
                $totalParticipantsCounts = DB::table($tableName)
                    ->join('activities', 'activities.id', '=', $tableName.'.activity_id')
                    ->whereIn('activities.user_id', $creatorIds)
                    ->select('activities.user_id', DB::raw('COUNT(*) as total'))
                    ->groupBy('activities.user_id')
                    ->pluck('total', 'user_id');

                return $rankByParticipants->map(function ($row) use ($creatorMap, $sparklineData, $activitiesCounts, $activeActivitiesCounts, $totalParticipantsCounts) {
                    $u = $creatorMap->get($row->user_id);
                    $name = $u->name ?? ('User #'.$row->user_id);
                    $photo = optional($u->profile)->foto;
                    $provinceName = null;
                    try {
                        if (optional($u->profile)->province) {
                            $provinceName = $u->profile->province->name;
                        }
                    } catch (Exception $e) {
                        $provinceName = null;
                    }

                    // Activities stats
                    $activitiesAll = $activitiesCounts[$row->user_id] ?? 0;
                    $activitiesActive = $activeActivitiesCounts[$row->user_id] ?? 0;

                    // Participants stats
                    $totalParticipants = $totalParticipantsCounts[$row->user_id] ?? 0;
                    $activeParticipants = (int) $row->active_participants;

                    // Sparkline: peserta aktif per minggu (6 minggu terakhir)
                    $spark = [];
                    $userSparkData = $sparklineData->get($row->user_id, collect())->pluck('count', 'yearweek');

                    for ($w = 5; $w >= 0; $w--) {
                        $checkDate = now()->subWeeks($w);
                        // Use ISO-8601 year and week number to match MySQL YEARWEEK(date, 3)
                        $key = $checkDate->format('oW');
                        $count = $userSparkData[$key] ?? 0;
                        $spark[] = (int) $count;
                    }

                    // Skor gabungan (prioritas peserta aktif, lalu jumlah aktivitas aktif)
                    $score = ($activeParticipants * 1000) + $activitiesActive;

                    return [
                        'id' => $row->user_id,
                        'name' => $name,
                        'photo' => $photo,
                        'province' => $provinceName,
                        'activities_all' => (int) $activitiesAll,
                        'activities_active' => (int) $activitiesActive,
                        'participants_total' => (int) $totalParticipants,
                        'participants_active' => (int) $activeParticipants,
                        'spark' => $spark,
                        'score' => $score,
                    ];
                })->sortByDesc('score')->values();
            } catch (Exception $e) {
                return collect();
            }
        });

        // Gender chart data - Cached and Optimized
        $profileStatsKey = 'dashboard_profile_stats_v2_'.md5(json_encode([
            'act' => $selectedActivity,
            'prov' => $selectedProvince,
        ]));

        $profileStats = Cache::remember($profileStatsKey, 3600, function () use ($userQuery) {
            $genderKeySql = "CASE
                WHEN profiles.jenis_kelamin IS NULL OR TRIM(profiles.jenis_kelamin) = '' OR TRIM(profiles.jenis_kelamin) = '-' THEN 'Tidak Disebutkan'
                WHEN LOWER(REPLACE(REPLACE(TRIM(profiles.jenis_kelamin), ' ', ''), '-', '')) IN ('l','lakilaki','pria','male','m') THEN 'L'
                WHEN LOWER(REPLACE(REPLACE(TRIM(profiles.jenis_kelamin), ' ', ''), '-', '')) IN ('p','perempuan','wanita','female','f') THEN 'P'
                ELSE 'Tidak Disebutkan'
            END";

            $genderStats = Profile::selectRaw("$genderKeySql as gender_key, COUNT(profiles.id) as total")
                ->whereIn('user_id', $userQuery->clone()->select('id'))
                ->groupBy('gender_key')
                ->get();

            $genderCounts = $genderStats->pluck('total', 'gender_key')->toArray();
            $genderLabels = [];
            $genderData = [];
            foreach (['L', 'P', 'Tidak Disebutkan'] as $key) {
                $count = (int) ($genderCounts[$key] ?? 0);
                if ($count > 0) {
                    $genderLabels[] = $key;
                    $genderData[] = $count;
                }
            }

            // Top provinces chart - Optimized
            $regionQuery = Profile::join('provinces', 'profiles.province_id', '=', 'provinces.id')
                ->select('provinces.id', 'provinces.name', DB::raw('COUNT(profiles.id) as total'))
                ->groupBy('provinces.id', 'provinces.name')
                ->orderByDesc('total')
                ->limit(15);

            $regionQuery->whereIn('user_id', $userQuery->clone()->select('id'));
            $regionStats = $regionQuery->get();

            // Get top 5 occupations - Optimized
            $occupationStatsQuery = DB::table('profiles')
                ->select('pekerjaan', DB::raw('COUNT(id) as total'))
                ->whereIn('user_id', $userQuery->clone()->select('id'))
                ->whereNotNull('pekerjaan')
                ->where('pekerjaan', '!=', '')
                ->groupBy('pekerjaan')
                ->orderByDesc('total')
                ->limit(5);

            $occupationStats = $occupationStatsQuery->get();

            $occupationLabels = [];
            $occupationData = [];
            if ($occupationStats->count() > 0) {
                $occupationLabels = $occupationStats->pluck('pekerjaan')->toArray();
                $occupationData = $occupationStats->pluck('total')->toArray();
            } else {
                $occupationLabels = ['No Data'];
                $occupationData = [0];
            }

            return [
                'gender' => [
                    'labels' => $genderLabels,
                    'data' => $genderData,
                ],
                'occupation' => [
                    'labels' => $occupationLabels,
                    'data' => $occupationData,
                ],
                'region' => [
                    'ids' => $regionStats->pluck('id')->toArray(),
                    'labels' => $regionStats->pluck('name')->toArray(),
                    'data' => $regionStats->pluck('total')->toArray(),
                ],
            ];
        });

        // Get all provinces for dropdown filter (cached separately at top)
        $allProvinces = $provinces; // Already fetched at top

        // Tambahkan info pengguna yang punya profile
        // This is fast enough but let's cache it too or just calculate
        // It depends on $userQuery which is dynamic.
        // We can just calculate it here as count() is relatively fast compared to heavy joins
        // But better to cache if possible.
        // Actually, $stats['totalUsers'] is already cached in $dashboardData.
        // But $usersWithProfile depends on filters.
        $usersWithProfile = Cache::remember('dashboard_users_with_profile_'.md5(json_encode(['act' => $selectedActivity, 'prov' => $selectedProvince])), 3600, function () use ($userQuery) {
            return $userQuery->clone()->has('profile')->count();
        });
        $usersWithoutProfile = max(0, $stats['totalUsers'] - $usersWithProfile);

        // Payment Status Chart Data
        $paymentStatusData = [
            'labels' => ['Pending', 'Verified', 'Rejected'],
            'data' => [
                $stats['pendingPayment'],
                $stats['verifiedPayment'],
                $stats['rejectedPayment'],
            ],
        ];

        // Attendance Type Chart Data
        $attendanceTypeData = Cache::remember('dashboard_attendance_type_data', 3600, function () use ($attendancesExist) {
            $data = [
                'labels' => [],
                'data' => [],
            ];
            if ($attendancesExist) {
                try {
                    $attendanceTypes = Attendance::select('jenis_absen', DB::raw('COUNT(*) as total'))
                        ->groupBy('jenis_absen')
                        ->get();
                    $data['labels'] = $attendanceTypes->pluck('jenis_absen')->toArray();
                    $data['data'] = $attendanceTypes->pluck('total')->toArray();
                } catch (Exception $e) {
                    $data = ['labels' => ['No Data'], 'data' => [0]];
                }
            }

            return $data;
        });

        return Inertia::render('Dashboard/Index', compact(
            'stats',
            'activityData',
            'activityTrend',
            'userVisitTrend',
            'trendDual',
            'newsPerformance',
            'demographics',
            'globalDistribution',
            'categoryData',
            'statusData',
            'recentActivities',
            'participationData',
            'profileStats',
            'usersWithProfile',
            'usersWithoutProfile',
            'activities',
            'selectedActivity',
            'provinces',
            'selectedProvince',
            'paymentStatusData',
            'attendanceTypeData',
            'subscriptionStats',
            'subscriptionByPlan',
            'topActiveUsers',
            'topRatedActivities',
            'topDailyActiveUsers',
            'topCreators',
            'startDateStr',
            'endDateStr'
        ));
    }

    /**
     * Dashboard khusus untuk Creator
     * Menampilkan statistik dari aktivitas yang dibuat oleh creator
     */
    public function creatorDashboard(Request $request)
    {
        $userId = auth()->id();
        $cacheKey = 'creator_dashboard_data_'.$userId;

        $data = Cache::remember($cacheKey, 600, function () use ($userId) {
            // Helper for subquery to avoid loading IDs into memory
            $myActivityIdsSubQuery = function ($query) use ($userId) {
                $query->select('id')->from('activities')->where('user_id', $userId);
            };

            // Combined participant stats
            $participantStats = ActivityUser::whereIn('activity_id', $myActivityIdsSubQuery)
                ->selectRaw('COUNT(*) as total, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as active', [ActivityUser::STATUS_ACTIVE])
                ->first();

            // Combined payment stats
            $paymentStats = Payment::whereIn('activity_id', $myActivityIdsSubQuery)
                ->where('status', 'success')
                ->selectRaw('COUNT(*) as count, SUM(amount) as total')
                ->first();

            $creatorStats = [
                'totalActivities' => Activity::where('user_id', $userId)->count(),
                'activityGrowth' => 0,
                'activeParticipants' => (int) ($participantStats->active ?? 0),
                'totalParticipants' => (int) ($participantStats->total ?? 0),
                'approvedPayments' => (int) ($paymentStats->count ?? 0),
                'totalPaymentAmount' => (float) ($paymentStats->total ?? 0),
            ];

            // Get upcoming activities
            $upcomingActivities = Activity::where('user_id', $userId)
                ->whereNotNull('date')
                ->whereDate('date', '>=', now())
                ->orderBy('date')
                ->take(5)
                ->with('category')
                ->get();

            // Get top activities by active participants
            $topActivities = Activity::where('user_id', $userId)
                ->withCount(['participants' => function ($q) {
                    $q->where('status', ActivityUser::STATUS_ACTIVE);
                }])
                ->orderByDesc('participants_count')
                ->take(5)
                ->with('category')
                ->get();

            // Monthly data (last 6 months)
            $monthlyLabels = [];
            $monthlyActivities = [];
            $monthlyParticipants = [];

            // Optimize loop queries with grouping
            $startOfPeriod = now()->subMonths(5)->startOfMonth();

            $actCounts = Activity::where('user_id', $userId)
                ->where('created_at', '>=', $startOfPeriod)
                ->selectRaw('YEAR(created_at) as y, MONTH(created_at) as m, COUNT(*) as total')
                ->groupBy('y', 'm')
                ->get()
                ->mapWithKeys(function ($item) {
                    return [$item->y.'-'.$item->m => $item->total];
                });

            $partCounts = ActivityUser::whereIn('activity_id', $myActivityIdsSubQuery)
                ->where('created_at', '>=', $startOfPeriod)
                ->selectRaw('YEAR(created_at) as y, MONTH(created_at) as m, COUNT(*) as total')
                ->groupBy('y', 'm')
                ->get()
                ->mapWithKeys(function ($item) {
                    return [$item->y.'-'.$item->m => $item->total];
                });

            for ($i = 5; $i >= 0; $i--) {
                $date = now()->subMonths($i);
                $key = $date->year.'-'.$date->month;

                $monthlyLabels[] = $date->translatedFormat('M Y');
                $monthlyActivities[] = $actCounts[$key] ?? 0;
                $monthlyParticipants[] = $partCounts[$key] ?? 0;
            }

            return [
                'stats' => $creatorStats,
                'monthlyLabels' => $monthlyLabels,
                'monthlyActivities' => $monthlyActivities,
                'monthlyParticipants' => $monthlyParticipants,
                'upcomingActivities' => $upcomingActivities,
                'topActivities' => $topActivities,
            ];
        });

        return Inertia::render('Dashboard/Creator', $data);
    }

    /**
     * Dashboard khusus untuk User biasa
     */
    public function userDashboard(Request $request)
    {
        $user = auth()->user();
        $userId = $user->id;

        // Cache stats calculation
        $stats = Cache::remember('user_dashboard_stats_'.$userId, 600, function () use ($userId) {
            $query = ActivityUser::where('user_id', $userId);

            // Single query for all stats
            $statsRaw = $query->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as verification,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as rejected
            ', [
                ActivityUser::STATUS_ACTIVE,
                ActivityUser::STATUS_VERIFICATION,
                ActivityUser::STATUS_REJECTED,
            ])->first();

            return [
                'totalActivitiesJoined' => (int) ($statsRaw->total ?? 0),
                'active' => (int) ($statsRaw->active ?? 0),
                'verification' => (int) ($statsRaw->verification ?? 0),
                'rejected' => (int) ($statsRaw->rejected ?? 0),
            ];
        });

        // Daftar pendaftaran kegiatan per batch (tampil terpisah jika batch berbeda)
        // Limit to 50 latest activities to prevent overload
        $joinedActivityUsers = Cache::remember('user_dashboard_activities_'.$userId, 600, function () use ($userId) {
            $results = ActivityUser::where('user_id', $userId)
                ->with(['activity' => function ($query) {
                    $query->select('id', 'name', 'category_id', 'date', 'start_time', 'end_time', 'location', 'image', 'status')
                        ->with('category:id,name')
                        ->withCount('batches');
                }, 'batch:id,name,start_date,end_date,start_time,end_time'])
                ->orderBy('created_at', 'desc')
                ->limit(50)
                ->get();

            $results->transform(function ($item) {
                if ($item->activity) {
                    $item->activity->image = ImageHelper::getImageUrl($item->activity->image, asset('assets/images/hero/defoult.webp'), 'activities');
                }

                return $item;
            });

            return $results;
        });

        // Status langganan (cache 5 menit agar tidak query tiap buka dashboard)
        $subscription = Cache::remember('user_dashboard_subscription_'.$userId, 300, function () use ($user) {
            return $user->activeSubscription ?? $user->subscriptions()->latest()->first();
        });

        return Inertia::render('Dashboard/User', [
            'stats' => $stats,
            'joinedActivityUsers' => $joinedActivityUsers,
            'subscription' => $subscription,
        ]);
    }

    public function getUsersByProvince(Request $request)
    {
        $data = DB::table('profiles')
            ->join('provinces', 'profiles.province_id', '=', 'provinces.id')
            ->select('provinces.name', 'provinces.id', DB::raw('count(*) as total'))
            ->groupBy('provinces.id', 'provinces.name')
            ->orderByDesc('total')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'labels' => $data->pluck('name'),
                'data' => $data->pluck('total'),
                'ids' => $data->pluck('id'),
            ],
        ]);
    }

    public function getUsersByRegency(Request $request)
    {
        $data = DB::table('profiles')
            ->join('regencies', 'profiles.regency_id', '=', 'regencies.id')
            ->select('regencies.name', 'regencies.id', DB::raw('count(*) as total'))
            ->groupBy('regencies.id', 'regencies.name')
            ->orderByDesc('total')
            ->take(15)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'labels' => $data->pluck('name'),
                'data' => $data->pluck('total'),
                'ids' => $data->pluck('id'),
            ],
        ]);
    }

    public function getUsersByDistrict(Request $request)
    {
        $data = DB::table('profiles')
            ->join('districts', 'profiles.district_id', '=', 'districts.id')
            ->select('districts.name', 'districts.id', DB::raw('count(*) as total'))
            ->groupBy('districts.id', 'districts.name')
            ->orderByDesc('total')
            ->take(15)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'labels' => $data->pluck('name'),
                'data' => $data->pluck('total'),
                'ids' => $data->pluck('id'),
            ],
        ]);
    }

    public function getUsersByProvinceDetail($id)
    {
        $data = DB::table('profiles')
            ->join('regencies', 'profiles.regency_id', '=', 'regencies.id')
            ->where('profiles.province_id', $id)
            ->select('regencies.name', 'regencies.id', DB::raw('count(*) as total'))
            ->groupBy('regencies.id', 'regencies.name')
            ->orderByDesc('total')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'labels' => $data->pluck('name'),
                'data' => $data->pluck('total'),
                'ids' => $data->pluck('id'),
            ],
        ]);
    }

    public function getUsersByRegencyDetail($id)
    {
        $data = DB::table('profiles')
            ->join('districts', 'profiles.district_id', '=', 'districts.id')
            ->where('profiles.regency_id', $id)
            ->select('districts.name', 'districts.id', DB::raw('count(*) as total'))
            ->groupBy('districts.id', 'districts.name')
            ->orderByDesc('total')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'labels' => $data->pluck('name'),
                'data' => $data->pluck('total'),
                'ids' => $data->pluck('id'),
            ],
        ]);
    }

    public function getUserVisitTrend(Request $request)
    {
        $year = $request->input('year', date('Y'));
        $month = $request->input('month');
        $week = $request->input('week'); // Week of month (1-5)
        $day = $request->input('day');

        $cacheKey = 'api_user_visit_trend_'.md5(json_encode($request->all()));

        $result = Cache::remember($cacheKey, 3600, function () use ($year, $month, $week, $day) {
            $labels = [];
            $data = [];
            $viewsExist = Schema::hasTable('views');

            if ($day && $month) {
                // CASE 1: Hourly trend for a specific day
                $queryData = [];
                if ($viewsExist) {
                    $queryData = DB::table('views')
                        ->select(DB::raw('HOUR(created_at) as h'), DB::raw('COUNT(DISTINCT user_id) as count'))
                        ->whereYear('created_at', $year)
                        ->whereMonth('created_at', $month)
                        ->whereDay('created_at', $day)
                        ->whereNotNull('user_id')
                        ->groupBy('h')
                        ->pluck('count', 'h')
                        ->toArray();
                }

                for ($h = 0; $h < 24; $h++) {
                    $labels[] = sprintf('%02d:00', $h);
                    $data[] = (int) ($queryData[$h] ?? 0);
                }
            } elseif ($week && $month) {
                // CASE 2: Daily trend for a specific week
                $date = Carbon::createFromDate($year, $month, 1);
                $startDay = ($week - 1) * 7 + 1;
                $endDay = min($startDay + 6, $date->daysInMonth);

                $queryData = [];
                if ($viewsExist) {
                    $queryData = DB::table('views')
                        ->select(DB::raw('DAY(created_at) as d'), DB::raw('COUNT(DISTINCT user_id) as count'))
                        ->whereYear('created_at', $year)
                        ->whereMonth('created_at', $month)
                        ->whereDay('created_at', '>=', $startDay)
                        ->whereDay('created_at', '<=', $endDay)
                        ->whereNotNull('user_id')
                        ->groupBy('d')
                        ->pluck('count', 'd')
                        ->toArray();
                } else {
                    $queryData = User::select(DB::raw('DAY(last_login_at) as d'), DB::raw('COUNT(*) as count'))
                        ->whereYear('last_login_at', $year)
                        ->whereMonth('last_login_at', $month)
                        ->whereDay('last_login_at', '>=', $startDay)
                        ->whereDay('last_login_at', '<=', $endDay)
                        ->groupBy('d')
                        ->pluck('count', 'd')
                        ->toArray();
                }

                for ($d = $startDay; $d <= $endDay; $d++) {
                    $labels[] = (string) $d.' '.substr($date->format('F'), 0, 3);
                    $data[] = (int) ($queryData[$d] ?? 0);
                }

            } elseif ($month) {
                // CASE 3: Daily trend for a specific month
                $daysInMonth = Carbon::createFromDate($year, $month, 1)->daysInMonth;

                $queryData = [];
                if ($viewsExist) {
                    $queryData = DB::table('views')
                        ->select(DB::raw('DAY(created_at) as d'), DB::raw('COUNT(DISTINCT user_id) as count'))
                        ->whereYear('created_at', $year)
                        ->whereMonth('created_at', $month)
                        ->whereNotNull('user_id')
                        ->groupBy('d')
                        ->pluck('count', 'd')
                        ->toArray();
                } else {
                    $queryData = User::select(DB::raw('DAY(last_login_at) as d'), DB::raw('COUNT(*) as count'))
                        ->whereYear('last_login_at', $year)
                        ->whereMonth('last_login_at', $month)
                        ->groupBy('d')
                        ->pluck('count', 'd')
                        ->toArray();
                }

                for ($d = 1; $d <= $daysInMonth; $d++) {
                    $labels[] = (string) $d;
                    $data[] = (int) ($queryData[$d] ?? 0);
                }
            } else {
                // CASE 4: Monthly trend for a specific year
                $months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

                $queryData = [];
                if ($viewsExist) {
                    $queryData = DB::table('views')
                        ->select(DB::raw('MONTH(created_at) as m'), DB::raw('COUNT(DISTINCT user_id) as count'))
                        ->whereYear('created_at', $year)
                        ->whereNotNull('user_id')
                        ->groupBy('m')
                        ->pluck('count', 'm')
                        ->toArray();
                } else {
                    $queryData = User::select(DB::raw('MONTH(last_login_at) as m'), DB::raw('COUNT(*) as count'))
                        ->whereYear('last_login_at', $year)
                        ->groupBy('m')
                        ->pluck('count', 'm')
                        ->toArray();
                }

                foreach ($months as $index => $mLabel) {
                    $mNum = $index + 1;
                    $labels[] = $mLabel;
                    $data[] = (int) ($queryData[$mNum] ?? 0);
                }
            }

            return [
                'labels' => $labels,
                'data' => $data,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $result,
        ]);
    }
}
