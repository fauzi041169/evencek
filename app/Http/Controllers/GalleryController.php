<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\Gallery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GalleryController extends Controller
{
    // Upload multiple images
    public function store(Request $request, $activityId)
    {
        if (! auth()->check()) {
            abort(403, 'Unauthorized');
        }

        $activity = Activity::findOrFail($activityId);
        $user = auth()->user();
        $isAdmin = $user->isAdmin() || $user->isSuperAdmin();
        $isCreator = (int) $activity->user_id === (int) $user->id && $user->isCreator();
        $isCommittee = method_exists($activity, 'canManageRegistration') ? $activity->canManageRegistration($user->id) : false;
        if (! ($isAdmin || $isCreator || $isCommittee)) {
            abort(403, 'Anda tidak memiliki izin untuk mengelola galeri aktivitas ini.');
        }

        $request->validate([
            'image' => 'required',
            // Naikkan batas per file menjadi 10MB (Laravel memakai KB)
            'image.*' => 'image|mimes:jpg,jpeg,png|max:10240',
        ]);

        $saved = [];
        if ($request->hasFile('image')) {
            $uploadPath = public_path('storage/activities/gallery');
            if (! file_exists($uploadPath)) {
                mkdir($uploadPath, 0755, true);
            }

            foreach ($request->file('image') as $file) {
                if (! $file->isValid()) {
                    return back()->with('error', 'File upload tidak valid: '.($file->getError() ?? 'Unknown error'));
                }

                $filename = time().'_'.uniqid().'.'.$file->getClientOriginalExtension();
                $file->move($uploadPath, $filename);

                // Simpan ke DB hanya nama file; path publik di-blade
                Gallery::create([
                    'activity_id' => $activityId,
                    'image' => $filename,
                ]);
                $saved[] = $filename;
            }
        }
        // Jika request AJAX/JSON, kembalikan daftar URL agar bisa ditampilkan tanpa reload
        if ($request->ajax() || $request->wantsJson()) {
            $urls = array_map(function ($name) {
                return asset('storage/activities/gallery/'.$name);
            }, $saved);

            return response()->json(['success' => true, 'urls' => $urls]);
        }

        return back()->with('success', 'Galeri berhasil ditambahkan');
    }

    // Hapus gambar galeri
    public function destroy($activityId, $galleryId)
    {
        if (! auth()->check()) {
            abort(403, 'Unauthorized');
        }
        $activity = Activity::findOrFail($activityId);
        $user = auth()->user();
        $isAdmin = $user->isAdmin() || $user->isSuperAdmin();
        $isCreator = (int) $activity->user_id === (int) $user->id && $user->isCreator();
        $isCommittee = method_exists($activity, 'canManageRegistration') ? $activity->canManageRegistration($user->id) : false;
        if (! ($isAdmin || $isCreator || $isCommittee)) {
            abort(403, 'Anda tidak memiliki izin untuk menghapus galeri aktivitas ini.');
        }

        $gallery = Gallery::where('activity_id', $activityId)->where('id', $galleryId)->firstOrFail();
        $imagePath = public_path('storage/activities/gallery/'.$gallery->image);
        if (file_exists($imagePath)) {
            unlink($imagePath);
        }
        $gallery->delete();
        // Jika request AJAX/JSON, kembalikan status tanpa redirect
        if (request()->ajax() || request()->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return back()->with('success', 'Gambar galeri berhasil dihapus');
    }
}
