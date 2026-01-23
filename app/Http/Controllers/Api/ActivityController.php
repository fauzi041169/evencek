<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ActivityChat;
use App\Models\ActivityUser;
use App\Models\CardSettings;
use App\Models\CertificateSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ActivityController extends Controller
{
    /**
     * Get list of activities
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();

            $query = Activity::with(['user', 'category']);
            // ->where('status', 'published');

            // Filter by user's registered activities if requested
            if ($request->has('my_activities') && $request->my_activities == 'true') {
                $activityIds = ActivityUser::where('user_id', $user->id)
                    ->pluck('activity_id');
                $query->whereIn('id', $activityIds);
            }

            // Filter by creator if user is creator
            if ($request->has('created_by_me') && $request->created_by_me == 'true' && $user->isCreator()) {
                $query->where('user_id', $user->id);
            }

            // Search
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            }

            // Sorting
            $sortBy = $request->get('sort_by', 'created_at'); // created_at, start_date, name
            $sortOrder = $request->get('sort_order', 'desc'); // asc, desc

            // Validate sort_by
            $allowedSorts = ['created_at', 'start_date', 'date', 'name', 'price'];
            if (! in_array($sortBy, $allowedSorts)) {
                $sortBy = 'created_at';
            }

            // Validate sort_order
            if (! in_array($sortOrder, ['asc', 'desc'])) {
                $sortOrder = 'desc';
            }

            // Use 'date' field if sorting by start_date
            if ($sortBy === 'start_date') {
                $sortBy = 'date';
            }

            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $activities = $query->paginate($perPage);

            // Format activities dengan image URL lengkap
            $formattedActivities = $activities->items();
            foreach ($formattedActivities as &$activity) {
                // Convert to array if it's an object
                if (is_object($activity)) {
                    $activity = $activity->toArray();
                }

                // Format image URL
                $activity['image'] = $this->formatActivityImage($activity['image'] ?? null);

                // Format category jika ada
                if (isset($activity['category']) && is_object($activity['category'])) {
                    $activity['category'] = [
                        'id' => $activity['category']->id ?? null,
                        'name' => $activity['category']->name ?? null,
                    ];
                }

                // Format creator jika ada
                if (isset($activity['user']) && is_object($activity['user'])) {
                    $activity['creator'] = [
                        'id' => $activity['user']->id ?? null,
                        'name' => $activity['user']->name ?? null,
                        'email' => $activity['user']->email ?? null,
                    ];
                    unset($activity['user']); // Hapus user, ganti dengan creator
                }
            }

            return response()->json([
                'success' => true,
                'data' => $formattedActivities,
                'pagination' => [
                    'current_page' => $activities->currentPage(),
                    'last_page' => $activities->lastPage(),
                    'per_page' => $activities->perPage(),
                    'total' => $activities->total(),
                ],
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Activities API error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data kegiatan.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Get activity detail
     */
    public function show($id)
    {
        try {
            $activity = Activity::with([
                'user',
                'category',
                'batches',
                'speakers',
                'contents',
                'materials',
                'rundowns',
                'galleries',
                'divisions',
                'committeeStructures.user',
                'certificateSettings',
                'comments.user',
                'comments.children.user',
                'owners',
                'activeBatch',
                'users.profile', // Tambahkan users dengan profile untuk peserta
            ])->withCount([
                'participants',
                'comments',
                'batches',
            ])->findOrFail($id);

            // Check if user is registered
            $isRegistered = false;
            $registrationStatus = null;
            if (Auth::check()) {
                $activityUser = ActivityUser::where('user_id', Auth::id())
                    ->where('activity_id', $id)
                    ->first();
                $isRegistered = $activityUser ? true : false;
                $registrationStatus = $activityUser ? $activityUser->status : null;
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $activity->id,
                    'name' => $activity->name,
                    'description' => $activity->description,
                    'materi' => $activity->materi,
                    'start_date' => $activity->date ? $activity->date->format('Y-m-d') : null,
                    'end_date' => $activity->end_date ? $activity->end_date->format('Y-m-d') : null,
                    'start_time' => $activity->start_time ? $activity->start_time->format('H:i:s') : null,
                    'end_time' => $activity->end_time ? $activity->end_time->format('H:i:s') : null,
                    'location' => $activity->location,
                    'price' => $activity->price,
                    'show_price' => $activity->show_price,
                    'payment_method_type' => $activity->payment_method_type,
                    'status' => $activity->status,
                    'pendaftaran' => $activity->pendaftaran, // 0: belum dibuka, 1: dibuka, 2: ditutup
                    'image' => $this->formatActivityImage($activity->image),
                    'category' => $activity->category ? [
                        'id' => $activity->category->id,
                        'name' => $activity->category->name,
                    ] : null,
                    'creator' => [
                        'id' => $activity->user->id,
                        'name' => $activity->user->name,
                        'email' => $activity->user->email,
                        'avatar' => $this->formatStoragePath($activity->user->avatar),
                    ],
                    'owners' => $activity->owners->map(function ($owner) {
                        return [
                            'id' => $owner->id,
                            'name' => $owner->name,
                            'email' => $owner->email,
                            'avatar' => $this->formatStoragePath($owner->avatar),
                        ];
                    }),
                    'batches' => $activity->batches->map(function ($batch) {
                        return [
                            'id' => $batch->id,
                            'name' => $batch->name,
                            'start_date' => $batch->start_date ? $batch->start_date->format('Y-m-d') : null,
                            'end_date' => $batch->end_date ? $batch->end_date->format('Y-m-d') : null,
                            'capacity' => $batch->capacity,
                            'is_active' => $batch->is_active ?? false,
                        ];
                    })->values(),
                    'active_batch' => $activity->activeBatch ? [
                        'id' => $activity->activeBatch->id,
                        'name' => $activity->activeBatch->name,
                        'start_date' => $activity->activeBatch->start_date ? $activity->activeBatch->start_date->format('Y-m-d') : null,
                        'end_date' => $activity->activeBatch->end_date ? $activity->activeBatch->end_date->format('Y-m-d') : null,
                        'capacity' => $activity->activeBatch->capacity,
                    ] : null,
                    'speakers' => $activity->speakers->map(function ($speaker) {
                        return [
                            'id' => $speaker->id,
                            'name' => $speaker->name,
                            'photo' => $this->formatSpeakerPhoto($speaker->photo),
                            'bio' => $speaker->bio,
                        ];
                    })->values(),
                    'contents' => $activity->contents->map(function ($content) {
                        return [
                            'id' => $content->id,
                            'title' => $content->title,
                            'content' => $content->content,
                            'type' => $content->type,
                            'order' => $content->order,
                        ];
                    })->values(),
                    'materials' => $activity->materials->map(function ($material) {
                        return [
                            'id' => $material->id,
                            'name' => $material->name,
                            'file_name' => $material->file_name,
                            'file_path' => $this->formatStoragePath($material->file_path),
                            'file_type' => $material->file_type,
                            'file_size' => $material->file_size,
                            'description' => $material->description,
                        ];
                    })->values(),
                    'rundowns' => $activity->rundowns->map(function ($rundown) {
                        return [
                            'id' => $rundown->id,
                            'time' => $rundown->time,
                            'activity' => $rundown->activity,
                            'order' => $rundown->order,
                        ];
                    }),
                    'galleries' => $activity->galleries->map(function ($gallery) {
                        return [
                            'id' => $gallery->id,
                            'image' => $this->formatStoragePath($gallery->image),
                            'caption' => $gallery->caption,
                        ];
                    })->values(),
                    'divisions' => $activity->divisions->map(function ($division) {
                        return [
                            'id' => $division->id,
                            'name' => $division->name,
                            'description' => $division->description,
                        ];
                    }),
                    // Panitia (Committee Structures)
                    'committee' => $activity->committeeStructures->map(function ($committee) {
                        return [
                            'id' => $committee->id,
                            'position' => $committee->position,
                            'name' => $committee->name,
                            'phone' => $committee->phone,
                            'email' => $committee->email,
                            'user' => $committee->user ? [
                                'id' => $committee->user->id,
                                'name' => $committee->user->name,
                                'email' => $committee->user->email,
                                'avatar' => $this->formatStoragePath($committee->user->avatar),
                            ] : null,
                            'division_id' => $committee->activity_division_id,
                            'order' => $committee->order,
                        ];
                    })->values(),
                    // ID Card Settings
                    'id_card_settings' => $this->getCardSettings($id),
                    // Certificate Settings
                    'certificate_settings' => $this->getCertificateSettings($activity),
                    // Comments
                    'comments' => $activity->comments->map(function ($comment) {
                        return [
                            'id' => $comment->id,
                            'body' => $comment->body,
                            'rating' => $comment->rating,
                            'user' => $comment->user ? [
                                'id' => $comment->user->id,
                                'name' => $comment->user->name,
                                'avatar' => $this->formatStoragePath($comment->user->avatar),
                            ] : null,
                            'created_at' => $comment->created_at ? $comment->created_at->format('Y-m-d H:i:s') : null,
                            'replies' => $comment->children->map(function ($reply) {
                                return [
                                    'id' => $reply->id,
                                    'body' => $reply->body,
                                    'user' => $reply->user ? [
                                        'id' => $reply->user->id,
                                        'name' => $reply->user->name,
                                        'avatar' => $this->formatStoragePath($reply->user->avatar),
                                    ] : null,
                                    'created_at' => $reply->created_at ? $reply->created_at->format('Y-m-d H:i:s') : null,
                                ];
                            })->values(),
                        ];
                    })->values(),
                    // Chat Messages (hanya untuk user yang terdaftar)
                    'chats' => Auth::check() && $isRegistered ? $this->getActivityChats($id, Auth::id()) : [],
                    // Visibility settings
                    'visibility' => [
                        'rundown_visible' => $activity->rundown_visible,
                        'detail_rundown_visible' => $activity->detail_rundown_visible ?? true,
                        'materials_visible' => $activity->materials_visible,
                        'detail_materials_visible' => $activity->detail_materials_visible ?? true,
                        'speakers_visible' => $activity->speakers_visible ?? true,
                        'detail_speakers_visible' => $activity->detail_speakers_visible ?? true,
                        'show_gallery' => $activity->show_gallery,
                        'enable_comments' => $activity->enable_comments,
                        'rooms_visible' => $activity->rooms_visible ?? true,
                    ],
                    // Participants (Peserta) - Limit 50 untuk menghindari response terlalu besar
                    'participants' => $activity->users->take(50)->map(function ($user) {
                        $pivot = $user->pivot;

                        return [
                            'id' => $user->id,
                            'name' => $user->name,
                            'email' => $user->email,
                            'phone' => $user->phone,
                            'avatar' => $this->formatStoragePath($user->avatar),
                            'registration_status' => $pivot->status ?? null,
                            'registered_at' => $pivot->created_at ? $pivot->created_at->format('Y-m-d H:i:s') : null,
                            'batch_id' => $pivot->activity_batch_id ?? null,
                            'profile' => $user->profile ? [
                                'instansi' => $user->profile->instansi ?? null,
                                'province' => $user->profile->province ? $user->profile->province->name : null,
                                'regency' => $user->profile->regency ? $user->profile->regency->name : null,
                            ] : null,
                        ];
                    })->values(),
                    'participants_summary' => [
                        'total' => $activity->participants_count ?? 0,
                        'displayed' => min($activity->users->count(), 50),
                        'has_more' => ($activity->participants_count ?? 0) > 50,
                    ],
                    // Statistics
                    'statistics' => [
                        'total_participants' => $activity->participants_count ?? 0,
                        'total_comments' => $activity->comments_count ?? 0,
                        'total_batches' => $activity->batches_count ?? 0,
                        'average_rating' => $activity->averageRating(),
                        'total_speakers' => $activity->speakers->count(),
                        'total_materials' => $activity->materials->count(),
                        'total_galleries' => $activity->galleries->count(),
                    ],
                    // Metadata
                    'created_at' => $activity->created_at ? $activity->created_at->format('Y-m-d H:i:s') : null,
                    'updated_at' => $activity->updated_at ? $activity->updated_at->format('Y-m-d H:i:s') : null,
                    'is_registered' => $isRegistered,
                    'registration_status' => $registrationStatus,
                ],
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Kegiatan tidak ditemukan',
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Activity detail API error', [
                'activity_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil detail kegiatan.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Register to activity
     */
    public function register(Request $request, $id)
    {
        try {
            $user = Auth::user();
            $activity = Activity::findOrFail($id);

            // Check if already registered
            $existing = ActivityUser::where('user_id', $user->id)
                ->where('activity_id', $id)
                ->first();

            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda sudah terdaftar pada acara ini',
                ], 400);
            }

            // Register user
            ActivityUser::create([
                'user_id' => $user->id,
                'activity_id' => $id,
                'status' => 0, // STATUS_VERIFICATION

            ]);

            return response()->json([
                'success' => true,
                'message' => 'Berhasil mendaftar ke acara',
            ], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Kegiatan tidak ditemukan',
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Activity register API error', [
                'activity_id' => $id,
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mendaftar ke acara.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Get user's registered activities
     */
    public function myActivities(Request $request)
    {
        try {
            $user = Auth::user();

            $activityUsers = ActivityUser::where('user_id', $user->id)
                ->with(['activity.user', 'activity.category'])
                ->orderBy('created_at', 'desc')
                ->get();

            $activities = $activityUsers->map(function ($activityUser) {
                $activity = $activityUser->activity;
                if (! $activity) {
                    return null; // Skip if activity deleted
                }

                return [
                    'id' => $activity->id,
                    'name' => $activity->name,
                    'description' => $activity->description,
                    'start_date' => $activity->start_date,
                    'end_date' => $activity->end_date,
                    'location' => $activity->location,
                    'price' => $activity->price,
                    'image' => $activity->image ? (strpos($activity->image, 'activities/') === 0
                        ? asset('storage/'.$activity->image)
                        : asset('storage/activities/'.$activity->image)) : null,
                    'status' => $activityUser->status,
                    'registered_at' => $activityUser->created_at,
                    'category' => $activity->category ? [
                        'id' => $activity->category->id,
                        'name' => $activity->category->name,
                    ] : null,
                ];
            })->filter(); // Remove null values

            return response()->json([
                'success' => true,
                'data' => $activities->values(),
            ], 200);
        } catch (\Exception $e) {
            \Log::error('My activities API error', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data kegiatan Anda.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Get registration status for current user
     */
    public function status($id)
    {
        try {
            $user = Auth::user();
            $activity = Activity::findOrFail($id);
            $activityUser = ActivityUser::where('user_id', $user->id)
                ->where('activity_id', $id)
                ->first();

            return response()->json([
                'success' => true,
                'data' => [
                    'activity_id' => $activity->id,
                    'registered' => (bool) $activityUser,
                    'status' => $activityUser ? $activityUser->status : null,
                    'registered_at' => $activityUser ? $activityUser->created_at : null,
                ],
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Kegiatan tidak ditemukan',
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Activity status API error', [
                'activity_id' => $id,
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Unregister from activity
     */
    public function unregister(Request $request, $id)
    {
        try {
            $user = Auth::user();
            $activity = Activity::findOrFail($id);

            $existing = ActivityUser::where('user_id', $user->id)
                ->where('activity_id', $id)
                ->first();

            if (! $existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda belum terdaftar pada acara ini',
                ], 400);
            }

            $existing->delete();

            return response()->json([
                'success' => true,
                'message' => 'Pendaftaran dibatalkan',
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Kegiatan tidak ditemukan',
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Activity unregister API error', [
                'activity_id' => $id,
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat membatalkan pendaftaran.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Get card settings for activity
     */
    private function getCardSettings($activityId)
    {
        $cardSettings = CardSettings::where('activity_id', $activityId)
            ->whereNull('activity_batch_id')
            ->first();

        if (! $cardSettings) {
            return [
                'is_active' => false,
                'card_setting' => null,
                'print_settings' => null,
                'download_card_visible' => false,
            ];
        }

        return [
            'id' => $cardSettings->id,
            'is_active' => ! empty($cardSettings->card_setting),
            'card_setting' => $cardSettings->card_setting,
            'print_settings' => $cardSettings->print_settings,
            'download_card_visible' => $cardSettings->print_settings['download_card_visible'] ?? false,
        ];
    }

    /**
     * Get certificate settings for activity
     */
    private function getCertificateSettings($activity)
    {
        // Get CertificateSettings (plural) - the unified model
        $certificateSettings = \App\Models\CertificateSettings::where('activity_id', $activity->id)
            ->whereNull('activity_batch_id')
            ->first();

        // Extract settings from JSON if available
        $settingsData = $certificateSettings ? ($certificateSettings->certificate_setting ?? []) : [];

        return [
            'id' => $certificateSettings ? $certificateSettings->id : null,
            'is_active' => ! empty($settingsData['elements']),
            'elements' => $settingsData['elements'] ?? null,
            'size' => $settingsData['size'] ?? null,
            'orientation' => $settingsData['orientation'] ?? null,
            'background' => $settingsData['background'] ?? null,
            'certificate_setting' => $certificateSettings ? $certificateSettings->certificate_setting : null,
            'print_settings' => $certificateSettings ? $certificateSettings->print_settings : null,
            'download_card_visible' => $certificateSettings && isset($certificateSettings->print_settings['download_card_visible'])
                ? (bool) $certificateSettings->print_settings['download_card_visible']
                : false,
        ];
    }

    /**
     * Get activity chats for user
     */
    private function getActivityChats($activityId, $userId)
    {
        $chats = ActivityChat::where('activity_id', $activityId)
            ->where('user_id', $userId)
            ->with(['sender'])
            ->orderBy('created_at', 'asc')
            ->get();

        return $chats->map(function ($chat) {
            return [
                'id' => $chat->id,
                'message' => $chat->message,
                'sender' => $chat->sender ? [
                    'id' => $chat->sender->id,
                    'name' => $chat->sender->name,
                    'avatar' => $this->formatStoragePath($chat->sender->avatar),
                ] : null,
                'is_read' => $chat->is_read,
                'is_read_by_user' => $chat->is_read_by_user,
                'is_read_by_committee' => $chat->is_read_by_committee,
                'created_at' => $chat->created_at ? $chat->created_at->format('Y-m-d H:i:s') : null,
            ];
        });
    }

    private function makeAbsolute($path)
    {
        if (! $path) {
            return null;
        }
        $normalized = ltrim($path, '/');
        $base = request()->getSchemeAndHttpHost();

        return $base.'/'.$normalized;
    }

    private function formatActivityImage($image)
    {
        if (empty($image)) {
            return null;
        }
        if (filter_var($image, FILTER_VALIDATE_URL)) {
            return $image;
        }
        $image = ltrim($image, '/');
        if (strpos($image, 'storage/') === 0) {
            return $this->makeAbsolute($image);
        }
        if (strpos($image, 'activities/') === 0) {
            return $this->makeAbsolute('storage/'.$image);
        }

        return $this->makeAbsolute('storage/activities/'.$image);
    }

    private function formatStoragePath($path)
    {
        if (empty($path)) {
            return null;
        }
        if (filter_var($path, FILTER_VALIDATE_URL)) {
            return $path;
        }
        $path = ltrim($path, '/');
        if (strpos($path, 'storage/') === 0) {
            return $this->makeAbsolute($path);
        }

        return $this->makeAbsolute('storage/'.$path);
    }

    private function formatSpeakerPhoto($photo)
    {
        if (empty($photo)) {
            return null;
        }
        if (filter_var($photo, FILTER_VALIDATE_URL)) {
            return $photo;
        }
        $photo = ltrim($photo, '/');
        if (strpos($photo, 'speakers/') === 0) {
            return $this->makeAbsolute('storage/'.$photo);
        }

        return $this->makeAbsolute('storage/speakers/'.$photo);
    }
}
