<?php

namespace App\Http\Controllers;

use App\Helpers\ImageHelper;
use Illuminate\Http\Request;

class CertificateSettingsController extends Controller
{
    public function update(Request $request, $activityId = null)
    {
        try {
            $activity_id = $request->input('activity_id', $activityId);
            $activity_batch_id = $request->input('activity_batch_id');
            $certificate_setting = $request->input('certificate_setting');
            $print_settings = $request->input('print_settings');

            if (! $activity_id || ! $certificate_setting) {
                return response()->json([
                    'success' => false,
                    'message' => 'activity_id dan certificate_setting wajib diisi',
                ], 400);
            }
            // Pastikan certificate_setting bisa di-decode ke array
            $decoded = json_decode($certificate_setting, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format certificate_setting tidak valid JSON: '.json_last_error_msg(),
                    'raw' => $certificate_setting,
                ], 400);
            }
            $certificateSettings = \App\Models\CertificateSettings::firstOrNew([
                'activity_id' => $activity_id,
                'activity_batch_id' => $activity_batch_id,
            ]);
            $certificateSettings->certificate_setting = $decoded;
            if ($print_settings) {
                $decodedPrint = is_array($print_settings) ? $print_settings : json_decode($print_settings, true);
                if (! is_array($decodedPrint)) {
                    $decodedPrint = [];
                }
                $existingPrint = is_array($certificateSettings->print_settings) ? $certificateSettings->print_settings : [];
                if (! array_key_exists('download_card_visible', $decodedPrint) && array_key_exists('download_card_visible', $existingPrint)) {
                    $decodedPrint['download_card_visible'] = $existingPrint['download_card_visible'];
                }
                $certificateSettings->print_settings = array_merge($existingPrint, $decodedPrint);
            }
            try {
                $certificateSettings->save();
            } catch (\Exception $e) {
                \Log::error('Gagal menyimpan sertifikat ke database: '.$e->getMessage());

                return response()->json([
                    'success' => false,
                    'message' => 'Gagal menyimpan ke database: '.$e->getMessage(),
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Pengaturan sertifikat berhasil disimpan',
                'data' => $certificateSettings,
                'certificate_setting' => $certificateSettings->certificate_setting,
                'print_settings' => $certificateSettings->print_settings,
            ]);
        } catch (\Exception $e) {
            \Log::error('[DEBUG] Exception umum: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan internal server.',
            ], 500);
        }
    }

    public function uploadBackground(Request $request)
    {
        $request->validate([
            'activity_id' => 'required',
            'background' => 'required|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        $activityId = $request->activity_id;
        $file = $request->file('background');
        
        // Use a more consistent path
        $filename = time() . '_' . \Illuminate\Support\Str::random(10) . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('certificate-backgrounds/' . $activityId, $filename, 'public');

        $id = \DB::table('certificate_backgrounds')->insertGetId([
            'activity_id' => $activityId,
            'filename' => $path,
            'original_name' => $file->getClientOriginalName(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'image' => [
                'id' => $id,
                'filename' => $path,
                'original_name' => $file->getClientOriginalName(),
                'url' => \Illuminate\Support\Facades\Storage::url($path),
                'type' => 'uploaded',
            ],
        ]);
    }

    public function deleteBackground(Request $request)
    {
        $request->validate([
            'filename' => 'required|string',
        ]);

        $filename = ltrim($request->input('filename'), '/');

        $existsInStorage = \Illuminate\Support\Facades\Storage::disk('public')->exists($filename);
        $legacyPath = public_path('assets/images/certificate/'.$filename);
        $existsInLegacy = file_exists($legacyPath);

        if (! $existsInStorage && ! $existsInLegacy) {
            return response()->json([
                'success' => false,
                'message' => 'File tidak ditemukan',
            ], 404);
        }

        try {
            if ($existsInStorage) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($filename);
            } elseif ($existsInLegacy) {
                unlink($legacyPath);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus file: '.$e->getMessage(),
            ], 500);
        }

        try {
            \DB::table('certificate_backgrounds')->where('filename', $filename)->delete();
        } catch (\Exception $e) {
            \Log::warning('[CERT BG] Delete DB gagal: '.$e->getMessage());
        }

        return response()->json([
            'success' => true,
            'deleted' => $filename,
        ]);
    }

    public function getBackgroundImages(Request $request, $activityId)
    {
        if (! auth()->check()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $items = \DB::table('certificate_backgrounds')
            ->where('activity_id', $activityId)
            ->orderBy('created_at', 'desc')
            ->get(['id', 'filename', 'original_name']);

        $images = [];

        // 1. Uploaded Images
        foreach ($items as $it) {
            $url = '';
            // Handle storage vs legacy path
            if (\Illuminate\Support\Str::startsWith($it->filename, 'certificate-backgrounds/')) {
                $url = '/storage/'.$it->filename;
            } else {
                $url = '/assets/images/certificate/'.$it->filename;
            }

            $images[] = [
                'id' => $it->id,
                'filename' => $it->filename,
                'original_name' => $it->original_name,
                'url' => $url,
                'type' => 'uploaded',
            ];
        }

        // 2. Default Images
        $defaultPath = public_path('assets/images/certificate/background/default');

        if (file_exists($defaultPath) && is_dir($defaultPath)) {
            $files = scandir($defaultPath);
            foreach ($files as $file) {
                if ($file === '.' || $file === '..') continue;

                $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                if (! in_array($ext, ['png', 'jpg', 'jpeg', 'webp'])) continue;

                $filename = 'background/default/'.$file;
                $images[] = [
                    'id' => 'default_'.$file,
                    'filename' => $filename,
                    'original_name' => 'Default '.$file,
                    'url' => '/assets/images/certificate/'.$filename,
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
