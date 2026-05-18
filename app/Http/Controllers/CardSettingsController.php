<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class CardSettingsController extends Controller
{
    public function update(Request $request, $activityId = null)
    {
        try {
            $activity_id = $request->input('activity_id', $activityId);
            $activity_batch_id = $request->input('activity_batch_id');
            $type = $request->input('type', 'participant');
            if ($activity_batch_id === 'all' || $activity_batch_id === '') {
                $activity_batch_id = null;
            }
            $card_setting = $request->input('card_setting');
            $print_settings = $request->input('print_settings');

            if (! $activity_id || ! $card_setting) {
                return response()->json([
                    'success' => false,
                    'message' => 'activity_id dan card_setting wajib diisi',
                ], 400);
            }
            // Pastikan card_setting bisa di-decode ke array
            $decoded = json_decode($card_setting, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format card_setting tidak valid JSON: '.json_last_error_msg(),
                    'raw' => $card_setting,
                ], 400);
            }
            $cardSettings = \App\Models\CardSettings::firstOrNew([
                'activity_id' => $activity_id,
                'activity_batch_id' => $activity_batch_id,
                'type' => $type,
            ]);
            $cardSettings->card_setting = $decoded;
            if ($print_settings) {
                $decodedPrint = is_array($print_settings) ? $print_settings : json_decode($print_settings, true);
                // Gabungkan dengan nilai yang sudah ada agar flag lain (mis. card_id_visible) tidak hilang
                $existing = $cardSettings->print_settings ?? [];
                if (! is_array($existing)) {
                    $existing = [];
                }
                if (! is_array($decodedPrint)) {
                    $decodedPrint = [];
                }
                $cardSettings->print_settings = array_merge($existing, $decodedPrint);
            }
            try {
                $cardSettings->save();
            } catch (\Exception $e) {
                \Log::error('[DEBUG] Gagal menyimpan ke database: '.$e->getMessage());

                return response()->json([
                    'success' => false,
                    'message' => 'Gagal menyimpan ke database: '.$e->getMessage(),
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Pengaturan berhasil disimpan',
                'data' => $cardSettings,
                'card_setting' => $cardSettings->card_setting,
                'print_settings' => $cardSettings->print_settings,
            ]);
        } catch (\Exception $e) {
            \Log::error('Exception umum: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: '.$e->getMessage(),
            ], 500);
        }
    }
}
