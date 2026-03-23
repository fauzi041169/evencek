<?php

namespace App\Http\Controllers;

use App\Models\ActivityUser;
use Illuminate\Http\Request;

class ActivityScanController extends Controller
{
    public function store(Request $request)
    {
        try {
            // Validasi input
            $validated = $request->validate([
                'user_id' => 'required',
                'activity_id' => 'required',
                'attendance_id' => 'required',
                'status' => 'required',
            ]);

            // Authorization Check
            $activity = \App\Models\Activity::find($request->activity_id);
            if (! $activity) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kegiatan tidak ditemukan',
                ], 404);
            }

            if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && ! $activity->canManageRegistration(auth()->id())) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki izin untuk melakukan scan pada kegiatan ini.',
                ], 403);
            }

            // Ambil data sesi absensi
            $attendanceSession = \App\Models\Attendance::find($request->attendance_id);
            if (! $attendanceSession) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sesi absensi tidak ditemukan',
                ]);
            }

            // Cek apakah user terdaftar di activity
            $query = ActivityUser::where([
                'user_id' => $request->user_id,
                'activity_id' => $request->activity_id,
            ]);

            if ($attendanceSession->activity_batch_id) {
                $query->where('activity_batch_id', $attendanceSession->activity_batch_id);
            }

            $isRegistered = $query->exists();

            if (! $isRegistered) {
                // Cek apakah user terdaftar tapi beda batch
                if ($attendanceSession->activity_batch_id) {
                    $wrongBatch = ActivityUser::where([
                        'user_id' => $request->user_id,
                        'activity_id' => $request->activity_id,
                    ])->exists();

                    if ($wrongBatch) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Peserta terdaftar di batch/sesi yang berbeda',
                        ]);
                    }
                }

                return response()->json([
                    'success' => false,
                    'message' => 'User tidak terdaftar dalam kegiatan ini',
                ]);
            }

            // Simpan attendance
            \App\Models\ActivityRecord::create([
                'user_id' => $request->user_id,
                'activity_id' => $request->activity_id,
                'activity_batch_id' => $attendanceSession->activity_batch_id,
                'attendance_id' => $request->attendance_id,
                'status' => $request->status,
                'record_type' => 'scan',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Absensi berhasil dicatat',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mencatat absensi',
            ], 500);
        }
    }
}
