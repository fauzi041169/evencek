<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ActivityUser;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics for a specific activity
     */
    public function activityDashboard($activityId)
    {
        $activity = Activity::findOrFail($activityId);
        $user = Auth::user();

        // Check if user has access to this activity
        if (! $user->isAdmin() && ! $user->isSuperAdmin() && $activity->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $tableName = Schema::hasTable('activity_users') ? 'activity_users' : 'activity_users';
        $activityUsersHasDeletedAt = Schema::hasColumn($tableName, 'deleted_at');
        $activityUsersBaseQuery = DB::table($tableName.' as au')
            ->join('users as u', 'u.id', '=', 'au.user_id')
            ->where('au.activity_id', $activityId);
        if ($activityUsersHasDeletedAt) {
            $activityUsersBaseQuery->whereNull('au.deleted_at');
        }

        // Total peserta
        $totalPeserta = (clone $activityUsersBaseQuery)
            ->where('au.status', 1)
            ->distinct()
            ->count('au.user_id');

        $pesertaAktif = (clone $activityUsersBaseQuery)
            ->where('au.status', 1)
            ->distinct()
            ->count('au.user_id');

        $pesertaPending = (clone $activityUsersBaseQuery)
            ->where('au.status', 0)
            ->distinct()
            ->count('au.user_id');

        // Statistik absensi
        $pesertaHadir = 0;
        $recordUserIds = [];

        if (Schema::hasTable('activity_records')) {
            $recordUserIds = DB::table('activity_records')
                ->where('activity_id', $activityId)
                ->where('status', 1)
                ->distinct('user_id')
                ->pluck('user_id')
                ->toArray();
        }

        // Include users who have accessed the system (implicit attendance)
        $accessUserIds = [];
        if (Schema::hasColumn($tableName, 'jumlah_akses')) {
            $accessUserIds = DB::table($tableName)
                ->where('activity_id', $activityId)
                ->where('jumlah_akses', '>', 0)
                ->pluck('user_id')
                ->toArray();
        }

        // Combine both sources
        $pesertaHadir = count(array_unique(array_merge($recordUserIds, $accessUserIds)));

        $persentaseKehadiran = $totalPeserta > 0 ? round(($pesertaHadir / $totalPeserta) * 100, 1) : 0;

        // Total tugas
        $totalTugas = 0;
        $tugasSelesai = 0;
        if (Schema::hasTable('activity_division_requirements')) {
            $totalTugas = DB::table('activity_division_requirements')
                ->join('activity_divisions', 'activity_division_requirements.activity_division_id', '=', 'activity_divisions.id')
                ->where('activity_divisions.activity_id', $activityId)
                ->count();

            $tugasSelesai = DB::table('activity_division_requirements')
                ->join('activity_divisions', 'activity_division_requirements.activity_division_id', '=', 'activity_divisions.id')
                ->where('activity_divisions.activity_id', $activityId)
                ->where('activity_division_requirements.status', 'completed')
                ->count();
        }

        $persentaseTugasSelesai = $totalTugas > 0 ? round(($tugasSelesai / $totalTugas) * 100, 1) : 0;

        // Total panitia
        $totalPanitia = 0;
        $committeeStats = [];

        if (Schema::hasTable('activity_committee_structures')) {
            $totalPanitia = DB::table('activity_committee_structures')
                ->where('activity_id', $activityId)
                ->count();

            // Committee Stats (Best PIC & Action Graphs)
            $committees = \App\Models\ActivityCommitteeStructure::where('activity_id', $activityId)
                ->with(['user'])
                ->get();

            $userIds = $committees->pluck('user_id')->filter()->unique();

            // Count registrations by user (created_by), fallback to payment sender_name
            $registrations = [];
            if (Schema::hasColumn($tableName, 'created_by')) {
                $registrations = DB::table($tableName)
                    ->where('activity_id', $activityId)
                    ->whereIn('created_by', $userIds)
                    ->select('created_by', DB::raw('count(*) as total'))
                    ->groupBy('created_by')
                    ->pluck('total', 'created_by')
                    ->toArray();
            }

            // Count registrations by payment sender_name
            $paymentCounts = [];
            if (Schema::hasTable('payments') && Schema::hasColumn('payments', 'sender_name')) {
                $committeeNames = $committees->map(function ($member) {
                    return strtolower(trim((string) ($member->user ? $member->user->name : $member->name)));
                })->filter()->unique()->values();

                $paymentCounts = DB::table('payments')
                    ->where('activity_id', $activityId)
                    ->where('status', 'success')
                    ->whereIn(DB::raw('LOWER(sender_name)'), $committeeNames)
                    ->select(DB::raw('LOWER(sender_name) as name'), DB::raw('count(*) as total'))
                    ->groupBy(DB::raw('LOWER(sender_name)'))
                    ->pluck('total', 'name')
                    ->toArray();
            }

            // Count validations by user (updated_by), fallback: payments approved verified_by
            $validations = [];
            if (Schema::hasColumn($tableName, 'updated_by')) {
                $validations = DB::table($tableName)
                    ->where('activity_id', $activityId)
                    ->whereIn('updated_by', $userIds)
                    ->where('status', 1) // Only count successful validations
                    ->select('updated_by', DB::raw('count(*) as total'))
                    ->groupBy('updated_by')
                    ->pluck('total', 'updated_by')
                    ->toArray();
            }
            // Fallback validations via payments.verified_by (approved)
            if (Schema::hasTable('payments') && Schema::hasColumn('payments', 'verified_by')) {
                $paymentsApprovedBy = DB::table('payments')
                    ->where('activity_id', $activityId)
                    ->where('status', 'approved')
                    ->whereIn('verified_by', $userIds)
                    ->select('verified_by', DB::raw('count(*) as total'))
                    ->groupBy('verified_by')
                    ->pluck('total', 'verified_by')
                    ->toArray();
                foreach ($paymentsApprovedBy as $uid => $cnt) {
                    $validations[$uid] = ($validations[$uid] ?? 0) + (int) $cnt;
                }
            }

            // Map to committee members
            $committeeStats = $committees->map(function ($member) use ($registrations, $validations, $paymentCounts) {
                $userId = $member->user_id;
                $name = $member->user ? $member->user->name : $member->name;
                $normalizedName = strtolower(trim((string) $name));

                $regCount = (int) ($registrations[$userId] ?? 0);
                $payCount = (int) ($paymentCounts[$normalizedName] ?? 0);
                $totalReg = $regCount + $payCount;
                $valCount = (int) ($validations[$userId] ?? 0);
                $aksesCount = $member->lama_akses ?? 0; // Menggunakan lama_akses sebagai nilai AKSES

                // Poin tertimbang: 50% validasi, 30% pendaftaran, 20% akses (tampil sebagai poin)
                $weightedPoin = (int) round(
                    ($valCount * 0.5) +      // 50% validasi
                    ($totalReg * 0.3) +      // 30% pendaftaran
                    ($aksesCount * 0.2)      // 20% akses
                );

                return [
                    'id' => $member->id,
                    'user_id' => $userId,
                    'name' => $name,
                    'position' => $member->position,
                    'registrations' => $totalReg,
                    'validations' => $valCount,
                    'akses' => $aksesCount,
                    'total_actions' => $weightedPoin,
                ];
            })->sortByDesc('total_actions')->values();
        }

        // Trend pendaftaran (30 hari terakhir)
        $registrationTrend = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $count = DB::table($tableName)
                ->where('activity_id', $activityId)
                ->whereDate('created_at', $date->toDateString())
                ->count();

            $registrationTrend[] = [
                'date' => $date->format('Y-m-d'),
                'count' => $count,
            ];
        }

        // Distribusi jenis kelamin
        $genderKeySql = "CASE
            WHEN profiles.jenis_kelamin IS NULL OR TRIM(profiles.jenis_kelamin) = '' OR TRIM(profiles.jenis_kelamin) = '-' THEN 'Tidak Disebutkan'
            WHEN LOWER(REPLACE(REPLACE(TRIM(profiles.jenis_kelamin), ' ', ''), '-', '')) IN ('l','lakilaki','pria','male','m') THEN 'L'
            WHEN LOWER(REPLACE(REPLACE(TRIM(profiles.jenis_kelamin), ' ', ''), '-', '')) IN ('p','perempuan','wanita','female','f') THEN 'P'
            ELSE 'Tidak Disebutkan'
        END";

        $genderStats = DB::table($tableName)
            ->join('profiles', 'profiles.user_id', '=', $tableName.'.user_id')
            ->selectRaw("$genderKeySql as gender_key, COUNT(*) as total")
            ->where($tableName.'.activity_id', $activityId)
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

        // Status peserta
        $statusPesertaData = [
            'labels' => ['Aktif', 'Pending'],
            'data' => [$pesertaAktif, $pesertaPending],
        ];

        // Statistik per batch
        $batchStats = [];
        if (Schema::hasTable('activity_batches')) {
            $batches = \App\Models\ActivityBatch::where('activity_id', $activityId)->get();
            foreach ($batches as $batch) {
                $count = (clone $activityUsersBaseQuery)
                    ->where('au.activity_batch_id', $batch->id)
                    ->where('au.status', 1)
                    ->distinct()
                    ->count('au.user_id');
                $batchStats[] = [
                    'id' => $batch->id,
                    'name' => $batch->name,
                    'count' => $count,
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'activity' => [
                    'id' => $activity->id,
                    'name' => $activity->name,
                ],
                'statistics' => [
                    'total_peserta' => $totalPeserta,
                    'peserta_aktif' => $pesertaAktif,
                    'peserta_pending' => $pesertaPending,
                    'peserta_hadir' => $pesertaHadir,
                    'persentase_kehadiran' => $persentaseKehadiran,
                    'total_tugas' => $totalTugas,
                    'tugas_selesai' => $tugasSelesai,
                    'persentase_tugas_selesai' => $persentaseTugasSelesai,
                    'total_panitia' => $totalPanitia,
                    'committee_stats' => $committeeStats,
                ],
                'registration_trend' => $registrationTrend,
                'gender_distribution' => [
                    'labels' => $genderLabels,
                    'data' => $genderData,
                ],
                'status_peserta' => $statusPesertaData,
                'batch_stats' => $batchStats,
            ],
        ], 200);
    }

    /**
     * Get user dashboard statistics
     */
    public function userDashboard()
    {
        $user = Auth::user();
        $userId = $user->id;

        $myActivityUsers = ActivityUser::where('user_id', $userId)->get();
        $myActivityIds = $myActivityUsers->pluck('activity_id');

        $stats = [
            'total_activities_joined' => $myActivityUsers->count(),
            'active' => $myActivityUsers->where('status', 1)->count(), // STATUS_ACTIVE
            'verification' => $myActivityUsers->where('status', 0)->count(), // STATUS_VERIFICATION
            'rejected' => $myActivityUsers->where('status', 2)->count(), // STATUS_REJECTED
        ];

        // Aktivitas yang akan datang
        $upcomingActivities = Activity::whereIn('id', $myActivityIds)
            ->whereDate('date', '>=', now()->toDateString())
            ->orderBy('date')
            ->take(5)
            ->get()
            ->map(function ($activity) {
                return [
                    'id' => $activity->id,
                    'name' => $activity->name,
                    'date' => $activity->date,
                    'location' => $activity->location,
                    'image' => $activity->image ? asset('storage/'.$activity->image) : null,
                ];
            });

        // Aktivitas terbaru
        $recentActivities = Activity::whereIn('id', $myActivityIds)
            ->latest()
            ->take(5)
            ->get()
            ->map(function ($activity) {
                return [
                    'id' => $activity->id,
                    'name' => $activity->name,
                    'date' => $activity->date,
                    'location' => $activity->location,
                    'image' => $activity->image ? asset('storage/'.$activity->image) : null,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'stats' => $stats,
                'upcoming_activities' => $upcomingActivities,
                'recent_activities' => $recentActivities,
            ],
        ], 200);
    }
}
