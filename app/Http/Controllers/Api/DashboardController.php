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

        // Total peserta
        $totalPeserta = DB::table($tableName)
            ->where('activity_id', $activityId)
            ->where('status', 1)
            ->count();

        $pesertaAktif = DB::table($tableName)
            ->where('activity_id', $activityId)
            ->where('status', 1)
            ->count();

        $pesertaPending = DB::table($tableName)
            ->where('activity_id', $activityId)
            ->where('status', 0)
            ->count();

        // Statistik absensi
        $pesertaHadir = 0;
        if (Schema::hasTable('activity_records')) {
            $pesertaHadir = DB::table('activity_records')
                ->where('activity_id', $activityId)
                ->where('status', 1)
                ->distinct('user_id')
                ->count('user_id');
        }

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
            
            // Count registrations by user (created_by)
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
                
            // Count validations by user (updated_by)
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
            
            // Map to committee members
            $committeeStats = $committees->map(function ($member) use ($registrations, $validations) {
                $userId = $member->user_id;
                return [
                    'id' => $member->id,
                    'user_id' => $userId,
                    'name' => $member->user ? $member->user->name : $member->name,
                    'position' => $member->position,
                    'registrations' => $registrations[$userId] ?? 0,
                    'validations' => $validations[$userId] ?? 0,
                    'total_actions' => ($registrations[$userId] ?? 0) + ($validations[$userId] ?? 0),
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
        $genderStats = DB::table($tableName)
            ->join('profiles', 'profiles.user_id', '=', $tableName.'.user_id')
            ->select('profiles.jenis_kelamin', DB::raw('COUNT(*) as total'))
            ->where($tableName.'.activity_id', $activityId)
            ->whereNotNull('profiles.jenis_kelamin')
            ->groupBy('profiles.jenis_kelamin')
            ->get();

        $genderLabels = $genderStats->pluck('jenis_kelamin')->toArray();
        $genderData = $genderStats->pluck('total')->toArray();

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
                $count = DB::table($tableName)
                    ->where('activity_id', $activityId)
                    ->where('activity_batch_id', $batch->id)
                    ->where('status', 1)
                    ->count();
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

