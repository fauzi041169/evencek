<?php

namespace App\Http\Controllers;
 
use Illuminate\Http\Request;
use App\Models\Activity;
use App\Models\ActivityParticipationType;

class ActivityParticipationTypeController extends Controller
{
    public function store(Request $request, $activityId)
    {
        $activity = Activity::where('uid', $activityId)->first();
        if (!$activity) {
            $activity = Activity::where('id', $activityId)->firstOrFail();
        }
        
        // Permission check
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && ! $activity->canManageRegistration(auth()->id())) {
            abort(403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        ActivityParticipationType::create([
            'activity_id' => $activity->id,
            'name' => $request->name,
            'description' => $request->description,
        ]);

        return redirect()->back()->with('success', 'Jenis kepesertaan berhasil ditambahkan.');
    }

    public function update(Request $request, $activityId, $typeId)
    {
        $activity = Activity::where('uid', $activityId)->first();
        if (!$activity) {
            $activity = Activity::where('id', $activityId)->firstOrFail();
        }

        $type = ActivityParticipationType::where('activity_id', $activity->id)
                ->where('id', $typeId)
                ->firstOrFail();

        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && ! $activity->canManageRegistration(auth()->id())) {
            abort(403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $type->update([
            'name' => $request->name,
            'description' => $request->description,
        ]);

        return redirect()->back()->with('success', 'Jenis kepesertaan berhasil diperbarui.');
    }

    public function destroy($activityId, $typeId)
    {
        $activity = Activity::where('uid', $activityId)->first();
        if (!$activity) {
            $activity = Activity::where('id', $activityId)->firstOrFail();
        }

        $type = ActivityParticipationType::where('activity_id', $activity->id)
                ->where('id', $typeId)
                ->firstOrFail();

        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && ! $activity->canManageRegistration(auth()->id())) {
            abort(403);
        }

        $type->delete();

        return redirect()->back()->with('success', 'Jenis kepesertaan berhasil dihapus.');
    }
}
