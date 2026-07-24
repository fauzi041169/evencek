<?php

namespace App\Http\Controllers;

use App\Helpers\ImageHelper;
use App\Models\Activity;
use App\Models\CertificateBackground;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CertificateSettingsController extends Controller
{
    private function assertCanManageCertificates($activityId): Activity
    {
        $user = auth()->user();
        if (! $user) {
            abort(403, 'Unauthorized');
        }

        $activity = Activity::find($activityId);
        if (! $activity || ! $activity->canAccessPrinting($user, 'certificates')) {
            abort(403, 'Anda tidak memiliki akses untuk mengatur sertifikat kegiatan ini');
        }

        return $activity;
    }

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

            $this->assertCanManageCertificates($activity_id);

            $decoded = json_decode($certificate_setting, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format certificate_setting tidak valid JSON: '.json_last_error_msg(),
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
                Log::error('Gagal menyimpan sertifikat ke database: '.$e->getMessage());

                return response()->json([
                    'success' => false,
                    'message' => 'Gagal menyimpan ke database',
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Pengaturan sertifikat berhasil disimpan',
                'data' => $certificateSettings,
                'certificate_setting' => $certificateSettings->certificate_setting,
                'print_settings' => $certificateSettings->print_settings,
            ]);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Exception certificate settings: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan internal server.',
            ], 500);
        }
    }

    public function uploadBackground(Request $request)
    {
        if (! $request->has('activity_id')) {
            if ($request->has('activityId')) {
                $request->merge(['activity_id' => $request->activityId]);
            } elseif ($request->has('id')) {
                $request->merge(['activity_id' => $request->id]);
            }
        }

        try {
            $validator = \Validator::make($request->all(), [
                'activity_id' => 'required|exists:activities,id',
                'background' => 'required|file|image|mimes:jpeg,png,jpg,webp|max:51200',
            ], [
                'activity_id.required' => 'ID Aktivitas wajib diisi.',
                'background.required' => 'File background wajib diunggah.',
                'background.file' => 'Input harus berupa file.',
                'background.max' => 'Ukuran file maksimal 50MB.',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validasi gagal: '.$validator->errors()->first(),
                    'errors' => $validator->errors(),
                ], 422);
            }

            $activityId = $request->activity_id;
            $this->assertCanManageCertificates($activityId);

            $file = $request->file('background');

            if (! $file || ! $file->isValid()) {
                return response()->json([
                    'success' => false,
                    'message' => 'File tidak valid atau gagal diupload.',
                ], 400);
            }

            $path = ImageHelper::storeCompressedUploadedImage($file, 'certificate-backgrounds/'.$activityId, 'public', [
                'max_width' => 2500,
                'max_height' => 2500,
                'quality' => 85,
                'format' => 'webp',
            ]);

            if (! $path) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal menyimpan file gambar.',
                ], 500);
            }

            $bg = CertificateBackground::create([
                'activity_id' => $activityId,
                'filename' => $path,
                'original_name' => $file->getClientOriginalName(),
            ]);

            return response()->json([
                'success' => true,
                'image' => [
                    'id' => $bg->id,
                    'filename' => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'url' => Storage::url($path),
                    'type' => 'uploaded',
                ],
                'filename' => $path,
            ]);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('[CERT BG UPLOAD] Error: '.$e->getMessage(), [
                'activity_id' => $request->activity_id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal upload background.',
            ], 500);
        }
    }

    public function deleteBackground(Request $request)
    {
        $request->validate([
            'filename' => 'required|string|max:500',
            'activity_id' => 'nullable|exists:activities,id',
        ]);

        $filename = ltrim((string) $request->input('filename'), '/');
        $filename = str_replace('\\', '/', $filename);

        // Prevent path traversal outside certificate asset folders
        if (
            str_contains($filename, '..')
            || (! Str::startsWith($filename, 'certificate-backgrounds/')
                && ! Str::startsWith($filename, 'background/default/')
                && ! Str::startsWith($filename, 'assets/images/certificate/'))
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Path file tidak diizinkan',
            ], 403);
        }

        $bg = CertificateBackground::where('filename', $filename)->first();
        $activityId = $request->input('activity_id') ?: ($bg->activity_id ?? null);

        if (! $activityId) {
            return response()->json([
                'success' => false,
                'message' => 'activity_id wajib diisi',
            ], 400);
        }

        $this->assertCanManageCertificates($activityId);

        if ($bg && (string) $bg->activity_id !== (string) $activityId) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        // Do not allow deleting shared default templates
        if (Str::startsWith($filename, 'background/default/')) {
            return response()->json([
                'success' => false,
                'message' => 'Background default tidak dapat dihapus',
            ], 403);
        }

        $existsInStorage = Storage::disk('public')->exists($filename);
        $legacyRelative = Str::startsWith($filename, 'assets/images/certificate/')
            ? substr($filename, strlen('assets/images/certificate/'))
            : $filename;
        $legacyPath = public_path('assets/images/certificate/'.$legacyRelative);
        $existsInLegacy = is_file($legacyPath);

        if (! $existsInStorage && ! $existsInLegacy && ! $bg) {
            return response()->json([
                'success' => false,
                'message' => 'File tidak ditemukan',
            ], 404);
        }

        try {
            if ($existsInStorage) {
                Storage::disk('public')->delete($filename);
            } elseif ($existsInLegacy) {
                unlink($legacyPath);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus file',
            ], 500);
        }

        try {
            DB::table('certificate_backgrounds')
                ->where('filename', $filename)
                ->where('activity_id', $activityId)
                ->delete();
        } catch (\Exception $e) {
            Log::warning('[CERT BG] Delete DB gagal: '.$e->getMessage());
        }

        return response()->json([
            'success' => true,
            'deleted' => $filename,
        ]);
    }

    public function getBackgroundImages(Request $request, $activityId)
    {
        $this->assertCanManageCertificates($activityId);

        $items = DB::table('certificate_backgrounds')
            ->where('activity_id', $activityId)
            ->orderBy('created_at', 'desc')
            ->get(['id', 'filename', 'original_name']);

        $images = [];

        foreach ($items as $it) {
            $url = '';
            if (Str::startsWith($it->filename, 'certificate-backgrounds/')) {
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

        $defaultPath = public_path('assets/images/certificate/background/default');

        if (file_exists($defaultPath) && is_dir($defaultPath)) {
            $files = scandir($defaultPath);
            foreach ($files as $file) {
                if ($file === '.' || $file === '..') {
                    continue;
                }

                $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                if (! in_array($ext, ['png', 'jpg', 'jpeg', 'webp'])) {
                    continue;
                }

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
