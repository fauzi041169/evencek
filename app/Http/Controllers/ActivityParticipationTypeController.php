<?php

namespace App\Http\Controllers;
 
use Illuminate\Http\Request;
use App\Models\Activity;
use App\Models\ActivityParticipationType;

class ActivityParticipationTypeController extends Controller
{
    public function store(Request $request, $activityId)
    {
        try {
            $activity = Activity::where('uid', $activityId)->first();
            if (!$activity) {
                $activity = Activity::where('id', $activityId)->firstOrFail();
            }
            
            // Permission check
            if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && ! $activity->canManageRegistration(auth()->id())) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki izin untuk melakukan aksi ini.'
                ], 403);
            }

            $request->validate([
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
            ]);

            $participationType = ActivityParticipationType::create([
                'activity_id' => $activity->id,
                'name' => $request->name,
                'description' => $request->description,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Jenis kepesertaan berhasil ditambahkan.',
                'data' => $participationType
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $activityId, $typeId)
    {
        try {
            $activity = Activity::where('uid', $activityId)->first();
            if (!$activity) {
                $activity = Activity::where('id', $activityId)->firstOrFail();
            }

            $type = ActivityParticipationType::where('activity_id', $activity->id)
                    ->where('id', $typeId)
                    ->firstOrFail();

            if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && ! $activity->canManageRegistration(auth()->id())) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki izin untuk melakukan aksi ini.'
                ], 403);
            }

            $request->validate([
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
            ]);

            $type->update([
                'name' => $request->name,
                'description' => $request->description,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Jenis kepesertaan berhasil diperbarui.',
                'data' => $type
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($activityId, $typeId)
    {
        try {
            $activity = Activity::where('uid', $activityId)->first();
            if (!$activity) {
                $activity = Activity::where('id', $activityId)->firstOrFail();
            }

            $type = ActivityParticipationType::where('activity_id', $activity->id)
                    ->where('id', $typeId)
                    ->firstOrFail();

            if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && ! $activity->canManageRegistration(auth()->id())) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki izin untuk melakukan aksi ini.'
                ], 403);
            }

            $type->delete();

            return response()->json([
                'success' => true,
                'message' => 'Jenis kepesertaan berhasil dihapus.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }
}
