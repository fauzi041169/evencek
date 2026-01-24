<?php

namespace App\Http\Controllers;

use App\Mail\VerifyEmailMail;
use App\Models\Activity;
use App\Models\ActivityBatch;
use App\Models\ActivityCommitteeStructure;
use App\Models\ActivityDivision;
use App\Models\ActivityDivisionRequirement;
use App\Models\ActivityHotelRoom;
use App\Models\ActivityHotelRoomAssignment;
use App\Models\ActivityMaterial;
use App\Models\ActivityParticipantGroup;
use App\Models\ActivityRundown;
use App\Models\ActivityRecord;
use App\Models\ActivityUser;
use App\Models\Attendance;
use App\Models\CardSettings;
use App\Models\CertificateSettings;
use App\Models\Comment;
use App\Models\District;
use App\Helpers\RegionMatcher;
use App\Models\Payment;
use App\Models\Profile;
use App\Models\Province;
use App\Models\RefPosition;
use App\Models\Regency;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Exception;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ActivityPreparationController extends Controller
{
    /**
     * Display the preparation page for an activity
     */
    public function index($activityId)
    {
        try {
            $activity = Activity::where('uid', $activityId)->first();
            if (! $activity) {
                $activity = Activity::findOrFail($activityId);
            }
            $activityId = $activity->id;

            // Check permission: Admin dan superadmin bisa akses semua, creator dan panitia hanya aktivitas mereka
            if (! auth()->check()) {
                abort(403, 'Silakan login terlebih dahulu.');
            }

            if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
                // Untuk creator dan panitia, check apakah mereka bisa manage registration untuk aktivitas ini
                if (! $activity->canManageRegistration(auth()->id())) {
                    abort(403, 'Anda tidak memiliki izin untuk mengakses halaman ini.');
                }
            }

            // Longgarkan: jangan blokir berdasarkan permission key, cukup berdasarkan canManageRegistration

            // Gunakan $activity->id untuk konsistensi
            $activityIdValue = $activity->id;

            $divisions = ActivityDivision::where('activity_id', $activityIdValue)->get();
            $committeeStructure = ActivityCommitteeStructure::with(['user.profile'])
                ->where('activity_id', $activityIdValue)
                ->orderBy('order')
                ->get();

            // Update phone from profile for existing members that don't have phone
            foreach ($committeeStructure as $member) {
                if ($member->user && $member->user->profile && $member->user->profile->no_hp) {
                    if (! $member->phone) {
                        $member->phone = $member->user->profile->no_hp;
                        $member->save();
                    }
                }
            }

            // Auto-sync: Ensure all committee positions exist as divisions
            // This fixes issue where existing positions (like "Ketua Panitia") are not in divisions list
            $existingDivisionNames = $divisions->pluck('name')->map(function ($name) {
                return trim(strtolower($name));
            })->all();

            $committeePositions = $committeeStructure->unique('position');
            $newDivisionsCreated = false;

            foreach ($committeePositions as $committee) {
                $positionName = trim($committee->position);
                $lowerPositionName = strtolower($positionName);

                // Check if it is a main position
                // Rule: Any position NOT starting with "anggota" is considered a Jabatan (Division)
                $isMainPosition = ! Str::startsWith($lowerPositionName, 'anggota');

                if ($isMainPosition) {
                    // It is a main position, create division if not exists
                    if (! in_array($lowerPositionName, $existingDivisionNames)) {
                        // Create missing division
                        $newDivision = ActivityDivision::create([
                            'activity_id' => $activityIdValue,
                            'activity_batch_id' => $committee->activity_batch_id,
                            'name' => $positionName,
                            'description' => 'Jabatan '.$positionName,
                            'leader_name' => $committee->name,
                            'leader_phone' => $committee->phone,
                        ]);

                        $newDivisionsCreated = true;

                        // Update the committee member to link to this new division
                        ActivityCommitteeStructure::where('activity_id', $activityIdValue)
                            ->where('position', $positionName)
                            ->update(['activity_division_id' => $newDivision->id]);

                        // Add to existing list to avoid duplicates in loop
                        $existingDivisionNames[] = $lowerPositionName;
                    } else {
                        // If division exists but link is missing, update it
                        if (! $committee->activity_division_id) {
                            $division = $divisions->first(function ($div) use ($positionName) {
                                return strtolower($div->name) === strtolower($positionName);
                            });

                            if ($division) {
                                ActivityCommitteeStructure::where('activity_id', $activityIdValue)
                                    ->where('position', $positionName)
                                    ->update(['activity_division_id' => $division->id]);
                            }
                        }
                    }
                } elseif (str_contains($lowerPositionName, 'anggota')) {
                    // Logic for "Anggota" -> Map to "Koordinator"
                    // Example: "Anggota Acara" -> "Koordinator Acara"
                    $suffix = trim(str_ireplace('anggota', '', $lowerPositionName));
                    if ($suffix) {
                        // Find a division that is "Koordinator" + suffix
                        // We use the database query for partial matching if exact not found in memory
                        // Or iterate through existing divisions

                        $targetDivision = $divisions->first(function ($div) use ($suffix) {
                            $divName = strtolower($div->name);

                            return str_contains($divName, 'koordinator') && str_contains($divName, $suffix);
                        });

                        if ($targetDivision) {
                            ActivityCommitteeStructure::where('activity_id', $activityIdValue)
                                ->where('position', $positionName)
                                ->update(['activity_division_id' => $targetDivision->id]);
                        }
                    }
                }
            }

            // Clean up: Delete divisions that start with "Anggota" if they were accidentally created
            $deletedAnggota = ActivityDivision::where('activity_id', $activityIdValue)
                ->where('name', 'LIKE', 'Anggota%')
                ->delete();

            if ($newDivisionsCreated || $deletedAnggota > 0) {
                // Refresh divisions if any were created or deleted
                $divisions = ActivityDivision::where('activity_id', $activityIdValue)->get();
                // Refresh committee structure to get updated division IDs
                $committeeStructure = ActivityCommitteeStructure::with(['user.profile'])
                    ->where('activity_id', $activityIdValue)
                    ->orderBy('order')
                    ->get();
            }

            // Sort divisions by hierarchy: Ketua Panitia > Wakil > Sekretaris > Bendahara > Koordinator > Others
            $divisions = $divisions->sortBy(function ($division) {
                $name = strtolower($division->name);
                if (str_contains($name, 'ketua panitia')) {
                    return 1;
                }
                if (str_contains($name, 'wakil')) {
                    return 2;
                }
                if (str_contains($name, 'sekretaris')) {
                    return 3;
                }
                if (str_contains($name, 'bendahara')) {
                    return 4;
                }
                if (str_contains($name, 'koordinator')) {
                    return 5;
                }

                return 10;
            });

            $rundowns = ActivityRundown::where('activity_id', $activityIdValue)
                ->orderBy('order')
                ->orderBy('start_time')
                ->get();

            // Get materials for this activity
            $materials = ActivityMaterial::where('activity_id', $activityIdValue)
                ->orderBy('created_at', 'desc')
                ->get();

            // Get enrolled users with profile and province
            $participants = ActivityUser::with(['user.profile.province'])
                ->where('activity_id', $activityIdValue)
                ->orderBy('created_at', 'desc')
                ->get();

            $owners = $activity->owners ?? collect();
            if ($activity->user) {
                $owners->prepend($activity->user);
            }
            $owners = $owners->unique('id');

            $refPositions = RefPosition::select('name')->get();
            $usedPositions = ActivityDivision::select('name')->whereNotNull('name')->where('name', '!=', '')->distinct()->get();
            $refPositions = $refPositions->concat($usedPositions)->unique('name')->sortBy('name')->values();

            // Attach leader_user_id to divisions based on committee structure
            foreach ($divisions as $division) {
                    $leader = $committeeStructure->firstWhere('activity_division_id', $division->id);
                    $division->leader_user_id = $leader ? $leader->user_id : null;
                }

            // Inject visibility settings
            $cardSettings = CardSettings::where('activity_id', $activityIdValue)
                ->whereNull('activity_batch_id')
                ->first();
            $activity->id_card_visible = $cardSettings && isset($cardSettings->print_settings['id_card_visible'])
                ? (bool) $cardSettings->print_settings['id_card_visible']
                : true;

            $certSettings = CertificateSettings::where('activity_id', $activityIdValue)
                ->whereNull('activity_batch_id')
                ->first();
            $activity->certificate_visible = $certSettings && isset($certSettings->print_settings['download_card_visible'])
                ? (bool) $certSettings->print_settings['download_card_visible']
                : false;

                return Inertia::render('Activity/Preparation/Index', compact('activity', 'divisions', 'committeeStructure', 'participants', 'rundowns', 'materials', 'owners', 'refPositions'));
        } catch (ModelNotFoundException $e) {
            abort(404, 'Aktivitas tidak ditemukan.');
        } catch (Exception $e) {
            Log::error('Error loading preparation page', [
                'activity_id' => $activityId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            abort(500, 'Terjadi kesalahan saat memuat halaman: '.$e->getMessage());
        }
    }

    public function searchUsers(Request $request, $activityId)
    {
        $term = $request->get('q');

        $query = User::query();

        if (! empty($term)) {
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%");
            });
        }

        $users = $query->limit(20)->get(['id', 'name', 'email']);

        return response()->json($users);
    }



    public function storeOwner(Request $request, $activityId)
    {
        $activity = Activity::findOrFail($activityId);

        // Only existing owners/creators/admins can add new owners
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && ! $activity->canManageRegistration(auth()->id())) {
            abort(403);
        }

        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $activity->owners()->syncWithoutDetaching([$request->user_id]);

        return redirect()->back()->with('success', 'Owner berhasil ditambahkan.');
    }

    public function destroyOwner($activityId, $userId)
    {
        $activity = Activity::findOrFail($activityId);

        // Only existing owners/creators/admins can remove owners
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && ! $activity->canManageRegistration(auth()->id())) {
            abort(403);
        }

        // Prevent removing the creator (main user_id)
        if ($activity->user_id == $userId) {
            return redirect()->back()->with('error', 'Tidak dapat menghapus creator utama.');
        }

        $activity->owners()->detach($userId);

        return redirect()->back()->with('success', 'Owner berhasil dihapus.');
    }

    /**
     * Halaman khusus manajemen peserta untuk sebuah aktivitas
     */
    public function participants($activityId)
    {
        \Log::info('Participants Controller HIT', ['activity_uid' => $activityId]);
        try {
            $activity = Activity::where('uid', $activityId)->first();
            if (! $activity) {
                $activity = Activity::findOrFail($activityId);
            }
            $activityId = $activity->id;

            $actor = auth()->user();
            if (! $actor) {
                abort(403, 'Silakan login untuk mengakses halaman ini.');
            }

            if (! $actor->isAdmin() && ! $actor->isSuperAdmin() && $activity->user_id !== $actor->id) {
                if (! $activity->canManageRegistration($actor->id)) {
                    abort(403, 'Anda tidak memiliki izin untuk mengakses halaman ini.');
                }
            }

            // Get batches
            $batches = collect();
            try {
                $batches = ActivityBatch::where('activity_id', $activityId)->get();
            } catch (\Exception $e) {
                \Log::warning('Failed to load batches', ['error' => $e->getMessage()]);
            }

            $selectedBatchId = request('batch_id');

            // Get unique regencies for filter
            $activityUserTable = (new ActivityUser)->getTable();

            // Optimasi: Cache filter location data (Province, Regency, District)
            $cacheKey = "activity_participants_filters_{$activityId}";
            $locationFilters = Cache::remember($cacheKey, 300, function() use ($activityId, $activityUserTable) {
                // 1. Get relevant Province IDs
                $participantProvinceIds = ActivityUser::query()
                    ->from($activityUserTable)
                    ->where('activity_id', $activityId)
                    ->join('users', "{$activityUserTable}.user_id", '=', 'users.id')
                    ->join('profiles', 'users.id', '=', 'profiles.user_id')
                    ->whereNotNull('profiles.province_id')
                    ->distinct()
                    ->pluck('profiles.province_id');

                $provinces = Province::whereIn('id', $participantProvinceIds)->orderBy('name')->get(['id', 'name']);

                // 2. Get relevant Regency IDs
                $participantRegencyIds = ActivityUser::query()
                    ->from($activityUserTable)
                    ->where('activity_id', $activityId)
                    ->join('users', "{$activityUserTable}.user_id", '=', 'users.id')
                    ->join('profiles', 'users.id', '=', 'profiles.user_id')
                    ->whereNotNull('profiles.regency_id')
                    ->distinct()
                    ->pluck('profiles.regency_id');

                $regencies = Regency::whereIn('id', $participantRegencyIds)->orderBy('name')->get();

                // 3. Get relevant District IDs and Other Districts
                $participantDistrictIds = ActivityUser::query()
                    ->from($activityUserTable)
                    ->where('activity_id', $activityId)
                    ->join('users', "{$activityUserTable}.user_id", '=', 'users.id')
                    ->join('profiles', 'users.id', '=', 'profiles.user_id')
                    ->whereNotNull('profiles.district_id')
                    ->distinct()
                    ->pluck('profiles.district_id');

                $districts = District::whereIn('id', $participantDistrictIds)->orderBy('name')->get();

                // Get other districts (text)
                $otherDistricts = collect();
                try {
                    if (Schema::hasColumn('profiles', 'other_district')) {
                        $otherDistricts = ActivityUser::query()
                            ->from($activityUserTable)
                            ->where('activity_id', $activityId)
                            ->join('users', "{$activityUserTable}.user_id", '=', 'users.id')
                            ->join('profiles', 'users.id', '=', 'profiles.user_id')
                            ->whereNull('profiles.district_id')
                            ->whereNotNull('profiles.other_district')
                            ->distinct()
                            ->pluck('profiles.other_district')
                            ->filter(fn ($val) => ! empty(trim($val)))
                            ->values();
                    }
                } catch (\Exception $e) {
                    \Log::warning('Failed to load other districts', ['error' => $e->getMessage()]);
                }
                
                return compact('provinces', 'regencies', 'districts', 'otherDistricts');
            });

            $provinces = $locationFilters['provinces'];
            $totalProvinces = $provinces->count();
            $selectedProvinceId = request('province_id');

            $regencies = $locationFilters['regencies'];
            $totalRegencies = $regencies->count();
            $selectedRegencyId = request('regency_id');

            $districts = $locationFilters['districts'];
            $totalDistricts = $districts->count();
            
            $otherDistricts = $locationFilters['otherDistricts'];
            $selectedDistrictId = request('district_id');

            // Simplified eager loading to avoid issues
            $query = ActivityUser::where('activity_id', $activityId);

            \Log::info('DEBUG PARTICIPANTS START', [
                'activity_id' => $activityId,
                'request_all' => request()->all(),
                'initial_count' => $query->count()
            ]);

            // Try to load relationships, but don't fail if they don't exist
            try {
                $query->with([
                    'user.profile', 
                    'user.profile.province',
                    'user.profile.regency',
                    'user.profile.district',
                    'batch', 
                    'participantGroup', 
                    'creator', 
                    'updater', 
                    'payment' => function($q) use ($activityId) {
                        $q->where('activity_id', $activityId)
                          ->with(['paymentMethod', 'verifier'])
                          ->latest();
                    }
                ]);
            } catch (\Exception $e) {
                \Log::warning('Failed to set eager loading', ['error' => $e->getMessage()]);
            }

            if ($selectedBatchId) {
                $query->where('activity_batch_id', $selectedBatchId);
            }

            // Get committee user IDs for role logic
            $committeeUserIds = [];
            try {
                $committeeUserIds = ActivityCommitteeStructure::where('activity_id', $activityId)
                    ->whereNotNull('user_id')
                    ->pluck('user_id')
                    ->toArray();
            } catch (\Exception $e) {
                \Log::warning('Failed to load committee IDs', ['error' => $e->getMessage()]);
            }

            $combinedFilter = request('status_role_filter');
            $roleFilter = null;
            $participantStatusFilter = null;
            if ($combinedFilter) {
                if ($combinedFilter === 'role_panitia') {
                    $roleFilter = 'panitia';
                } elseif ($combinedFilter === 'role_peserta') {
                    $roleFilter = 'peserta';
                } elseif ($combinedFilter === 'status_active') {
                    $participantStatusFilter = ActivityUser::STATUS_ACTIVE;
                } elseif ($combinedFilter === 'status_verification') {
                    $participantStatusFilter = ActivityUser::STATUS_VERIFICATION;
                } elseif ($combinedFilter === 'status_pending') {
                    $participantStatusFilter = ActivityUser::STATUS_PENDING;
                } elseif ($combinedFilter === 'status_rejected') {
                    $participantStatusFilter = ActivityUser::STATUS_REJECTED;
                }
            } else {
                $roleFilter = request('role_filter');
                $participantStatusFilter = request('participant_status');
            }

            if ($roleFilter === 'panitia') {
                $query->whereIn('user_id', $committeeUserIds);
            } elseif ($roleFilter === 'peserta') {
                $query->whereNotIn('user_id', $committeeUserIds);
            }

            if ($combinedFilter === 'email_unverified') {
                $query->whereHas('user', function ($q) {
                    $q->whereNull('email_verified_at');
                });
            }

            if ($participantStatusFilter !== null && $participantStatusFilter !== '') {
                $query->where('status', (int) $participantStatusFilter);
            }

            if ($selectedProvinceId) {
                $query->whereHas('user.profile', function ($q) use ($selectedProvinceId) {
                    $q->where('province_id', $selectedProvinceId);
                });
            }

            if ($selectedRegencyId) {
                $query->whereHas('user.profile', function ($q) use ($selectedRegencyId) {
                    $q->where('regency_id', $selectedRegencyId);
                });
            }

            if ($selectedDistrictId) {
                if (str_starts_with($selectedDistrictId, 'other:')) {
                    $otherVal = substr($selectedDistrictId, 6);
                    if (Schema::hasColumn('profiles', 'other_district')) {
                        $query->whereHas('user.profile', function ($q) use ($otherVal) {
                            $q->where('other_district', $otherVal);
                        });
                    }
                } else {
                    $query->whereHas('user.profile', function ($q) use ($selectedDistrictId) {
                        $q->where('district_id', $selectedDistrictId);
                    });
                }
            }

            // Handle search parameter - respecting column settings
            $searchTerm = request('search');
            // Server-side search enabled
            if ($searchTerm) {
                $searchTerm = trim($searchTerm);
                $settings = $activity->column_settings ?? [];

                $query->where(function ($q) use ($searchTerm) {
                    // 1. User fields (Always search name and email)
                    $q->orWhereHas('user', function ($u) use ($searchTerm) {
                        $u->where(function ($sub) use ($searchTerm) {
                            $sub->orWhere('name', 'like', "%{$searchTerm}%");
                            $sub->orWhere('email', 'like', "%{$searchTerm}%");
                        });
                    });

                    // 2. Profile fields (Always search all profile fields)
                    $profileMap = [
                        'no_hp', 'nik', 'instansi', 'pekerjaan', 'jabatan',
                        'alamat', 'jenis_kelamin', 'birth_place',
                    ];

                    $q->orWhereHas('user.profile', function ($p) use ($searchTerm, $profileMap) {
                        $p->where(function ($sub) use ($searchTerm, $profileMap) {
                            foreach ($profileMap as $field) {
                                $sub->orWhere($field, 'like', "%{$searchTerm}%");
                            }

                            // Location relationships
                            $sub->orWhereHas('province', fn ($loc) => $loc->where('name', 'like', "%{$searchTerm}%"));
                            $sub->orWhereHas('regency', fn ($loc) => $loc->where('name', 'like', "%{$searchTerm}%"));
                            $sub->orWhereHas('district', fn ($loc) => $loc->where('name', 'like', "%{$searchTerm}%"));
                        });
                    });

                    // 3. Custom Data (search only if column exists)
                    if (Schema::hasColumn('activity_users', 'custom_data')) {
                        $q->orWhere('custom_data', 'like', "%{$searchTerm}%");
                    }

                    // 4. Participant Group
                    $q->orWhereHas('participantGroup', function ($g) use ($searchTerm) {
                        $g->where('name', 'like', "%{$searchTerm}%");
                    });
                });
            }

            // --- OPTIMIZED FILTER LOGIC (MOVED FROM MANUAL FILTERING) ---
            if ($val = request('name')) {
                $query->whereHas('user', fn($q) => $q->where('name', $val));
            }
            if ($val = request('email')) {
                $query->whereHas('user', fn($q) => $q->where('email', $val));
            }
            if ($val = request('no_hp')) {
                $query->whereHas('user.profile', fn($q) => $q->where('no_hp', $val));
            }
            if ($val = request('nik')) {
                $query->whereHas('user.profile', fn($q) => $q->where('nik', $val));
            }
            if ($val = request('instansi')) {
                $query->whereHas('user.profile', fn($q) => $q->where('instansi', $val));
            }
            if ($val = request('pekerjaan')) {
                $query->whereHas('user.profile', fn($q) => $q->where('pekerjaan', $val));
            }
            if ($val = request('jabatan')) {
                $query->whereHas('user.profile', fn($q) => $q->where('jabatan', $val));
            }
            if ($val = request('jenis_kelamin')) {
                if ($val === '__EMPTY__') {
                    $query->whereHas('user.profile', fn($q) => $q->whereNull('jenis_kelamin')->orWhere('jenis_kelamin', '')->orWhere('jenis_kelamin', '-'));
                } else {
                    $query->whereHas('user.profile', fn($q) => $q->where('jenis_kelamin', $val));
                }
            }
            if ($val = request('birth_place')) {
                 if ($val === '__EMPTY__') {
                    $query->whereHas('user.profile', fn($q) => $q->whereNull('birth_place')->orWhere('birth_place', '')->orWhere('birth_place', '-'));
                } else {
                    $query->whereHas('user.profile', fn($q) => $q->where('birth_place', $val));
                }
            }
            if ($val = request('birth_year')) {
                 $query->whereHas('user.profile', fn($q) => $q->whereYear('birth_date', $val));
            }
            if ($val = request('address')) {
                $query->whereHas('user.profile', fn($q) => $q->where('alamat', $val));
            }
            if ($val = request('province_name')) {
                $query->whereHas('user.profile.province', fn($q) => $q->where('name', $val));
            }
            if ($val = request('regency_name')) {
                $query->whereHas('user.profile.regency', fn($q) => $q->where('name', $val));
            }
            if ($val = request('district_name')) {
                $query->whereHas('user.profile.district', fn($q) => $q->where('name', $val));
            }
            if ($val = request('group_id')) {
                $query->where('activity_participant_group_id', $val);
            }
            if ($val = request('room_number')) {
                $query->whereHas('room', fn($q) => $q->where('room_number', $val));
            }

            if ($val = request('room_status')) {
                if ($val === 'assigned') {
                    $query->whereExists(function ($q) use ($activityId) {
                        $q->select(\DB::raw(1))
                          ->from('activity_hotel_room_assignments')
                          ->whereColumn('activity_hotel_room_assignments.user_id', 'activity_users.user_id')
                          ->where('activity_hotel_room_assignments.activity_id', $activityId);
                    });
                } elseif ($val === 'unassigned') {
                    $query->whereNotExists(function ($q) use ($activityId) {
                        $q->select(\DB::raw(1))
                          ->from('activity_hotel_room_assignments')
                          ->whereColumn('activity_hotel_room_assignments.user_id', 'activity_users.user_id')
                          ->where('activity_hotel_room_assignments.activity_id', $activityId);
                    });
                }
            }

            // Calculate Bulk IDs for Registration Method Filter
            $bulkGroupUserIds = [];
            // We need this for the 'registration_method' filter and later usage
            try {
                $paymentsWithNotes = Payment::select('id', 'activity_id', 'user_id', 'notes')
                    ->where('activity_id', $activityId)
                    ->whereNotNull('notes')
                    ->where(function($q) {
                        $q->where('notes', 'like', '%user_ids%')
                          ->orWhere('notes', 'like', '%bulk_import%');
                    })
                    ->get();

                foreach ($paymentsWithNotes as $p) {
                    $decoded = json_decode($p->notes, true);
                    // Handle malformed json or mixed string if needed (simplified here for speed)
                    if (!$decoded && str_contains($p->notes, '{')) {
                        // fallback extractor
                         $start = strpos($p->notes, '{');
                         $end = strrpos($p->notes, '}');
                         if ($start !== false && $end !== false) {
                             $decoded = json_decode(substr($p->notes, $start, $end - $start + 1), true);
                         }
                    }

                    if (is_array($decoded)) {
                        $uids = $decoded['user_ids'] ?? ($decoded['bulk_import']['user_ids'] ?? []);
                        foreach ($uids as $uid) {
                            if($uid) $bulkGroupUserIds[] = (string)$uid;
                        }
                    }
                }
                $bulkGroupUserIds = array_unique($bulkGroupUserIds);
            } catch (\Exception $e) {}

            if ($val = request('registration_method')) {
                if ($val === 'kelompok') {
                     $query->where(function($q) use ($bulkGroupUserIds) {
                        $q->whereNotNull('activity_participant_group_id');
                        if (!empty($bulkGroupUserIds)) {
                            $q->orWhereIn('user_id', $bulkGroupUserIds);
                        }
                     });
                } elseif ($val === 'mandiri') {
                    $query->whereNull('activity_participant_group_id');
                    if (!empty($bulkGroupUserIds)) {
                        $query->whereNotIn('user_id', $bulkGroupUserIds);
                    }
                }
            }

            $participants = collect();
            // $bulkGroupUserIds is already calculated above
            
            \Log::info('DEBUG PARTICIPANTS BEFORE QUERY', [
                'count_before_paginate' => $query->count(),
                'sql' => $query->toSql(),
                'bindings' => $query->getBindings()
            ]);

            try {
                // Optimization: Assume created_at exists to avoid slow Schema::hasColumn check
                // ActivityUser model uses standard timestamps
                $orderColumn = 'created_at';

                $perPage = request('per_page', 15);
                $participants = $query->orderBy($orderColumn, 'desc')->paginate($perPage)->appends(request()->query());

                /*
                if ($searchTerm) {
                    \Log::info('DEBUG SEARCH: Query executed', [
                        'sql' => \DB::getQueryLog(),
                        'count_found' => $participants->count()
                    ]);
                }
                */

                // Load relationships manually with error handling
                if ($participants->isNotEmpty()) {
                        // Optimasi Eager Loading: Load nested relationships sekaligus
                        // REMOVED TRY-CATCH TO DEBUG LOADING ISSUES
                        $participants->load([
                            'user.profile.province',
                            'user.profile.regency',
                            'user.profile.district',
                            'batch',
                            'participantGroup'
                        ]);
                        
                        // Load payments for "Metode Daftar" column
                        $participants->load(['user.payments' => function ($query) use ($activityId) {
                            $query->where('activity_id', $activityId)
                                ->orderBy('id', 'desc')
                                ->with(['paymentMethod', 'verifier', 'user']);
                        }]);

                        if ($participants->isNotEmpty()) {
                            $firstP = $participants->first();
                            \Log::info('DEBUG FIRST PARTICIPANT RELATIONS', [
                                'user_id' => $firstP->user_id,
                                'has_user' => (bool)$firstP->user,
                                'has_profile' => (bool)($firstP->user->profile ?? false),
                                'province_data' => $firstP->user->profile->province ?? 'NULL',
                                'regency_data' => $firstP->user->profile->regency ?? 'NULL',
                            ]);
                        }


                    // Build bulk group user ids from payments (notes user_ids)
                    try {
                        $decodeNotes = function ($notes) {
                            if (is_array($notes)) {
                                return $notes;
                            }
                            if (! is_string($notes) || trim($notes) === '') {
                                return null;
                            }
                            $decoded = json_decode($notes, true);
                            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                                return $decoded;
                            }
                            // Try to extract JSON from mixed string
                            $start = strpos($notes, '{');
                            $end = strrpos($notes, '}');
                            if ($start !== false && $end !== false && $end > $start) {
                                $candidate = substr($notes, $start, $end - $start + 1);
                                $decoded = json_decode($candidate, true);
                                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                                    return $decoded;
                                }
                            }
                            return null;
                        };

                        // Optimasi: Hanya ambil payment yang memiliki notes dan kemungkinan berisi user_ids/bulk_import
                        // Select hanya kolom yang diperlukan
                        $payments = Payment::select('id', 'activity_id', 'user_id', 'notes')
                            ->where('activity_id', $activityId)
                            ->whereNotNull('notes')
                            ->where(function($q) {
                                $q->where('notes', 'like', '%user_ids%')
                                  ->orWhere('notes', 'like', '%bulk_import%');
                            })
                            ->get();

                        $bulkSet = [];
                        foreach ($payments as $p) {
                            $decoded = $decodeNotes($p->notes);
                            if (is_array($decoded)) {
                                $uids = [];
                                if (! empty($decoded['user_ids']) && is_array($decoded['user_ids'])) {
                                    $uids = $decoded['user_ids'];
                                } elseif (! empty($decoded['bulk_import']) && is_array($decoded['bulk_import']) && ! empty($decoded['bulk_import']['user_ids'])) {
                                    $uids = $decoded['bulk_import']['user_ids'];
                                }

                                if (! empty($uids)) {
                                    foreach ($uids as $uid) {
                                        if ($uid) {
                                            $bulkSet[(string) $uid] = true;
                                        }
                                    }
                                }
                            }
                        }

                        if (! empty($bulkSet)) {
                            $bulkGroupUserIds = array_keys($bulkSet);
                        }
                    } catch (\Exception $e) {
                        \Log::warning('Failed to build bulk group user ids', ['error' => $e->getMessage()]);
                    }

                    // ATTACH GROUP MEMBERS TO PAYMENTS
                    try {
                        $referencedUserIds = [];
                        $paymentMap = []; // payment_id -> [user_ids]

                        foreach ($participants as $participant) {
                            if ($participant->user && $participant->user->payments) {
                                foreach ($participant->user->payments as $payment) {
                                    if ($payment->notes) {
                                        $decoded = $decodeNotes($payment->notes);
                                        if (is_array($decoded)) {
                                            $uids = [];
                                            if (! empty($decoded['user_ids']) && is_array($decoded['user_ids'])) {
                                                $uids = $decoded['user_ids'];
                                            } elseif (! empty($decoded['bulk_import']) && is_array($decoded['bulk_import']) && ! empty($decoded['bulk_import']['user_ids'])) {
                                                $uids = $decoded['bulk_import']['user_ids'];
                                            }

                                            if (! empty($uids)) {
                                                $uniqueUids = array_unique($uids);
                                                $paymentMap[$payment->id] = $uniqueUids;
                                                foreach ($uniqueUids as $uid) {
                                                    $referencedUserIds[] = $uid;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        $referencedUserIds = array_unique($referencedUserIds);
                        $usersMap = [];
                        if (! empty($referencedUserIds)) {
                            $usersMap = User::whereIn('id', $referencedUserIds)
                                ->select('id', 'name', 'email')
                                ->get()
                                ->keyBy('id');
                        }

                        foreach ($participants as $participant) {
                            if ($participant->user && $participant->user->payments) {
                                foreach ($participant->user->payments as $payment) {
                                    if (isset($paymentMap[$payment->id])) {
                                        $members = [];
                                        foreach ($paymentMap[$payment->id] as $uid) {
                                            if (isset($usersMap[$uid])) {
                                                $members[] = $usersMap[$uid];
                                            }
                                        }
                                        $payment->setRelation('group_members', collect($members));
                                        $payment->is_group_payment = true;
                                    } else {
                                        $payment->setRelation('group_members', collect([]));
                                        $payment->is_group_payment = false;
                                    }
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        \Log::warning('Failed to attach group members to payments', ['error' => $e->getMessage()]);
                    }

                    // Loop for nested relationships removed as it is now handled by eager loading above
                }
            } catch (\Exception $e) {
                \Log::error('Failed to load participants', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                $participants = collect();
            }

            // Load rooms
            $rooms = collect();
            try {
                $rooms = ActivityHotelRoom::where('activity_id', $activityId)
                    ->orderBy('room_number')
                    ->get();
            } catch (\Exception $e) {
                \Log::warning('Failed to load rooms', ['error' => $e->getMessage()]);
            }

            // Load hotels
            $hotels = collect();
            try {
                $hotels = ActivityHotelRoom::where('activity_id', $activityId)
                    ->whereNotNull('hotel_name')
                    ->distinct()
                    ->orderBy('hotel_name')
                    ->pluck('hotel_name');
            } catch (\Exception $e) {
                \Log::warning('Failed to load hotels', ['error' => $e->getMessage()]);
            }

            // Filter assignments by batch if selected
            $assignments = collect();
            try {
                $assignmentsQuery = ActivityHotelRoomAssignment::where('activity_id', $activityId);
                if ($selectedBatchId) {
                    $assignmentsQuery->where('activity_batch_id', $selectedBatchId);
                }
                $assignments = $assignmentsQuery->get()->keyBy('user_id');
            } catch (\Exception $e) {
                \Log::warning('Failed to load assignments', ['error' => $e->getMessage()]);
            }

            // Attach Payment and Room Relation to each participant manually
            $assignmentsKeyed = $assignments ?? collect();
            $roomsKeyed = $rooms->keyBy('id');

            if ($participants instanceof LengthAwarePaginator || $participants instanceof Collection) {
                foreach ($participants as $participant) {
                    // Payment
                    $payment = null;
                    if ($participant->user && $participant->user->payments) {
                        // Filter payments to find one that actually covers this user
                        $payment = $participant->user->payments
                            ->where('activity_id', $activityId)
                            ->filter(function ($p) use ($participant) {
                                // If it's not a group payment, it applies to the payer (this user)
                                if (empty($p->is_group_payment)) {
                                    return true;
                                }
                                
                                // If it IS a group payment, the user must be in the group members
                                // We check the manually attached group_members relation
                                if ($p->relationLoaded('group_members')) {
                                    return $p->group_members->contains('id', $participant->user_id);
                                }
                                
                                return false; 
                            })
                            ->sortByDesc('created_at')
                            ->first();
                    }
                    $participant->setRelation('payment', $payment);

                    // Room
                    $room = null;
                    if (isset($assignmentsKeyed[$participant->user_id])) {
                        $assignment = $assignmentsKeyed[$participant->user_id];
                        if ($assignment->room_id && isset($roomsKeyed[$assignment->room_id])) {
                            $room = $roomsKeyed[$assignment->room_id];
                        }
                    }
                    $participant->setRelation('room', $room);
                }
            }


            // Occupancy counts per room
            $occupancy = [];
            $roomOccupants = [];
            try {
                $occupancyQuery = ActivityHotelRoomAssignment::select('room_id', DB::raw('COUNT(*) as count'))
                    ->where('activity_id', $activityId);

                if ($selectedBatchId) {
                    $occupancyQuery->where('activity_batch_id', $selectedBatchId);
                }

                $occupancy = $occupancyQuery->groupBy('room_id')
                    ->pluck('count', 'room_id')
                    ->toArray();

                // Load detailed room occupants
                $assignmentsList = ActivityHotelRoomAssignment::with('user:id,name,email')
                    ->where('activity_id', $activityId);

                if ($selectedBatchId) {
                    $assignmentsList->where('activity_batch_id', $selectedBatchId);
                }

                $assignmentsCollection = $assignmentsList->get();

                // Group by room_id
                foreach ($assignmentsCollection as $assignment) {
                    if ($assignment->room_id && $assignment->user) {
                        $roomOccupants[$assignment->room_id][] = $assignment->user;
                    }
                }

            } catch (\Exception $e) {
                \Log::warning('Failed to load occupancy', ['error' => $e->getMessage()]);
            }

            // Get unassigned participants for dropdown
            $unassignedParticipants = collect();
            try {
                // Get all participant user IDs
                $allParticipantIds = ActivityUser::where('activity_id', $activityId)
                    ->when($selectedBatchId, function ($q) use ($selectedBatchId) {
                        $q->where('activity_batch_id', $selectedBatchId);
                    })
                    ->pluck('user_id')
                    ->toArray();

                // Get assigned user IDs
                $assignedUserIds = ActivityHotelRoomAssignment::where('activity_id', $activityId)
                    ->when($selectedBatchId, function ($q) use ($selectedBatchId) {
                        $q->where('activity_batch_id', $selectedBatchId);
                    })
                    ->pluck('user_id')
                    ->toArray();

                $unassignedIds = array_diff($allParticipantIds, $assignedUserIds);

                if (! empty($unassignedIds)) {
                    $unassignedParticipants = User::whereIn('id', $unassignedIds)
                        ->orderBy('name')
                        ->get(['id', 'name']);
                }
            } catch (\Exception $e) {
                \Log::warning('Failed to load unassigned participants', ['error' => $e->getMessage()]);
            }

            // OPTIMIZED: Cache Filter Options to avoid heavy queries on every request
            $filterOptionsCacheKey = "activity_participant_filter_options_{$activityId}_v4";
            $filterOptions = Cache::remember($filterOptionsCacheKey, 3600, function () use ($activityId) {
                $options = [];
                
                // Helper to get distinct profile fields
                $getProfileFieldOptions = function($field) use ($activityId) {
                    return DB::table('activity_users')
                        ->join('users', 'activity_users.user_id', '=', 'users.id')
                        ->join('profiles', 'users.id', '=', 'profiles.user_id')
                        ->where('activity_users.activity_id', $activityId)
                        ->whereNotNull("profiles.$field")
                        ->where("profiles.$field", '!=', '')
                        ->where("profiles.$field", '!=', '-')
                        ->select("profiles.$field")
                        ->distinct()
                        ->pluck($field)
                        ->sort(SORT_NATURAL | SORT_FLAG_CASE)
                        ->values();
                };

                $options['instansi'] = $getProfileFieldOptions('instansi');
                $options['pekerjaan'] = $getProfileFieldOptions('pekerjaan');
                $options['jabatan'] = $getProfileFieldOptions('jabatan');
                $options['jenis_kelamin'] = $getProfileFieldOptions('jenis_kelamin');
                $options['birth_place'] = $getProfileFieldOptions('birth_place');
                $options['no_hp'] = $getProfileFieldOptions('no_hp');
                $options['nik'] = $getProfileFieldOptions('nik');
                $options['address'] = $getProfileFieldOptions('alamat');
                
                // User fields
                $options['name'] = DB::table('activity_users')
                    ->join('users', 'activity_users.user_id', '=', 'users.id')
                    ->where('activity_users.activity_id', $activityId)
                    ->select('users.name')
                    ->distinct()
                    ->pluck('name')
                    ->sort(SORT_NATURAL | SORT_FLAG_CASE)
                    ->values();

                $options['email'] = DB::table('activity_users')
                    ->join('users', 'activity_users.user_id', '=', 'users.id')
                    ->where('activity_users.activity_id', $activityId)
                    ->select('users.email')
                    ->distinct()
                    ->pluck('email')
                    ->sort(SORT_NATURAL | SORT_FLAG_CASE)
                    ->values();

                // Region Names
                $options['province_name'] = DB::table('activity_users')
                    ->join('users', 'activity_users.user_id', '=', 'users.id')
                    ->join('profiles', 'users.id', '=', 'profiles.user_id')
                    ->join('provinces', 'profiles.province_id', '=', 'provinces.id')
                    ->where('activity_users.activity_id', $activityId)
                    ->select('provinces.name')
                    ->distinct()
                    ->pluck('name')
                    ->sort()
                    ->values();

                $options['regency_name'] = DB::table('activity_users')
                    ->join('users', 'activity_users.user_id', '=', 'users.id')
                    ->join('profiles', 'users.id', '=', 'profiles.user_id')
                    ->join('regencies', 'profiles.regency_id', '=', 'regencies.id')
                    ->where('activity_users.activity_id', $activityId)
                    ->select('regencies.name')
                    ->distinct()
                    ->pluck('name')
                    ->sort()
                    ->values();

                $options['district_name'] = DB::table('activity_users')
                    ->join('users', 'activity_users.user_id', '=', 'users.id')
                    ->join('profiles', 'users.id', '=', 'profiles.user_id')
                    ->join('districts', 'profiles.district_id', '=', 'districts.id')
                    ->where('activity_users.activity_id', $activityId)
                    ->select('districts.name')
                    ->distinct()
                    ->pluck('name')
                    ->sort()
                    ->values();
                
                // Birth Year
                $options['birth_year'] = DB::table('activity_users')
                    ->join('users', 'activity_users.user_id', '=', 'users.id')
                    ->join('profiles', 'users.id', '=', 'profiles.user_id')
                    ->where('activity_users.activity_id', $activityId)
                    ->whereNotNull('profiles.birth_date')
                    ->selectRaw('YEAR(profiles.birth_date) as year')
                    ->distinct()
                    ->pluck('year')
                    ->sort()
                    ->values();

                // Room Numbers
                $options['room_number'] = DB::table('activity_hotel_rooms')
                    ->where('activity_id', $activityId)
                    ->whereNotNull('room_number')
                    ->select('room_number')
                    ->distinct()
                    ->pluck('room_number')
                    ->sort(SORT_NATURAL | SORT_FLAG_CASE)
                    ->values();

                // Payment Methods
                $options['payment_method'] = DB::table('payments')
                    ->leftJoin('payment_methods', 'payments.payment_method_id', '=', 'payment_methods.id')
                    ->where('payments.activity_id', $activityId)
                    ->select(DB::raw('COALESCE(payment_methods.name, IF(payments.midtrans_transaction_id IS NOT NULL, "Payment Gateway (Otomatis)", "Transfer Bank (Manual)")) as method_name'))
                    ->distinct()
                    ->pluck('method_name')
                    ->filter(fn($v) => $v && $v !== '-')
                    ->sort(SORT_NATURAL | SORT_FLAG_CASE)
                    ->values();
                    
                // Status
                $options['status'] = DB::table('activity_users')
                    ->where('activity_id', $activityId)
                    ->whereNotNull('status')
                    ->select('status')
                    ->distinct()
                    ->pluck('status')
                    ->sort()
                    ->values();
                
                return $options;
            });

            $instansiOptions = $filterOptions['instansi'];
            $pekerjaanOptions = $filterOptions['pekerjaan'];
            $jabatanOptions = $filterOptions['jabatan'];
            $genderOptions = $filterOptions['jenis_kelamin'];
            $birthPlaceOptions = $filterOptions['birth_place'];
            $birthYearOptions = $filterOptions['birth_year'];
            $roomOptions = $filterOptions['room_number'];
            $statusOptions = $filterOptions['status'];
            $paymentMethodOptions = $filterOptions['payment_method'];
            $nameOptions = $filterOptions['name'];
            $emailOptions = $filterOptions['email'];
            $hpOptions = $filterOptions['no_hp'];
            $nikOptions = $filterOptions['nik'];
            $addressOptions = $filterOptions['address'];
            $provinceOptions = $filterOptions['province_name'];
            $regencyNameOptions = $filterOptions['regency_name'];
            $districtNameOptions = $filterOptions['district_name'];
            
            // Empty flags for UI (simplified)
            $hasUnspecifiedGender = true; 
            $hasUnspecifiedBirthPlace = true;
            $hasUnspecifiedBirthYear = true;

            $registrationMethodOptions = collect([
                ['value' => 'mandiri', 'label' => 'Mandiri'],
                ['value' => 'kelompok', 'label' => 'Kelompok']
            ]);

            // NOTE: Manual filtering and manual pagination removed. 
            // We now rely on Eloquent filtering (applied before pagination) and standard Pagination.


            // Load all regions for lookup modal and filters - CACHED
            // Cache global regions for 24 hours as they change rarely
            $provinces = Cache::remember('all_provinces', 86400, function() {
                return Province::orderBy('name')->get(['id', 'name']);
            });

            $regencies = Cache::remember('all_regencies', 86400, function() {
                return Regency::orderBy('name')->get(['id', 'name', 'province_id']);
            });

            $districts = Cache::remember('all_districts', 86400, function() {
                return District::orderBy('name')->get(['id', 'name', 'regency_id']);
            });


            $customKeys = [];
            $baseKeys = [];

            $builtinTemplateKeys = array_fill_keys([
                'email',
                'name',
                'password',
                'no_hp',
                'nik',
                'gender',
                'birth_place',
                'birth_date',
                'address',
                'province_id',
                'regency_id',
                'district_id',
                'institution',
                'occupation',
                'category',
                'position',
            ], true);

            if (Schema::hasTable('activities') && Schema::hasColumn('activities', 'import_template')) {
                try {
                    Activity::query()
                        ->whereNotNull('import_template')
                        ->select('id', 'import_template')
                        ->chunkById(200, function ($activities) use (&$baseKeys, $builtinTemplateKeys) {
                            foreach ($activities as $act) {
                                $template = (string) ($act->import_template ?? '');
                                if ($template === '') {
                                    continue;
                                }
                                $columns = array_values(array_filter(array_map('trim', explode(',', $template))));
                                foreach ($columns as $col) {
                                    $key = $this->normalizeImportKey($col);
                                    if ($key === '') {
                                        continue;
                                    }
                                    $lower = strtolower($key);
                                    if (isset($builtinTemplateKeys[$lower])) {
                                        continue;
                                    }
                                    $baseKeys[$lower] = $baseKeys[$lower] ?? $key;
                                }
                            }
                        });
                } catch (\Throwable $e) {
                    \Log::warning('Failed to load custom keys from activities', ['error' => $e->getMessage()]);
                }
            }

            if (Schema::hasTable($activityUserTable) && Schema::hasColumn($activityUserTable, 'custom_data')) {
                try {
                    ActivityUser::query()
                        ->from($activityUserTable)
                        ->whereNotNull('custom_data')
                        ->select('id', 'custom_data')
                        ->chunkById(500, function ($chunk) use (&$baseKeys) {
                            foreach ($chunk as $row) {
                                $data = $row->custom_data;
                                if (is_string($data)) {
                                    $decoded = json_decode($data, true);
                                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                                        $data = $decoded;
                                    }
                                }
                                if (is_array($data)) {
                                    foreach (array_keys($data) as $key) {
                                        $base = $this->normalizeImportKey($key);
                                        if ($base === '') {
                                            continue;
                                        }
                                        $baseLower = strtolower($base);
                                        $baseKeys[$baseLower] = $baseKeys[$baseLower] ?? $base;
                                    }
                                }
                            }
                        });
                } catch (\Throwable $e) {
                    \Log::warning('Failed to load custom keys from activity users', ['error' => $e->getMessage()]);
                }
            }

            if (! empty($baseKeys)) {
                $customKeys = array_values($baseKeys);
                sort($customKeys, SORT_NATURAL | SORT_FLAG_CASE);
            }

            $templateOptions = [
                ['value' => 'user:name', 'label' => 'Nama Lengkap'],
                ['value' => 'user:email', 'label' => 'Email'],
                ['value' => 'user:password', 'label' => 'Password'],
                ['value' => 'profile:no_hp', 'label' => 'No HP/WA'],
                ['value' => 'profile:nik', 'label' => 'NIK'],
                ['value' => 'profile:gender', 'label' => 'Jenis Kelamin (L/P)'],
                ['value' => 'profile:birth_place', 'label' => 'Tempat Lahir'],
                ['value' => 'profile:birth_date', 'label' => 'Tanggal Lahir (YYYY-MM-DD)'],
                ['value' => 'profile:address', 'label' => 'Alamat Lengkap'],
                ['value' => 'province', 'label' => 'Provinsi (Nama)'],
                ['value' => 'regency', 'label' => 'Kabupaten/Kota (Nama)'],
                ['value' => 'district', 'label' => 'Kecamatan (Nama)'],
                ['value' => 'profile:province_id', 'label' => 'Provinsi (ID)'],
                ['value' => 'profile:regency_id', 'label' => 'Kabupaten/Kota (ID)'],
                ['value' => 'profile:district_id', 'label' => 'Kecamatan (ID)'],
                ['value' => 'profile:institution', 'label' => 'Instansi'],
                ['value' => 'profile:occupation', 'label' => 'Pekerjaan'],
                ['value' => 'profile:position', 'label' => 'Jabatan'],
            ];

            if (! empty($customKeys)) {
                $templateOptions[] = ['value' => '__separator__', 'label' => '------ Kolom Tambahan ------'];
                foreach ($customKeys as $key) {
                    $exists = false;
                    foreach ($templateOptions as $opt) {
                        if ($opt['value'] === $key || $opt['value'] === "user:$key" || $opt['value'] === "profile:$key") {
                            $exists = true;
                            break;
                        }
                    }
                    if (! $exists) {
                        $label = ucfirst(str_replace('_', ' ', $key));
                        $templateOptions[] = ['value' => $key, 'label' => $label . ' (Kolom Tambahan)'];
                    }
                }
            }

            // Load column settings
            $columnSettings = $activity->column_settings ?? [];

            \Log::info('participants method: columnSettings loaded', [
                'activity_id' => $activityId,
                'column_settings' => $columnSettings
            ]);

            // Load participant groups
            $participantGroups = ActivityParticipantGroup::where('activity_id', $activityId)
                ->withCount('participants')
                ->get();

            // DEBUG CHECK
            \Log::info('DEBUG FINAL CHECK', [
                'activity_uid' => $activity->uid,
                'participants_count' => $participants->count(),
                'page' => $page ?? 1,
                'perPage' => $perPage,
                'items_on_page' => $participants->count(), // Paginator count is count of items on page
                'total' => $participants->total(),
                'request' => request()->all()
            ]);

            // Ensure per_page is in filters for frontend state sync
            $filters = request()->all();
            if (!isset($filters['per_page'])) {
                $filters['per_page'] = $perPage;
            }

            return Inertia::render('Activity/Participants/Index', [
                'activity' => $activity,
                'participants' => $participants,
                'rooms' => $rooms,
                'assignments' => $assignments,
                'occupancy' => $occupancy,
                'roomOccupants' => $roomOccupants,
                'unassignedParticipants' => $unassignedParticipants,
                'batches' => $batches,
                'selectedBatchId' => $selectedBatchId,
                'hotels' => $hotels,
                'totalProvinces' => $totalProvinces,
                'totalRegencies' => $totalRegencies,
                'totalDistricts' => $totalDistricts,
                'provinces' => $provinces,
                'regencies' => $regencies,
                'districts' => $districts,
                'otherDistricts' => $otherDistricts,
                'selectedRegencyId' => $selectedRegencyId,
                'templateOptions' => $templateOptions,
                'columnSettings' => $columnSettings,
                'customKeys' => $customKeys,
                'participantGroups' => $participantGroups,
                'committeeUserIds' => $committeeUserIds,
                'instansiOptions' => $instansiOptions,
                'pekerjaanOptions' => $pekerjaanOptions,
                'jabatanOptions' => $jabatanOptions,
                'genderOptions' => $genderOptions,
                'hasUnspecifiedGender' => $hasUnspecifiedGender,
                'birthPlaceOptions' => $birthPlaceOptions,
                'birthYearOptions' => $birthYearOptions,
                'nameOptions' => $nameOptions,
                'emailOptions' => $emailOptions,
                'hpOptions' => $hpOptions,
                'nikOptions' => $nikOptions,
                'addressOptions' => $addressOptions,
                'roomOptions' => $roomOptions,
                'provinceOptions' => $provinceOptions,
                'regencyNameOptions' => $regencyNameOptions,
                'districtNameOptions' => $districtNameOptions,
                'statusOptions' => $statusOptions,
                'paymentMethodOptions' => $paymentMethodOptions,
                'registrationMethodOptions' => $registrationMethodOptions,
                'hasUnspecifiedBirthPlace' => $hasUnspecifiedBirthPlace,
                'hasUnspecifiedBirthYear' => $hasUnspecifiedBirthYear,
                'bulkGroupUserIds' => $bulkGroupUserIds,
                'filters' => $filters
            ]);

        } catch (\Exception $e) {
            \Log::error('Error in participants method', [
                'activity_id' => $activityId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Return with empty data to avoid complete failure
            $participants = new LengthAwarePaginator(
                collect(), 0, 15, 1, ['path' => request()->url(), 'query' => request()->query()]
            );

            return Inertia::render('Activity/Participants/Index', [
                'activity' => Activity::find($activityId) ?? new Activity,
                'participants' => $participants,
                'rooms' => collect(),
                'assignments' => collect(),
                'occupancy' => [],
                'roomOccupants' => [],
                'unassignedParticipants' => collect(),
                'batches' => collect(),
                'selectedBatchId' => null,
                'hotels' => collect(),
                'provinces' => collect(),
                'regencies' => collect(),
                'districts' => collect(),
                'totalProvinces' => 0,
                'totalRegencies' => 0,
                'totalDistricts' => 0,
                'otherDistricts' => collect(),
                'selectedRegencyId' => null,
                'templateOptions' => [],
                'columnSettings' => [],
                'customKeys' => [],
                'participantGroups' => collect(),
                'committeeUserIds' => [],
                'instansiOptions' => collect(),
                'pekerjaanOptions' => collect(),
                'jabatanOptions' => collect(),
                'genderOptions' => collect(),
                'hasUnspecifiedGender' => false,
                'birthPlaceOptions' => collect(),
                'hasUnspecifiedBirthPlace' => false,
                'birthYearOptions' => collect(),
                'nameOptions' => collect(),
                'emailOptions' => collect(),
                'provinceOptions' => collect(),
                'regencyNameOptions' => collect(),
                'districtNameOptions' => collect(),
                'statusOptions' => collect(),
                'paymentMethodOptions' => collect(),
                'registrationMethodOptions' => collect(),
                'hasUnspecifiedBirthYear' => false,
                'bulkGroupUserIds' => [],
                'filters' => request()->all()
            ])->with('error', 'Terjadi kesalahan saat memuat data peserta. Silakan refresh halaman.');
        }
    }

    public function storeRoom(Request $request, $activityId)
    {
        $activity = Activity::findOrFail($activityId);
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403);
            }
        }
        $data = $request->validate([
            'activity_batch_id' => 'nullable|exists:activity_batches,id',
            'hotel_name' => 'nullable|string|max:128',
            'room_number' => 'required|string|max:64',
            'capacity' => 'required|integer|min:0|max:1000',
            'notes' => 'nullable|string',
        ]);

        $room = ActivityHotelRoom::create([
            'activity_id' => $activityId,
            'activity_batch_id' => $data['activity_batch_id'] ?? null,
            'hotel_name' => $data['hotel_name'] ?? null,
            'room_number' => $data['room_number'],
            'capacity' => $data['capacity'],
            'notes' => $data['notes'] ?? null,
        ]);

        if ($request->ajax()) {
            $occupancy = 0;
            $rowHtml = '
            <tr>
                <td class="px-4 py-2 whitespace-nowrap">'.($room->hotel_name ?? '-').'</td>
                <td class="px-4 py-2 whitespace-nowrap font-medium">'.$room->room_number.'</td>
                <td class="px-4 py-2 whitespace-nowrap">'.((int) $room->capacity > 0 ? $room->capacity : 'Tak terbatas').'</td>
                <td class="px-4 py-2 whitespace-nowrap">0</td>
                <td class="px-4 py-2 whitespace-nowrap text-gray-500">'.$room->notes.'</td>
                <td class="px-4 py-2 whitespace-nowrap text-right">
                    <form action="'.route('activity.participants.rooms.destroy', [$activity->id, $room->id]).'" method="POST" onsubmit="return confirm(\'Hapus kamar ini beserta penugasan pesertanya?\');" class="inline">
                        '.csrf_field().'
                        '.method_field('DELETE').'
                        <button class="text-red-600 hover:text-red-900 font-medium">Hapus</button>
                    </form>
                </td>
            </tr>';

            return response()->json([
                'status' => 'success',
                'message' => 'Kamar berhasil ditambahkan',
                'room' => $room,
                'html' => $rowHtml,
            ]);
        }

        return redirect()
            ->back()
            ->with('success', 'Kamar ditambahkan')
            ->withInput(array_merge($data, ['room_number' => '']));
    }

    public function updateRoom(Request $request, $activityId, $roomId)
    {
        $activity = Activity::findOrFail($activityId);
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403);
            }
        }
        $data = $request->validate([
            'activity_batch_id' => 'nullable|exists:activity_batches,id',
            'hotel_name' => 'nullable|string|max:128',
            'room_number' => 'required|string|max:64',
            'capacity' => 'required|integer|min:0|max:1000',
            'notes' => 'nullable|string',
        ]);
        $room = ActivityHotelRoom::where('activity_id', $activityId)->findOrFail($roomId);
        $room->update($data);

        return redirect()->back()->with('success', 'Kamar diperbarui');
    }

    public function destroyRoom($activityId, $roomId)
    {
        $activity = Activity::findOrFail($activityId);
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403);
            }
        }
        $room = ActivityHotelRoom::where('activity_id', $activityId)->findOrFail($roomId);
        ActivityHotelRoomAssignment::where('room_id', $room->id)->delete();
        $room->delete();

        return redirect()->back()->with('success', 'Kamar dihapus');
    }

    public function destroyRoomsBatch(Request $request, $activityId)
    {
        $activity = Activity::findOrFail($activityId);
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403);
            }
        }

        $request->validate([
            'room_ids' => 'required|array',
            'room_ids.*' => 'exists:activity_hotel_rooms,id',
        ]);

        $count = 0;
        foreach ($request->room_ids as $roomId) {
            $room = ActivityHotelRoom::where('activity_id', $activityId)->find($roomId);
            if ($room) {
                ActivityHotelRoomAssignment::where('room_id', $room->id)->delete();
                $room->delete();
                $count++;
            }
        }

        return redirect()->back()->with('success', $count.' kamar berhasil dihapus');
    }

    public function activateRoomsBatch(Request $request, $activityId)
    {
        $activity = Activity::findOrFail($activityId);
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403);
            }
        }

        $request->validate([
            'room_ids' => 'required|array',
            'room_ids.*' => 'exists:activity_hotel_rooms,id',
        ]);

        $updated = ActivityHotelRoom::where('activity_id', $activityId)
            ->whereIn('id', $request->room_ids)
            ->update(['is_active' => true]);

        return redirect()->back()->with('success', $updated.' kamar diaktifkan');
    }

    public function deactivateRoomsBatch(Request $request, $activityId)
    {
        $activity = Activity::findOrFail($activityId);
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403);
            }
        }

        $request->validate([
            'room_ids' => 'required|array',
            'room_ids.*' => 'exists:activity_hotel_rooms,id',
        ]);

        $updated = ActivityHotelRoom::where('activity_id', $activityId)
            ->whereIn('id', $request->room_ids)
            ->update(['is_active' => false]);

        return redirect()->back()->with('success', $updated.' kamar dinonaktifkan');
    }

    /**
     * Toggle room active status
     */
    public function toggleRoomStatus($activityId, $roomId)
    {
        $activity = Activity::findOrFail($activityId);
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403);
            }
        }

        $room = ActivityHotelRoom::where('activity_id', $activityId)->findOrFail($roomId);
        $room->is_active = ! $room->is_active;
        $room->save();

        $status = $room->is_active ? 'diaktifkan' : 'dinonaktifkan';

        return redirect()->back()->with('success', "Kamar {$room->room_number} berhasil {$status}");
    }

    /**
     * Import rooms from Excel/CSV
     */
    public function importRooms(Request $request, $activityId)
    {
        $activity = Activity::findOrFail($activityId);
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403);
            }
        }

        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv',
            'activity_batch_id' => 'nullable|exists:activity_batches,id',
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();

        $inserted = 0;
        $updated = 0;
        $skipped = 0;
        $failures = [];

        try {
            $spreadsheet = IOFactory::load($path);
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray(null, true, true, true);

            $header = array_map(function ($v) {
                return strtolower(trim((string) $v));
            }, $rows[1] ?? []);
            $colHotel = array_search('hotel', $header, true);
            $colRoom = array_search('room_number', $header, true);
            $colCapacity = array_search('capacity', $header, true);
            $colNotes = array_search('notes', $header, true);

            if ($colRoom === false) {
                throw new \RuntimeException('Kolom room_number wajib ada di baris header.');
            }

            for ($i = 2; $i <= count($rows); $i++) {
                $row = $rows[$i] ?? [];
                $hotel = $colHotel !== false ? trim((string) ($row[$colHotel] ?? '')) : null;
                $roomNumber = trim((string) ($row[$colRoom] ?? ''));
                $capacityStr = $colCapacity !== false ? trim((string) ($row[$colCapacity] ?? '')) : '';
                $notes = $colNotes !== false ? trim((string) ($row[$colNotes] ?? '')) : '';

                if ($roomNumber === '') {
                    $skipped++;

                    continue;
                }

                $capacity = is_numeric($capacityStr) ? (int) $capacityStr : 0;

                $query = ActivityHotelRoom::where('activity_id', $activityId)->where('room_number', $roomNumber);
                if ($hotel !== null && $hotel !== '') {
                    $query->where('hotel_name', $hotel);
                } else {
                    $query->whereNull('hotel_name');
                }

                // If batch is provided, scope to that batch (or null if not provided)
                if ($request->activity_batch_id) {
                    $query->where('activity_batch_id', $request->activity_batch_id);
                } else {
                    $query->whereNull('activity_batch_id');
                }

                $existing = $query->first();

                if ($existing) {
                    $existing->update([
                        'capacity' => $capacity,
                        'notes' => $notes !== '' ? $notes : $existing->notes,
                        'activity_batch_id' => $request->activity_batch_id,
                    ]);
                    $updated++;
                } else {
                    ActivityHotelRoom::create([
                        'activity_id' => $activityId,
                        'activity_batch_id' => $request->activity_batch_id,
                        'hotel_name' => ($hotel !== null && $hotel !== '') ? $hotel : null,
                        'room_number' => $roomNumber,
                        'capacity' => $capacity,
                        'notes' => $notes !== '' ? $notes : null,
                    ]);
                    $inserted++;
                }
            }

            return redirect()->back()->with('success', "Impor kamar selesai. Ditambah: $inserted, Diupdate: $updated, Dilewati: $skipped");
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'Gagal mengimpor kamar: '.$e->getMessage());
        }
    }

    /**
     * Download Excel template for rooms
     */
    public function downloadRoomsTemplate($activityId)
    {
        $activity = Activity::findOrFail($activityId);
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403);
            }
        }
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setCellValue('A1', 'hotel');
        $sheet->setCellValue('B1', 'room_number');
        $sheet->setCellValue('C1', 'capacity');
        $sheet->setCellValue('D1', 'notes');
        $sheet->setCellValue('A2', 'GrandHotel');
        $sheet->setCellValue('B2', '101');
        $sheet->setCellValue('C2', '2');
        $sheet->setCellValue('D2', 'Dekat lift');

        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
        $filename = 'template_kamar_activity_'.$activityId.'.xlsx';
        $tmp = tempnam(sys_get_temp_dir(), 'rooms_template_');
        $writer->save($tmp);

        return response()->download($tmp, $filename)->deleteFileAfterSend(true);
    }

    private function columnLetter($index)
    {
        // Convert 0-based index to Excel column letter (A, B, C ...)
        $letters = range('A', 'Z');

        return $letters[$index] ?? 'A';
    }

    private function normalizeImportKey($raw): string
    {
        $key = preg_replace('/^\d+\./', '', (string) $raw);
        $key = trim((string) $key);
        $key = preg_replace('/\{[^}]*\}/', '', (string) $key);
        $key = trim((string) $key);
        if ($key !== '' && str_ends_with($key, '*')) {
            $key = trim(substr($key, 0, -1));
        }
        if ($key !== '' && str_contains($key, '|')) {
            $key = trim(explode('|', $key, 2)[0]);
        }

        $lower = strtolower($key);
        if (str_starts_with($lower, 'user:')) {
            $key = trim(substr($key, 5));
            $lower = strtolower($key);
        }
        if (str_starts_with($lower, 'profile:')) {
            $key = trim(substr($key, 8));
        }

        return trim((string) $key);
    }

    public function assignRoom(Request $request, $activityId)
    {
        $activity = Activity::findOrFail($activityId);
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && $activity->user_id !== auth()->id()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403);
            }
        }
        $request->validate([
            'user_id' => 'required|string|exists:users,id',
            'room_id' => 'nullable|string|exists:activity_hotel_rooms,id',
            'room_code' => 'nullable|string|max:64',
            'force' => 'nullable|boolean',
        ]);
        $userId = $request->user_id;

        // Find user enrollment to get batch ID
        $enrollment = ActivityUser::where('activity_id', $activityId)
            ->where('user_id', $userId)
            ->first();
        $batchId = $enrollment ? $enrollment->activity_batch_id : null;

        $roomId = $request->room_id ? $request->room_id : null;
        $roomCode = trim((string) $request->room_code);
        $capacityFromCode = null;
        $roomCodeClean = $roomCode;
        if ($roomCode !== '') {
            if (preg_match('/^(.*)\((\d+)(?:\/(\d+))?\)$/', $roomCode, $m)) {
                $roomCodeClean = trim($m[1]);
                $capacityFromCode = isset($m[3]) && $m[3] !== '' ? (int) $m[3] : (int) ($m[2] ?? 0);
                if ($capacityFromCode <= 0) {
                    $capacityFromCode = 1;
                }
            }
        }

        // If a room code is provided, resolve/create room first
        if (! $roomId && $roomCode !== '') {
            $hotelName = null;
            $roomNum = $roomCodeClean;
            if (str_contains($roomCodeClean, '/')) {
                [$hotelName, $roomNum] = array_map('trim', explode('/', $roomCodeClean, 2));
            }
            $query = ActivityHotelRoom::where('activity_id', $activityId)
                ->where('room_number', $roomNum);
            if ($hotelName !== null) {
                $query->where('hotel_name', $hotelName);
            } else {
                $query->whereNull('hotel_name');
            }
            $existing = $query->first();
            if (! $existing) {
                $existing = ActivityHotelRoom::create([
                    'activity_id' => $activityId,
                    'hotel_name' => $hotelName,
                    'room_number' => $roomNum,
                    'capacity' => $capacityFromCode ?? 0,
                    'notes' => null,
                ]);
            }
            // JANGAN PERNAH MENGUBAH KAPASITAS KAMAR YANG SUDAH ADA
            // Kapasitas hanya boleh diubah melalui form "Kelola Kamar" atau import Excel
            // Jika kamar sudah ada, gunakan kapasitas yang sudah ada, jangan ubah menjadi 0
            // Hanya update kapasitas jika capacityFromCode > 0 (ada explicit capacity dari code)
            if ($existing && $capacityFromCode !== null && $capacityFromCode > 0) {
                // Hanya update jika ada explicit capacity yang valid dari code
                if ((int) $existing->capacity !== $capacityFromCode) {
                    $existing->capacity = $capacityFromCode;
                    $existing->save();
                }
            }
            // Jika capacityFromCode === null atau <= 0, pertahankan kapasitas yang sudah ada
            $roomId = $existing->id;
        }

        // Clear assignment when neither room_id nor room_code provided
        if (! $roomId) {
            $deleteQuery = ActivityHotelRoomAssignment::where('activity_id', $activityId)->where('user_id', $userId);
            if ($batchId) {
                $deleteQuery->where('activity_batch_id', $batchId);
            } else {
                $deleteQuery->whereNull('activity_batch_id');
            }
            $deleteQuery->delete();

            return response()->json(['success' => true, 'cleared' => true]);
        }

        $room = ActivityHotelRoom::where('activity_id', $activityId)->findOrFail($roomId);

        // Check capacity BEFORE modifying existing assignments
        $capacityQuery = ActivityHotelRoomAssignment::where('activity_id', $activityId)
            ->where('room_id', $room->id);
        if ($batchId) {
            $capacityQuery->where('activity_batch_id', $batchId);
        }
        $currentCount = $capacityQuery->count();

        if ((int) $room->capacity > 0 && $currentCount >= (int) $room->capacity && ! $request->boolean('force')) {
            return response()->json(['success' => false, 'message' => 'Kapasitas kamar penuh'], 422);
        }

        \DB::beginTransaction();
        try {
            // Ensure single assignment per user in this activity/batch AFTER capacity is confirmed
            $deleteQuery = ActivityHotelRoomAssignment::where('activity_id', $activityId)->where('user_id', $userId);
            if ($batchId) {
                $deleteQuery->where('activity_batch_id', $batchId);
            } else {
                $deleteQuery->whereNull('activity_batch_id');
            }
            $deleteQuery->delete();

            ActivityHotelRoomAssignment::create([
                'activity_id' => $activityId,
                'activity_batch_id' => $batchId,
                'room_id' => $room->id,
                'user_id' => $userId,
            ]);
            \DB::commit();
        } catch (\Throwable $e) {
            \DB::rollBack();

            return response()->json(['success' => false, 'message' => 'Gagal menyimpan: '.$e->getMessage()], 500);
        }

        $countQuery = ActivityHotelRoomAssignment::where('activity_id', $activityId)
            ->where('room_id', $room->id);
        if ($batchId) {
            $countQuery->where('activity_batch_id', $batchId);
        }
        $updatedCount = $countQuery->count();

        return response()->json([
            'success' => true,
            'hotel_name' => $room->hotel_name,
            'room_number' => $room->room_number,
            'occupancy' => $updatedCount,
            'capacity' => (int) $room->capacity,
        ]);
    }

    /**
     * Import participants from Excel/CSV into the activity
     */
    public function importParticipants(Request $request, $activityId)
    {
        \Log::info('Import Participants Request:', [
            'url' => $request->fullUrl(),
            'method' => $request->method(),
            'headers' => $request->headers->all(),
            'all' => $request->all(),
            'file_present' => $request->hasFile('file'),
            'file_valid' => $request->file('file') ? $request->file('file')->isValid() : false,
            'file_mime' => $request->file('file') ? $request->file('file')->getMimeType() : null,
            'file_client_mime' => $request->file('file') ? $request->file('file')->getClientMimeType() : null,
            'type_id' => $request->input('type_id'),
            'item_id' => $request->input('item_id'),
        ]);

        // Tingkatkan batas waktu eksekusi untuk menghindari timeout
        set_time_limit(600); // 10 menit
        ini_set('max_execution_time', 600);

        $activity = Activity::where('uid', $activityId)->first();
        if (! $activity) {
            $activity = Activity::findOrFail($activityId);
        }
        $activityId = $activity->id;

        // Check permission: Admin, SuperAdmin, Creator, Committee, or Authenticated User (for public registration)
        $isOrganizer = auth()->user()->isAdmin() || auth()->user()->isSuperAdmin() || $activity->user_id === auth()->id() || $activity->canManageRegistration(auth()->id());

        if (! $isOrganizer) {
            // If not organizer, must be authenticated
            if (! auth()->check()) {
                abort(401, 'Silakan login terlebih dahulu untuk melakukan pendaftaran kelompok.');
            }
            // Regular users cannot mark as paid
            $markPaid = false;
        } else {
            $markPaid = $request->boolean('mark_paid');
        }

        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv,txt|mimetypes:application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain',
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();

        $inserted = 0;
        $updated = 0;
        $linked = 0;
        $skipped = 0;
        $alreadyLinked = 0;
        
        $stats = [
            'new_users' => 0,
            'existing_users' => 0,
            'new_participants' => 0,
            'already_registered' => 0,
            'total_bill' => 0,
        ];
        $successes = [];
        $failures = [];
        $pendingUserIds = [];
        $isPaidEvent = (float) ($activity->price ?? 0) > 0;

        Log::info('Import Participants Check Paid Status', [
            'activity_id' => $activityId,
            'price' => $activity->price,
            'is_paid_event' => $isPaidEvent,
            'user_is_organizer' => $isOrganizer ?? 'unknown',
            'mark_paid_request' => $request->boolean('mark_paid'),
            'mark_paid_final' => $markPaid,
        ]);
        // markPaid is already determined above based on permissions
        // $markPaid = $request->boolean('mark_paid');
        $typeId = $request->input('type_id');
        $itemId = $request->input('item_id');

        \Log::info('Import Parameters Check:', [
            'type_id' => $typeId,
            'item_id' => $itemId,
            'mark_paid' => $markPaid,
            'is_organizer' => $isOrganizer ?? false,
            'request_all' => $request->all(),
        ]);

        try {
            $spreadsheet = IOFactory::load($path);
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray(null, true, true, true); // Keys by column letters

            Log::info('Import Debug', [
                'path' => $path,
                'total_rows' => count($rows),
                'first_row' => $rows[1] ?? [],
                'second_row' => $rows[2] ?? [],
            ]);

            // Normalize header values
            $normalizeHeader = function ($value) {
                $h = strtolower(trim((string) $value));
                $h = preg_replace('/^\xEF\xBB\xBF/', '', $h); // Strip UTF-8 BOM
                $h = preg_replace('/\s+/', ' ', $h);
                return str_ends_with($h, '*') ? substr($h, 0, -1) : $h;
            };

            // Expect header in first row, fallback to second row if needed
            $headerRowIndex = 1;
            $header = array_map($normalizeHeader, $rows[$headerRowIndex] ?? []);
            $hasEmailHeader = in_array('email', $header, true) || in_array('user:email', $header, true);
            if (! $hasEmailHeader) {
                $altHeader = array_map($normalizeHeader, $rows[2] ?? []);
                $altHasEmail = in_array('email', $altHeader, true) || in_array('user:email', $altHeader, true);
                if ($altHasEmail) {
                    $headerRowIndex = 2;
                    $header = $altHeader;
                }
            }
            $dataStartRow = $headerRowIndex + 1;

            $findHeader = function (array $header, array $aliases, bool $useContains = false) {
                foreach ($header as $colKey => $colName) {
                    foreach ($aliases as $alias) {
                        if ($alias === '') {
                            continue;
                        }
                        if ($colName === $alias) {
                            return $colKey;
                        }
                        if ($useContains && str_contains($colName, $alias)) {
                            return $colKey;
                        }
                    }
                }
                return false;
            };

            $colMap = [
                'email' => array_search('email', $header, true) ?: array_search('user:email', $header, true),
                'name' => array_search('name', $header, true) ?: array_search('user:name', $header, true),
                'password' => array_search('password', $header, true) ?: array_search('user:password', $header, true),
                'no_hp' => array_search('no_hp', $header, true) ?: array_search('profile:no_hp', $header, true),
                'alamat' => array_search('alamat', $header, true) ?: array_search('profile:address', $header, true),
                'jenis_kelamin' => array_search('jenis_kelamin', $header, true) ?: array_search('profile:gender', $header, true),
                'province' =>
                    array_search('province', $header, true)
                    ?: array_search('provinsi', $header, true)
                    ?: array_search('province_name', $header, true)
                    ?: array_search('profile:province_name', $header, true),
                'regency' =>
                    array_search('regency', $header, true)
                    ?: array_search('kabupaten', $header, true)
                    ?: array_search('kota', $header, true)
                    ?: array_search('kabupaten/kota', $header, true)
                    ?: array_search('regency_name', $header, true)
                    ?: array_search('profile:regency_name', $header, true),
                'district' =>
                    array_search('district', $header, true)
                    ?: array_search('kecamatan', $header, true)
                    ?: array_search('district_name', $header, true)
                    ?: array_search('profile:district_name', $header, true),
                'province_id' => array_search('province_id', $header, true) ?: array_search('profile:province_id', $header, true),
                'regency_id' => array_search('regency_id', $header, true) ?: array_search('profile:regency_id', $header, true),
                'district_id' => array_search('district_id', $header, true) ?: array_search('profile:district_id', $header, true),
                'other_province' => array_search('other_province', $header, true),
                'other_regency' => array_search('other_regency', $header, true),
                'other_district' => array_search('other_district', $header, true),
                'pekerjaan' => array_search('pekerjaan', $header, true) ?: array_search('profile:occupation', $header, true),
                'jabatan' => $findHeader($header, ['jabatan', 'profile:position', 'position'])
                    ?: $findHeader($header, ['jabatan', 'position', 'posisi'], true),
                'instansi' => $findHeader($header, ['instansi', 'profile:institution', 'institution'])
                    ?: $findHeader($header, ['instansi', 'institusi', 'institution'], true),
                'nik' => array_search('nik', $header, true) ?: array_search('profile:nik', $header, true),
                'birth_place' => array_search('birth_place', $header, true) ?: array_search('profile:birth_place', $header, true),
                'birth_date' => array_search('birth_date', $header, true) ?: array_search('profile:birth_date', $header, true),
                'sender_name' => array_search('sender_name', $header, true) ?: array_search('nama_pengirim', $header, true) ?: array_search('pengirim', $header, true),
            ];

            // Debug: Log header and colMap
            Log::info('Import header detected', ['header' => $header]);
            Log::info('ColMap result', ['colMap' => $colMap]);

            // Identify custom columns (columns in header that are not mapped in $colMap)
            $usedColKeys = array_filter($colMap, function ($v) {
                return $v !== false;
            });

            $customColMap = [];
            foreach ($header as $colKey => $colName) {
                // $colKey is 'A', 'B'...
                if (! in_array($colKey, $usedColKeys, true)) {
                    if ($colName !== '') {
                        $customColMap[$colKey] = $colName;
                    }
                }
            }

            if ($colMap['email'] === false) {
                $message = 'Kolom header "email" wajib ada. Header yang ditemukan: ' . implode(', ', $header);
                if ($request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
                    return response()->json(['success' => false, 'message' => $message], 422);
                }
                return redirect()->back()->with('success', null)->with('error', $message);
            }

            // Cache activeBatch di luar loop
            $activeBatch = $activity->activeBatch;
            $batchId = $activeBatch ? $activeBatch->id : null;

            // Kumpulkan semua email yang valid terlebih dahulu untuk optimasi query
            $validEmails = [];
            $emailToRowData = [];
            $senderName = null;

            for ($i = $dataStartRow; $i <= count($rows); $i++) {
                $row = $rows[$i] ?? [];
                $emailKey = $colMap['email'];
                $nameKey = $colMap['name'];
                $passwordKey = $colMap['password'];

                // Extract sender info if available and not yet set
                if ($senderName === null && ! empty($colMap['sender_name']) && $colMap['sender_name'] !== false) {
                    $val = trim((string) ($row[$colMap['sender_name']] ?? ''));
                    if ($val !== '') {
                        $senderName = $val;
                    }
                }

                $email = $emailKey !== false ? trim((string) ($row[$emailKey] ?? '')) : '';
                $email = strtolower($email);
                $name = $nameKey !== false ? trim((string) ($row[$nameKey] ?? '')) : '';
                $passwordPlain = $passwordKey !== false ? trim((string) ($row[$passwordKey] ?? '')) : '';

                if (! $email) {
                    $skipped++;
                    $failures[] = ['row' => $i, 'email' => '', 'reason' => 'Email kosong'];

                    continue;
                }
                if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $skipped++;
                    $failures[] = ['row' => $i, 'email' => $email, 'reason' => 'Format email tidak valid (RFC)'];

                    continue;
                }

                $validEmails[] = $email;

                // Extract custom data
                $customData = [];
                foreach ($customColMap as $colKey => $colName) {
                    $val = isset($row[$colKey]) ? trim((string) $row[$colKey]) : '';
                    if ($val !== '') {
                        $customKey = $this->normalizeImportKey($colName);
                        if ($customKey !== '') {
                            $customData[$customKey] = $val;
                        }
                    }
                }

                $emailToRowData[$email] = [
                    'row' => $i,
                    'name' => $name,
                    'password' => $passwordPlain,
                    'custom_data' => ! empty($customData) ? json_encode($customData) : null,
                ];
            }

            // Batch load semua user yang sudah ada sekaligus
            $existingUsers = User::with('profile')->whereIn('email', $validEmails)->get()->keyBy('email');

            // Batch load semua ActivityUser yang sudah terhubung
            $existingActivityUsers = ActivityUser::where('activity_id', $activityId)
                ->whereIn('user_id', $existingUsers->pluck('id')->toArray())
                ->get()
                ->keyBy('user_id');

            // Batch insert untuk user baru dan ActivityUser
            $usersToCreate = [];
            $activityUsersToCreate = [];
            $profilesToCreate = [];
            $usersToSendEmail = [];

            // Iterate starting row 2
            foreach ($emailToRowData as $email => $rowData) {
                $i = $rowData['row'];
                $row = $rows[$i] ?? []; // Need to access raw row data for other fields

                $name = $rowData['name'];
                $passwordPlain = $rowData['password'];

                $noHp = $colMap['no_hp'] !== false ? trim((string) ($row[$colMap['no_hp']] ?? '')) : null;
                $alamat = $colMap['alamat'] !== false ? trim((string) ($row[$colMap['alamat']] ?? '')) : null;
                $jenisKelamin = $colMap['jenis_kelamin'] !== false ? trim((string) ($row[$colMap['jenis_kelamin']] ?? '')) : null;
                $pekerjaan = $colMap['pekerjaan'] !== false ? trim((string) ($row[$colMap['pekerjaan']] ?? '')) : null;
                $jabatan = $colMap['jabatan'] !== false ? trim((string) ($row[$colMap['jabatan']] ?? '')) : null;
                $instansi = $colMap['instansi'] !== false ? trim((string) ($row[$colMap['instansi']] ?? '')) : null;
                $nik = $colMap['nik'] !== false ? trim((string) ($row[$colMap['nik']] ?? '')) : null;
                $birthPlace = $colMap['birth_place'] !== false ? trim((string) ($row[$colMap['birth_place']] ?? '')) : null;
                $birthDate = $colMap['birth_date'] !== false ? trim((string) ($row[$colMap['birth_date']] ?? '')) : null;
                $otherProvince = $colMap['other_province'] !== false ? trim((string) ($row[$colMap['other_province']] ?? '')) : null;
                $otherRegency = $colMap['other_regency'] !== false ? trim((string) ($row[$colMap['other_regency']] ?? '')) : null;
                $otherDistrict = $colMap['other_district'] !== false ? trim((string) ($row[$colMap['other_district']] ?? '')) : null;

                $provinceId = null;
                $regencyId = null;
                $districtId = null;

                $getCellValue = function ($colIndex) use ($row) {
                    if ($colIndex === false) {
                        return '';
                    }
                    return trim((string) ($row[$colIndex] ?? ''));
                };

                $provinceRawId = $getCellValue($colMap['province_id']);
                $regencyRawId = $getCellValue($colMap['regency_id']);
                $districtRawId = $getCellValue($colMap['district_id']);

                $provinceRawName = $getCellValue($colMap['province']);
                $regencyRawName = $getCellValue($colMap['regency']);
                $districtRawName = $getCellValue($colMap['district']);

                if ($provinceRawId !== '') {
                    $provinceIdCandidate = $provinceRawId;
                    if (Province::whereKey($provinceIdCandidate)->exists()) {
                        $provinceId = $provinceIdCandidate;
                    } elseif (is_numeric($provinceRawId)) {
                        $provinceIdCandidate = (int) $provinceRawId;
                        if (Province::whereKey($provinceIdCandidate)->exists()) {
                            $provinceId = $provinceIdCandidate;
                        } else {
                            $failures[] = ['row' => $i, 'email' => $email, 'reason' => 'Province ID tidak valid'];
                            $skipped++;
                            continue;
                        }
                    }
                }
 
                if ($regencyRawId !== '') {
                    $regencyIdCandidate = $regencyRawId;
                    $regencyQuery = Regency::whereKey($regencyIdCandidate);
                    if ($provinceId) {
                        $regencyQuery->where('province_id', $provinceId);
                    }
                    if ($regencyQuery->exists()) {
                        $regencyId = $regencyIdCandidate;
                    } elseif (is_numeric($regencyRawId)) {
                        $regencyIdCandidate = (int) $regencyRawId;
                        $regencyQuery = Regency::whereKey($regencyIdCandidate);
                        if ($provinceId) {
                            $regencyQuery->where('province_id', $provinceId);
                        }
                        if ($regencyQuery->exists()) {
                            $regencyId = $regencyIdCandidate;
                        } else {
                            $failures[] = ['row' => $i, 'email' => $email, 'reason' => 'Regency ID tidak valid'];
                            $skipped++;
                            continue;
                        }
                    }
                }
 
                if ($districtRawId !== '') {
                    $districtIdCandidate = $districtRawId;
                    $districtQuery = District::whereKey($districtIdCandidate);
                    if ($regencyId) {
                        $districtQuery->where('regency_id', $regencyId);
                    }
                    if ($districtQuery->exists()) {
                        $districtId = $districtIdCandidate;
                    } elseif (is_numeric($districtRawId)) {
                        $districtIdCandidate = (int) $districtRawId;
                        $districtQuery = District::whereKey($districtIdCandidate);
                        if ($regencyId) {
                            $districtQuery->where('regency_id', $regencyId);
                        }
                        if ($districtQuery->exists()) {
                            $districtId = $districtIdCandidate;
                        } else {
                            $failures[] = ['row' => $i, 'email' => $email, 'reason' => 'District ID tidak valid'];
                            $skipped++;
                            continue;
                        }
                    }
                }

                $provinceNameForMatch = '';
                $regencyNameForMatch = '';
                $districtNameForMatch = '';

                if ($provinceId === null) {
                    if ($provinceRawId !== '' && ! is_numeric($provinceRawId)) {
                        $provinceNameForMatch = $provinceRawId;
                    } else {
                        $provinceNameForMatch = $provinceRawName;
                    }
                }

                if ($regencyId === null) {
                    if ($regencyRawId !== '' && ! is_numeric($regencyRawId)) {
                        $regencyNameForMatch = $regencyRawId;
                    } else {
                        $regencyNameForMatch = $regencyRawName;
                    }
                }

                if ($districtId === null) {
                    if ($districtRawId !== '' && ! is_numeric($districtRawId)) {
                        $districtNameForMatch = $districtRawId;
                    } else {
                        $districtNameForMatch = $districtRawName;
                    }
                }

                if ($provinceNameForMatch !== '' || $regencyNameForMatch !== '' || $districtNameForMatch !== '') {
                    $matchedRegions = RegionMatcher::matchRegions($provinceNameForMatch, $regencyNameForMatch, $districtNameForMatch, 0.6);
                    if ($provinceId === null && ! empty($matchedRegions['province_id'])) {
                        $provinceId = $matchedRegions['province_id'];
                    }
                    if ($regencyId === null && ! empty($matchedRegions['regency_id'])) {
                        $regencyId = $matchedRegions['regency_id'];
                    }
                    if ($districtId === null && ! empty($matchedRegions['district_id'])) {
                        $districtId = $matchedRegions['district_id'];
                    }
                }

                if ($provinceId === null && $provinceNameForMatch !== '' && ($otherProvince === null || $otherProvince === '')) {
                    $otherProvince = $provinceNameForMatch;
                }
                if ($regencyId === null && $regencyNameForMatch !== '' && ($otherRegency === null || $otherRegency === '')) {
                    $otherRegency = $regencyNameForMatch;
                }
                if ($districtId === null && $districtNameForMatch !== '' && ($otherDistrict === null || $otherDistrict === '')) {
                    $otherDistrict = $districtNameForMatch;
                }

                $user = $existingUsers->get($email);

                if (! $user) {
                    // Siapkan data untuk batch insert
                    // Generate custom UID untuk user (karena User::insert() tidak memicu event model)
                    $uid = $this->generateUserUid();
                    $token = Str::random(64);
                    $additionalProfileData = [];
                    if (! empty($rowData['custom_data'])) {
                        $decodedCustom = json_decode($rowData['custom_data'], true);
                        if (json_last_error() === JSON_ERROR_NONE && is_array($decodedCustom)) {
                            $additionalProfileData = $decodedCustom;
                        }
                    }
                    $usersToCreate[] = [
                        'id' => $uid, // Tambahkan ID manual karena User menggunakan custom UID
                        'name' => $name ?: $email,
                        'email' => $email,
                        'password' => bcrypt($passwordPlain ?: str()->random(10)),
                        'email_verification_token' => $token,
                        'email_verified_at' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];

                    // Prepare profile for new user
                    $profileUid = $this->generateProfileUid();
                    $profilesToCreate[] = [
                        'id' => $profileUid,
                        'user_id' => $uid,
                        'no_hp' => $noHp,
                        'alamat' => $alamat,
                        'jenis_kelamin' => $jenisKelamin,
                        'pekerjaan' => $pekerjaan,
                        'instansi' => $instansi,
                        'jabatan' => $jabatan,
                        'nik' => $nik,
                        'birth_place' => $birthPlace,
                        'birth_date' => $birthDate,
                        'province_id' => $provinceId,
                        'regency_id' => $regencyId,
                        'district_id' => $districtId,
                        'other_province' => $otherProvince,
                        'other_regency' => $otherRegency,
                        'other_district' => $otherDistrict,
                        'additional_data' => ! empty($additionalProfileData) ? json_encode($additionalProfileData) : null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];

                    $usersToSendEmail[] = [
                        'email' => $email,
                        'token' => $token,
                        'row' => $i,
                    ];
                    $inserted++;
                    $stats['new_users']++;
                    $successes[] = ['row' => $i, 'email' => $email, 'action' => 'created_and_sent_verification'];
                } else {
                    $action = 'existing_user';
                    $stats['existing_users']++;

                    // Update user name if provided and different (exclude email/password)
                    if ($name && $name !== $user->name) {
                        $user->name = $name;
                        $user->save();
                    }

                    // Create profile if not exists or update if exists
                    if (! $user->profile) {
                        $profileUid = $this->generateProfileUid();
                        $additionalProfileData = [];
                        if (! empty($rowData['custom_data'])) {
                            $decodedCustom = json_decode($rowData['custom_data'], true);
                            if (json_last_error() === JSON_ERROR_NONE && is_array($decodedCustom)) {
                                $additionalProfileData = $decodedCustom;
                            }
                        }
                        $profilesToCreate[] = [
                            'id' => $profileUid,
                            'user_id' => $user->id,
                            'no_hp' => $noHp,
                            'alamat' => $alamat,
                            'jenis_kelamin' => $jenisKelamin,
                            'pekerjaan' => $pekerjaan,
                            'instansi' => $instansi,
                            'jabatan' => $jabatan,
                            'nik' => $nik,
                            'birth_place' => $birthPlace,
                            'birth_date' => $birthDate,
                            'province_id' => $provinceId,
                            'regency_id' => $regencyId,
                            'district_id' => $districtId,
                            'other_province' => $otherProvince,
                            'other_regency' => $otherRegency,
                            'other_district' => $otherDistrict,
                            'additional_data' => ! empty($additionalProfileData) ? json_encode($additionalProfileData) : null,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    } else {
                        // Update existing profile
                        $profile = $user->profile;
                        $profileDirty = false;
                        $fields = [
                            'no_hp' => $noHp, 'alamat' => $alamat, 'jenis_kelamin' => $jenisKelamin,
                            'pekerjaan' => $pekerjaan, 'instansi' => $instansi, 'jabatan' => $jabatan,
                            'nik' => $nik, 'birth_place' => $birthPlace, 'birth_date' => $birthDate,
                            'other_province' => $otherProvince, 'other_regency' => $otherRegency, 'other_district' => $otherDistrict,
                        ];
                        foreach ($fields as $k => $v) {
                            if ($v !== null && $v !== '' && $v != $profile->$k) {
                                $profile->$k = $v;
                                $profileDirty = true;
                            }
                        }
                        if ($provinceId && $profile->province_id != $provinceId) {
                            $profile->province_id = $provinceId;
                            $profileDirty = true;
                        }
                        if ($regencyId && $profile->regency_id != $regencyId) {
                            $profile->regency_id = $regencyId;
                            $profileDirty = true;
                        }
                        if ($districtId && $profile->district_id != $districtId) {
                            $profile->district_id = $districtId;
                            $profileDirty = true;
                        }

                        if (! empty($rowData['custom_data'])) {
                            $decodedCustom = json_decode($rowData['custom_data'], true);
                            if (json_last_error() === JSON_ERROR_NONE && is_array($decodedCustom) && ! empty($decodedCustom)) {
                                $existingAdditional = $profile->additional_data ?? [];
                                if (is_string($existingAdditional)) {
                                    $decodedExisting = json_decode($existingAdditional, true);
                                    if (json_last_error() === JSON_ERROR_NONE && is_array($decodedExisting)) {
                                        $existingAdditional = $decodedExisting;
                                    } else {
                                        $existingAdditional = [];
                                    }
                                }
                                if (! is_array($existingAdditional)) {
                                    $existingAdditional = [];
                                }
                                $mergedAdditional = array_merge($existingAdditional, $decodedCustom);
                                if (json_encode($existingAdditional) !== json_encode($mergedAdditional)) {
                                    $profile->additional_data = $mergedAdditional;
                                    $profileDirty = true;
                                }
                            }
                        }

                        if ($profileDirty) {
                            $profile->save();
                            $action = 'updated_profile';
                        }
                    }

                    if ($existingActivityUsers->has($user->id)) {
                        $activityUser = $existingActivityUsers->get($user->id);

                        $newCustomData = ! empty($rowData['custom_data']) ? json_decode($rowData['custom_data'], true) : [];
                        if (auth()->check()) {
                            $newCustomData['importer_id'] = auth()->id();
                        }

                        $existingCustomData = $activityUser->custom_data ?? [];
                        if (is_string($existingCustomData)) {
                            $existingCustomData = json_decode($existingCustomData, true) ?? [];
                        }
                        if (! is_array($existingCustomData)) {
                            $existingCustomData = [];
                        }

                        $mergedCustomData = array_merge($existingCustomData, $newCustomData);
                        $isCustomDataChanged = json_encode($existingCustomData) !== json_encode($mergedCustomData);

                        if ($isCustomDataChanged) {
                            if (Schema::hasColumn('activity_users', 'custom_data')) {
                                $activityUser->custom_data = $mergedCustomData;
                                $activityUser->save();
                                $action = ($action === 'updated_profile') ? 'updated_profile_and_data' : 'updated_data';
                            } else {
                                Log::warning('Attempted to save custom_data but column missing', ['activity_user_id' => $activityUser->id]);
                            }
                        }

                        if ($action === 'existing_user') {
                            $alreadyLinked++;
                            $stats['already_registered']++;
                            $successes[] = ['row' => $i, 'email' => $email, 'action' => 'already_linked'];
                        } else {
                            $updated++;
                            $stats['already_registered']++;
                            $successes[] = ['row' => $i, 'email' => $email, 'action' => $action];
                        }

                        continue;
                    }

                    if ($action !== 'existing_user') {
                        $updated++;
                    }
                    $successes[] = ['row' => $i, 'email' => $email, 'action' => $action];
                }

            // Siapkan data ActivityUser untuk batch insert
            // Jika user baru, kita akan insert setelah user dibuat
            // Jika user existing, langsung insert
                if ($user) {
                    $processedUserIds[] = $user->id;
                    // Fix: Free event participants should start as STATUS_VERIFICATION (0), matching self-registration.
                    // Only set to ACTIVE if it's a paid event and explicitly marked as paid by admin.
                    if ($isPaidEvent) {
                        $linkStatus = $markPaid ? ActivityUser::STATUS_ACTIVE : ActivityUser::STATUS_PENDING;
                    } else {
                        $linkStatus = ActivityUser::STATUS_VERIFICATION;
                    }
                    // Generate custom UID untuk ActivityUser (karena ActivityUser::insert() tidak memicu event model)
                    $activityUserUid = $this->generateActivityUserUid();

                    // Prepare custom data for existing user link
                    $customData = ! empty($rowData['custom_data']) ? json_decode($rowData['custom_data'], true) : [];
                    if (! is_array($customData)) {
                        $customData = [];
                    }
                    if ($typeId) {
                        $customData['type_id'] = $typeId;
                    }
                    if ($itemId) {
                        $customData['item_id'] = $itemId;
                    }
                    if (auth()->check()) {
                        $customData['importer_id'] = auth()->id();
                    }

                    $activityUserPayload = [
                        'id' => $activityUserUid, // Tambahkan ID manual karena ActivityUser menggunakan custom UID
                        'activity_id' => $activityId,
                        'user_id' => $user->id,
                        'status' => $linkStatus,
                        'activity_batch_id' => $batchId,
                        'created_by' => auth()->check() ? auth()->id() : null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];

                    // Add custom_data only if column exists
                    if (Schema::hasColumn('activity_users', 'custom_data')) {
                        $activityUserPayload['custom_data'] = json_encode($customData);
                    }

                    if ($typeId) {
                        $activityUserPayload['activity_participant_group_id'] = $typeId;
                    }

                    // Untuk kegiatan berbayar yang belum ditandai lunas (markPaid = false),
                    // jangan langsung membuat ActivityUser. Peserta baru akan dibuat
                    // setelah pembayaran atau bukti pembayaran berhasil.
                    $shouldCreateActivityUser = ! $isPaidEvent || $markPaid;

                    if ($shouldCreateActivityUser) {
                        $activityUsersToCreate[] = $activityUserPayload;
                    }

                    $linked++;
                    $stats['new_participants']++;

                    if ($isPaidEvent) {
                        if (! $markPaid) {
                            $pendingUserIds[] = $user->id;
                            $successes[] = ['row' => $i, 'email' => $email, 'action' => 'linked_pending_payment'];
                        } else {
                            $successes[] = ['row' => $i, 'email' => $email, 'action' => 'linked_paid'];
                        }
                    } else {
                        $successes[] = ['row' => $i, 'email' => $email, 'action' => 'linked'];
                    }
                }
            }

            // Batch insert users baru
            if (! empty($usersToCreate)) {
                // Insert dalam chunk untuk menghindari query terlalu besar
                $chunks = array_chunk($usersToCreate, 100);
                foreach ($chunks as $chunk) {
                    User::insert($chunk);
                }

                // Reload users yang baru dibuat untuk mendapatkan ID
                $newUsers = User::whereIn('email', array_column($usersToCreate, 'email'))->get()->keyBy('email');

                // Kirim email verifikasi (dalam background atau skip jika terlalu banyak)
                // Untuk menghindari timeout, kita skip pengiriman email langsung
                // Email bisa dikirim nanti melalui queue atau cron job
                foreach ($usersToSendEmail as $emailData) {
                    $newUser = $newUsers->get($emailData['email']);
                    if ($newUser) {
                        try {
                            // Queue email atau skip untuk performa
                            // Mail::to($newUser->email)->send(new VerifyEmailMail($newUser, $emailData['token']));
                        } catch (\Throwable $e) {
                            Log::warning('Failed to send verification email during import', [
                                'email' => $emailData['email'],
                                'error' => $e->getMessage(),
                            ]);
                        }
                    }
                }

                // Tambahkan ActivityUser untuk user baru
                if ($isPaidEvent) {
                    $linkStatus = $markPaid ? ActivityUser::STATUS_ACTIVE : ActivityUser::STATUS_PENDING;
                } else {
                    $linkStatus = ActivityUser::STATUS_VERIFICATION;
                }
                foreach ($newUsers as $email => $newUser) {
                    $rowData = $emailToRowData[$email];
                    $i = $rowData['row'];

                    // Generate custom UID untuk ActivityUser (karena ActivityUser::insert() tidak memicu event model)
                    $activityUserUid = $this->generateActivityUserUid();

                    // Prepare custom data with type_id and item_id if present
                    $customData = ! empty($rowData['custom_data']) ? json_decode($rowData['custom_data'], true) : [];
                    if (! is_array($customData)) {
                        $customData = [];
                    }

                    if ($typeId) {
                        $customData['type_id'] = $typeId;
                    }
                    if ($itemId) {
                        $customData['item_id'] = $itemId;
                    }

                    $activityUserPayload = [
                        'id' => $activityUserUid, // Tambahkan ID manual karena ActivityUser menggunakan custom UID
                        'activity_id' => $activityId,
                        'user_id' => $newUser->id,
                        'status' => $linkStatus,
                        'activity_batch_id' => $batchId,
                        'created_by' => auth()->check() ? auth()->id() : null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];

                    // Add custom_data only if column exists
                    if (Schema::hasColumn('activity_users', 'custom_data')) {
                        $activityUserPayload['custom_data'] = json_encode($customData);
                    }

                    if ($typeId) {
                        $activityUserPayload['activity_participant_group_id'] = $typeId;
                    }

                    // Untuk kegiatan berbayar yang belum ditandai lunas (markPaid = false),
                    // tunda pembuatan ActivityUser sampai pembayaran selesai.
                    $shouldCreateActivityUser = ! $isPaidEvent || $markPaid;

                    if ($shouldCreateActivityUser) {
                        $activityUsersToCreate[] = $activityUserPayload;
                    }

                    $linked++;
                    $stats['new_participants']++;

                    if ($isPaidEvent && ! $markPaid) {
                        $pendingUserIds[] = $newUser->id;
                    }
                }
            }

            // Batch insert ActivityUser
            if (! empty($activityUsersToCreate)) {
                $chunks = array_chunk($activityUsersToCreate, 100);
                foreach ($chunks as $chunk) {
                    ActivityUser::insert($chunk);
                }
            }

            // Batch insert Profiles
            if (! empty($profilesToCreate)) {
                $chunks = array_chunk($profilesToCreate, 100);
                foreach ($chunks as $chunk) {
                    Profile::insert($chunk);
                }
            }
        } catch (\Throwable $e) {
            Log::error('Import Participants Failed: '.$e->getMessage(), [
                'activity_id' => $activityId,
                'trace' => $e->getTraceAsString(),
            ]);

            // Jika AJAX request, return JSON error
            if ($request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Gagal memproses file: '.$e->getMessage(),
                    'failures' => [['row' => 1, 'email' => '', 'reason' => $e->getMessage()]],
                ], 400);
            }

            return redirect()->back()->with('error', 'Gagal memproses file: '.$e->getMessage());
        }

        $message = "Impor selesai: berhasil {$inserted}, gagal {$skipped}.";
        if ($isPaidEvent) {
            $message .= ' Tagihan pembayaran telah dibuat otomatis ('.($markPaid ? 'Lunas' : 'Pending').').';
        }

        $stats['total_bill'] = count($pendingUserIds) * ($activity->price ?? 0);

        $importResult = [
            'success' => true,
            'inserted' => $inserted,
            'updated' => $updated,
            'linked' => $linked,
            'already_linked' => $alreadyLinked,
            'skipped' => $skipped,
            'successes' => $successes,
            'failures' => $failures,
            'bulk_payment_available' => false,
            'stats' => $stats,
            'debug_info' => [
                'is_paid_event' => $isPaidEvent,
                'mark_paid' => $markPaid,
                'pending_count' => count($pendingUserIds),
                'activity_price' => $activity->price,
                'total_bill' => $stats['total_bill']
            ]
        ];

        $returnTo = (string) $request->input('return_to', '');

        Log::info('Import Participants redirect decision', [
            'activity_id' => $activityId,
            'is_paid_event' => $isPaidEvent,
            'mark_paid' => $markPaid,
            'pending_user_ids_count' => count($pendingUserIds),
            'inserted' => $inserted,
            'linked' => $linked,
            'already_linked' => $alreadyLinked,
            'skipped' => $skipped,
            'return_to' => $returnTo,
            'wants_json' => $request->wantsJson(),
            'is_ajax' => $request->header('X-Requested-With') === 'XMLHttpRequest',
        ]);

        if ($isPaidEvent && ! $markPaid && ! empty($pendingUserIds)) {
            Log::info('Setting import_bulk_payment session', ['pending_count' => count($pendingUserIds)]);
            $unitPrice = (float) ($activity->price ?? 0);
            $totalAmount = count($pendingUserIds) * $unitPrice;
            session([
                'import_bulk_payment' => [
                    'activity_id' => $activityId,
                    'pending_user_ids' => $pendingUserIds,
                    'allowed_count' => count($pendingUserIds),
                    'unit_price' => $unitPrice,
                    'gross_amount' => $totalAmount,
                    'successfully_imported_count' => $inserted + $linked,
                    'activity_batch_id' => $batchId,
                    'sender_name' => $senderName,
                ],
            ]);
            session()->flash('show_import_bulk_payment_once', true);
            session()->put('import_result', $importResult);
            session()->flash('show_import_result_once', true);
            $importResult['bulk_payment_available'] = true;
            if ($returnTo === 'detail') {
                session(['import_return_to' => 'detail']);
            } else {
                session()->forget('import_return_to');
            }
            
            // Redirect directly to payment page if payment is required
            $redirectUrl = route('payments.create', [
                'activity' => $activityId,
                'is_bulk' => 1,
                'batch_id' => $batchId
            ]);

            $importResult['redirect_url'] = $redirectUrl;

            if ($request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
                return response()->json($importResult, 200);
            }

            return redirect($redirectUrl);
        }

        // Jika AJAX request, return JSON response
        if ($request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return response()->json($importResult, 200);
        }

        session()->put('import_result', $importResult);
        session()->flash('show_import_result_once', true);

        if ($returnTo === 'detail') {
            session(['import_return_to' => 'detail']);
            return redirect()->route('activity.detail', $activityId)->with('success', $message);
        }
        session()->forget('import_return_to');
        return redirect()->route('activity.participants.index', $activityId)->with('success', $message);
    }

    public function importParticipantsGet(Request $request, $activityId)
    {
        return redirect()->route('activity.participants.index', $activityId)
            ->with('info', 'Gunakan tombol Upload pada halaman Manajemen Acara untuk mengimpor peserta.');
    }

    public function checkParticipants(Request $request, $activityId)
    {
        $activity = Activity::where('uid', $activityId)->first();
        if (! $activity) {
            $activity = Activity::findOrFail($activityId);
        }
        $activityId = $activity->id;

        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && $activity->user_id !== auth()->id()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403, 'Anda tidak memiliki izin untuk melakukan pengecekan ini.');
            }
        }

        $data = $request->validate([
            'emails' => 'required|array',
        ]);

        $emails = array_map(function ($e) {
            return strtolower(trim((string) $e));
        }, $data['emails']);

        $result = [
            'existing' => [],
            'new' => [],
            'invalid' => [],
            'already_participants' => [],
            'existing_not_in_activity' => [],
            'details' => [],
        ];

        $validEmails = [];
        foreach ($emails as $email) {
            if (! $email || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $result['invalid'][] = $email;
            } else {
                $validEmails[] = $email;
            }
        }

        $users = collect();
        $activityUsers = collect();

        if (! empty($validEmails)) {
            $users = User::whereIn('email', $validEmails)->get()->keyBy('email');
            $userIds = $users->pluck('id')->toArray();
            if (! empty($userIds)) {
                $activityUsers = ActivityUser::where('activity_id', $activityId)
                    ->whereIn('user_id', $userIds)
                    ->get()
                    ->keyBy('user_id');
            }
        }

        foreach ($emails as $email) {
            if (! $email || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $result['details'][] = [
                    'email' => $email,
                    'status' => 'invalid',
                    'user_id' => null,
                    'user_name' => null,
                    'is_participant' => false,
                    'activity_status' => null,
                ];

                continue;
            }

            $user = $users->get($email);
            if (! $user) {
                $result['new'][] = $email;
                $result['details'][] = [
                    'email' => $email,
                    'status' => 'new_user',
                    'user_id' => null,
                    'user_name' => null,
                    'is_participant' => false,
                    'activity_status' => null,
                ];

                continue;
            }

            $result['existing'][] = $email;

            $activityUser = $activityUsers->get($user->id);
            if ($activityUser) {
                $result['already_participants'][] = $email;
                $result['details'][] = [
                    'email' => $email,
                    'status' => 'existing_participant',
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'is_participant' => true,
                    'activity_status' => $activityUser->status,
                ];
            } else {
                $result['existing_not_in_activity'][] = $email;
                $result['details'][] = [
                    'email' => $email,
                    'status' => 'existing_not_in_activity',
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'is_participant' => false,
                    'activity_status' => null,
                ];
            }
        }

        $result['summary'] = [
            'total' => count($emails),
            'new' => count($result['new']),
            'existing' => count($result['existing']),
            'already_participants' => count($result['already_participants']),
            'existing_not_in_activity' => count($result['existing_not_in_activity']),
            'invalid' => count($result['invalid']),
        ];

        return response()->json($result);
    }

    public function getImportTemplate($activityId)
    {
        if (! auth()->check()) {
            abort(401, 'Silakan login terlebih dahulu.');
        }

        $activity = Activity::where('uid', $activityId)->first();
        if (! $activity) {
            $activity = Activity::findOrFail($activityId);
        }
        $activityId = $activity->id;

        // Template retrieval doesn't need special permission - allow all logged-in users
        // to see the template for their own import activities

        $template = $activity->import_template ?? 'email,name,password';

        return response()->json(['template' => $template]);
    }

    public function saveImportTemplate(Request $request, $activityId)
    {
        if (! auth()->check()) {
            if ($request->expectsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Silakan login terlebih dahulu.',
                ], 401);
            }
            abort(401, 'Silakan login terlebih dahulu.');
        }

        $activity = Activity::where('uid', $activityId)->first();
        if (! $activity) {
            $activity = Activity::findOrFail($activityId);
        }

        $userId = auth()->id();
        $user = auth()->user();
        $isAdmin = $user->isAdmin() || $user->isSuperAdmin();
        $isCreator = $user->isCreator();
        $canManage = $activity->canManageRegistration($userId);

        Log::info('saveImportTemplate:request', [
            'user_id' => $userId,
            'activity_id' => $activityId,
            'resolved_activity_id' => $activity->id,
            'activity_user_id' => $activity->user_id,
            'is_admin' => $isAdmin,
            'is_creator' => $isCreator,
            'can_manage' => $canManage,
            'raw_template' => $request->input('template'),
        ]);

        if (! $isAdmin && ! $isCreator) {
            Log::error('Permission denied for saveImportTemplate', [
                'user_id' => $userId,
                'activity_id' => $activityId,
                'activity_user_id' => $activity->user_id,
                'is_admin' => $isAdmin,
                'is_creator' => $isCreator,
                'can_manage' => $canManage,
            ]);
            if ($request->expectsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Anda tidak memiliki izin untuk menyimpan template impor.',
                    'flags' => [
                        'is_admin' => $isAdmin,
                        'is_creator' => $isCreator,
                        'can_manage' => $canManage,
                    ],
                ], 403);
            }
            abort(403, 'Anda tidak memiliki izin untuk menyimpan template impor.');
        }

        $data = $request->validate([
            'template' => 'nullable|string|max:2000',
        ]);

        if (! Schema::hasColumn('activities', 'import_template')) {
            Log::error('saveImportTemplate:missing_import_template_column', [
                'user_id' => $userId,
                'activity_id' => $activity->id,
            ]);
            if ($request->expectsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Kolom import_template belum ada di database. Jalankan migrasi database di server Anda.',
                ], 500);
            }
            abort(500, 'Kolom import_template belum ada di database. Jalankan migrasi database di server Anda.');
        }

        $template = $data['template'] ?? null;
        if ($template !== null) {
            $parts = array_values(array_filter(array_map('trim', explode(',', $template)), function ($v) {
                return $v !== '';
            }));
            $seen = [];
            $duplicates = [];
            foreach ($parts as $v) {
                $base = $v;
                if ($base !== '' && substr($base, -1) === '*') {
                    $base = substr($base, 0, -1);
                }
                $optPos = strpos($base, '{');
                if ($optPos !== false) {
                    $base = substr($base, 0, $optPos);
                }
                $norm = strtolower(trim($base));
                if ($norm === '') {
                    continue;
                }
                if (isset($seen[$norm])) {
                    $duplicates[$norm] = $base;
                } else {
                    $seen[$norm] = $base;
                }
            }
            if (! empty($duplicates)) {
                $names = array_values(array_unique(array_values($duplicates)));
                $message = 'Nama kolom berikut duplikat: '.implode(', ', $names).'. Gunakan nama yang unik.';
                Log::warning('saveImportTemplate:duplicate_columns', [
                    'user_id' => $userId,
                    'activity_id' => $activity->id,
                    'duplicates' => $names,
                    'raw_template' => $template,
                ]);
                if ($request->expectsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
                    return response()->json([
                        'status' => 'error',
                        'message' => $message,
                        'errors' => [
                            'template' => [$message],
                        ],
                    ], 422);
                }
                abort(422, $message);
            }
        }

        $activity->import_template = $template !== '' ? $template : null;
        $activity->save();

        Log::info('saveImportTemplate:saved', [
            'user_id' => $userId,
            'activity_id' => $activity->id,
            'template_len' => strlen((string) $activity->import_template),
        ]);

        return response()->json([
            'status' => 'success',
            'template_len' => strlen((string) $activity->import_template),
        ]);
    }

    public function downloadParticipantsTemplate($activityId)
    {
        $activity = Activity::where('uid', $activityId)->first();
        if (! $activity) {
            $activity = Activity::findOrFail($activityId);
        }
        $activityId = $activity->id;
        
        // Allow any authenticated user to download the template
        // This is needed for potential participants to prepare their data for registration

        $template = $activity->import_template ?: 'email,name,password';
        $columns = array_values(array_filter(array_map('trim', explode(',', $template))));

        // Merge with mandatory_profile_fields
        $mandatoryFields = $activity->mandatory_profile_fields ?? [];
        if (! empty($mandatoryFields)) {
            $existingKeys = [];
            foreach ($columns as $col) {
                // Remove * for key comparison
                $key = str_replace('*', '', $col);
                $key = preg_replace('/^\d+\./', '', $key); // Remove numbering if any
                $key = strtolower(trim($key));
                // Handle user:/profile: prefixes
                if (str_starts_with($key, 'user:')) {
                    $key = trim(substr($key, 5));
                }
                if (str_starts_with($key, 'profile:')) {
                    $key = trim(substr($key, 8));
                }

                $existingKeys[$key] = true;
            }

            foreach ($mandatoryFields as $field) {
                // If field is not in columns, add it
                // We add '*' to indicate it's required (since it is mandatory)
                if (! isset($existingKeys[$field])) {
                    $columns[] = $field.'*';
                    $existingKeys[$field] = true;
                }
            }
        }

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        // write header row
        $colIndex = 0;
        foreach ($columns as $col) {
            $headerName = $col;
            $options = [];

            // Parse options {A|B}
            $optStart = strrpos($col, '{');
            $optEnd = strrpos($col, '}');

            if ($optStart !== false && $optEnd !== false && $optEnd > $optStart) {
                $optionsStr = substr($col, $optStart + 1, $optEnd - $optStart - 1);
                $options = explode('|', $optionsStr);

                // Remove options from header name
                $headerName = substr($col, 0, $optStart).substr($col, $optEnd + 1);
            }
            // Support custom types with | separator (text, dropdown, etc)
            elseif (str_contains($col, '|')) {
                $parts = explode('|', $col, 2);
                $headerName = $parts[0];
                $typeDefinition = $parts[1];

                if (str_starts_with($typeDefinition, 'dropdown:')) {
                    $optionsStr = substr($typeDefinition, 9); // remove 'dropdown:'
                    // Support ~ separator (new) and , (legacy)
                    if (str_contains($optionsStr, '~')) {
                        $options = explode('~', $optionsStr);
                    } else {
                        $options = explode(',', $optionsStr);
                    }
                }
            }

            // Use columnLetter helper to be consistent
            $cellLetter = $this->columnLetter($colIndex);
            $sheet->setCellValue($cellLetter.'1', $headerName);

            // Apply validation if options exist
            if (! empty($options)) {
                $validation = $sheet->getCell($cellLetter.'2')->getDataValidation();
                $validation->setType(DataValidation::TYPE_LIST);
                $validation->setErrorStyle(DataValidation::STYLE_INFORMATION);
                $validation->setAllowBlank(false);
                $validation->setShowInputMessage(true);
                $validation->setShowErrorMessage(true);
                $validation->setShowDropDown(true);
                $validation->setErrorTitle('Input error');
                $validation->setError('Value is not in list.');
                $validation->setPromptTitle('Pick from list');
                $validation->setPrompt('Please pick a value from the drop-down list.');
                $validation->setFormula1('"'.implode(',', $options).'"');

                // Apply to rows 2-100
                for ($r = 2; $r <= 100; $r++) {
                    $sheet->getCell($cellLetter.$r)->setDataValidation(clone $validation);
                }
            }

            $colIndex++;
        }

        // add an example row below header to guide users
        $sampleMap = [
            'email' => 'isi_email@domainanda.com',
            'name' => 'Nama Lengkap',
            'password' => 'password123',
            'no_hp' => '081234567890',
            'alamat' => 'Alamat lengkap',
            'pekerjaan' => 'Pekerjaan',
            'occupation' => 'Pekerjaan',
            'jabatan' => 'Jabatan',
            'position' => 'Jabatan',
            'instansi' => 'Nama Instansi',
            'institution' => 'Nama Instansi',
            'jenis_kelamin' => 'Laki-laki',
            'gender' => 'Laki-laki',
            'province_id' => '11 (Lihat ID Wilayah)',
            'regency_id' => '1101 (Lihat ID Wilayah)',
            'district_id' => '1101010 (Lihat ID Wilayah)',
            'nik' => '1234567890123456',
            'birth_place' => 'Jakarta',
            'birth_date' => '1990-01-01',
            'address' => 'Alamat Lengkap',
        ];

        $provinceColumnLetter = null;
        $regencyColumnLetter = null;
        $districtColumnLetter = null;

        if (! empty($columns)) {
            $rowNum = 2;
            $colIndex = 0;
            foreach ($columns as $col) {
                // Remove options first to find key
                $key = $col;
                $optStart = strrpos($key, '{');
                $optEnd = strrpos($key, '}');
                if ($optStart !== false && $optEnd !== false && $optEnd > $optStart) {
                    $key = substr($key, 0, $optStart).substr($key, $optEnd + 1);
                }
                if (str_contains($key, '|dropdown:')) {
                    $key = explode('|dropdown:', $key)[0];
                }

                // Remove prefix user: or profile: to match keys in sampleMap
                $key = str_replace(['user:', 'profile:'], '', $key);
                // Remove required asterisk for sample data lookup
                if (str_ends_with($key, '*')) {
                    $key = substr($key, 0, -1);
                }

                $columnLetter = $this->columnLetter($colIndex);

                if ($key === 'province_id') {
                    $provinceColumnLetter = $columnLetter;
                } elseif ($key === 'regency_id') {
                    $regencyColumnLetter = $columnLetter;
                } elseif ($key === 'district_id') {
                    $districtColumnLetter = $columnLetter;
                }

                $cell = $columnLetter.$rowNum;
                $sheet->setCellValue($cell, $sampleMap[$key] ?? '');
                $colIndex++;
            }
        }

        if ($provinceColumnLetter || $regencyColumnLetter || $districtColumnLetter) {
            $provinces = Province::orderBy('name')->get();
            $regencies = Regency::orderBy('name')->get();
            $districts = District::orderBy('name')->get();

            if ($provinces->isNotEmpty()) {
                $provinceSheet = $spreadsheet->createSheet();
                $provinceSheet->setTitle('Province List');
                $provinceSheet->setCellValue('A1', 'ID');
                $provinceSheet->setCellValue('B1', 'Nama Provinsi');
                $row = 2;
                foreach ($provinces as $province) {
                    $provinceSheet->setCellValue('A'.$row, (string) $province->id);
                    $provinceSheet->setCellValue('B'.$row, (string) $province->name);
                    $row++;
                }
                if ($provinceColumnLetter) {
                    $formula = "'Province List'!\$B\$2:\$B\$".($provinces->count() + 1);
                    for ($r = 2; $r <= 100; $r++) {
                        $validation = $sheet->getCell($provinceColumnLetter.$r)->getDataValidation();
                        $validation->setType(DataValidation::TYPE_LIST);
                        $validation->setErrorStyle(DataValidation::STYLE_INFORMATION);
                        $validation->setAllowBlank(true);
                        $validation->setShowInputMessage(true);
                        $validation->setShowErrorMessage(true);
                        $validation->setShowDropDown(true);
                        $validation->setFormula1($formula);
                    }
                }
            }

            if ($regencies->isNotEmpty()) {
                $regencySheet = $spreadsheet->createSheet();
                $regencySheet->setTitle('Regency List');
                $regencySheet->setCellValue('A1', 'ID');
                $regencySheet->setCellValue('B1', 'Nama Kabupaten/Kota');
                $regencySheet->setCellValue('C1', 'Provinsi ID');
                $row = 2;
                foreach ($regencies as $regency) {
                    $regencySheet->setCellValue('A'.$row, (string) $regency->id);
                    $regencySheet->setCellValue('B'.$row, (string) $regency->name);
                    $regencySheet->setCellValue('C'.$row, (string) $regency->province_id);
                    $row++;
                }
                if ($regencyColumnLetter) {
                    $formula = "'Regency List'!\$B\$2:\$B\$".($regencies->count() + 1);
                    for ($r = 2; $r <= 100; $r++) {
                        $validation = $sheet->getCell($regencyColumnLetter.$r)->getDataValidation();
                        $validation->setType(DataValidation::TYPE_LIST);
                        $validation->setErrorStyle(DataValidation::STYLE_INFORMATION);
                        $validation->setAllowBlank(true);
                        $validation->setShowInputMessage(true);
                        $validation->setShowErrorMessage(true);
                        $validation->setShowDropDown(true);
                        $validation->setFormula1($formula);
                    }
                }
            }

            if ($districts->isNotEmpty()) {
                $districtSheet = $spreadsheet->createSheet();
                $districtSheet->setTitle('District List');
                $districtSheet->setCellValue('A1', 'ID');
                $districtSheet->setCellValue('B1', 'Nama Kecamatan');
                $districtSheet->setCellValue('C1', 'Kabupaten ID');
                $row = 2;
                foreach ($districts as $district) {
                    $districtSheet->setCellValue('A'.$row, (string) $district->id);
                    $districtSheet->setCellValue('B'.$row, (string) $district->name);
                    $districtSheet->setCellValue('C'.$row, (string) $district->regency_id);
                    $row++;
                }
                if ($districtColumnLetter) {
                    $formula = "'District List'!\$B\$2:\$B\$".($districts->count() + 1);
                    for ($r = 2; $r <= 100; $r++) {
                        $validation = $sheet->getCell($districtColumnLetter.$r)->getDataValidation();
                        $validation->setType(DataValidation::TYPE_LIST);
                        $validation->setErrorStyle(DataValidation::STYLE_INFORMATION);
                        $validation->setAllowBlank(true);
                        $validation->setShowInputMessage(true);
                        $validation->setShowErrorMessage(true);
                        $validation->setShowDropDown(true);
                        $validation->setFormula1($formula);
                    }
                }
            }
        }

        // prepare writer
        $writer = new Xlsx($spreadsheet);
        $filename = 'template_peserta_'.$activityId.'_'.date('Ymd').'.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function downloadImportResultExcel(Request $request, $activityId)
    {
        $activity = Activity::where('uid', $activityId)->first();
        if (! $activity) {
            $activity = Activity::findOrFail($activityId);
        }
        $activityId = $activity->id;
        
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403);
            }
        }

        $import = session('import_result');
        if (! $import) {
            return redirect()->route('activity.preparation.index', $activityId)->with('error', 'Tidak ada hasil impor untuk diunduh.');
        }

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setCellValue('A1', 'Baris');
        $sheet->setCellValue('B1', 'Email');
        $sheet->setCellValue('C1', 'Status');
        $sheet->setCellValue('D1', 'Alasan');

        $row = 2;
        foreach ((array) ($import['successes'] ?? []) as $s) {
            $sheet->setCellValue('A'.$row, (string) ($s['row'] ?? ''));
            $sheet->setCellValue('B'.$row, (string) ($s['email'] ?? ''));
            $sheet->setCellValue('C'.$row, 'Berhasil');
            $sheet->setCellValue('D'.$row, 'Selamat');
            $row++;
        }
        foreach ((array) ($import['failures'] ?? []) as $f) {
            $sheet->setCellValue('A'.$row, (string) ($f['row'] ?? ''));
            $sheet->setCellValue('B'.$row, (string) ($f['email'] ?? ''));
            $sheet->setCellValue('C'.$row, 'Gagal');
            $sheet->setCellValue('D'.$row, (string) ($f['reason'] ?? ''));
            $row++;
        }

        $writer = new Xlsx($spreadsheet);
        $filename = 'hasil_impor_peserta_'.$activityId.'_'.date('Ymd_His').'.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Update participant status (admin/superadmin only)
     */
    public function updateParticipantStatus(Request $request, $activityId, $userId)
    {
        $activity = Activity::findOrFail($activityId);

        // Allow organizers to update status as well
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && $activity->user_id !== auth()->id()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403, 'Anda tidak memiliki izin untuk mengubah status peserta.');
            }
        }

        $request->validate([
            'status' => 'required|integer|in:0,1,2',
            'batch_id' => 'nullable|string',
        ]);

        $query = ActivityUser::where('activity_id', $activityId)
            ->where('user_id', $userId);

        if ($request->has('batch_id')) {
            if ($request->batch_id) {
                $query->where('activity_batch_id', $request->batch_id);
            } else {
                $query->whereNull('activity_batch_id');
            }
        }

        $participant = $query->firstOrFail();

        // Group Validation Logic
        $targetUserIds = [$userId];

        // Expand with Import Groups (registration groups)
        // This ensures that if a user is part of a registration group (Kelompok), 
        // the action applies to the entire group.
        // We do NOT expand based on Payment groups anymore, to avoid affecting 
        // other groups or individuals who just happened to pay together.
        $targetUserIds = $this->expandUserIdsWithGroups($activityId, $targetUserIds);

        // Update ALL related participants
        $count = ActivityUser::where('activity_id', $activityId)
            ->whereIn('user_id', $targetUserIds)
            ->when($request->has('batch_id'), function ($q) use ($request) {
                if ($request->batch_id) {
                    $q->where('activity_batch_id', $request->batch_id);
                } else {
                    $q->whereNull('activity_batch_id');
                }
            })
            ->update([
                'status' => (int) $request->status,
                'updated_by' => auth()->id()
            ]);

        // Refresh original participant
        $participant->refresh();

        if ($request->wantsJson()) {
            $statusText = match ($participant->status) {
                ActivityUser::STATUS_ACTIVE => 'Aktif',
                ActivityUser::STATUS_VERIFICATION => 'Belum Verifikasi',
                ActivityUser::STATUS_REJECTED => 'Ditolak',
                default => 'Tidak Diketahui',
            };

            return response()->json([
                'success' => true,
                'status' => $participant->status,
                'status_text' => $statusText,
                'updated_count' => $count,
            ]);
        }

        return redirect()->back()->with('success', 'Status peserta berhasil diperbarui ('.$count.' peserta).');
    }

    private function expandUserIdsWithGroups($activityId, $userIds)
    {
        try {
            if (! is_array($userIds)) {
                $userIds = [$userIds];
            }

            // Get table name dynamically to handle variations
            $tableName = (new ActivityUser)->getTable();

            // Check if group column exists
            if (! Schema::hasColumn($tableName, 'activity_participant_group_id')) {
                return $userIds;
            }

            // Find groups for these users
            $groupIds = ActivityUser::where('activity_id', $activityId)
                ->whereIn('user_id', $userIds)
                ->whereNotNull('activity_participant_group_id')
                ->pluck('activity_participant_group_id')
                ->unique()
                ->toArray();

            if (empty($groupIds)) {
                return $userIds;
            }

            // Find all users in these groups
            $groupUserIds = ActivityUser::where('activity_id', $activityId)
                ->whereIn('activity_participant_group_id', $groupIds)
                ->pluck('user_id')
                ->toArray();

            return array_values(array_unique(array_merge($userIds, $groupUserIds)));
        } catch (\Exception $e) {
            \Log::error('Error expanding user IDs with groups: '.$e->getMessage());

            return $userIds;
        }
    }

    public function destroyParticipantUser(Request $request, $activityId, $userId)
    {
        $activity = Activity::findOrFail($activityId);

        // Permission check
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403, 'Anda tidak memiliki izin untuk menghapus akun peserta.');
            }
        }

        try {
            // 1. Identify all users to delete (including group members)
            // If 'single' param is present, only delete the specified user, ignoring group
            if ($request->has('single') || $request->query('single')) {
                $userIdsToDelete = [$userId];
            } else {
                $userIdsToDelete = $this->expandUserIdsWithGroups($activityId, [$userId]);
            }

            \DB::beginTransaction();

            foreach ($userIdsToDelete as $uid) {
                // Get user object (if exists)
                $user = User::find($uid);
                if (! $user) {
                    continue;
                }

                // A. Delete Payments & Files for this activity FIRST (sebelum user dihapus)
                $payments = Payment::where('activity_id', $activityId)->where('user_id', $uid)->get();
                foreach ($payments as $payment) {
                    if ($payment->proof_of_payment) {
                        try {
                            // Gunakan Storage facade untuk menghapus file
                            if (Storage::disk('public')->exists($payment->proof_of_payment)) {
                                // Jangan hapus file default/aset
                                if (! str_contains($payment->proof_of_payment, 'assets/images/credit/bukti bayar.png')) {
                                    Storage::disk('public')->delete($payment->proof_of_payment);
                                }
                            } else {
                                // Fallback ke public_path jika file tidak ada di storage disk (legacy)
                                $pathsToCheck = [
                                    public_path($payment->proof_of_payment),
                                    public_path('storage/' . $payment->proof_of_payment)
                                ];
                                
                                foreach ($pathsToCheck as $path) {
                                    if (File::exists($path) &&
                                        ! str_contains($payment->proof_of_payment, 'assets/images/credit/bukti bayar.png')) {
                                        File::delete($path);
                                    }
                                }
                            }
                        } catch (\Exception $e) {
                        }
                    }
                    $payment->delete();
                }

                // B. Delete Activity Enrollments & Files
                $enrollments = ActivityUser::where('activity_id', $activityId)->where('user_id', $uid)->get();
                foreach ($enrollments as $enrollment) {
                    if ($enrollment->image_path) {
                        try {
                            // Gunakan Storage facade
                            if (Storage::disk('public')->exists($enrollment->image_path)) {
                                Storage::disk('public')->delete($enrollment->image_path);
                            } else {
                                // Fallback ke public_path
                                $path = public_path($enrollment->image_path);
                                if (File::exists($path)) {
                                    File::delete($path);
                                }
                            }
                        } catch (\Exception $e) {
                        }
                    }
                    $enrollment->delete();
                }

                // C. Delete Activity Related Records (Attendance, etc.)
                // Note: We scope by activity_id via relationships or direct where if possible

                // Attendance Records
                if (Schema::hasTable('attendances')) {
                    $attendanceIds = Attendance::where('activity_id', $activityId)->pluck('id');
                    if ($attendanceIds->isNotEmpty()) {
                        ActivityRecord::whereIn('attendance_id', $attendanceIds)->where('user_id', $uid)->delete();
                    }
                }

                // Room Assignments
                if (Schema::hasTable('activity_hotel_room_assignments')) {
                    ActivityHotelRoomAssignment::where('activity_id', $activityId)->where('user_id', $uid)->delete();
                }

                // Comments for this activity
                Comment::where('commentable_id', $activityId)
                    ->where('commentable_type', Activity::class)
                    ->where('user_id', $uid)
                    ->delete();

            }

            \DB::commit();

            $count = count($userIdsToDelete);

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => "Berhasil menghapus $count peserta dan data terkait (termasuk anggota kelompok).",
                ]);
            }

            return redirect()->back()->with('success', "Berhasil menghapus $count peserta dan data terkait (termasuk anggota kelompok).");
        } catch (\Throwable $e) {
            \DB::rollBack();
            \Log::error('Error deleting participant user', [
                'activity_id' => $activityId,
                'user_id' => $userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Terjadi kesalahan saat menghapus peserta: '.$e->getMessage(),
                ], 500);
            }

            return redirect()->back()->with('error', 'Terjadi kesalahan saat menghapus peserta: '.$e->getMessage());
        }
    }

    // ============ DIVISI METHODS ============

    /**
     * Store a new division
     */
    public function storeDivision(Request $request, $activityId)
    {
        $activity = Activity::findOrFail($activityId);

        // Check permission: Admin dan superadmin bisa akses semua, creator dan panitia hanya aktivitas mereka
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            // Untuk creator dan panitia, check apakah mereka bisa manage registration untuk aktivitas ini
            if (! $activity->canManageRegistration(auth()->id())) {
                if ($request->ajax()) {
                    return response()->json(['success' => false, 'message' => 'Anda tidak memiliki izin.'], 403);
                }
                abort(403, 'Anda tidak memiliki izin untuk mengakses halaman ini.');
            }
        }

        $request->validate([
            'activity_batch_id' => 'nullable|exists:activity_batches,id',
            'name_select' => 'nullable|string',
            'custom_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'leader_name' => 'nullable|string|max:255',
            'leader_phone' => 'nullable|string|max:20',
        ]);

        $name = $request->name_select;
        if ($name === 'Lainnya' && $request->filled('custom_name')) {
            $name = $request->custom_name;
        }

        if (empty($name)) {
            // Fallback to 'name' field if name_select is not used (legacy support or direct POST)
            $name = $request->name;
        }

        if (empty($name)) {
            if ($request->ajax()) {
                return response()->json(['success' => false, 'message' => 'Nama jabatan harus diisi.'], 422);
            }

            return redirect()->back()->with('error', 'Nama jabatan harus diisi.');
        }

        // Check if division with this name already exists for this activity
        if (ActivityDivision::where('activity_id', $activityId)->where('name', $name)->exists()) {
            if ($request->ajax()) {
                return response()->json(['success' => false, 'message' => 'Jabatan dengan nama ini sudah ada.'], 422);
            }

            return redirect()->back()->with('error', 'Jabatan dengan nama ini sudah ada.');
        }

        // Add to RefPosition if not exists
        RefPosition::firstOrCreate(['name' => $name]);

        $division = ActivityDivision::create([
            'activity_id' => $activityId,
            'activity_batch_id' => $request->activity_batch_id,
            'name' => $name,
            'description' => $request->description,
            'leader_name' => $request->leader_name,
            'leader_phone' => $request->leader_phone,
        ]);

        // If leader is assigned, update their committee structure record
        if ($request->filled('leader_user_id')) {
            ActivityCommitteeStructure::where('activity_id', $activityId)
                ->where('user_id', $request->leader_user_id)
                ->update([
                    'position' => $name,
                    'activity_division_id' => $division->id,
                ]);
        }

        if ($request->ajax()) {
            return response()->json(['success' => true, 'message' => 'Divisi berhasil ditambahkan.']);
        }

        return redirect()->back()->with('success', 'Divisi berhasil ditambahkan.');
    }

    /**
     * Update a division
     */
    public function updateDivision(Request $request, $activityId, $divisionId)
    {
        $activity = Activity::findOrFail($activityId);

        // Check permission: Admin dan superadmin bisa akses semua, creator dan panitia hanya aktivitas mereka
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            // Untuk creator dan panitia, check apakah mereka bisa manage registration untuk aktivitas ini
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403, 'Anda tidak memiliki izin untuk mengakses halaman ini.');
            }
        }

        // Check permission menggunakan permission system
        if (! auth()->user()->hasPermission('manage_activity_preparation')) {
            abort(403, 'Anda tidak memiliki izin untuk mengelola persiapan aktivitas.');
        }

        $request->validate([
            'activity_batch_id' => 'nullable|exists:activity_batches,id',
            'name_select' => 'nullable|string',
            'custom_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'leader_name' => 'nullable|string|max:255',
            'leader_phone' => 'nullable|string|max:20',
        ]);

        $division = ActivityDivision::where('activity_id', $activityId)
            ->findOrFail($divisionId);

        $name = $request->name_select;
        if ($name === 'Lainnya' && $request->filled('custom_name')) {
            $name = $request->custom_name;
        }

        if (empty($name)) {
            $name = $request->name;
        }

        if (empty($name)) {
            if ($request->ajax()) {
                return response()->json(['success' => false, 'message' => 'Nama jabatan harus diisi.'], 422);
            }

            return redirect()->back()->with('error', 'Nama jabatan harus diisi.');
        }

        // Check if division with this name already exists for this activity (excluding current division)
        // Only check if name is changing to avoid blocking updates on existing duplicates
        if ($name !== $division->name && ActivityDivision::where('activity_id', $activityId)
            ->where('name', $name)
            ->where('id', '!=', $divisionId)
            ->exists()) {
            if ($request->ajax()) {
                return response()->json(['success' => false, 'message' => 'Jabatan dengan nama ini sudah ada.'], 422);
            }

            return redirect()->back()->with('error', 'Jabatan dengan nama ini sudah ada.');
        }

        // Add to RefPosition if not exists
        RefPosition::firstOrCreate(['name' => $name]);

        $data = $request->only(['description', 'leader_name', 'leader_phone']);
        $data['name'] = $name;

        if ($request->has('activity_batch_id')) {
            $data['activity_batch_id'] = $request->activity_batch_id;
        }

        $division->update($data);

        // If leader is assigned, update their committee structure record
        if ($request->filled('leader_user_id')) {
            ActivityCommitteeStructure::where('activity_id', $activityId)
                ->where('user_id', $request->leader_user_id)
                ->update([
                    'position' => $name,
                    'activity_division_id' => $division->id,
                ]);
        }

        return redirect()->back()->with('success', 'Divisi berhasil diperbarui.');
    }

    /**
     * Delete a division
     */
    public function destroyDivision($activityId, $divisionId)
    {
        $activity = Activity::findOrFail($activityId);

        // Check permission: Admin dan superadmin bisa akses semua, creator dan panitia hanya aktivitas mereka
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            // Untuk creator dan panitia, check apakah mereka bisa manage registration untuk aktivitas ini
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403, 'Anda tidak memiliki izin untuk mengakses halaman ini.');
            }
        }

        // Check permission menggunakan permission system
        if (! auth()->user()->hasPermission('manage_activity_preparation')) {
            abort(403, 'Anda tidak memiliki izin untuk mengelola persiapan aktivitas.');
        }

        $division = ActivityDivision::where('activity_id', $activityId)
            ->findOrFail($divisionId);

        $division->delete();

        return redirect()->back()->with('success', 'Divisi berhasil dihapus.');
    }

    // ============ REQUIREMENT METHODS ============

    /**
     * Show requirements for a division
     */
    public function showRequirements($activityId, $divisionId)
    {
        $activity = Activity::findOrFail($activityId);
        $division = ActivityDivision::where('activity_id', $activityId)
            ->findOrFail($divisionId);
        $requirements = ActivityDivisionRequirement::where('activity_division_id', $divisionId)
            ->orderBy('status')
            ->orderBy('name')
            ->get();

        // If request wants JSON (AJAX)
        if (request()->wantsJson() || request()->ajax()) {
            return response()->json([
                'requirements' => $requirements,
            ]);
        }

        return Inertia::render('Activity/Preparation/Requirements', compact('activity', 'division', 'requirements'));
    }

    /**
     * Store a new requirement
     */
    public function storeRequirement(Request $request, $activityId, $divisionId)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'quantity' => 'nullable|integer|min:1',
            'unit' => 'nullable|string|max:50',
            'status' => 'nullable|in:pending,ready,completed',
            'notes' => 'nullable|string',
            'target_date' => 'nullable|date',
        ]);

        ActivityDivisionRequirement::create([
            'activity_division_id' => $divisionId,
            'name' => $request->name,
            'quantity' => $request->quantity ?? 1,
            'unit' => $request->unit,
            'status' => $request->status ?? 'pending',
            'notes' => $request->notes,
            'target_date' => $request->target_date,
        ]);

        if ($request->ajax()) {
            return response()->json(['success' => true, 'message' => 'Tugas berhasil ditambahkan.']);
        }

        return redirect()->back()->with('success', 'Kebutuhan berhasil ditambahkan.');
    }

    /**
     * Update a requirement
     */
    public function updateRequirement(Request $request, $activityId, $divisionId, $requirementId)
    {
        $rules = [
            'unit' => 'nullable|string|max:50',
            'status' => 'nullable|in:pending,ready,completed',
            'notes' => 'nullable|string',
            'target_date' => 'nullable|date',
        ];

        // Only require name if it's provided (for JSON updates that might only update status)
        if ($request->has('name')) {
            $rules['name'] = 'required|string|max:255';
        }

        // Only require quantity if it's provided
        if ($request->has('quantity')) {
            $rules['quantity'] = 'required|integer|min:1';
        }

        $request->validate($rules);

        $requirement = ActivityDivisionRequirement::where('activity_division_id', $divisionId)
            ->findOrFail($requirementId);

        $updateData = [];
        if ($request->has('name')) {
            $updateData['name'] = $request->name;
        }
        if ($request->has('quantity')) {
            $updateData['quantity'] = $request->quantity;
        }
        if ($request->has('unit')) {
            $updateData['unit'] = $request->unit;
        }
        if ($request->has('status')) {
            $updateData['status'] = $request->status;
        }
        if ($request->has('notes')) {
            $updateData['notes'] = $request->notes;
        }
        if ($request->has('target_date')) {
            $updateData['target_date'] = $request->target_date;
        }

        $requirement->update($updateData);

        if ($request->ajax() || $request->wantsJson()) {
            return response()->json(['success' => true, 'message' => 'Tugas berhasil diperbarui.']);
        }

        return redirect()->back()->with('success', 'Kebutuhan berhasil diperbarui.');
    }

    /**
     * Delete a requirement
     */
    public function destroyRequirement($activityId, $divisionId, $requirementId)
    {
        $requirement = ActivityDivisionRequirement::where('activity_division_id', $divisionId)
            ->findOrFail($requirementId);

        $requirement->delete();

        return redirect()->back()->with('success', 'Kebutuhan berhasil dihapus.');
    }

    // ============ COMMITTEE STRUCTURE METHODS ============

    /**
     * Show committee structure
     */
    public function showCommittee($activityId)
    {
        return redirect()->route('activity.preparation.index', $activityId);
    }

    /**
     * Store a new committee member
     */
    public function storeCommittee(Request $request, $activityId)
    {
        $activity = Activity::findOrFail($activityId);

        // Check permission: Admin dan superadmin bisa akses semua, creator dan panitia hanya aktivitas mereka
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            // Untuk creator dan panitia, check apakah mereka bisa manage registration untuk aktivitas ini
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403, 'Anda tidak memiliki izin untuk menambah panitia untuk aktivitas ini.');
            }
        }

        // Longgarkan: jangan blokir berdasarkan permission key

        $request->validate([
            'activity_batch_id' => 'nullable|exists:activity_batches,id',
            'user_id' => 'required|exists:users,id',
            'position' => 'required|string|max:255',
            'order' => 'nullable|integer|min:0',
        ]);

        // Hilangkan batasan langganan untuk penambahan panitia

        // Get user data from database with profile
        $user = User::with('profile')->findOrFail($request->user_id);

        // Determine activity_batch_id if not provided
        $batchId = $request->activity_batch_id;
        if (! $batchId) {
            $activityUser = ActivityUser::where('activity_id', $activityId)
                ->where('user_id', $request->user_id)
                ->first();
            if ($activityUser) {
                $batchId = $activityUser->activity_batch_id;
            }
        }

        // Get the next order value (max order + 1)
        $maxOrder = ActivityCommitteeStructure::where('activity_id', $activityId)->max('order') ?? -1;

        // Ensure position exists in RefPosition
        RefPosition::firstOrCreate(['name' => $request->position]);

        $positionName = trim($request->position);
        $lowerPositionName = strtolower($positionName);
        $isMainPosition = ! Str::startsWith($lowerPositionName, 'anggota');
        $division = null;

        if ($isMainPosition) {
            // Check if position matches an existing division to link it
            $division = ActivityDivision::where('activity_id', $activityId)
                ->where('name', $request->position)
                ->first();

            // If division doesn't exist, create it automatically (Auto-sync feature)
            if (! $division) {
                $division = ActivityDivision::create([
                    'activity_id' => $activityId,
                    'activity_batch_id' => $batchId,
                    'name' => $request->position,
                    'description' => 'Jabatan '.$request->position,
                    'leader_name' => $user->name,
                    'leader_phone' => $user->profile->no_hp ?? null,
                ]);
            }
        } else {
             // Logic for "Anggota" -> Map to "Koordinator"
             // Example: "Anggota Acara" -> "Koordinator Acara"
             $suffix = trim(str_ireplace('anggota', '', $lowerPositionName));
             if ($suffix) {
                 $division = ActivityDivision::where('activity_id', $activityId)
                     ->where('name', 'like', '%Koordinator%')
                     ->where('name', 'like', "%{$suffix}%")
                     ->first();
             }
        }

        ActivityCommitteeStructure::create([
            'activity_id' => $activityId,
            'activity_batch_id' => $batchId,
            'position' => $request->position,
            'activity_division_id' => $division ? $division->id : null,
            'name' => $user->name,
            'user_id' => $request->user_id,
            'phone' => $user->profile->no_hp ?? null,
            'email' => $user->email,
            'order' => $maxOrder + 1,
        ]);

        return redirect()->back()->with('success', 'Anggota kepanitiaan berhasil ditambahkan.');
    }

    /**
     * Update a committee member
     */
    public function updateCommittee(Request $request, $activityId, $committeeId)
    {
        $activity = Activity::findOrFail($activityId);

        // Check permission: Admin dan superadmin bisa akses semua, creator dan panitia hanya aktivitas mereka
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            // Untuk creator dan panitia, check apakah mereka bisa manage registration untuk aktivitas ini
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403, 'Anda tidak memiliki izin untuk mengubah panitia untuk aktivitas ini.');
            }
        }

        // Longgarkan: jangan blokir berdasarkan permission key

        $request->validate([
            'activity_batch_id' => 'nullable|exists:activity_batches,id',
            'user_id' => 'required|exists:users,id',
            'position' => 'required|string|max:255',
            'order' => 'nullable|integer|min:0',
        ]);

        $committee = ActivityCommitteeStructure::where('activity_id', $activityId)
            ->findOrFail($committeeId);

        // Ensure position exists in RefPosition
        RefPosition::firstOrCreate(['name' => $request->position]);

        // Check if position matches an existing division to link it
        $division = ActivityDivision::where('activity_id', $activityId)
            ->where('name', $request->position)
            ->first();

        // Get user data from database with profile
        $user = User::with('profile')->findOrFail($request->user_id);

        // If division doesn't exist, create it automatically (Auto-sync feature)
        if (! $division) {
            $division = ActivityDivision::create([
                'activity_id' => $activityId,
                'activity_batch_id' => $request->activity_batch_id,
                'name' => $request->position,
                'description' => 'Jabatan '.$request->position,
                'leader_name' => $user->name,
                'leader_phone' => $user->profile->no_hp ?? null,
            ]);
        }

        $committee->update([
            'activity_batch_id' => $request->activity_batch_id,
            'position' => $request->position,
            'activity_division_id' => $division ? $division->id : null,
            'name' => $user->name,
            'user_id' => $request->user_id,
            'phone' => $user->profile->no_hp ?? null,
            'email' => $user->email,
            'order' => $committee->order, // Keep existing order
        ]);

        // Return JSON response for AJAX requests
        if ($request->ajax() || $request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Anggota kepanitiaan berhasil diperbarui.',
                'position' => $committee->position,
            ]);
        }

        return redirect()->back()->with('success', 'Anggota kepanitiaan berhasil diperbarui.');
    }

    /**
     * Delete a committee member
     */
    public function destroyCommittee($activityId, $committeeId)
    {
        $activity = Activity::findOrFail($activityId);

        // Check permission: Admin dan superadmin bisa akses semua, creator dan panitia hanya aktivitas mereka
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            // Untuk creator dan panitia, check apakah mereka bisa manage registration untuk aktivitas ini
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403, 'Anda tidak memiliki izin untuk menghapus panitia untuk aktivitas ini.');
            }
        }

        // Check permission menggunakan permission system
        if (! auth()->user()->hasPermission('manage_activity_preparation')) {
            abort(403, 'Anda tidak memiliki izin untuk mengelola kepanitiaan.');
        }

        $committee = ActivityCommitteeStructure::where('activity_id', $activityId)
            ->findOrFail($committeeId);

        $committee->delete();

        return redirect()->back()->with('success', 'Anggota kepanitiaan berhasil dihapus.');
    }

    // ============ RUNDOWN METHODS ============

    /**
     * Store a new rundown
     */
    public function storeRundown(Request $request, $activityId)
    {
        $activity = Activity::findOrFail($activityId);

        // Check permission: Admin dan superadmin bisa akses semua, creator dan panitia hanya aktivitas mereka
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            // Creator/panitia: cukup pastikan terkait dengan aktivitas ini
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403, 'Anda tidak memiliki izin untuk mengakses halaman ini.');
            }
        }

        // Longgarkan: jangan blokir berdasarkan permission key

        $request->validate([
            'activity_batch_id' => 'nullable|exists:activity_batches,id',
            'rundown_date' => 'nullable|date',
            'start_time' => 'required',
            'end_time' => 'nullable',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'speaker' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'order' => 'nullable|integer|min:0',
        ]);

        // Get the next order value (max order + 1)
        $maxOrder = ActivityRundown::where('activity_id', $activityId)->max('order') ?? -1;

        ActivityRundown::create([
            'activity_id' => $activityId,
            'activity_batch_id' => $request->activity_batch_id,
            'rundown_date' => $request->rundown_date,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'title' => $request->title,
            'description' => $request->description,
            'speaker' => $request->speaker,
            'location' => $request->location,
            'order' => ($maxOrder + 1),
        ]);

        return redirect()->back()->with('success', 'Rundown acara berhasil ditambahkan.');
    }

    /**
     * Update a rundown
     */
    public function updateRundown(Request $request, $activityId, $rundownId)
    {
        $activity = Activity::findOrFail($activityId);

        // Check permission: Admin dan superadmin bisa akses semua, creator dan panitia hanya aktivitas mereka
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403, 'Anda tidak memiliki izin untuk mengakses halaman ini.');
            }
        }

        // Longgarkan: jangan blokir berdasarkan permission key

        $request->validate([
            'activity_batch_id' => 'nullable|exists:activity_batches,id',
            'rundown_date' => 'nullable|date',
            'start_time' => 'required',
            'end_time' => 'nullable',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'speaker' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'order' => 'nullable|integer|min:0',
        ]);

        $rundown = ActivityRundown::where('activity_id', $activityId)
            ->findOrFail($rundownId);

        $rundown->update($request->only([
            'activity_batch_id',
            'rundown_date',
            'start_time',
            'end_time',
            'title',
            'description',
            'speaker',
            'location',
            'order',
        ]));

        return redirect()->back()->with('success', 'Rundown acara berhasil diperbarui.');
    }

    /**
     * Delete a rundown
     */
    public function destroyRundown($activityId, $rundownId)
    {
        $activity = Activity::findOrFail($activityId);

        // Check permission: Admin dan superadmin bisa akses semua, creator dan panitia hanya aktivitas mereka
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403, 'Anda tidak memiliki izin untuk mengakses halaman ini.');
            }
        }

        // Longgarkan: jangan blokir berdasarkan permission key

        $rundown = ActivityRundown::where('activity_id', $activityId)
            ->findOrFail($rundownId);

        $rundown->delete();

        return redirect()->back()->with('success', 'Rundown acara berhasil dihapus.');
    }

    public function importRundowns(Request $request, $activityId)
    {
        $activity = Activity::findOrFail($activityId);
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403, 'Anda tidak memiliki izin untuk mengakses halaman ini.');
            }
        }
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv',
            'activity_batch_id' => 'nullable|exists:activity_batches,id',
        ]);
        $file = $request->file('file');
        $path = $file->getRealPath();
        $inserted = 0;
        $skipped = 0;
        try {
            $spreadsheet = IOFactory::load($path);
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray(null, true, true, true);
            $header = array_map(function ($v) {
                return strtolower(trim((string) $v));
            }, $rows[1] ?? []);
            $colStart = array_search('start_time', $header, true);
            $colEnd = array_search('end_time', $header, true);
            $colTitle = array_search('title', $header, true);
            $colDesc = array_search('description', $header, true);
            $colSpeaker = array_search('speaker', $header, true);
            $colLocation = array_search('location', $header, true);
            $colOrder = array_search('order', $header, true);
            if ($colStart === false || $colTitle === false) {
                throw new \RuntimeException('Kolom start_time dan title wajib ada di baris header.');
            }
            $nextOrder = ((int) (ActivityRundown::where('activity_id', $activityId)->max('order') ?? -1)) + 1;
            for ($i = 2; $i <= count($rows); $i++) {
                $row = $rows[$i] ?? [];
                $start = trim((string) ($row[$colStart] ?? ''));
                $end = $colEnd !== false ? trim((string) ($row[$colEnd] ?? '')) : '';
                $title = trim((string) ($row[$colTitle] ?? ''));
                $desc = $colDesc !== false ? trim((string) ($row[$colDesc] ?? '')) : '';
                $speaker = $colSpeaker !== false ? trim((string) ($row[$colSpeaker] ?? '')) : '';
                $location = $colLocation !== false ? trim((string) ($row[$colLocation] ?? '')) : '';
                $orderStr = $colOrder !== false ? trim((string) ($row[$colOrder] ?? '')) : '';
                if ($start === '' || $title === '') {
                    $skipped++;

                    continue;
                }
                $orderVal = is_numeric($orderStr) ? (int) $orderStr : $nextOrder++;
                ActivityRundown::create([
                    'activity_id' => $activityId,
                    'activity_batch_id' => $request->activity_batch_id,
                    'start_time' => $start,
                    'end_time' => ($end !== '' ? $end : null),
                    'title' => $title,
                    'description' => ($desc !== '' ? $desc : null),
                    'speaker' => ($speaker !== '' ? $speaker : null),
                    'location' => ($location !== '' ? $location : null),
                    'order' => $orderVal,
                ]);
                $inserted++;
            }

            return redirect()->back()->with('success', "Impor rundown selesai. Ditambah: $inserted, Dilewati: $skipped");
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'Gagal mengimpor rundown: '.$e->getMessage());
        }
    }

    public function downloadRundownTemplate($activityId)
    {
        $activity = Activity::findOrFail($activityId);
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403, 'Anda tidak memiliki izin untuk mengakses halaman ini.');
            }
        }
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setCellValue('A1', 'start_time');
        $sheet->setCellValue('B1', 'end_time');
        $sheet->setCellValue('C1', 'title');
        $sheet->setCellValue('D1', 'description');
        $sheet->setCellValue('E1', 'speaker');
        $sheet->setCellValue('F1', 'location');
        $sheet->setCellValue('G1', 'order');
        $sheet->setCellValue('A2', '08:00');
        $sheet->setCellValue('B2', '09:00');
        $sheet->setCellValue('C2', 'Pembukaan');
        $sheet->setCellValue('D2', 'Sambutan');
        $sheet->setCellValue('E2', 'MC');
        $sheet->setCellValue('F2', 'Hall A');
        $sheet->setCellValue('G2', '0');
        $writer = new Xlsx($spreadsheet);
        $filename = 'template_rundown_'.$activityId.'_'.date('Ymd').'.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    // ============ MATERIAL METHODS ============

    /**
     * Store a new material
     */
    public function storeMaterial(Request $request, $activityId)
    {
        $activity = Activity::findOrFail($activityId);

        // Check permission: Admin dan superadmin bisa akses semua, creator dan panitia hanya aktivitas mereka
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403, 'Anda tidak memiliki izin untuk mengakses halaman ini.');
            }
        }

        // Longgarkan: jangan blokir berdasarkan permission key

        $request->validate([
            'activity_batch_id' => 'nullable|exists:activity_batches,id',
            'name' => 'required|string|max:255',
            'material_type' => 'nullable|in:image,pdf,ppt,doc,audio,video,link',
            'file' => 'nullable|file|max:102400', // 100MB max
            'link_url' => 'nullable|url|max:2048',
            'description' => 'nullable|string',
            'cover_image' => 'nullable|image|max:5120', // 5MB max for cover
        ]);

        $selectedType = $request->input('material_type');
        $hasFile = $request->hasFile('file');
        $hasLink = $request->filled('link_url');

        // Handle cover image upload
        $coverImagePath = null;
        if ($request->hasFile('cover_image')) {
            $coverFile = $request->file('cover_image');
            $coverFilename = 'cover_'.time().'_'.uniqid().'.'.$coverFile->getClientOriginalExtension();
            $coverImagePath = $coverFile->storeAs('activity_materials/'.$activityId.'/covers', $coverFilename, 'public');
        }

        if (! $hasFile && $hasLink) {
            ActivityMaterial::create([
                'activity_id' => $activityId,
                'activity_batch_id' => $request->activity_batch_id,
                'name' => $request->name,
                'file_name' => null,
                'file_path' => $request->link_url,
                'file_type' => 'link',
                'mime_type' => null,
                'file_size' => 0,
                'description' => $request->description,
                'uploaded_by' => auth()->id(),
                'cover_image_path' => $coverImagePath,
            ]);
        } elseif ($hasFile) {
            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            $extension = $file->getClientOriginalExtension();
            $mimeType = $file->getMimeType();
            $fileSize = $file->getSize();

            $fileType = null;
            if ($selectedType) {
                $fileType = $selectedType;
            } else {
                if (str_starts_with((string) $mimeType, 'image/')) {
                    $fileType = 'image';
                } elseif ($mimeType === 'application/pdf' || strtolower($extension) === 'pdf') {
                    $fileType = 'pdf';
                } elseif (in_array(strtolower($extension), ['ppt', 'pptx'], true) || in_array($mimeType, ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'], true)) {
                    $fileType = 'ppt';
                } elseif (in_array(strtolower($extension), ['doc', 'docx'], true) || in_array($mimeType, ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], true)) {
                    $fileType = 'doc';
                } elseif (str_starts_with((string) $mimeType, 'audio/')) {
                    $fileType = 'audio';
                } elseif (str_starts_with((string) $mimeType, 'video/')) {
                    $fileType = 'video';
                } else {
                    $fileType = 'file';
                }
            }

            $directory = 'activity_materials/'.$activityId;
            $filename = time().'_'.uniqid().'.'.$extension;
            $filePath = $file->storeAs($directory, $filename, 'public');

            ActivityMaterial::create([
                'activity_id' => $activityId,
                'activity_batch_id' => $request->activity_batch_id,
                'name' => $request->name,
                'file_name' => $originalName,
                'file_path' => $filePath,
                'file_type' => $fileType,
                'mime_type' => $mimeType,
                'file_size' => $fileSize,
                'description' => $request->description,
                'uploaded_by' => auth()->id(),
                'cover_image_path' => $coverImagePath,
            ]);
        } else {
            return redirect()->back()->with('error', 'Silakan pilih file atau masukkan link materi.');
        }

        return redirect()->back()->with('success', 'Materi acara berhasil diupload.');
    }

    /**
     * Delete a material
     */
    public function destroyMaterial($activityId, $materialId)
    {
        $activity = Activity::findOrFail($activityId);

        // Check permission: Admin dan superadmin bisa akses semua, creator dan panitia hanya aktivitas mereka
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403, 'Anda tidak memiliki izin untuk mengakses halaman ini.');
            }
        }

        // Longgarkan: jangan blokir berdasarkan permission key

        $material = ActivityMaterial::where('activity_id', $activityId)
            ->findOrFail($materialId);

        // Delete file from storage
        if (Storage::disk('public')->exists($material->file_path)) {
            Storage::disk('public')->delete($material->file_path);
        }

        // Delete material record
        $material->delete();

        return redirect()->back()->with('success', 'Materi acara berhasil dihapus.');
    }

    /**
     * Download a material file
     */
    public function downloadMaterial($activityId, $materialId)
    {
        $activity = Activity::findOrFail($activityId);
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            $isEnrolled = ActivityUser::where('activity_id', $activityId)
                ->where('user_id', auth()->id())
                ->where('status', ActivityUser::STATUS_ACTIVE)
                ->exists();
            if (! $activity->canManageRegistration(auth()->id()) && ! $isEnrolled) {
                abort(403);
            }
        }

        $material = ActivityMaterial::where('activity_id', $activityId)->findOrFail($materialId);
        $relativePath = ltrim($material->file_path, '/');
        // Remove storage/ prefix if present (since disk('public') maps to storage/app/public)
        $relativePath = preg_replace('/^storage\//', '', $relativePath);

        if (Storage::disk('public')->exists($relativePath)) {
            try {
                $fullPath = Storage::disk('public')->path($relativePath);

                return response()->download($fullPath, $material->file_name);
            } catch (\Throwable $e) {
                try {
                    $stream = Storage::disk('public')->readStream($relativePath);
                    if ($stream) {
                        return response()->streamDownload(function () use ($stream) {
                            fpassthru($stream);
                        }, $material->file_name, [
                            'Content-Type' => $material->mime_type ?? 'application/octet-stream',
                        ]);
                    }
                } catch (\Throwable $e2) {
                    // continue to public_path fallback
                }
            }
        }

        // Fallback checks
        $pathsToCheck = [
            public_path('storage/'.$relativePath),
            public_path($material->file_path)
        ];

        foreach ($pathsToCheck as $path) {
            if (file_exists($path)) {
                return response()->download($path, $material->file_name);
            }
        }

        abort(404);
    }

    /**
     * Serve material file directly (for PDF viewing in iframe/embed)
     */
    public function serveMaterial($activityId, $materialId)
    {
        try {
            // Check authentication
            if (! auth()->check()) {
                \Log::warning('Unauthenticated access to material', [
                    'activity_id' => $activityId,
                    'material_id' => $materialId,
                ]);
                abort(401, 'Silakan login terlebih dahulu');
            }

            $activity = Activity::findOrFail($activityId);
            $user = auth()->user();

            // Check permission
            if (! $user->isAdmin() && ! $user->isSuperAdmin()) {
                $isEnrolled = ActivityUser::where('activity_id', $activityId)
                    ->where('user_id', $user->id)
                    ->where('status', ActivityUser::STATUS_ACTIVE)
                    ->exists();
                if (! $activity->canManageRegistration($user->id) && ! $isEnrolled) {
                    \Log::warning('Unauthorized access to material', [
                        'activity_id' => $activityId,
                        'material_id' => $materialId,
                        'user_id' => $user->id,
                    ]);
                    abort(403, 'Anda tidak memiliki izin untuk mengakses materi ini');
                }
            }

            $material = ActivityMaterial::where('activity_id', $activityId)->findOrFail($materialId);
            $originalPath = $material->file_path;
            $relativePath = ltrim($originalPath, '/');

            // Normalize path - coba berbagai format
            $possiblePaths = [];

            // Format 1: Langsung relative path
            $possiblePaths[] = $relativePath;

            // Format 2: Hapus prefix public/
            if (Str::startsWith($relativePath, 'public/')) {
                $possiblePaths[] = Str::after($relativePath, 'public/');
            }

            // Format 3: Tambahkan prefix activity_materials jika belum ada
            if (! Str::startsWith($relativePath, 'activity_materials/')) {
                // Coba cari di folder activity_materials
                $activityMaterialsPath = 'activity_materials/'.$activityId.'/'.basename($relativePath);
                $possiblePaths[] = $activityMaterialsPath;
            }

            // Format 4: Path dengan activity_id di dalamnya
            $pathParts = explode('/', $relativePath);
            if (count($pathParts) > 1 && $pathParts[0] !== 'activity_materials') {
                $possiblePaths[] = 'activity_materials/'.implode('/', array_slice($pathParts, 1));
            }

            \Log::info('Serving material file', [
                'activity_id' => $activityId,
                'material_id' => $materialId,
                'original_file_path' => $originalPath,
                'possible_paths' => $possiblePaths,
            ]);

            // Coba setiap possible path
            $foundPath = null;
            foreach ($possiblePaths as $testPath) {
                if (Storage::disk('public')->exists($testPath)) {
                    $foundPath = $testPath;
                    \Log::info('Found material file', ['path' => $foundPath]);
                    break;
                }
            }

            // Jika tidak ditemukan, gunakan path pertama sebagai default
            if (! $foundPath) {
                $foundPath = $possiblePaths[0];
                \Log::warning('Material file not found in any possible paths, using first path', [
                    'using_path' => $foundPath,
                ]);
            }

            $relativePath = $foundPath;

            // Try Storage disk first
            if (Storage::disk('public')->exists($relativePath)) {
                try {
                    $mimeType = $material->mime_type ?? Storage::disk('public')->mimeType($relativePath) ?? 'application/pdf';
                    $fileName = $material->file_name ?? basename($relativePath);

                    \Log::info('Serving from storage disk', [
                        'path' => $relativePath,
                        'mime_type' => $mimeType,
                        'file_name' => $fileName,
                    ]);

                    // Gunakan Storage::response() yang lebih reliable untuk serve file
                    return Storage::disk('public')->response($relativePath, $fileName, [
                        'Content-Type' => $mimeType,
                        'Content-Disposition' => 'inline; filename="'.$fileName.'"',
                        'Cache-Control' => 'public, max-age=3600',
                        'X-Content-Type-Options' => 'nosniff',
                    ]);
                } catch (\Throwable $e) {
                    \Log::warning('Failed to serve material from storage using Storage::response(), trying fallback', [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                        'path' => $relativePath,
                    ]);

                    // Fallback ke response()->file()
                    try {
                        $fullPath = Storage::disk('public')->path($relativePath);
                        $mimeType = $material->mime_type ?? Storage::disk('public')->mimeType($relativePath) ?? 'application/pdf';
                        $fileName = $material->file_name ?? basename($relativePath);

                        return response()->file($fullPath, [
                            'Content-Type' => $mimeType,
                            'Content-Disposition' => 'inline; filename="'.$fileName.'"',
                            'Cache-Control' => 'public, max-age=3600',
                            'X-Content-Type-Options' => 'nosniff',
                        ]);
                    } catch (\Throwable $e2) {
                        \Log::error('Failed to serve material with both methods', [
                            'error1' => $e->getMessage(),
                            'error2' => $e2->getMessage(),
                            'path' => $relativePath,
                        ]);
                    }
                }
            }

            // Fallback to public_path
            $publicPath = public_path('storage/'.$relativePath);
            if (file_exists($publicPath)) {
                $mimeType = $material->mime_type ?? mime_content_type($publicPath) ?? 'application/pdf';

                \Log::info('Serving from public path', [
                    'public_path' => $publicPath,
                    'mime_type' => $mimeType,
                ]);

                return response()->file($publicPath, [
                    'Content-Type' => $mimeType,
                    'Content-Disposition' => 'inline; filename="'.basename($material->file_name ?? $relativePath).'"',
                    'Cache-Control' => 'public, max-age=3600',
                    'X-Content-Type-Options' => 'nosniff',
                ]);
            }

            \Log::error('Material file not found', [
                'activity_id' => $activityId,
                'material_id' => $materialId,
                'file_path' => $material->file_path,
                'normalized_path' => $relativePath,
                'storage_exists' => Storage::disk('public')->exists($relativePath),
                'public_path' => $publicPath,
                'public_exists' => file_exists($publicPath),
            ]);

            abort(404, 'File tidak ditemukan');
        } catch (\Throwable $e) {
            \Log::error('Error serving material', [
                'activity_id' => $activityId,
                'material_id' => $materialId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * View material in a dedicated page
     */
    public function viewMaterial($activityId, $materialId)
    {
        $activity = Activity::findOrFail($activityId);
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            $isEnrolled = ActivityUser::where('activity_id', $activityId)
                ->where('user_id', auth()->id())
                ->where('status', ActivityUser::STATUS_ACTIVE)
                ->exists();
            if (! $activity->canManageRegistration(auth()->id()) && ! $isEnrolled) {
                abort(403);
            }
        }

        $material = ActivityMaterial::where('activity_id', $activityId)->findOrFail($materialId);

        $fileType = $material->file_type;
        $filePath = $material->file_path;
        $materialUrl = '';
        $embedUrl = null;
        $viewerHint = null;
        $host = request()->getHost();
        $isLocalHost = in_array($host, ['127.0.0.1', 'localhost']);

        if ($fileType === 'link' && is_string($filePath)) {
            $u = trim($filePath);
            if (str_contains($u, 'youtu.be/')) {
                $id = Str::after($u, 'youtu.be/');
                $id = Str::before($id, '?');
                if ($id) {
                    $embedUrl = 'https://www.youtube.com/embed/'.$id;
                }
            } elseif (str_contains($u, 'youtube.com')) {
                $q = [];
                parse_str(parse_url($u, PHP_URL_QUERY) ?? '', $q);
                $id = $q['v'] ?? null;
                if (! $id && Str::contains($u, '/shorts/')) {
                    $id = Str::between($u, '/shorts/', '?') ?: Str::after($u, '/shorts/');
                }
                if ($id) {
                    $embedUrl = 'https://www.youtube.com/embed/'.$id;
                }
            } elseif (str_contains($u, 'drive.google.com')) {
                if (Str::contains($u, '/file/d/')) {
                    $id = Str::between($u, '/file/d/', '/');
                    if ($id) {
                        $embedUrl = 'https://drive.google.com/file/d/'.$id.'/preview';
                    }
                } else {
                    $q = [];
                    parse_str(parse_url($u, PHP_URL_QUERY) ?? '', $q);
                    $id = $q['id'] ?? null;
                    if ($id) {
                        $embedUrl = 'https://drive.google.com/file/d/'.$id.'/preview';
                    }
                }
            } else {
                return redirect()->away($u);
            }
        } else {
            if ($filePath) {
                if (Str::startsWith($filePath, ['http://', 'https://'])) {
                    $materialUrl = $filePath;
                } else {
                    $normalized = ltrim($filePath, '/');
                    if (Str::startsWith($normalized, 'public/')) {
                        $normalized = Str::after($normalized, 'public/');
                    }

                    // Verifikasi file exists sebelum membuat URL
                    $fileExists = false;
                    if (\Illuminate\Support\Facades\Storage::disk('public')->exists($normalized)) {
                        $fileExists = true;
                        // Untuk PDF, gunakan route serve-material yang lebih reliable di production
                        // Gunakan url() helper langsung untuk menghindari masalah route name
                        if ($fileType === 'pdf') {
                            // Generate URL langsung dengan parameter yang benar
                            $materialUrl = url('/activity/'.$activityId.'/materials/'.$materialId.'/serve');

                            \Log::info('Generated PDF material URL', [
                                'activity_id' => $activityId,
                                'material_id' => $materialId,
                                'url' => $materialUrl,
                            ]);
                        } else {
                            // Untuk file lain, coba Storage::url() dulu, fallback ke asset()
                            try {
                                $materialUrl = \Illuminate\Support\Facades\Storage::disk('public')->url($normalized);
                                // Jika URL tidak valid (misalnya symlink tidak ada), gunakan route serve
                                if (! filter_var($materialUrl, FILTER_VALIDATE_URL) || strpos($materialUrl, 'http') !== 0) {
                                    try {
                                        $materialUrl = url('/activity/'.$activityId.'/materials/'.$materialId.'/serve');
                                        if (! filter_var($materialUrl, FILTER_VALIDATE_URL)) {
                                            throw new \Exception('Invalid URL');
                                        }
                                    } catch (\Exception $e) {
                                        try {
                                            $materialUrl = route('activity.material.serve', ['activityId' => $activityId, 'materialId' => $materialId]);
                                        } catch (\Exception $e2) {
                                            $materialUrl = route('activity.preparation.serve-material', ['activityId' => $activityId, 'materialId' => $materialId]);
                                        }
                                    }
                                }
                            } catch (\Exception $e) {
                                $materialUrl = asset('storage/'.$normalized);
                            }
                        }
                    } else {
                        // Fallback ke public_path
                        $publicPath = public_path('storage/'.$normalized);
                        
                        // Cek juga direct path
                        $directPath = public_path($normalized);
                        
                        if (file_exists($publicPath)) {
                            $fileExists = true;
                            // Untuk PDF, gunakan route serve-material
                            if ($fileType === 'pdf') {
                                // Generate URL langsung dengan parameter yang benar
                                $materialUrl = url('/activity/'.$activityId.'/materials/'.$materialId.'/serve');

                                \Log::info('Generated PDF material URL (fallback path)', [
                                    'activity_id' => $activityId,
                                    'material_id' => $materialId,
                                    'url' => $materialUrl,
                                ]);
                            } else {
                                $materialUrl = asset('storage/'.$normalized);
                            }
                        } elseif (file_exists($directPath)) {
                             $fileExists = true;
                             if ($fileType === 'pdf') {
                                 $materialUrl = url('/activity/'.$activityId.'/materials/'.$materialId.'/serve');
                             } else {
                                 // If it's in public root (not storage), asset() points to it
                                 $materialUrl = asset($normalized);
                             }
                        } else {
                            \Log::warning('Material file not found', [
                                'activity_id' => $activityId,
                                'material_id' => $materialId,
                                'file_path' => $filePath,
                                'normalized' => $normalized,
                            ]);
                            $viewerHint = 'File tidak ditemukan. Silakan hubungi administrator.';
                        }
                    }
                }
            }
            if ($materialUrl) {
                if ($fileType === 'pdf') {
                    // Untuk PDF, gunakan materialUrl langsung (akan ditangani oleh PDF.js di view)
                    $embedUrl = $materialUrl;
                } elseif (in_array($fileType, ['ppt', 'doc'])) {
                    $relative = ltrim($filePath, '/');
                    if (Str::startsWith($relative, 'public/')) {
                        $relative = Str::after($relative, 'public/');
                    }
                    $inputAbs = \Illuminate\Support\Facades\Storage::disk('public')->path($relative);
                    $convertedDirRel = 'activity_materials/'.$activityId.'/converted';
                    \Illuminate\Support\Facades\Storage::disk('public')->makeDirectory($convertedDirRel);
                    $outputAbsDir = \Illuminate\Support\Facades\Storage::disk('public')->path($convertedDirRel);
                    $base = pathinfo($inputAbs, PATHINFO_FILENAME);
                    $convertedRel = $convertedDirRel.'/'.$base.'.pdf';
                    $convertedAbs = $outputAbsDir.DIRECTORY_SEPARATOR.$base.'.pdf';
                    if (! \Illuminate\Support\Facades\Storage::disk('public')->exists($convertedRel)) {
                        $candidates = [
                            'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
                            'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
                            'soffice',
                        ];
                        $bin = null;
                        foreach ($candidates as $cand) {
                            if ($cand === 'soffice') {
                                $bin = $cand;
                                break;
                            }
                            if (file_exists($cand)) {
                                $bin = $cand;
                                break;
                            }
                        }
                        if ($bin) {
                            // Validasi keamanan: Pastikan path input dan output aman
                            // Hanya izinkan path yang valid dan tidak mengandung karakter berbahaya
                            $safeInputPath = realpath($inputAbs);
                            $safeOutputDir = realpath($outputAbsDir);

                            // Validasi: Pastikan path input dan output valid dan dalam storage yang diizinkan
                            if ($safeInputPath && $safeOutputDir &&
                                strpos($safeInputPath, realpath(storage_path('app/public'))) === 0 &&
                                strpos($safeOutputDir, realpath(storage_path('app/public'))) === 0) {

                                // Escape path untuk keamanan
                                $escapedBin = escapeshellarg($bin);
                                $escapedInput = escapeshellarg($safeInputPath);
                                $escapedOutput = escapeshellarg($safeOutputDir);

                                $cmd = $escapedBin.' --headless --convert-to pdf --outdir '.$escapedOutput.' '.$escapedInput.' 2>&1';
                                $out = [];
                                $code = 0;
                                $outputText = null;
                                try {
                                    $outputText = @shell_exec($cmd);
                                } catch (\Throwable $e) {
                                    \Log::warning('Shell exec failed for document conversion', [
                                        'error' => $e->getMessage(),
                                        'input' => $safeInputPath,
                                    ]);
                                }
                                if (! $outputText) {
                                    try {
                                        @exec($cmd, $out, $code);
                                        $outputText = implode("\n", (array) $out);
                                    } catch (\Throwable $e2) {
                                        \Log::warning('Exec failed for document conversion', [
                                            'error' => $e2->getMessage(),
                                            'input' => $safeInputPath,
                                        ]);
                                    }
                                }
                            } else {
                                \Log::warning('Invalid path for document conversion', [
                                    'input' => $inputAbs,
                                    'output' => $outputAbsDir,
                                ]);
                            }
                            if (\Illuminate\Support\Facades\Storage::disk('public')->exists($convertedRel)) {
                                $embedUrl = asset('storage/'.$convertedRel);
                            } else {
                                if (! $isLocalHost) {
                                    $embedUrl = 'https://view.officeapps.live.com/op/embed.aspx?src='.urlencode($materialUrl);
                                } else {
                                    $viewerHint = 'Konversi ke PDF gagal. Silakan Unduh atau gunakan domain publik untuk pratinjau.';
                                }
                            }
                        } else {
                            if (! $isLocalHost) {
                                $embedUrl = 'https://view.officeapps.live.com/op/embed.aspx?src='.urlencode($materialUrl);
                            } else {
                                $viewerHint = 'Konversi ke PDF membutuhkan LibreOffice. Silakan Unduh atau pasang LibreOffice di server.';
                            }
                        }
                    } else {
                        $embedUrl = asset('storage/'.$convertedRel);
                    }
                } elseif ($fileType === 'image') {
                    $embedUrl = $materialUrl;
                } elseif ($fileType === 'audio') {
                    $embedUrl = $materialUrl;
                }
            }
        }

        $downloadUrl = route('activity.preparation.download-material', [$activityId, $materialId]);

        return Inertia::render('Activity/MaterialView', [
            'activity' => $activity,
            'material' => $material,
            'embedUrl' => $embedUrl,
            'materialUrl' => $materialUrl,
            'downloadUrl' => $downloadUrl,
            'viewerHint' => $viewerHint,
        ]);
    }

    /**
     * Verifikasi email peserta (single)
     */
    public function verifyEmail(Request $request, $activityId, $userId)
    {
        $activity = Activity::findOrFail($activityId);

        // Check permission
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && $activity->user_id !== auth()->id()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403, 'Anda tidak memiliki izin untuk memverifikasi email peserta.');
            }
        }

        $user = User::findOrFail($userId);

        // Verifikasi email
        if (! $user->email_verified_at) {
            $user->email_verified_at = now();
            $user->email_verification_token = null;
            $user->save();

            // Update status ActivityUser jika masih dalam status verifikasi
            $query = ActivityUser::where('activity_id', $activityId)
                ->where('user_id', $userId);

            if ($request->has('batch_id') && $request->batch_id) {
                $query->where('activity_batch_id', $request->batch_id);
            }

            $participant = $query->first();
            if ($participant && $participant->status == ActivityUser::STATUS_VERIFICATION) {
                $participant->status = ActivityUser::STATUS_ACTIVE;
                $participant->save();
            }
        }

        return redirect()->back()->with('success', 'Email peserta berhasil diverifikasi.');
    }

    /**
     * Verifikasi email peserta (bulk)
     */
    public function verifyEmailBulk(Request $request, $activityId)
    {
        $activity = Activity::findOrFail($activityId);

        // Check permission
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && $activity->user_id !== auth()->id()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403, 'Anda tidak memiliki izin untuk memverifikasi email peserta.');
            }
        }

        $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'required|exists:users,id',
            'batch_id' => 'nullable|string',
        ]);

        $userIds = $request->user_ids;
        $batchId = $request->batch_id;
        $verifiedCount = 0;

        DB::beginTransaction();
        try {
            foreach ($userIds as $userId) {
                $user = User::find($userId);
                if ($user && ! $user->email_verified_at) {
                    $user->email_verified_at = now();
                    $user->email_verification_token = null;
                    $user->save();

                    // Update status ActivityUser jika masih dalam status verifikasi
                    $query = ActivityUser::where('activity_id', $activityId)
                        ->where('user_id', $userId);

                    if ($batchId) {
                        $query->where('activity_batch_id', $batchId);
                    }

                    $participant = $query->first();
                    if ($participant && $participant->status == ActivityUser::STATUS_VERIFICATION) {
                        $participant->status = ActivityUser::STATUS_ACTIVE;
                        $participant->save();
                    }

                    $verifiedCount++;
                }
            }

            DB::commit();

            return redirect()->back()->with('success', "Email {$verifiedCount} peserta berhasil diverifikasi.");
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error verifying emails in bulk', [
                'activity_id' => $activityId,
                'error' => $e->getMessage(),
            ]);

            return redirect()->back()->with('error', 'Terjadi kesalahan saat memverifikasi email: '.$e->getMessage());
        }
    }

    /**
     * Toggle participant status (Enable/Disable)
     */
    public function toggleParticipantStatus(Request $request, $activityId, $userId)
    {
        $activity = Activity::findOrFail($activityId);

        // Check permission
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && $activity->user_id !== auth()->id()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403, 'Anda tidak memiliki izin untuk mengubah status peserta.');
            }
        }

        $query = ActivityUser::where('activity_id', $activityId)
            ->where('user_id', $userId);

        if ($request->has('batch_id') && $request->batch_id) {
            $query->where('activity_batch_id', $request->batch_id);
        }

        $participant = $query->firstOrFail();

        // Determine target status
        $isCurrentlyActive = ($participant->status == ActivityUser::STATUS_ACTIVE);
        $newStatus = $isCurrentlyActive ? ActivityUser::STATUS_VERIFICATION : ActivityUser::STATUS_ACTIVE;
        $message = $isCurrentlyActive ? 'Peserta dinonaktifkan (status diubah ke verifikasi).' : 'Peserta diaktifkan.';
        
        $userIdsToUpdate = [$userId];
        
        // 1. Check explicit group
        if ($participant->activity_participant_group_id) {
            $groupMembers = ActivityUser::where('activity_id', $activityId)
                ->where('activity_participant_group_id', $participant->activity_participant_group_id)
                ->pluck('user_id')
                ->toArray();
            $userIdsToUpdate = array_merge($userIdsToUpdate, $groupMembers);
        } else {
            // 2. Check implicit bulk group (via Payment notes) to ensure integrity of bulk registrations
            try {
                // Find any payment in this activity that lists this user in 'user_ids'
                $parentPayment = Payment::where('activity_id', $activityId)
                    ->where('notes', 'like', '%user_ids%')
                    ->get()
                    ->first(function($p) use ($userId) {
                        $notes = json_decode($p->notes, true);
                        if (!is_array($notes)) return false;
                        
                        $uids = $notes['user_ids'] ?? ($notes['bulk_import']['user_ids'] ?? []);
                        if (is_array($uids)) {
                            // Compare as strings to be safe
                            return in_array((string)$userId, array_map('strval', $uids));
                        }
                        return false;
                    });
                
                if ($parentPayment) {
                     $notes = json_decode($parentPayment->notes, true);
                     $groupUids = $notes['user_ids'] ?? ($notes['bulk_import']['user_ids'] ?? []);
                     if (!empty($groupUids)) {
                         $userIdsToUpdate = array_merge($userIdsToUpdate, $groupUids);
                     }
                }
            } catch (\Exception $e) {
                \Log::warning('Error checking implict group structure: ' . $e->getMessage());
            }
        }
        
        $userIdsToUpdate = array_unique($userIdsToUpdate);
        $count = count($userIdsToUpdate);
        
        if ($count > 1) {
            $message .= " (Status diterapkan untuk $count anggota kelompok)";
        }

        // Apply update to all found members
        ActivityUser::where('activity_id', $activityId)
            ->whereIn('user_id', $userIdsToUpdate)
            ->when($request->has('batch_id') && $request->batch_id, function($q) use ($request) {
                $q->where('activity_batch_id', $request->batch_id);
            })
            ->update([
                'status' => $newStatus,
                'updated_by' => auth()->id(),
                'updated_at' => now(),
            ]);

        return redirect()->back()->with('success', $message);
    }

    /**
     * Generate custom UID untuk User (karena User::insert() tidak memicu event model)
     *
     * @return string
     */
    private function generateUserUid()
    {
        do {
            $uid = $this->generateRandomString();
        } while (User::where('id', $uid)->exists());

        return $uid;
    }

    /**
     * Generate custom UID untuk Profile
     *
     * @return string
     */
    private function generateProfileUid()
    {
        do {
            $uid = $this->generateRandomString();
        } while (Profile::where('id', $uid)->exists());

        return $uid;
    }

    /**
     * Generate custom UID untuk ActivityUser (karena ActivityUser::insert() tidak memicu event model)
     *
     * @return string
     */
    private function generateActivityUserUid()
    {
        do {
            $uid = $this->generateRandomString();
        } while (ActivityUser::where('id', $uid)->exists());

        return $uid;
    }

    /**
     * Generate random string dengan 3 huruf dan 3 angka (format custom UID)
     *
     * @return string
     */
    private function generateRandomString()
    {
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

        return implode('', $combined);
    }

    /**
     * Save column visibility settings for the participant table
     */
    public function saveColumnSettings(Request $request)
    {
        try {
            $data = $request->validate([
                'activity_id' => 'required',
                'settings' => 'required|array',
            ]);

            \Log::info('saveColumnSettings called', [
                'activity_id_input' => $data['activity_id'],
                'settings_received' => $data['settings']
            ]);

            // Support both ID and UID
            $activity = Activity::find($data['activity_id']);
            if (!$activity) {
                $activity = Activity::where('uid', $data['activity_id'])->first();
            }
            
            if (!$activity) {
                throw new \Exception('Activity not found with ID/UID: ' . $data['activity_id']);
            }

            // Check permission
            $actor = auth()->user();
            if (! $actor->isAdmin() && ! $actor->isSuperAdmin() && $activity->user_id !== $actor->id) {
                if (! $activity->canManageRegistration($actor->id)) {
                    abort(403, 'Anda tidak memiliki izin untuk menyimpan pengaturan ini.');
                }
            }

            $activity->column_settings = $data['settings'];
            $activity->save();
            
            // Log for debugging
            \Log::info('Column settings saved for activity ' . $activity->id, [
                'user_id' => $actor->id,
                'settings_count' => count($data['settings']),
                'saved_settings' => $activity->column_settings
            ]);

            return response()->json([
                'success' => true, 
                'message' => 'Pengaturan kolom berhasil disimpan.',
                'settings' => $activity->column_settings
            ]);
        } catch (\Exception $e) {
            \Log::error('Error saving column settings', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);

            return response()->json(['success' => false, 'message' => 'Gagal menyimpan pengaturan: '.$e->getMessage()], 500);
        }
    }
}

