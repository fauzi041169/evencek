<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\ActivityCommitteeType;
use Illuminate\Http\Request;

class ActivityCommitteeTypeController extends Controller
{
    public function store(Request $request, $activityId)
    {
        $activity = Activity::where('uid', $activityId)->first();
        if (! $activity) {
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

        ActivityCommitteeType::create([
            'activity_id' => $activity->id,
            'name' => $request->name,
            'description' => $request->description,
        ]);

        return redirect()->back()->with('success', 'Jenis kepanitiaan berhasil ditambahkan.');
    }

    public function update(Request $request, $activityId, $typeId)
    {
        $activity = Activity::where('uid', $activityId)->first();
        if (! $activity) {
            $activity = Activity::where('id', $activityId)->firstOrFail();
        }

        $type = ActivityCommitteeType::where('activity_id', $activity->id)
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

        return redirect()->back()->with('success', 'Jenis kepanitiaan berhasil diperbarui.');
    }

    public function destroy($activityId, $typeId)
    {
        $activity = Activity::where('uid', $activityId)->first();
        if (! $activity) {
            $activity = Activity::where('id', $activityId)->firstOrFail();
        }

        $type = ActivityCommitteeType::where('activity_id', $activity->id)
            ->where('id', $typeId)
            ->firstOrFail();

        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && ! $activity->canManageRegistration(auth()->id())) {
            abort(403);
        }

        $type->delete();

        return redirect()->back()->with('success', 'Jenis kepanitiaan berhasil dihapus.');
    }
}
