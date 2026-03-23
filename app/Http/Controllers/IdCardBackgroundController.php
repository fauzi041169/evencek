<?php

namespace App\Http\Controllers;

use App\Helpers\ImageHelper;
use App\Models\Activity;
use App\Models\IdCardBackground;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class IdCardBackgroundController extends Controller
{
    public function upload(Request $request)
    {
        if (! auth()->check()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        // Use Manual Validator to return custom error response
        // Log request data for debugging
        \Log::info('Background Upload Request', [
            'all' => $request->all(),
            'files' => $request->allFiles(),
            'has_background' => $request->hasFile('background'),
            'content_length' => $request->header('Content-Length'),
        ]);

        $validator = Validator::make($request->all(), [
            'activity_id' => 'required|string|exists:activities,id',
            'background' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:51200', // Max 50MB
        ]);

        if ($validator->fails()) {
            \Log::error('Background upload validation failed', ['errors' => $validator->errors()]);

            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $activity = Activity::find($request->input('activity_id'));
        if (! $activity || ! $activity->canAccessPrinting(auth()->user(), 'cards')) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }
        $file = $request->file('background');
        if (! $file || ! $file->isValid()) {
            return response()->json([
                'success' => false,
                'message' => 'File upload tidak valid',
            ], 400);
        }

        $path = ImageHelper::storeCompressedUploadedImage($file, 'id-card-backgrounds/'.$activity->id, 'public', [
            'max_width' => 2500,
            'max_height' => 2500,
            'quality' => 80,
            'format' => 'webp',
        ]);

        if (! $path) {
            return response()->json([
                'success' => false,
                'message' => 'File gagal disimpan',
            ], 500);
        }

        // Simpan ke database
        IdCardBackground::create([
            'activity_id' => $activity->id,
            'filename' => $path,
            'original_name' => basename($file->getClientOriginalName()),
        ]);

        \Log::info('Upload sukses', ['filename' => $path]);

        return response()->json([
            'success' => true,
            'filename' => $path,
            'url' => \Illuminate\Support\Facades\Storage::url($path),
        ]);
    }

    public function delete(Request $request)
    {
        if (! auth()->check()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }
        $request->validate([
            'activity_id' => 'required|string|exists:activities,id',
            'filename' => 'required|string',
        ]);
        $activity = Activity::find($request->input('activity_id'));
        if (! $activity || ! $activity->canAccessPrinting(auth()->user(), 'cards')) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $filename = ltrim($request->input('filename'), '/');

        $bgRecord = DB::table('id_card_backgrounds')->where('filename', $filename)->first();
        if (! $bgRecord) {
            return response()->json([
                'success' => false,
                'message' => 'File tidak terdaftar',
            ], 404);
        }

        // Check ownership if activity_id is set
        if ($bgRecord->activity_id && $bgRecord->activity_id != $activity->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized file access',
            ], 403);
        }

        // Delete from DB
        DB::table('id_card_backgrounds')->where('id', $bgRecord->id)->delete();

        // Delete File
        if (\Illuminate\Support\Facades\Storage::disk('public')->exists($filename)) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($filename);
        } else {
            // Legacy fallback
            $path = public_path('assets/images/card/'.$filename);
            if (file_exists($path)) {
                unlink($path);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'File dihapus',
        ]);
    }

    public function getBackgroundImages(Request $request, $activityId = null)
    {
        if (! auth()->check()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $items = collect();
        if ($activityId) {
            $activity = Activity::find($activityId);
            if (! $activity || ! $activity->canAccessPrinting(auth()->user(), 'cards')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 403);
            }

            $items = DB::table('id_card_backgrounds')
                ->where('activity_id', $activityId)
                ->orderBy('created_at', 'desc')
                ->get(['id', 'filename', 'original_name']);
        }

        // Initialize images array
        $images = [];

        // 1. Get uploaded images from DB
        foreach ($items as $it) {
            $url = '';
            if (\Illuminate\Support\Str::startsWith($it->filename, 'id-card-backgrounds/')) {
                $url = \Illuminate\Support\Facades\Storage::url($it->filename);
            } else {
                $url = asset('assets/images/card/'.$it->filename);
            }

            $images[] = [
                'id' => $it->id,
                'filename' => $it->filename,
                'original_name' => $it->original_name,
                'url' => $url,
                'type' => 'uploaded',
            ];
        }

        // 2. Get Default Images from directory
        $defaultPath = public_path('assets/images/card/background/default');
        if (file_exists($defaultPath) && is_dir($defaultPath)) {
            $files = scandir($defaultPath);
            foreach ($files as $file) {
                if ($file === '.' || $file === '..') {
                    continue;
                }

                // Only allow image extensions
                $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                if (! in_array($ext, ['png', 'jpg', 'jpeg', 'webp'])) {
                    continue;
                }

                $filename = 'background/default/'.$file;
                $images[] = [
                    'id' => 'default_'.$file,
                    'filename' => $filename,
                    'original_name' => 'Default '.$file,
                    'url' => asset('assets/images/card/'.$filename),
                    'type' => 'default',
                ];
            }
        }

        return response()->json([
            'success' => true,
            'images' => $images,
        ]);
    }
}
