<?php

namespace App\Http\Controllers;

use App\Helpers\ImageHelper;
use App\Models\Activity;
use App\Models\EventActivity;
use App\Models\EventActivityOption;
use App\Models\EventActivityQuestion;
use App\Models\EventActivityResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class EventActivityController extends Controller
{
    public function index($activityId)
    {
        $activity = Activity::where('id', $activityId)->orWhere('uid', $activityId)->firstOrFail();

        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && ! $activity->canManageRegistration(auth()->id())) {
            abort(403, 'Unauthorized');
        }

        $eventActivities = EventActivity::where('activity_id', $activity->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $isCommittee = $activity->canManageRegistration(auth()->id());
        $activityData = array_merge($activity->toArray(), [
            'is_committee' => $isCommittee,
            'can_manage_registration' => $isCommittee,
        ]);

        return Inertia::render('Activity/EventActivities/Index', [
            'activity' => $activityData,
            'eventActivities' => $eventActivities,
        ]);
    }

    public function create($activityId)
    {
        $activity = Activity::where('id', $activityId)->orWhere('uid', $activityId)->firstOrFail();

        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && ! $activity->canManageRegistration(auth()->id())) {
            abort(403, 'Unauthorized');
        }

        // Check if we need to pass a type
        $type = request()->query('type', 'other');

        $isCommittee = $activity->canManageRegistration(auth()->id());
        $activityData = array_merge($activity->toArray(), [
            'is_committee' => $isCommittee,
            'can_manage_registration' => $isCommittee,
        ]);

        return Inertia::render('Activity/EventActivities/Create', [
            'activity' => $activityData,
            'initialType' => $type,
        ]);
    }

    public function store(Request $request, $activityId)
    {
        $activity = Activity::where('id', $activityId)->orWhere('uid', $activityId)->firstOrFail();

        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && ! $activity->canManageRegistration(auth()->id())) {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|in:voting,quiz,assignment,other',
            'questions' => 'nullable|array',
            'questions.*.text' => 'required|string',
            'questions.*.type' => 'required|in:multiple_choice,essay,scale',
        ]);

        DB::beginTransaction();
        try {
            $eventActivity = new EventActivity;
            $eventActivity->activity_id = $activity->id;
            $eventActivity->title = $request->title;
            $eventActivity->slug = Str::slug($request->title.'-'.Str::random(6));
            $eventActivity->type = $request->type;
            $eventActivity->description = $request->description;

            if ($request->hasFile('image')) {
                $path = ImageHelper::storeCompressedUploadedImage($request->file('image'), 'event_activities', 'public', [
                    'max_width' => 1600,
                    'max_height' => 1600,
                    'quality' => 82,
                    'format' => 'webp',
                ]);
                $eventActivity->image = $path;
            }

            $eventActivity->start_time = $request->start_time ? str_replace('T', ' ', $request->start_time) : null;
            $eventActivity->end_time = $request->end_time ? str_replace('T', ' ', $request->end_time) : null;
            $eventActivity->is_active = $request->has('is_active');
            $eventActivity->save();

            if ($request->has('questions')) {
                foreach ($request->questions as $index => $qData) {
                    $question = new EventActivityQuestion;
                    $question->event_activity_id = $eventActivity->id;
                    $question->question_text = $qData['text'];
                    $question->type = $qData['type'];
                    $question->order = $index;
                    $question->is_required = isset($qData['is_required']);

                    // Handle simple options for backward compatibility or simple quizzes
                    $options = isset($qData['options']) ? $qData['options'] : null;
                    if (is_string($options)) {
                        $options = array_map('trim', explode(',', $options));
                    }
                    $question->options = $options;
                    $question->save();

                    // Handle Rich Options (Candidates)
                    if (isset($qData['candidates']) && is_array($qData['candidates'])) {
                        foreach ($qData['candidates'] as $cIndex => $candidate) {
                            // Skip if name is empty
                            if (empty($candidate['name'])) {
                                continue;
                            }

                            $option = new EventActivityOption;
                            $option->event_activity_question_id = $question->id;
                            $option->value = $candidate['name'];
                            $option->description = $candidate['description'] ?? null;
                            $option->order = $cIndex;

                            if (isset($candidate['image']) && $candidate['image'] instanceof \Illuminate\Http\UploadedFile) {
                                $path = ImageHelper::storeCompressedUploadedImage($candidate['image'], 'activity_options', 'public', [
                                    'max_width' => 1200,
                                    'max_height' => 1200,
                                    'quality' => 82,
                                    'format' => 'webp',
                                ]);
                                $option->image = $path;
                            } elseif (isset($candidate['image_path'])) {
                                // Keep existing image if provided (for update)
                                $option->image = $candidate['image_path'];
                            }

                            $option->save();
                        }
                    }
                }
            }

            DB::commit();

            return redirect()->route('activity.event-activities.index', $activity->id)
                ->with('success', 'Kegiatan berhasil ditambahkan.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Gagal menyimpan kegiatan: '.$e->getMessage())->withInput();
        }
    }

    public function edit($activityId, $eventActivityId)
    {
        $activity = Activity::where('id', $activityId)->orWhere('uid', $activityId)->firstOrFail();

        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && ! $activity->canManageRegistration(auth()->id())) {
            abort(403, 'Unauthorized');
        }

        $eventActivity = EventActivity::where('id', $eventActivityId)->with(['questions.activityOptions'])->firstOrFail();

        $isCommittee = $activity->canManageRegistration(auth()->id());
        $activityData = array_merge($activity->toArray(), [
            'is_committee' => $isCommittee,
            'can_manage_registration' => $isCommittee,
        ]);

        return Inertia::render('Activity/EventActivities/Edit', [
            'activity' => $activityData,
            'eventActivity' => $eventActivity,
        ]);
    }

    public function update(Request $request, $activityId, $eventActivityId)
    {
        $activity = Activity::where('id', $activityId)->orWhere('uid', $activityId)->firstOrFail();

        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && ! $activity->canManageRegistration(auth()->id())) {
            abort(403, 'Unauthorized');
        }

        $eventActivity = EventActivity::where('id', $eventActivityId)->firstOrFail();

        $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|in:voting,quiz,assignment,other',
            'questions' => 'nullable|array',
            'questions.*.text' => 'required|string',
            'questions.*.type' => 'required|in:multiple_choice,essay,scale,checkbox',
        ]);

        DB::beginTransaction();
        try {
            $eventActivity->title = $request->title;
            $eventActivity->type = $request->type;
            $eventActivity->description = $request->description;

            if ($request->hasFile('image')) {
                // Delete old image if exists
                if ($eventActivity->image) {
                    Storage::disk('public')->delete($eventActivity->image);
                }
                $path = ImageHelper::storeCompressedUploadedImage($request->file('image'), 'event_activities', 'public', [
                    'max_width' => 1600,
                    'max_height' => 1600,
                    'quality' => 82,
                    'format' => 'webp',
                ]);
                $eventActivity->image = $path;
            }

            $eventActivity->start_time = $request->start_time ? str_replace('T', ' ', $request->start_time) : null;
            $eventActivity->end_time = $request->end_time ? str_replace('T', ' ', $request->end_time) : null;
            $eventActivity->is_active = $request->has('is_active');
            $eventActivity->save();

            if ($request->has('questions')) {
                $eventActivity->questions()->delete();
                foreach ($request->questions as $index => $qData) {
                    $question = new EventActivityQuestion;
                    $question->event_activity_id = $eventActivity->id;
                    $question->question_text = $qData['text'];
                    $question->type = $qData['type'];
                    $question->order = $index;
                    $question->is_required = isset($qData['is_required']);

                    // Handle simple options
                    $options = isset($qData['options']) ? $qData['options'] : null;
                    if (is_string($options)) {
                        $options = array_map('trim', explode(',', $options));
                    }
                    $question->options = $options;
                    $question->save();

                    // Handle Rich Options (Candidates)
                    if (isset($qData['candidates']) && is_array($qData['candidates'])) {
                        foreach ($qData['candidates'] as $cIndex => $candidate) {
                            if (empty($candidate['name'])) {
                                continue;
                            }

                            $option = new EventActivityOption;
                            $option->event_activity_question_id = $question->id;
                            $option->value = $candidate['name'];
                            $option->description = $candidate['description'] ?? null;
                            $option->order = $cIndex;

                            if (isset($candidate['image']) && $candidate['image'] instanceof \Illuminate\Http\UploadedFile) {
                                $path = ImageHelper::storeCompressedUploadedImage($candidate['image'], 'activity_options', 'public', [
                                    'max_width' => 1200,
                                    'max_height' => 1200,
                                    'quality' => 82,
                                    'format' => 'webp',
                                ]);
                                $option->image = $path;
                            } elseif (isset($candidate['image_path'])) {
                                $option->image = $candidate['image_path'];
                            }

                            $option->save();
                        }
                    }
                }
            }

            DB::commit();

            return redirect()->route('activity.event-activities.index', $activity->id)
                ->with('success', 'Kegiatan berhasil diperbarui.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Gagal memperbarui kegiatan: '.$e->getMessage())->withInput();
        }
    }

    public function destroy($activityId, $eventActivityId)
    {
        // Add activity check for authorization
        $activity = Activity::where('id', $activityId)->orWhere('uid', $activityId)->firstOrFail();

        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin() && ! $activity->canManageRegistration(auth()->id())) {
            abort(403, 'Unauthorized');
        }

        $eventActivity = EventActivity::where('id', $eventActivityId)->firstOrFail();
        $eventActivity->delete();

        return back()->with('success', 'Kegiatan berhasil dihapus.');
    }

    public function show($activityId, $eventActivityId)
    {
        $activity = Activity::where('id', $activityId)->orWhere('uid', $activityId)->firstOrFail();
        $eventActivity = EventActivity::where('id', $eventActivityId)->with(['questions.activityOptions'])->firstOrFail();

        $user = auth()->user();
        $existingResponse = null;
        if ($user) {
            $existingResponse = EventActivityResponse::where('event_activity_id', $eventActivity->id)
                ->where('user_id', $user->id)
                ->first();
        }

        $isCommittee = $user && $activity->canManageRegistration($user->id);
        $activityData = array_merge($activity->toArray(), [
            'is_committee' => $isCommittee,
            'can_manage_registration' => $isCommittee,
        ]);

        return Inertia::render('Activity/EventActivities/Show', [
            'activity' => $activityData,
            'eventActivity' => $eventActivity,
            'existingResponse' => $existingResponse,
        ]);
    }

    public function participate(Request $request, $activityId, $eventActivityId)
    {
        $activity = Activity::where('id', $activityId)->orWhere('uid', $activityId)->firstOrFail();
        $eventActivity = EventActivity::where('id', $eventActivityId)->orWhere('uid', $eventActivityId)->firstOrFail();
        $user = auth()->user();

        if (! $user) {
            return redirect()->route('login');
        }

        $request->validate([
            'answers' => 'required|array',
        ]);

        $existingResponse = EventActivityResponse::where('event_activity_id', $eventActivity->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existingResponse) {
            return back()->with('error', 'Anda sudah mengisi kegiatan ini.');
        }

        $response = new EventActivityResponse;
        $response->event_activity_id = $eventActivity->id;
        $response->user_id = $user->id;
        $response->answers = $request->answers;
        $response->save();

        return back()->with('success', 'Jawaban Anda telah tersimpan.');
    }
}
