<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\ActivitySpeaker;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ActivitySpeakerController extends Controller
{
    /**
     * Get speaker photo directly from storage
     * This bypasses symlink issues on some servers
     * Handles both old path (profilefoto) and new path (storage/speakers)
     */
    public function getPhoto(ActivitySpeaker $speaker)
    {
        \Log::info('getPhoto called', [
            'speaker_id' => $speaker->id,
            'speaker_name' => $speaker->name,
            'photo_path' => $speaker->photo,
        ]);

        if (! $speaker->photo) {
            // No photo, return default
            $defaultPath = public_path('assets/images/profilefoto/default-profile.png');
            if (file_exists($defaultPath)) {
                return response()->file($defaultPath);
            }
            abort(404);
        }

        $photoPath = $speaker->photo;

        // Normalize path - remove leading slashes and common prefixes
        $photoPath = ltrim($photoPath, '/');
        $photoPath = str_replace('assets/images/profilefoto/', '', $photoPath);
        $photoPath = str_replace('profilefoto/', '', $photoPath);
        $photoPath = str_replace('storage/', '', $photoPath);
        $photoPath = str_replace('public/', '', $photoPath);

        \Log::info('Normalized path', ['normalized' => $photoPath]);

        // If path contains 'speakers/', it's new format
        if (str_contains($photoPath, 'speakers/')) {
            // New path format - check in storage
            if (Storage::disk('public')->exists($photoPath)) {
                \Log::info('Photo found in storage', ['path' => $photoPath]);
                try {
                    $response = Storage::disk('public')->response($photoPath);
                    // Set proper headers
                    $mimeType = Storage::disk('public')->mimeType($photoPath);
                    if ($mimeType) {
                        $response->headers->set('Content-Type', $mimeType);
                    }
                    $response->headers->set('Cache-Control', 'public, max-age=3600');

                    return $response;
                } catch (\Exception $e) {
                    \Log::error('Error serving photo from storage', [
                        'path' => $photoPath,
                        'error' => $e->getMessage(),
                    ]);
                }
            } else {
                \Log::warning('Photo path in DB but file not found in storage', [
                    'path' => $photoPath,
                    'storage_path' => Storage::disk('public')->path($photoPath),
                    'storage_exists' => Storage::disk('public')->exists($photoPath),
                ]);
            }
        } else {
            // Old path format or just filename
            $photoName = basename($photoPath);

            // First, try old location (public/assets/images/profilefoto/)
            $oldPath = public_path('assets/images/profilefoto/'.$photoName);
            if (file_exists($oldPath)) {
                \Log::info('Photo found in old location', ['path' => $oldPath]);

                return response()->file($oldPath);
            }

            // If not found in old location, try new location (storage/speakers/)
            if (Storage::disk('public')->exists('speakers/'.$photoName)) {
                \Log::info('Photo found in new location', ['path' => 'speakers/'.$photoName]);

                return Storage::disk('public')->response('speakers/'.$photoName);
            }
        }

        // If file not found with exact path, try to find any file in speakers directory
        // This handles cases where file was uploaded with different name but DB has old name
        $allFiles = Storage::disk('public')->files('speakers');
        $imageFiles = array_filter($allFiles, function ($file) {
            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));

            return in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp']);
        });

        // Try to find file that might match by checking if filename contains any part of the original
        // or if it's the only file for this activity
        $photoNameWithoutExt = pathinfo($photoName, PATHINFO_FILENAME);
        foreach ($imageFiles as $file) {
            $fileName = basename($file);
            $fileNameWithoutExt = pathinfo($fileName, PATHINFO_FILENAME);

            // If filename (without ext) matches or contains part of original, use it
            if ($fileNameWithoutExt === $photoNameWithoutExt ||
                str_contains($fileNameWithoutExt, $photoNameWithoutExt) ||
                str_contains($photoNameWithoutExt, $fileNameWithoutExt)) {
                if (Storage::disk('public')->exists($file)) {
                    \Log::info('Speaker photo found with partial match', [
                        'speaker_id' => $speaker->id,
                        'expected' => $speaker->photo,
                        'found' => $file,
                    ]);

                    return Storage::disk('public')->response($file);
                }
            }
        }

        // If still not found, check if there's only one image file (likely the correct one)
        // This is a fallback for cases where DB path is completely wrong
        if (count($imageFiles) === 1) {
            $fallbackFile = reset($imageFiles);
            if (Storage::disk('public')->exists($fallbackFile)) {
                \Log::warning('Speaker photo not found, using single file fallback', [
                    'speaker_id' => $speaker->id,
                    'expected_path' => $speaker->photo,
                    'fallback_path' => $fallbackFile,
                ]);

                return Storage::disk('public')->response($fallbackFile);
            }
        }

        // Log warning if file not found - this indicates DB path doesn't match actual file
        \Log::warning('Speaker photo not found', [
            'speaker_id' => $speaker->id,
            'speaker_name' => $speaker->name,
            'expected_path' => $speaker->photo,
            'normalized_path' => $photoPath,
            'available_files' => count($imageFiles),
        ]);

        // If file not found anywhere, return default
        $defaultPath = public_path('assets/images/profilefoto/default-profile.png');
        if (file_exists($defaultPath)) {
            return response()->file($defaultPath);
        }

        abort(404);
    }

    /**
     * Get speaker CV directly from storage
     * This bypasses symlink issues on some servers
     */
    public function getCv(ActivitySpeaker $speaker)
    {
        // If no CV or file doesn't exist in storage
        if (! $speaker->cv || ! Storage::disk('public')->exists($speaker->cv)) {
            abort(404, 'CV tidak ditemukan.');
        }

        // Return file from storage with proper headers for PDF
        return Storage::disk('public')->response($speaker->cv, null, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.basename($speaker->cv).'"',
        ]);
    }

    public function index(Activity $activity)
    {
        if (! $activity->canManageRegistration(auth()->id())) {
            abort(403, 'Anda tidak memiliki izin untuk mengakses halaman ini.');
        }

        $speakers = $activity->speakers()->orderBy('order')->get();

        return \Inertia\Inertia::render('Activity/Speakers/Index', compact('activity', 'speakers'));
    }

    public function store(Request $request, Activity $activity)
    {
        if (! $activity->canManageRegistration(auth()->id())) {
            if ($request->ajax() || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
                ], 403);
            }
            abort(403, 'Anda tidak memiliki izin untuk melakukan tindakan ini.');
        }

        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'title' => 'nullable|string|max:255',
                'institution' => 'nullable|string|max:255',
                'bio' => 'nullable|string',
                'photo' => 'nullable|image|max:10240', // 10MB Max
                'cv' => 'nullable|mimes:pdf|max:5120', // 5MB Max PDF
                'email' => 'required|email|max:255',
                'phone' => 'nullable|string|max:20',
                'instagram' => 'nullable|string|max:255',
                'linkedin' => 'nullable|string|max:255',
            ]);

            // Check if email already exists in this activity (unique constraint per activity)
            $alreadyInActivity = ActivitySpeaker::where('email', $validated['email'])
                ->where('activity_id', $activity->id)
                ->exists();

            if ($alreadyInActivity) {
                if ($request->ajax() || $request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Narasumber dengan email ini sudah ditambahkan ke kegiatan ini.',
                        'errors' => ['email' => ['Email narasumber sudah digunakan di kegiatan ini.']],
                    ], 422);
                }

                return redirect()->back()
                    ->withErrors(['email' => 'Email narasumber sudah digunakan di kegiatan ini.'])
                    ->withInput();
            }

            // Check if speaker exists in other activities and reuse data if available
            $existingSpeaker = ActivitySpeaker::where('email', $validated['email'])
                ->where('activity_id', '!=', $activity->id)
                ->first();

            if ($existingSpeaker) {
                // Reuse existing speaker data if available
                if (empty($validated['title']) && $existingSpeaker->title) {
                    $validated['title'] = $existingSpeaker->title;
                }
                if (empty($validated['institution']) && $existingSpeaker->institution) {
                    $validated['institution'] = $existingSpeaker->institution;
                }
                if (empty($validated['bio']) && $existingSpeaker->bio) {
                    $validated['bio'] = $existingSpeaker->bio;
                }
                if (empty($validated['phone']) && $existingSpeaker->phone) {
                    $validated['phone'] = $existingSpeaker->phone;
                }
                if (empty($validated['instagram']) && $existingSpeaker->instagram) {
                    $validated['instagram'] = $existingSpeaker->instagram;
                }
                if (empty($validated['linkedin']) && $existingSpeaker->linkedin) {
                    $validated['linkedin'] = $existingSpeaker->linkedin;
                }
                // Don't reuse photo and CV - user can upload new ones
            }

            if ($request->hasFile('photo')) {
                $path = $request->file('photo')->store('speakers', 'public');
                $validated['photo'] = $path;
            }

            if ($request->hasFile('cv')) {
                $path = $request->file('cv')->store('speakers/cv', 'public');
                $validated['cv'] = $path;
            }

            $validated['activity_id'] = $activity->id;
            $validated['order'] = $activity->speakers()->max('order') + 1;

            ActivitySpeaker::create($validated);

            // Return JSON response for AJAX requests
            if ($request->ajax() || $request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Narasumber berhasil ditambahkan.',
                ]);
            }

            return redirect()->route('activity.speakers.index', $activity->id)->with('success', 'Narasumber berhasil ditambahkan.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Return JSON response for AJAX requests with validation errors
            if ($request->ajax() || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validasi gagal. Periksa kembali data yang Anda masukkan.',
                    'errors' => $e->errors(),
                ], 422);
            }
            throw $e;
        } catch (\Exception $e) {
            // Return JSON response for AJAX requests with error
            if ($request->ajax() || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Terjadi kesalahan: '.$e->getMessage(),
                ], 500);
            }
            throw $e;
        }
    }

    public function update(Request $request, Activity $activity, ActivitySpeaker $speaker)
    {
        if (! $activity->canManageRegistration(auth()->id())) {
            if ($request->ajax() || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
                ], 403);
            }
            abort(403, 'Anda tidak memiliki izin untuk melakukan tindakan ini.');
        }

        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'title' => 'nullable|string|max:255',
                'institution' => 'nullable|string|max:255',
                'bio' => 'nullable|string',
                'photo' => 'nullable|image|max:10240', // 10MB Max
                'cv' => 'nullable|mimes:pdf|max:5120',
                'email' => 'required|email|max:255',
                'phone' => 'nullable|string|max:20',
                'instagram' => 'nullable|string|max:255',
                'linkedin' => 'nullable|string|max:255',
            ]);

            // Check if email already exists in this activity (unique constraint per activity)
            // Exclude current speaker being updated
            $alreadyInActivity = ActivitySpeaker::where('email', $validated['email'])
                ->where('activity_id', $activity->id)
                ->where('id', '!=', $speaker->id)
                ->exists();

            if ($alreadyInActivity) {
                if ($request->ajax() || $request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Narasumber dengan email ini sudah ditambahkan ke kegiatan ini.',
                        'errors' => ['email' => ['Email narasumber sudah digunakan di kegiatan ini.']],
                    ], 422);
                }

                return redirect()->back()
                    ->withErrors(['email' => 'Email narasumber sudah digunakan di kegiatan ini.'])
                    ->withInput();
            }

            if ($request->hasFile('photo')) {
                if ($speaker->photo) {
                    Storage::disk('public')->delete($speaker->photo);
                }
                $path = $request->file('photo')->store('speakers', 'public');
                $validated['photo'] = $path;
            }

            if ($request->hasFile('cv')) {
                if ($speaker->cv) {
                    Storage::disk('public')->delete($speaker->cv);
                }
                $path = $request->file('cv')->store('speakers/cv', 'public');
                $validated['cv'] = $path;
            }

            $speaker->update($validated);

            // Return JSON response for AJAX requests
            if ($request->ajax() || $request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Data narasumber berhasil diperbarui.',
                ]);
            }

            return redirect()->route('activity.speakers.index', $activity->id)->with('success', 'Data narasumber berhasil diperbarui.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Return JSON response for AJAX requests with validation errors
            if ($request->ajax() || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validasi gagal. Periksa kembali data yang Anda masukkan.',
                    'errors' => $e->errors(),
                ], 422);
            }
            throw $e;
        } catch (\Exception $e) {
            // Return JSON response for AJAX requests with error
            if ($request->ajax() || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Terjadi kesalahan: '.$e->getMessage(),
                ], 500);
            }
            throw $e;
        }
    }

    public function destroy(Activity $activity, ActivitySpeaker $speaker)
    {
        if (! $activity->canManageRegistration(auth()->id())) {
            abort(403, 'Anda tidak memiliki izin untuk melakukan tindakan ini.');
        }

        if ($speaker->photo) {
            Storage::disk('public')->delete($speaker->photo);
        }

        if ($speaker->cv) {
            Storage::disk('public')->delete($speaker->cv);
        }

        $speaker->delete();

        return redirect()->route('activity.speakers.index', $activity->id)->with('success', 'Narasumber berhasil dihapus.');
    }

    public function reorder(Request $request, Activity $activity)
    {
        if (! $activity->canManageRegistration(auth()->id())) {
            abort(403, 'Anda tidak memiliki izin untuk melakukan tindakan ini.');
        }

        $request->validate([
            'order' => 'required|array',
            'order.*' => 'exists:activity_speakers,id',
        ]);

        foreach ($request->order as $index => $id) {
            ActivitySpeaker::where('id', $id)->where('activity_id', $activity->id)->update(['order' => $index]);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Search for existing speakers by name or email (Real-time)
     */
    public function search(Request $request, Activity $activity)
    {
        $query = trim($request->input('q', ''));

        if (strlen($query) < 2) {
            return response()->json(['speakers' => []]);
        }

        // Get emails already in this activity (case-insensitive comparison)
        $existingEmails = ActivitySpeaker::where('activity_id', $activity->id)
            ->whereNotNull('email')
            ->get()
            ->map(function ($speaker) {
                return strtolower(trim($speaker->email));
            })
            ->unique()
            ->values()
            ->toArray();

        // Search ALL speakers by name or email (case-insensitive)
        // We'll filter out duplicates by email later
        $queryLower = strtolower($query);
        $speakers = ActivitySpeaker::where(function ($q) use ($queryLower) {
            $q->whereRaw('LOWER(name) LIKE ?', ['%'.$queryLower.'%'])
                ->orWhereRaw('LOWER(email) LIKE ?', ['%'.$queryLower.'%']);
        })
            ->whereNotNull('email')
            ->where('email', '!=', '') // Ensure email is not empty
            ->select('id', 'name', 'title', 'institution', 'email', 'phone', 'bio', 'photo', 'cv', 'instagram', 'linkedin', 'activity_id', 'created_at')
            ->orderBy('created_at', 'desc') // Get most recent first
            ->limit(50) // Get more results to filter
            ->get();

        // Filter out speakers with emails that already exist in current activity (case-insensitive)
        $filteredSpeakers = $speakers->filter(function ($speaker) use ($existingEmails) {
            $speakerEmail = strtolower(trim($speaker->email));

            return ! in_array($speakerEmail, $existingEmails);
        });

        // Group by email to get unique speakers (keep the most recent one for each email)
        $uniqueSpeakers = $filteredSpeakers->unique(function ($speaker) {
            return strtolower(trim($speaker->email));
        })->take(10)->values();

        // Remove activity_id and created_at from response (not needed in frontend)
        $uniqueSpeakers = $uniqueSpeakers->map(function ($speaker) {
            unset($speaker->activity_id);
            unset($speaker->created_at);

            return $speaker;
        });

        return response()->json(['speakers' => $uniqueSpeakers]);
    }
}
