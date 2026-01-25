<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\ActivityBatch;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ActivityBatchController extends Controller
{
    // Ensure only authorized users can manage batches
    public function __construct()
    {
        $this->middleware('auth');
    }

    // List batches for an activity
    public function index(Activity $activity)
    {
        $user = auth()->user();
        if (! $user) {
            abort(403);
        }

        if (! $activity->canManageRegistration($user->id)) {
            abort(403);
        }

        // Auto-generate Batch 1 if no batches exist (Legacy Migration)
        if ($activity->batches()->count() === 0) {
            try {
                DB::beginTransaction();

                // Create default batch based on activity details
                $defaultBatch = $activity->batches()->create([
                    'name' => 'Batch 1',
                    'code' => 'B1',
                    'start_date' => $activity->date,
                    'end_date' => $activity->end_date,
                    'description' => 'Sesi awal (otomatis dibuat dari data kegiatan).',
                    'is_active' => true,
                ]);

                // Migrate existing participants with null batch_id to this new batch
                DB::table('activity_users')
                    ->where('activity_id', $activity->id)
                    ->whereNull('activity_batch_id')
                    ->update(['activity_batch_id' => $defaultBatch->id]);

                DB::commit();

                // Add a flash message to inform the user
                session()->flash('success', 'Batch 1 otomatis dibuat dan peserta lama telah dipindahkan.');

            } catch (Exception $e) {
                DB::rollBack();
                Log::error('Failed to auto-generate Batch 1: '.$e->getMessage());
                // Continue without failing, just show empty list or error
            }
        }

        $batches = $activity->batches()->withCount('users')->orderBy('created_at', 'desc')->get();

        $isCommittee = $activity->canManageRegistration($user->id);
        $activityData = array_merge($activity->toArray(), [
             'is_committee' => $isCommittee,
             'can_manage_registration' => $isCommittee,
        ]);

        return Inertia::render('Activity/Batches/Index', [
            'activity' => $activityData,
            'batches' => $batches
        ]);
    }

    // Store a new batch
    public function store(Request $request, Activity $activity)
    {
        $user = auth()->user();
        if (! $user) {
            abort(403);
        }

        if (! $activity->canManageRegistration($user->id)) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'start_time' => 'nullable',
            'end_time' => 'nullable',
            'quota' => 'nullable|integer|min:0',
            'price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        try {
            DB::beginTransaction();

            // If new batch is set to active, deactivate others
            if ($request->boolean('is_active')) {
                $activity->batches()->update(['is_active' => false]);
            }

            $batch = $activity->batches()->create($validated);

            DB::commit();

            return redirect()->back()->with('success', 'Batch berhasil dibuat.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating batch: '.$e->getMessage());

            return redirect()->back()->with('error', 'Gagal membuat batch.');
        }
    }

    // Update a batch
    public function update(Request $request, Activity $activity, ActivityBatch $batch)
    {
        $user = auth()->user();
        if (! $user) {
            abort(403);
        }

        if (! $activity->canManageRegistration($user->id)) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'start_time' => 'nullable',
            'end_time' => 'nullable',
            'quota' => 'nullable|integer|min:0',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        try {
            DB::beginTransaction();

            // If batch is set to active, deactivate others
            if ($request->boolean('is_active')) {
                $activity->batches()->where('id', '!=', $batch->id)->update(['is_active' => false]);
            }

            $batch->update($validated);

            DB::commit();

            return redirect()->back()->with('success', 'Batch berhasil diperbarui.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating batch: '.$e->getMessage());

            return redirect()->back()->with('error', 'Gagal memperbarui batch.');
        }
    }

    // Activate a batch (shortcut)
    public function activate(Activity $activity, ActivityBatch $batch)
    {
        $user = auth()->user();
        if (! $user) {
            abort(403);
        }

        if (! $activity->canManageRegistration($user->id)) {
            abort(403);
        }

        try {
            DB::beginTransaction();
            $activity->batches()->update(['is_active' => false]);
            $batch->update(['is_active' => true]);
            DB::commit();

            return redirect()->back()->with('success', 'Batch diaktifkan.');
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Gagal mengaktifkan batch.');
        }
    }

    // Delete a batch
    public function destroy(Activity $activity, ActivityBatch $batch)
    {
        $user = auth()->user();
        if (! $user) {
            abort(403);
        }

        if (! $activity->canManageRegistration($user->id)) {
            abort(403);
        }

        try {
            // Check if batch has participants
            if ($batch->users()->exists()) {
                return redirect()->back()->with('error', 'Tidak dapat menghapus batch yang sudah memiliki peserta.');
            }

            $batch->delete();

            return redirect()->back()->with('success', 'Batch berhasil dihapus.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menghapus batch.');
        }
    }
}
