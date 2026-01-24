<?php

namespace App\Http\Controllers;

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

            // Debug: log data mentah
            \Log::info('[DEBUG] Data setting sertifikat yang diterima:', [
                'activity_id' => $activity_id,
                'activity_batch_id' => $activity_batch_id,
                'certificate_setting' => $certificate_setting,
            ]);

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
                \Log::error('[DEBUG] Gagal menyimpan sertifikat ke database: '.$e->getMessage());

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
        try {
            $request->validate([
                'background_image' => 'required|image|mimes:jpg,jpeg,png|max:2048',
            ]);

            $file = $request->file('background_image');
            if (! $file) {
                return response()->json([
                    'success' => false,
                    'message' => 'File tidak ditemukan',
                ], 400);
            }

            // Simpan menggunakan Storage facade
            $activityId = $request->input('activity_id');
            $path = $file->store('certificate-backgrounds/'.($activityId ?: 'default'), 'public');

            if (! $path) {
                return response()->json([
                    'success' => false,
                    'message' => 'File gagal disimpan ke server',
                ], 500);
            }

            try {
                \DB::table('certificate_backgrounds')->insert([
                    'activity_id' => $activityId,
                    'filename' => $path,
                    'original_name' => basename($file->getClientOriginalName()),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } catch (\Exception $e) {
                \Log::warning('[CERT BG] Insert DB gagal: '.$e->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'Latar sertifikat berhasil diupload',
                'filename' => $path,
                'url' => \Illuminate\Support\Facades\Storage::url($path),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal: '.implode(', ', $e->errors()['background_image'] ?? []),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('[CERTIFICATE UPLOAD] Error: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: '.$e->getMessage(),
            ], 500);
        }
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
}
