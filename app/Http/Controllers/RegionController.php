<?php

namespace App\Http\Controllers;

use App\Models\District;
use App\Models\Regency;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class RegionController extends Controller
{
    public function getRegencies($provinceId): JsonResponse
    {
        try {
            Log::info('Fetching regencies for province: '.$provinceId);

            $regencies = Regency::where('province_id', $provinceId)
                ->select('id', 'name')
                ->orderBy('name')
                ->get();

            if ($regencies->isEmpty()) {
                Log::warning('No regencies found for province: '.$provinceId);

                return response()->json([
                    'status' => 'error',
                    'message' => 'Tidak ada data kabupaten',
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'data' => $regencies,
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching regencies: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memuat data kabupaten',
            ], 500);
        }
    }

    public function getDistricts($regencyId): JsonResponse
    {
        try {
            Log::info('Fetching districts for regency: '.$regencyId);

            $districts = District::where('regency_id', $regencyId)
                ->select('id', 'name')
                ->orderBy('name')
                ->get();

            if ($districts->isEmpty()) {
                Log::warning('No districts found for regency: '.$regencyId);

                return response()->json([
                    'status' => 'error',
                    'message' => 'Tidak ada data kecamatan',
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'data' => $districts,
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching districts: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memuat data kecamatan',
            ], 500);
        }
    }

    public function getUserCountsByRegency($provinceId): JsonResponse
    {
        try {
            $data = \App\Models\Profile::join('regencies', 'profiles.regency_id', '=', 'regencies.id')
                ->where('profiles.province_id', $provinceId)
                ->select('regencies.id', 'regencies.name', \DB::raw('COUNT(profiles.id) as total'))
                ->groupBy('regencies.id', 'regencies.name')
                ->orderByDesc('total')
                ->limit(15)
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'ids' => $data->pluck('id')->toArray(),
                    'labels' => $data->pluck('name')->toArray(),
                    'data' => $data->pluck('total')->toArray(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function getUserCountsByDistrict($regencyId): JsonResponse
    {
        try {
            $data = \App\Models\Profile::join('districts', 'profiles.district_id', '=', 'districts.id')
                ->where('profiles.regency_id', $regencyId)
                ->select('districts.id', 'districts.name', \DB::raw('COUNT(profiles.id) as total'))
                ->groupBy('districts.id', 'districts.name')
                ->orderByDesc('total')
                ->limit(15)
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'ids' => $data->pluck('id')->toArray(),
                    'labels' => $data->pluck('name')->toArray(),
                    'data' => $data->pluck('total')->toArray(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function getGlobalTopProvinces(): JsonResponse
    {
        try {
            $data = \App\Models\Profile::join('provinces', 'profiles.province_id', '=', 'provinces.id')
                ->select('provinces.id', 'provinces.name', \DB::raw('COUNT(profiles.id) as total'))
                ->groupBy('provinces.id', 'provinces.name')
                ->orderByDesc('total')
                ->limit(15)
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'ids' => $data->pluck('id')->toArray(),
                    'labels' => $data->pluck('name')->toArray(),
                    'data' => $data->pluck('total')->toArray(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function getGlobalTopRegencies(): JsonResponse
    {
        try {
            $data = \App\Models\Profile::join('regencies', 'profiles.regency_id', '=', 'regencies.id')
                ->select('regencies.id', 'regencies.name', \DB::raw('COUNT(profiles.id) as total'))
                ->groupBy('regencies.id', 'regencies.name')
                ->orderByDesc('total')
                ->limit(15)
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'ids' => $data->pluck('id')->toArray(),
                    'labels' => $data->pluck('name')->toArray(),
                    'data' => $data->pluck('total')->toArray(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function getGlobalTopDistricts(): JsonResponse
    {
        try {
            $data = \App\Models\Profile::join('districts', 'profiles.district_id', '=', 'districts.id')
                ->select('districts.id', 'districts.name', \DB::raw('COUNT(profiles.id) as total'))
                ->groupBy('districts.id', 'districts.name')
                ->orderByDesc('total')
                ->limit(15)
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'ids' => $data->pluck('id')->toArray(),
                    'labels' => $data->pluck('name')->toArray(),
                    'data' => $data->pluck('total')->toArray(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
