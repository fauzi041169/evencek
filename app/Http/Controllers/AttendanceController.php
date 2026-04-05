<?php

namespace App\Http\Controllers;

use App\Events\NewAttendanceRecorded;
use App\Exports\GenericArrayExport;
use App\Helpers\ImageHelper;
use App\Models\Activity;
use App\Models\ActivityRecord;
use App\Models\ActivityUser;
use App\Models\Attendance;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class AttendanceController extends Controller
{
    private function authorizeActivityAccess($activityId)
    {
        $activity = Activity::findOrFail($activityId);
        $user = auth()->user();
        $isAdmin = $user && ($user->isAdmin() || $user->isSuperAdmin());
        $isOwner = $user && ((int) $activity->user_id === (int) $user->id);
        $isCommittee = $user && $activity->canManageRegistration($user->id);
        if (! ($isAdmin || $isOwner || $isCommittee)) {
            abort(403);
        }

        return $activity;
    }

    private function getBackgrounds()
    {
        $bgJson = Setting::get('attendance_scan_backgrounds');
        $defaultBackgrounds = [
            'assets/images/hero/defoult.webp',
            'assets/images/begron/b1.png',
            'assets/images/begron/b2.png',
            'assets/images/begron/b3.png',
        ];
        $backgroundsRaw = $bgJson ? json_decode($bgJson, true) : $defaultBackgrounds;
        $backgrounds = [];
        foreach ($backgroundsRaw as $bgPath) {
            if (file_exists(public_path($bgPath))) {
                $backgrounds[] = $bgPath;
            }
        }
        if (empty($backgrounds)) {
            $backgrounds = ['assets/images/hero/defoult.webp'];
        }

        return $backgrounds;
    }

    /**
     * Generate custom UID for activity_records
     */
    private function generateCustomUid()
    {
        do {
            $letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            $numbers = '0123456789';

            $randomLetters = '';
            for ($i = 0; $i < 3; $i++) {
                $randomLetters .= $letters[rand(0, strlen($letters) - 1)];
            }

            $randomNumbers = '';
            for ($i = 0; $i < 3; $i++) {
                $randomNumbers .= $numbers[rand(0, strlen($numbers) - 1)];
            }

            $combined = str_split($randomLetters.$randomNumbers);
            shuffle($combined);
            $uid = implode('', $combined);
        } while (ActivityRecord::where('id', $uid)->exists());

        return $uid;
    }

    /**
     * Check if attendance record already exists
     */
    private function isDuplicate($user_id, $activity_id, $attendance_id)
    {
        return ActivityRecord::where('user_id', $user_id)
            ->where('activity_id', $activity_id)
            ->where('attendance_id', $attendance_id)
            ->exists();
    }

    /**
     * Upload background image for scan page and store paths in settings (JSON list).
     */
    public function uploadScanBackground(Request $request)
    {
        $this->validate($request, [
            'background' => 'required|image|mimes:jpg,jpeg,png,webp,gif|max:4096',
        ]);

        $file = $request->file('background');
        $path = ImageHelper::storeCompressedUploadedImage($file, 'attendance-backgrounds', 'public', [
            'max_width' => 2500,
            'max_height' => 2500,
            'quality' => 80,
            'format' => 'webp',
        ]);
        $relativePath = 'storage/'.$path;

        $existingJson = Setting::get('attendance_scan_backgrounds');
        $list = [];
        if ($existingJson) {
            $decoded = json_decode($existingJson, true);
            if (is_array($decoded)) {
                $list = $decoded;
            }
        }
        $list[] = $relativePath;
        Setting::set('attendance_scan_backgrounds', json_encode($list));

        return redirect()->back()->with('success', 'Background berhasil ditambahkan');
    }

    /**
     * Delete background image from settings and filesystem (except defaults).
     */
    public function deleteScanBackground(Request $request)
    {
        $path = $request->input('path');
        if (! $path) {
            return redirect()->back()->with('error', 'Path background tidak ditemukan');
        }

        $defaults = [
            'assets/images/hero/defoult.webp',
            'assets/images/begron/b1.png',
            'assets/images/begron/b2.png',
            'assets/images/begron/b3.png',
        ];

        $existingJson = Setting::get('attendance_scan_backgrounds');
        $list = [];
        if ($existingJson) {
            $decoded = json_decode($existingJson, true);
            if (is_array($decoded)) {
                $list = $decoded;
            }
        }

        $list = array_values(array_filter($list, function ($p) use ($path) {
            return $p !== $path;
        }));

        if (! in_array($path, $defaults)) {
            if (Str::startsWith($path, 'storage/')) {
                $storagePath = Str::replaceFirst('storage/', '', $path);
                if (Storage::disk('public')->exists($storagePath)) {
                    Storage::disk('public')->delete($storagePath);
                }
            } else {
                $fullPath = public_path($path);
                if (file_exists($fullPath)) {
                    @unlink($fullPath);
                }
            }
        }

        Setting::set('attendance_scan_backgrounds', json_encode($list));

        return redirect()->back()->with('success', 'Background berhasil dihapus');
    }

    /**
     * Record or update attendance
     */
    public function recordAttendance($userId, $activityId, $attendanceId)
    {
        Log::info('Mencoba record attendance dengan data:', [
            'user_id' => $userId,
            'activity_id' => $activityId,
            'attendance_id' => $attendanceId,
        ]);

        try {
            // Coba update jika data sudah ada
            $result = ActivityRecord::updateOrCreate(
                [
                    'user_id' => $userId,
                    'activity_id' => $activityId,
                    'attendance_id' => $attendanceId,
                ],
                [
                    'status' => 1,
                    // 'marked_at' => now(), // ActivityRecord usually uses created_at/updated_at, or check if marked_at exists
                ]
            );

            Log::info('Hasil record attendance:', $result->toArray());

            return $result;

        } catch (\Exception $e) {
            Log::error('Error saat record attendance:', [
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ]);
            throw $e;
        }
    }

    /**
     * Check if user has attended the activity
     */
    public function hasAttended($activityId, $attendanceId, $userId)
    {
        return \App\Models\ActivityRecord::where([
            'activity_id' => $activityId,
            'attendance_id' => $attendanceId,
            'user_id' => $userId,
            'status' => 1,
        ])->exists();
    }

    /**
     * Store a new attendance session
     */
    public function store(Request $request, Activity $activity)
    {
        // Validasi akses
        $this->authorizeActivityAccess($activity->id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'jenis_absen' => 'required|array|min:1',
            'jenis_absen.*' => 'in:Mandiri,Manual,QR Mandiri,QR Manual',
            'description' => 'nullable|string',
            'activity_batch_id' => 'nullable|exists:activity_batches,id',
        ]);

        $attendance = new Attendance;
        $attendance->activity_id = $activity->id;
        $attendance->activity_batch_id = $validated['activity_batch_id'] ?? null;
        $attendance->name = $validated['name'];
        $attendance->jenis_absen = implode(',', $validated['jenis_absen']);
        $attendance->description = $validated['description'] ?? null;
        $attendance->save();

        // Definisikan data yang akan dikirim ke event
        $attendanceData = [
            'name' => $attendance->name,
            'description' => $attendance->description,
            // tambahkan data lain yang diperlukan
        ];

        event(new NewAttendanceRecorded($activity->id, $attendance->id, $attendanceData));

        return redirect()
            ->route('attendance.management', ['activity' => $activity->id])
            ->with('success', 'Sesi absensi berhasil dibuat.');
    }

    /**
     * Show scan page for attendance
     *
     * @param  int  $activity_id
     * @param  int  $attendance_id
     * @return \Illuminate\View\View
     */
    public function scan($activity_id, $attendance_id)
    {
        try {
            $activity = $this->authorizeActivityAccess($activity_id);
            $attendance = Attendance::findOrFail($attendance_id);

            // Ambil daftar peserta dari tabel activity_users
            $query = DB::table('activity_users')
                ->join('users', 'users.id', '=', 'activity_users.user_id')
                ->where('activity_users.activity_id', $activity_id);
            if (Schema::hasColumn('activity_users', 'deleted_at')) {
                $query->whereNull('activity_users.deleted_at');
            }

            // Filter peserta berdasarkan batch jika attendance memiliki batch_id
            if ($attendance->activity_batch_id) {
                $query->where('activity_users.activity_batch_id', $attendance->activity_batch_id);
            }

            $participants = $query->select('users.id', 'users.name')->get();

            $isCommittee = $activity->canManageRegistration(auth()->id());
            $activityData = array_merge($activity->toArray(), [
                'is_committee' => $isCommittee,
                'can_manage_registration' => $isCommittee,
            ]);

            return Inertia::render('Activity/Attendance/Scan', [
                'activity' => $activityData,
                'attendance' => $attendance,
                'activity_id' => $activity_id,
                'attendance_id' => $attendance_id,
                'participants' => $participants,
                'backgrounds' => $this->getBackgrounds(),
            ]);

        } catch (\Exception $e) {
            \Log::error('Error in scan method:', [
                'error' => $e->getMessage(),
                'activity_id' => $activity_id,
                'attendance_id' => $attendance_id,
            ]);

            return redirect()->back()
                ->with('error', 'Terjadi kesalahan saat memuat halaman scan');
        }
    }

    public function showResults(Attendance $attendance)
    {
        $activity = $attendance->activity;
        $this->authorizeActivityAccess($activity->id);

        $attendances = ActivityRecord::where([
            'activity_id' => $activity->id,
            'attendance_id' => $attendance->id,
            'record_type' => 'attendance',
        ])
            ->orderBy('created_at', 'desc')
            ->limit(9)
            ->get();

        $userIds = $attendances->pluck('user_id')->unique()->values();
        $users = User::with('profile')->whereIn('id', $userIds)->get()->keyBy('id');
        $participants = $attendances->map(function ($record) use ($users) {
            $user = $users->get($record->user_id);

            return [
                'id' => $record->id,
                'user_id' => $record->user_id,
                'status' => $record->status,
                'created_at' => $record->created_at,
                'user' => $user ? [
                    'name' => $user->name,
                    'profile' => $user->profile ? [
                        'foto' => $user->profile->foto,
                        'instansi' => $user->profile->instansi,
                    ] : null,
                ] : null,
            ];
        });

        if (request()->ajax() || request()->wantsJson()) {
            return response()->json([
                'attendances' => $participants,
            ]);
        }

        $isCommittee = $activity->canManageRegistration(auth()->id());
        $activityData = array_merge($activity->toArray(), [
            'is_committee' => $isCommittee,
            'can_manage_registration' => $isCommittee,
        ]);

        return Inertia::render('Activity/Attendance/Results', [
            'activity' => $activityData,
            'attendance' => $attendance,
            'participants' => $participants,
        ]);
    }

    public function destroy(Attendance $attendance)
    {
        $this->authorizeActivityAccess($attendance->activity_id);
        try {
            DB::beginTransaction();

            // Hapus records terkait terlebih dahulu
            $attendanceTable = 'activity_records';
            if (Schema::hasTable($attendanceTable)) {
                DB::table($attendanceTable)
                    ->where('attendance_id', $attendance->id)
                    ->delete();
            }

            // Hapus attendance
            $attendance->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Jenis absen berhasil dihapus',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error deleting attendance: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus jenis absen: '.$e->getMessage(),
            ], 500);
        }
    }

    public function updateStatus(Request $request)
    {
        $request->validate([
            'participant_id' => 'required|exists:activity_users,id',
            'attendance_id' => 'required|exists:attendances,id',
        ]);

        try {
            $participant = ActivityUser::find($request->participant_id);

            // Toggle status
            $participant->update([
                'status' => ! $participant->status,
            ]);

            return response()->json([
                'success' => true,
                'status' => $participant->status,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function create(Activity $activity)
    {
        $this->authorizeActivityAccess($activity->id);

        $isCommittee = $activity->canManageRegistration(auth()->id());
        $activityData = array_merge($activity->toArray(), [
            'is_committee' => $isCommittee,
            'can_manage_registration' => $isCommittee,
        ]);

        return Inertia::render('Activity/Attendance/Create', [
            'activity' => $activityData,
            'batches' => $activity->batches,
        ]);
    }

    public function edit(Activity $activity, Attendance $attendance)
    {
        $this->authorizeActivityAccess($activity->id);

        $isCommittee = $activity->canManageRegistration(auth()->id());
        $activityData = array_merge($activity->toArray(), [
            'is_committee' => $isCommittee,
            'can_manage_registration' => $isCommittee,
        ]);

        return Inertia::render('Activity/Attendance/Edit', [
            'activity' => $activityData,
            'attendance' => $attendance,
            'batches' => $activity->batches,
        ]);
    }

    public function update(Request $request, Activity $activity, Attendance $attendance)
    {
        $this->authorizeActivityAccess($activity->id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'jenis_absen' => 'required|array|min:1',
            'jenis_absen.*' => 'in:Mandiri,Manual,QR Mandiri,QR Manual',
            'description' => 'nullable|string',
            'activity_batch_id' => 'nullable|exists:activity_batches,id',
        ]);

        $attendance->activity_batch_id = $validated['activity_batch_id'] ?? null;
        $attendance->name = $validated['name'];
        $attendance->jenis_absen = implode(',', $validated['jenis_absen']);
        $attendance->description = $validated['description'] ?? null;
        $attendance->save();

        return redirect()
            ->route('attendance.management', ['activity' => $activity->id])
            ->with('success', 'Sesi absensi berhasil diperbarui.');
    }

    public function toggleVisibility(Attendance $attendance)
    {
        $this->authorizeActivityAccess($attendance->activity_id);

        $attendance->is_visible = ! $attendance->is_visible;
        $attendance->save();

        return redirect()->back()->with('success', 'Visibilitas absensi berhasil diubah.');
    }

    public function index(Request $request, $activity = null)
    {
        try {
            // Debugging
            \Log::info('Attendance Management Index Called', [
                'activity_param' => $activity,
                'request_activity' => $request->activity,
                'attendance_filter' => $request->query('attendance_filter'),
                'batch_id' => $request->query('batch_id'),
                'status_filter' => $request->query('status_filter'),
            ]);

            // Inisialisasi variabel
            $activities = Activity::all();
            $selectedActivity = null;
            $participants = new LengthAwarePaginator([], 0, 100);
            $attendances = collect();
            $selectedAttendanceId = null;
            $selectedAttendance = null;
            $presentCount = 0;

            // Cek ID aktivitas dari parameter URL atau request
            $activityId = $activity ?? $request->activity;

            if ($activityId) {
                // Ubah query untuk menghindari relasi 'user' yang tidak ada
                $selectedActivity = Activity::with(['participants', 'attendances.batch', 'batches'])->find($activityId);

                if (! $selectedActivity) {
                    abort(404, 'Activity not found');
                }

                if ($selectedActivity) {
                    $actor = auth()->user();
                    $isAdmin = $actor && ($actor->isAdmin() || $actor->isSuperAdmin());
                    $isOwner = $actor && ((int) $selectedActivity->user_id === (int) $actor->id);
                    $isCommittee = $actor && $selectedActivity->canManageRegistration($actor->id);
                    if (! ($isAdmin || $isOwner || $isCommittee)) {
                        abort(403);
                    }
                    $attendances = $selectedActivity->attendances;

                    // Query untuk participants dengan pagination dan filter
                    $query = ActivityUser::where('activity_id', $selectedActivity->id)
                        ->with(['user.profile.province', 'user.profile.regency', 'user.attendanceRecords' => function ($q) use ($selectedActivity) {
                            $q->where('activity_id', $selectedActivity->id)->where('status', 1);
                        }]);

                    // Ambil selectedAttendanceId untuk perhitungan presentCount
                    // HANYA ambil dari URL parameter, TIDAK auto-select
                    // Pastikan selalu null jika tidak ada parameter di URL
                    $selectedAttendanceId = null;
                    $selectedAttendance = null;

                    if ($request->has('attendance_filter') && $request->query('attendance_filter') !== null && $request->query('attendance_filter') !== '') {
                        $attendanceFilterId = $request->query('attendance_filter');

                        // Validasi bahwa attendance ID benar-benar ada di attendances
                        $selectedAttendance = $attendances->where('id', $attendanceFilterId)->first();
                        if ($selectedAttendance) {
                            $selectedAttendanceId = $attendanceFilterId;
                        }
                    }

                    // Filter peserta berdasarkan batch
                    // Priority 1: Jika attendance spesifik dipilih dan memiliki batch, gunakan batch tersebut
                    // Priority 2: Jika filter batch_id ada di request
                    $batchId = $request->query('batch_id');
                    $attendanceBatchId = isset($selectedAttendance) ? $selectedAttendance->activity_batch_id : null;

                    \Log::info('Filtering Participants by Batch', [
                        'attendance_batch_id' => $attendanceBatchId,
                        'request_batch_id' => $batchId,
                        'selected_attendance_id' => $selectedAttendanceId,
                    ]);

                    if ($attendanceBatchId) {
                        $query->where(function ($q) use ($attendanceBatchId) {
                            $q->where('activity_batch_id', $attendanceBatchId)
                                ->orWhereNull('activity_batch_id');
                        });
                    } elseif ($batchId) {
                        $query->where(function ($q) use ($batchId) {
                            $q->where('activity_batch_id', $batchId)
                                ->orWhereNull('activity_batch_id');
                        });
                    }

                    // Filter peserta berdasarkan status kehadiran di jenis absen yang dipilih
                    $attendanceTable = 'activity_records';
                    $attendanceTableExists = Schema::hasTable($attendanceTable);

                    if ($selectedAttendanceId && $attendanceTableExists) {
                        // Ambil parameter status_filter (present, absent, atau null untuk semua)
                        $statusFilter = $request->query('status_filter');

                        if ($statusFilter === 'present') {
                            // Hanya tampilkan peserta yang sudah hadir
                            $presentUserIds = DB::table($attendanceTable)
                                ->where('activity_id', $selectedActivity->id)
                                ->where('attendance_id', $selectedAttendanceId)
                                ->where('status', 1)
                                ->pluck('user_id')
                                ->toArray();

                            if (count($presentUserIds) > 0) {
                                $query->whereIn('user_id', $presentUserIds);
                            } else {
                                // Jika tidak ada yang hadir, return empty result
                                $query->whereRaw('1 = 0');
                            }
                        } elseif ($statusFilter === 'absent') {
                            // Hanya tampilkan peserta yang belum hadir
                            $presentUserIds = DB::table($attendanceTable)
                                ->where('activity_id', $selectedActivity->id)
                                ->where('attendance_id', $selectedAttendanceId)
                                ->where('status', 1)
                                ->pluck('user_id')
                                ->toArray();

                            if (count($presentUserIds) > 0) {
                                $query->whereNotIn('user_id', $presentUserIds);
                            }
                            // Jika tidak ada yang hadir, tampilkan semua (semua belum hadir)
                        }
                        // Jika statusFilter null atau tidak ada, tampilkan semua peserta
                    }

                    // Search filter jika ada
                    $search = $request->query('search');
                    if ($search) {
                        $query->whereHas('user', function ($userQuery) use ($search) {
                            $userQuery->where('name', 'LIKE', "%{$search}%")
                                ->orWhere('id', 'LIKE', "%{$search}%")
                                ->orWhereHas('profile', function ($profileQuery) use ($search) {
                                    $profileQuery->where('instansi', 'LIKE', "%{$search}%")
                                        ->orWhereHas('province', function ($provinceQuery) use ($search) {
                                            $provinceQuery->where('name', 'LIKE', "%{$search}%");
                                        })
                                        ->orWhereHas('regency', function ($regencyQuery) use ($search) {
                                            $regencyQuery->where('name', 'LIKE', "%{$search}%");
                                        });
                                });
                        });
                    }

                    // Pagination dengan per_page dari request atau default 20
                    $perPage = (int) $request->query('per_page', 20);
                    // Validasi per_page untuk mencegah nilai yang tidak valid
                    if (! in_array($perPage, [10, 20, 50, 100, 200, 500])) {
                        $perPage = 20;
                    }

                    // Selalu gunakan pagination, bahkan jika ada search
                    $participants = $query->paginate($perPage);
                    $participants->appends($request->query());

                    // Tambahkan user yang sudah absen tapi tidak terdaftar sebagai peserta
                    // Ini penting untuk menampilkan superadmin atau user lain yang absen tapi tidak terdaftar
                    // Hanya tambahkan jika tidak ada filter status atau filter status adalah "present"
                    $statusFilter = $request->query('status_filter');
                    if ($selectedAttendanceId && $attendanceTableExists && $statusFilter !== 'absent') {
                        // Tentukan batch_id yang digunakan untuk filter
                        $filterBatchId = null;
                        if (isset($selectedAttendance) && $selectedAttendance->activity_batch_id) {
                            $filterBatchId = $selectedAttendance->activity_batch_id;
                        } elseif ($batchId) {
                            $filterBatchId = $batchId;
                        }

                        // Ambil user_id yang sudah absen dari activity_records
                        $attendedUserIdsQuery = DB::table($attendanceTable)
                            ->where('activity_id', $selectedActivity->id)
                            ->where('attendance_id', $selectedAttendanceId)
                            ->where('status', 1);

                        // Filter berdasarkan batch jika ada
                        if ($filterBatchId) {
                            $attendedUserIdsQuery->where('activity_batch_id', $filterBatchId);
                        }

                        $attendedUserIds = $attendedUserIdsQuery->pluck('user_id')->unique()->toArray();

                        // Ambil user_id yang sudah ada di participants
                        $existingParticipantUserIds = $participants->pluck('user_id')->toArray();

                        // Cari user_id yang sudah absen tapi tidak ada di participants
                        $missingUserIds = array_diff($attendedUserIds, $existingParticipantUserIds);

                        if (count($missingUserIds) > 0) {
                            // Ambil data user yang sudah absen tapi tidak terdaftar sebagai peserta
                            $missingUsers = User::whereIn('id', $missingUserIds)
                                ->with(['profile.province', 'profile.regency'])
                                ->get();

                            // Buat objek virtual ActivityUser untuk user yang tidak terdaftar
                            $virtualParticipants = $missingUsers->map(function ($user) use ($selectedActivity, $filterBatchId) {
                                // Buat instance ActivityUser virtual
                                $virtual = new ActivityUser;
                                $virtual->id = 'virtual_'.$user->id;
                                $virtual->user_id = $user->id;
                                $virtual->activity_id = $selectedActivity->id;
                                $virtual->activity_batch_id = $filterBatchId;
                                $virtual->status = ActivityUser::STATUS_ACTIVE;
                                $virtual->setRelation('user', $user);

                                return $virtual;
                            });

                            // Gabungkan dengan participants yang sudah ada
                            if (method_exists($participants, 'getCollection')) {
                                // Jika paginated, gabungkan ke collection
                                $currentCollection = $participants->getCollection();
                                $mergedCollection = $currentCollection->merge($virtualParticipants);
                                $participants->setCollection($mergedCollection);
                            } else {
                                // Jika collection biasa, merge langsung
                                $participants = $participants->merge($virtualParticipants);
                            }
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            \Log::error('Error loading attendance management: '.$e->getMessage(), [
                'activity_id' => $activity ?? null,
            ]);
            $activities = Activity::all();
            $selectedActivity = null;
            $participants = new LengthAwarePaginator([], 0, 100);
            $attendances = collect();
            $selectedAttendanceId = null;
            $selectedAttendance = null;
            $totalParticipantsForStats = 0;
            $attendanceTable = 'activity_records';
            $attendanceTableExists = Schema::hasTable($attendanceTable);
        }

        // Calculate present count for selected attendance
        $presentCount = 0;
        $totalParticipantsForStats = 0;
        if ($selectedActivity) {
            $attendanceTable = 'activity_records';
            $attendanceTableExists = Schema::hasTable($attendanceTable);

            // Hitung total peserta untuk statistik (tanpa filter status)
            $totalParticipantsQuery = ActivityUser::where('activity_id', $selectedActivity->id);

            // Filter berdasarkan batch jika attendance memiliki batch
            if (isset($selectedAttendance) && $selectedAttendance->activity_batch_id) {
                $totalParticipantsQuery->where('activity_batch_id', $selectedAttendance->activity_batch_id);
            }

            $totalParticipantsForStats = $totalParticipantsQuery->count();

            if ($attendanceTableExists) {
                if ($selectedAttendanceId) {
                    $presentCount = DB::table($attendanceTable)
                        ->where('activity_id', $selectedActivity->id)
                        ->where('attendance_id', $selectedAttendanceId)
                        ->where('status', 1)
                        ->count();
                } else {
                    // Semua jenis absen: hitung user unik yang hadir di activity ini
                    $presentCount = DB::table($attendanceTable)
                        ->where('activity_id', $selectedActivity->id)
                        ->where('status', 1)
                        ->distinct('user_id')
                        ->count('user_id');
                }
            }
        }

        $attendanceTable = 'activity_records';
        $attendanceTableExists = Schema::hasTable($attendanceTable);

        if ($selectedAttendanceId && $participants) {
            $participants->getCollection()->transform(function ($participant) use ($selectedAttendanceId) {
                $records = optional($participant->user)->attendanceRecords;
                $participant->attendance_records = $records ? $records->where('attendance_id', $selectedAttendanceId)->values() : collect();

                return $participant;
            });
        }

        $selectedActivityData = $selectedActivity;
        if ($selectedActivity) {
            $isCommittee = $selectedActivity->canManageRegistration(auth()->id());
            $selectedActivityData = array_merge($selectedActivity->toArray(), [
                'is_committee' => $isCommittee,
                'can_manage_registration' => $isCommittee,
            ]);
        }

        return Inertia::render('Activity/Attendance/Management', [
            'selectedActivity' => $selectedActivityData,
            'participants' => $participants,
            'activities' => $activities,
            'attendances' => $attendances,
            'presentCount' => $presentCount,
            'selectedAttendanceId' => $selectedAttendanceId,
            'selectedAttendance' => $selectedAttendance,
            'totalParticipantsForStats' => $totalParticipantsForStats,
        ]);
    }

    public function download(Request $request)
    {
        $activityId = $request->query('activity_id');
        if (! $activityId) {
            abort(400, 'activity_id wajib diisi');
        }
        $activity = $this->authorizeActivityAccess($activityId);

        $attendanceId = $request->query('attendance_id');
        $search = $request->query('search');
        $batchId = $request->query('batch_id');

        $query = ActivityUser::where('activity_id', $activity->id)
            ->with(['user.profile.province', 'user.profile.regency', 'user.attendanceRecords' => function ($q) use ($activity) {
                $q->where('activity_id', $activity->id);
            }]);

        $selectedAttendance = null;
        if ($attendanceId) {
            $selectedAttendance = Attendance::where('id', $attendanceId)
                ->where('activity_id', $activity->id)
                ->first();
        }

        // Apply batch filter
        if ($selectedAttendance && $selectedAttendance->activity_batch_id) {
            $query->where('activity_batch_id', $selectedAttendance->activity_batch_id);
        } elseif ($batchId) {
            $query->where('activity_batch_id', $batchId);
        }

        if ($search) {
            $query->whereHas('user', function ($userQuery) use ($search) {
                $userQuery->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('id', 'LIKE', "%{$search}%")
                    ->orWhereHas('profile', function ($profileQuery) use ($search) {
                        $profileQuery->where('instansi', 'LIKE', "%{$search}%")
                            ->orWhereHas('province', function ($provinceQuery) use ($search) {
                                $provinceQuery->where('name', 'LIKE', "%{$search}%");
                            })
                            ->orWhereHas('regency', function ($regencyQuery) use ($search) {
                                $regencyQuery->where('name', 'LIKE', "%{$search}%");
                            });
                    });
            });
        }

        $participants = $query->get();

        $exportData = [];
        $sheetTitle = 'Daftar Peserta';
        $filename = 'peserta_activity_'.$activity->id.'.xlsx';

        $selectedAttendance = null;
        if ($attendanceId) {
            $selectedAttendance = Attendance::where('id', $attendanceId)
                ->where('activity_id', $activity->id)
                ->first();
        }

        if ($selectedAttendance) {
            $sheetTitle = 'Daftar Absen: '.$selectedAttendance->name;
            $filename = 'absen_'.Str::slug($selectedAttendance->name, '_').'_activity_'.$activity->id.'.xlsx';

            $statusFilter = $request->query('status_filter');
            $rowNumber = 1;

            foreach ($participants as $participant) {
                // Gunakan eager loaded records
                $userRecords = optional($participant->user)->attendanceRecords;
                $record = $userRecords ? $userRecords->where('attendance_id', $selectedAttendance->id)
                    ->where('status', 1)
                    ->sortByDesc('created_at')
                    ->first() : null;

                $isPresent = (bool) $record;

                // Filter logic
                if ($statusFilter === 'present' && ! $isPresent) {
                    continue;
                }
                if ($statusFilter === 'absent' && $isPresent) {
                    continue;
                }

                $timestamp = null;
                if ($record) {
                    $timestamp = $record->created_at ?? $record->updated_at ?? ($record->marked_at ?? null);
                }

                $exportData[] = [
                    'No' => $rowNumber++,
                    'Nama' => $participant->user->name ?? '-',
                    'Instansi' => optional($participant->user->profile)->instansi ?? '-',
                    'Provinsi' => optional(optional($participant->user->profile)->province)->name ?? '-',
                    'Kabupaten' => optional(optional($participant->user->profile)->regency)->name ?? '-',
                    'Status' => $isPresent ? 'Hadir' : 'Tidak Hadir',
                    'Waktu Absen' => $timestamp ? \Carbon\Carbon::parse($timestamp)->format('d/m/Y H:i:s') : '-',
                ];
            }
        } else {
            foreach ($participants as $i => $participant) {
                $exportData[] = [
                    'No' => $i + 1,
                    'Nama' => $participant->user->name ?? '-',
                    'Instansi' => optional($participant->user->profile)->instansi ?? '-',
                    'Provinsi' => optional(optional($participant->user->profile)->province)->name ?? '-',
                    'Kabupaten' => optional(optional($participant->user->profile)->regency)->name ?? '-',
                ];
            }
        }

        return Excel::download(new GenericArrayExport($exportData, $sheetTitle), $filename);
    }

    /**
     * Store scan attendance result
     */
    public function storeScan(Request $request)
    {
        try {
            $validated = $request->validate([
                'scanned_id' => 'required',
                'activity_id' => 'required|exists:activities,id',
                'attendance_id' => 'required|exists:attendances,id',
                'status' => 'required|in:0,1',
            ]);
            $this->authorizeActivityAccess($validated['activity_id']);

            $scannedId = $validated['scanned_id'];
            $finalUserId = null;

            // 1. Cek apakah scanned_id adalah ActivityUser ID (Participant ID) - Prioritas Utama
            $activityUser = ActivityUser::find($scannedId);
            if ($activityUser) {
                $finalUserId = $activityUser->user_id;
            }
            // 2. Jika bukan ActivityUser ID, cek apakah User ID valid
            elseif (User::where('id', $scannedId)->exists()) {
                $finalUserId = $scannedId;
            }

            if (! $finalUserId) {
                return response()->json([
                    'success' => false,
                    'message' => 'User tidak ditemukan (Invalid ID)',
                ], 404);
            }

            $attendance = Attendance::findOrFail($validated['attendance_id']);

            // Validasi batch: jika attendance terikat batch, pastikan user terdaftar di batch tersebut
            if ($attendance->activity_batch_id) {
                $isEnrolledInBatch = ActivityUser::where('user_id', $finalUserId)
                    ->where('activity_id', $validated['activity_id'])
                    ->where(function ($q) use ($attendance) {
                        $q->where('activity_batch_id', $attendance->activity_batch_id)
                            ->orWhereNull('activity_batch_id');
                    })
                    ->exists();

                if (! $isEnrolledInBatch) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Peserta tidak terdaftar pada sesi/batch ini.',
                    ], 400);
                }
            }

            // Cek duplikasi absensi
            $existingAttendance = ActivityRecord::where([
                'user_id' => $finalUserId,
                'activity_id' => $validated['activity_id'],
                'attendance_id' => $validated['attendance_id'],
                'status' => 1,
            ])->first();

            if ($existingAttendance) {
                $existingUser = User::with(['profile.province'])->find($finalUserId);

                return response()->json([
                    'success' => false,
                    'message' => 'User sudah melakukan absensi',
                    'already_scanned' => true,
                    'scanned_at' => $existingAttendance->created_at,
                    'user_name' => $existingUser ? $existingUser->name : 'Peserta',
                    'user_profile_url' => optional($existingUser->profile)->foto_url,
                    'user_instansi' => optional($existingUser->profile)->instansi,
                    'user_province' => optional(optional($existingUser->profile)->province)->name,
                    'attendance_name' => $attendance->name,
                    'first_scan_time' => $existingAttendance->created_at->format('H:i'),
                ]);
            }

            // Simpan absensi
            DB::table('activity_records')->insert([
                'id' => $this->generateCustomUid(),
                'user_id' => $finalUserId,
                'activity_id' => $validated['activity_id'],
                'activity_batch_id' => $attendance->activity_batch_id,
                'attendance_id' => $validated['attendance_id'],
                'status' => 1,
                'device_info' => $request->header('User-Agent'),
                'location' => null,
                'record_type' => 'scan',
                'description' => 'Scanned via scanner',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Ambil data user untuk ditampilkan
            $user = User::with(['profile.province', 'profile.regency'])->find($finalUserId);

            return response()->json([
                'success' => true,
                'message' => 'Absensi berhasil dicatat',
                'user' => $user,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check if user has already attended
     */
    public function checkAttendance(Request $request)
    {
        $hasAttended = $this->hasAttended(
            $request->activity_id,
            $request->attendance_id,
            $request->user_id
        );

        return response()->json([
            'hasAttended' => $hasAttended,
        ]);
    }

    public function checkUser(Request $request)
    {
        try {
            $validated = $request->validate([
                'scanned_id' => 'required|string',
                'activity_id' => 'required|string',
            ]);

            // Log input data
            \Log::info('Checking user registration:', $validated);

            // Cek di tabel activity_users
            $isRegistered = DB::table('activity_users')
                ->where([
                    'user_id' => $validated['scanned_id'],
                    'activity_id' => $validated['activity_id'],
                ])
                ->exists();

            // Log hasil pengecekan
            \Log::info('Check result:', [
                'is_registered' => $isRegistered,
                'user_id' => $validated['scanned_id'],
                'activity_id' => $validated['activity_id'],
            ]);

            return response()->json([
                'isRegistered' => $isRegistered,
                'message' => $isRegistered ? 'User terdaftar' : 'User tidak terdaftar',
            ]);

        } catch (\Exception $e) {
            \Log::error('Error checking user:', [
                'error' => $e->getMessage(),
                'input' => $request->all(),
            ]);

            return response()->json([
                'isRegistered' => false,
                'message' => 'Terjadi kesalahan: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check attendance status
     */
    public function checkAttendanceStatus(Request $request)
    {
        try {
            // Validasi input
            $validated = $request->validate([
                'user_id' => 'required|string',
                'activity_id' => 'required|string',
                'attendance_id' => 'required|string',
            ]);
            $this->authorizeActivityAccess($validated['activity_id']);

            // Cek di tabel activity_records
            $exists = DB::table('activity_records')
                ->where('user_id', $validated['user_id'])
                ->where('activity_id', $validated['activity_id'])
                ->where('attendance_id', $validated['attendance_id'])
                ->exists();

            return response()->json([
                'success' => true,
                'hasAttended' => $exists,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: '.$e->getMessage(),
            ]);
        }
    }

    /**
     * Store attendance record
     */
    public function storeAttendance(Request $request)
    {
        try {
            // Validasi input
            $validated = $this->validateAttendanceData($request);
            $this->authorizeActivityAccess($validated['activity_id']);

            // Validasi batch jika attendance terikat batch
            $attendance = Attendance::find($validated['attendance_id']);
            if ($attendance && $attendance->activity_batch_id) {
                $isEnrolledInBatch = ActivityUser::where('user_id', $validated['user_id'])
                    ->where('activity_id', $validated['activity_id'])
                    ->where(function ($q) use ($attendance) {
                        $q->where('activity_batch_id', $attendance->activity_batch_id)
                            ->orWhereNull('activity_batch_id');
                    })
                    ->exists();

                if (! $isEnrolledInBatch) {
                    // Cek jika terdaftar di batch lain untuk pesan error yang lebih spesifik
                    $wrongBatch = ActivityUser::where('user_id', $validated['user_id'])
                        ->where('activity_id', $validated['activity_id'])
                        ->exists();

                    if ($wrongBatch) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Peserta terdaftar di batch/sesi yang berbeda',
                        ], 403);
                    }

                    return response()->json([
                        'success' => false,
                        'message' => 'Peserta tidak terdaftar pada sesi/batch ini',
                    ], 403);
                }
            }

            // Simpan ke tabel activity_records
            $recordId = $this->generateCustomUid();
            $record = DB::table('activity_records')->insert([
                'id' => $recordId,
                'user_id' => $validated['user_id'],
                'activity_id' => $validated['activity_id'],
                'activity_batch_id' => $attendance ? $attendance->activity_batch_id : null,
                'attendance_id' => $validated['attendance_id'],
                'status' => $validated['status'],
                'device_info' => $validated['device_info'],
                'location' => $validated['location'],
                'record_type' => $validated['record_type'],
                'description' => $validated['description'],
                'metadata' => $validated['metadata'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Ambil data user untuk response
            $user = User::with('profile')->find($validated['user_id']);

            return response()->json([
                'success' => true,
                'message' => 'Attendance recorded successfully',
                'user' => $user,
                'record_id' => $recordId,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: '.$e->getMessage(),
            ]);
        }
    }

    protected function validateAttendanceData(Request $request)
    {
        return $request->validate([
            'user_id' => 'required|exists:users,id',
            'activity_id' => 'required|exists:activities,id',
            'attendance_id' => 'required|exists:attendances,id',
            'status' => 'required|integer',
            'device_info' => 'nullable|string',
            'location' => 'nullable|json',
            'record_type' => 'required|string',
            'description' => 'nullable|string',
            'metadata' => 'nullable|json',
        ]);
    }

    public function checkNew($activity_id, $attendance_id)
    {
        $attendance = Attendance::findOrFail($attendance_id);
        $latestRecords = $attendance->records()
            ->orderBy('updated_at', 'desc')
            ->take(6)
            ->get();

        return response()->json([
            'hasNewData' => $latestRecords->count() > 0,
            'count' => $latestRecords->count(),
            'lastAttendanceTime' => $latestRecords->first() ? $latestRecords->first()->updated_at : null,
        ]);
    }

    public function checkNewData($activity_id, $attendance_id)
    {
        $lastRecord = ActivityRecord::where([
            'activity_id' => $activity_id,
            'attendance_id' => $attendance_id,
        ])
            ->orderBy('updated_at', 'desc')
            ->first();

        return response()->json([
            'hasNewData' => $lastRecord ? $lastRecord->updated_at > request()->header('Last-Update') : false,
        ]);
    }

    public function toggleAttendance(Request $request)
    {
        \Log::info('ToggleAttendance called', $request->all());
        try {
            $this->authorizeActivityAccess($request->activity_id);

            // Validasi batch jika attendance terikat batch
            $attendance = Attendance::find($request->attendance_id);
            if ($attendance && $attendance->activity_batch_id) {
                $isEnrolledInBatch = ActivityUser::where('user_id', $request->user_id)
                    ->where('activity_id', $request->activity_id)
                    ->where('activity_batch_id', $attendance->activity_batch_id)
                    ->exists();

                if (! $isEnrolledInBatch) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Peserta tidak terdaftar pada sesi/batch ini',
                    ], 403);
                }
            }

            $record = \App\Models\ActivityRecord::where('activity_id', $request->activity_id)
                ->where('user_id', $request->user_id)
                ->where('attendance_id', $request->attendance_id)
                ->first();

            if ($record) {
                $record->delete();
                \Log::info('ToggleAttendance: record deleted', ['id' => $record->id]);
            } else {
                // Retrieve attendance to get batch ID
                $attendance = \App\Models\Attendance::find($request->attendance_id);
                $batchId = $attendance ? $attendance->activity_batch_id : null;

                $newRecord = \App\Models\ActivityRecord::create([
                    'activity_id' => $request->activity_id,
                    'activity_batch_id' => $batchId,
                    'user_id' => $request->user_id,
                    'attendance_id' => $request->attendance_id,
                    'status' => 1,
                    'record_type' => 'manual',
                    'device_info' => null,
                    'location' => null,
                    'description' => null,
                    'metadata' => null,
                ]);
                \Log::info('ToggleAttendance: record created', ['id' => $newRecord->id]);
            }

            \Log::info('ToggleAttendance success');

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            \Log::error('ToggleAttendance error: '.$e->getMessage());
            \Log::error('Attendance error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => app()->environment('production') ? 'Terjadi kesalahan saat memproses data.' : $e->getMessage(),
            ], 500);
        }
    }

    // Tambahkan endpoint untuk mengambil waktu absen terakhir user pada activity tertentu
    public function lastRecord(Request $request)
    {
        $userId = $request->query('user_id');
        $activityId = $request->query('activity_id');
        if (! $userId || ! $activityId) {
            return response()->json(['error' => 'user_id dan activity_id wajib diisi'], 400);
        }
        // Ambil record terakhir dari activity_records
        $record = \DB::table('activity_records')
            ->where('user_id', $userId)
            ->where('activity_id', $activityId)
            ->orderByDesc('updated_at')
            ->first();
        if ($record) {
            // Pastikan updated_at dalam format ISO8601
            $updatedAt = $record->updated_at ? date('c', strtotime($record->updated_at)) : null;
            $markedAt = isset($record->marked_at) ? date('c', strtotime($record->marked_at)) : null;

            return response()->json([
                'updated_at' => $updatedAt,
                'marked_at' => $markedAt,
            ]);
        } else {
            return response()->json(['updated_at' => null, 'marked_at' => null]);
        }
    }

    /**
     * Toggle status aktif/nonaktif untuk absen Mandiri
     */
    public function toggleMandiri(Request $request)
    {
        try {
            $validated = $request->validate([
                'attendance_id' => 'required|exists:attendances,id',
                'activity_id' => 'required|exists:activities,id',
                'enabled' => 'required|in:0,1', // Terima integer 0 atau 1, bukan boolean
            ]);
            $this->authorizeActivityAccess($validated['activity_id']);

            $attendance = Attendance::findOrFail($validated['attendance_id']);

            // Simpan status enabled di kolom description atau buat kolom baru
            // Untuk sementara, kita gunakan metadata atau kolom description
            // Jika ada kolom 'is_active' atau 'enabled', gunakan itu
            // Jika tidak, simpan di description sebagai JSON
            $rawDesc = $attendance->description;
            $description = json_decode($rawDesc ?? '{}', true);
            if (! is_array($description)) {
                $description = [];
                if (is_string($rawDesc) && trim($rawDesc) !== '') {
                    $description['instruction'] = trim($rawDesc);
                }
            }
            $description['enabled'] = (int) $validated['enabled'] === 1;
            $attendance->description = json_encode($description);
            $attendance->save();

            \Log::info('Toggle Mandiri:', [
                'attendance_id' => $validated['attendance_id'],
                'enabled' => $validated['enabled'],
            ]);

            return response()->json([
                'success' => true,
                'message' => $validated['enabled'] ? 'Absen mandiri diaktifkan' : 'Absen mandiri dinonaktifkan',
            ]);
        } catch (\Exception $e) {
            \Log::error('Toggle Mandiri Error: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengubah status: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Tampilkan halaman scan QR universal untuk user
     */
    public function scanQRUniversal()
    {
        $title = 'Scan QR Code Absensi';
        $titlepage = 'Scan QR Code';

        return Inertia::render('Attendance/ScanUniversal', compact('title', 'titlepage'));
    }

    /**
     * Update status kehadiran individual peserta (untuk Manual attendance)
     */
    public function recordStatus(Request $request)
    {
        try {
            $validated = $request->validate([
                'user_id' => 'required|exists:users,id',
                'activity_id' => 'required|exists:activities,id',
                'attendance_id' => 'required|exists:attendances,id',
                'status' => 'required|in:0,1',
            ]);
            $this->authorizeActivityAccess($validated['activity_id']);

            $userId = $validated['user_id'];
            $activityId = $validated['activity_id'];
            $attendanceId = $validated['attendance_id'];
            $status = (int) $validated['status'];

            // Cek apakah attendance adalah jenis Manual
            $attendance = Attendance::find($attendanceId);
            if (! $attendance || $attendance->jenis_absen !== 'Manual') {
                return response()->json([
                    'success' => false,
                    'message' => 'Hanya untuk jenis absen Manual',
                ], 400);
            }

            // Update atau create record
            if ($status === 1) {
                // Cek apakah record sudah ada
                $existingRecord = DB::table('activity_records')
                    ->where('activity_id', $activityId)
                    ->where('user_id', $userId)
                    ->where('attendance_id', $attendanceId)
                    ->first();

                if ($existingRecord) {
                    // Update record yang sudah ada
                    DB::table('activity_records')
                        ->where('id', $existingRecord->id)
                        ->update([
                            'activity_batch_id' => $attendance->activity_batch_id,
                            'status' => 1,
                            'record_type' => 'manual',
                            'updated_at' => now(),
                        ]);
                } else {
                    // Create record baru dengan ID
                    DB::table('activity_records')->insert([
                        'id' => $this->generateCustomUid(),
                        'activity_id' => $activityId,
                        'user_id' => $userId,
                        'attendance_id' => $attendanceId,
                        'activity_batch_id' => $attendance->activity_batch_id,
                        'status' => 1,
                        'record_type' => 'manual',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            } else {
                // Mark as not present - hapus record
                DB::table('activity_records')
                    ->where('activity_id', $activityId)
                    ->where('user_id', $userId)
                    ->where('attendance_id', $attendanceId)
                    ->delete();
            }

            $timestamp = $status === 1
                ? DB::table('activity_records')
                    ->where('activity_id', $activityId)
                    ->where('user_id', $userId)
                    ->where('attendance_id', $attendanceId)
                    ->value('created_at')
                : null;

            \Log::info('Record Status Updated:', [
                'user_id' => $userId,
                'activity_id' => $activityId,
                'attendance_id' => $attendanceId,
                'status' => $status,
            ]);

            return response()->json([
                'success' => true,
                'message' => $status === 1 ? 'Peserta berhasil diabsensi' : 'Status kehadiran berhasil dihapus',
                'timestamp' => $timestamp ? \Carbon\Carbon::parse($timestamp)->format('d/m/Y H:i:s') : null,
            ]);
        } catch (\Exception $e) {
            \Log::error('Record Status Error: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengupdate status: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Proses scan QR code universal (dari panitia)
     */
    public function processQRScan(Request $request)
    {
        try {
            $validated = $request->validate([
                'qr_data' => 'required|string',
            ]);

            // Parse QR code data
            $qrData = json_decode($validated['qr_data'], true);

            if (! $qrData || ! isset($qrData['type']) || $qrData['type'] !== 'attendance') {
                return response()->json([
                    'success' => false,
                    'message' => 'QR code tidak valid. Pastikan Anda scan QR code absensi yang benar.',
                ], 400);
            }

            $activityId = $qrData['activity_id'] ?? null;
            $attendanceId = $qrData['attendance_id'] ?? null;
            $userId = auth()->id();

            if (! $activityId || ! $attendanceId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data QR code tidak lengkap',
                ], 400);
            }

            // Cek apakah user terdaftar di activity
            $query = ActivityUser::where('activity_id', $activityId)
                ->where('user_id', $userId);

            // Fetch attendance details first to check for batch restrictions
            $attendance = Attendance::find($attendanceId);
            if (! $attendance) {
                return response()->json([
                    'success' => false,
                    'message' => 'Jenis absen tidak ditemukan',
                ], 404);
            }

            // If attendance is tied to a specific batch, ensure user is in that batch
            if ($attendance->activity_batch_id) {
                $query->where('activity_batch_id', $attendance->activity_batch_id);
            }

            $isRegistered = $query->exists();

            if (! $isRegistered) {
                // Check if user is registered but in a different batch
                if ($attendance->activity_batch_id) {
                    $wrongBatch = ActivityUser::where('activity_id', $activityId)
                        ->where('user_id', $userId)
                        ->exists();

                    if ($wrongBatch) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Anda terdaftar di batch/sesi yang berbeda',
                        ], 403);
                    }
                }

                return response()->json([
                    'success' => false,
                    'message' => 'Anda belum terdaftar di kegiatan ini',
                ], 403);
            }

            // Cek apakah sudah pernah absen
            $existingRecord = DB::table('activity_records')
                ->where('activity_id', $activityId)
                ->where('attendance_id', $attendanceId)
                ->where('user_id', $userId)
                ->where('status', 1)
                ->exists();

            if ($existingRecord) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda sudah melakukan absensi untuk jenis absen ini',
                ], 400);
            }

            // Buat record absensi
            DB::table('activity_records')->insert([
                'id' => $this->generateCustomUid(),
                'activity_id' => $activityId,
                'activity_batch_id' => $attendance->activity_batch_id,
                'attendance_id' => $attendanceId,
                'user_id' => $userId,
                'status' => 1,
                'record_type' => 'qr_scan',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Ambil info activity dan attendance untuk response
            $activity = Activity::find($activityId);
            $activityName = $activity->name ?? '';

            if ($activity && $activity->batches()->count() > 1 && $attendance->activity_batch_id) {
                if ($attendance->batch) {
                    $activityName .= ' - '.$attendance->batch->name;
                }
            }

            \Log::info('Universal QR Scan Attendance:', [
                'user_id' => $userId,
                'activity_id' => $activityId,
                'attendance_id' => $attendanceId,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Absensi berhasil dicatat',
                'activity_name' => $activityName,
                'attendance_name' => $attendance->name ?? '',
                'activity_id' => $activityId, // Tambahkan activity_id untuk redirect
            ]);
        } catch (\Exception $e) {
            \Log::error('Process QR Scan Error: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal memproses QR code: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle absensi mandiri dari peserta
     */
    public function doMandiriAttendance(Request $request)
    {
        try {
            $validated = $request->validate([
                'activity_id' => 'required|exists:activities,id',
                'attendance_id' => 'required|exists:attendances,id',
            ]);

            $userId = auth()->id();
            $activityId = $validated['activity_id'];
            $attendanceId = $validated['attendance_id'];

            // Cek apakah attendance adalah jenis Mandiri atau QR Mandiri
            $attendance = Attendance::findOrFail($attendanceId);

            // Cek apakah user terdaftar di activity dengan batch yang sesuai
            $query = ActivityUser::where('activity_id', $activityId)
                ->where('user_id', $userId);

            if ($attendance->activity_batch_id) {
                $query->where('activity_batch_id', $attendance->activity_batch_id);
            }

            $isRegistered = $query->exists();

            if (! $isRegistered) {
                // Check if user is registered but in a different batch
                if ($attendance->activity_batch_id) {
                    $wrongBatch = ActivityUser::where('activity_id', $activityId)
                        ->where('user_id', $userId)
                        ->exists();

                    if ($wrongBatch) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Anda terdaftar di batch/sesi yang berbeda',
                        ], 403);
                    }
                }

                return response()->json([
                    'success' => false,
                    'message' => 'Anda belum terdaftar di kegiatan ini',
                ], 403);
            }

            $types = array_map('trim', explode(',', $attendance->jenis_absen));
            if (! in_array('Mandiri', $types) && ! in_array('QR Mandiri', $types)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Jenis absensi ini tidak dapat dilakukan secara mandiri',
                ], 403);
            }

            // Cek apakah absen mandiri diaktifkan (default OFF jika tidak ada flag)
            // REVISI: User meminta jika sudah tampil, maka dianggap aktif.
            /*
            $description = json_decode($attendance->description ?? '{}', true);
            $isEnabled = isset($description['enabled']) ? (bool) $description['enabled'] : false;
            if (! $isEnabled) {
                return response()->json([
                    'success' => false,
                    'message' => 'Absensi mandiri untuk jenis absen ini belum diaktifkan',
                ], 403);
            }
            */

            // Cek apakah sudah pernah absen
            $existingRecord = DB::table('activity_records')
                ->where('activity_id', $activityId)
                ->where('attendance_id', $attendanceId)
                ->where('user_id', $userId)
                ->where('status', 1)
                ->exists();

            if ($existingRecord) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda sudah melakukan absensi untuk jenis absen ini',
                ], 400);
            }

            // Buat record absensi
            DB::table('activity_records')->insert([
                'id' => $this->generateCustomUid(),
                'activity_id' => $activityId,
                'activity_batch_id' => $attendance->activity_batch_id,
                'attendance_id' => $attendanceId,
                'user_id' => $userId,
                'status' => 1,
                'record_type' => 'mandiri',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            \Log::info('Mandiri Attendance:', [
                'user_id' => $userId,
                'activity_id' => $activityId,
                'attendance_id' => $attendanceId,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Absensi berhasil dicatat',
            ]);
        } catch (\Exception $e) {
            \Log::error('Mandiri Attendance Error: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal melakukan absensi: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mark all participants as present untuk absen Manual
     */
    public function markAllPresent(Request $request)
    {
        try {
            $validated = $request->validate([
                'attendance_id' => 'required|exists:attendances,id',
                'activity_id' => 'required|exists:activities,id',
            ]);
            $this->authorizeActivityAccess($validated['activity_id']);

            $attendance = Attendance::findOrFail($validated['attendance_id']);
            $activity = Activity::findOrFail($validated['activity_id']);

            // Ambil semua peserta dari activity (filter batch jika sesi absen spesifik batch)
            $query = ActivityUser::where('activity_id', $activity->id);

            if ($attendance->activity_batch_id) {
                $query->where('activity_batch_id', $attendance->activity_batch_id);
            }

            $participants = $query->get();

            $markedCount = 0;
            $skippedCount = 0;

            DB::beginTransaction();

            foreach ($participants as $participant) {
                // Cek apakah sudah ada record
                $existingRecord = DB::table('activity_records')
                    ->where('activity_id', $activity->id)
                    ->where('attendance_id', $attendance->id)
                    ->where('user_id', $participant->user_id)
                    ->first();

                if (! $existingRecord) {
                    // Buat record baru
                    DB::table('activity_records')->insert([
                        'id' => $this->generateCustomUid(),
                        'activity_id' => $activity->id,
                        'activity_batch_id' => $attendance->activity_batch_id,
                        'attendance_id' => $attendance->id,
                        'user_id' => $participant->user_id,
                        'status' => 1,
                        'record_type' => 'manual',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $markedCount++;
                } else {
                    // Update status jika belum hadir
                    if ($existingRecord->status != 1) {
                        DB::table('activity_records')
                            ->where('id', $existingRecord->id)
                            ->update([
                                'status' => 1,
                                'updated_at' => now(),
                            ]);
                        $markedCount++;
                    } else {
                        $skippedCount++;
                    }
                }
            }

            DB::commit();

            \Log::info('Mark All Present:', [
                'attendance_id' => $validated['attendance_id'],
                'activity_id' => $validated['activity_id'],
                'marked_count' => $markedCount,
                'skipped_count' => $skippedCount,
            ]);

            return response()->json([
                'success' => true,
                'message' => "{$markedCount} peserta berhasil diabsensi. {$skippedCount} peserta sudah terabsensi sebelumnya.",
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Mark All Present Error: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengabsensi semua peserta: '.$e->getMessage(),
            ], 500);
        }
    }
}
