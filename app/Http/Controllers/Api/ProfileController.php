<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ImageHelper;
use App\Http\Controllers\Controller;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class ProfileController extends Controller
{
    /**
     * Get user profile
     */
    public function show()
    {
        $user = Auth::user();
        $profile = $user->profile;

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'avatar' => $user->avatar,
                    'role' => $user->role,
                ],
                'profile' => $profile ? [
                    'jenis_kelamin' => $profile->jenis_kelamin,
                    'tanggal_lahir' => $profile->tanggal_lahir,
                    'alamat' => $profile->alamat,
                    'pekerjaan' => $profile->pekerjaan,
                    'province_id' => $profile->province_id,
                    'regency_id' => $profile->regency_id,
                    'district_id' => $profile->district_id,
                    'province' => $profile->province ? $profile->province->name : null,
                    'regency' => $profile->regency ? $profile->regency->name : null,
                    'district' => $profile->district ? $profile->district->name : null,
                ] : null,
            ],
        ], 200);
    }

    /**
     * Update user profile
     */
    public function update(Request $request)
    {
        $user = Auth::user();

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,'.$user->id,
            'no_hp' => 'nullable|string|max:20',
            'nik' => 'nullable|string|max:20',
            'pekerjaan' => 'nullable|string|max:100',
            'instansi' => 'nullable|string|max:100',
            'jabatan' => 'nullable|string|max:100',
            'alamat' => 'nullable|string',
            'province_id' => 'nullable|exists:provinces,id',
            'regency_id' => 'nullable|exists:regencies,id',
            'district_id' => 'nullable|exists:districts,id',
            'foto_file' => 'nullable|image|mimes:jpeg,png,jpg|max:20480',
            'foto' => 'nullable|image|mimes:jpeg,png,jpg|max:20480',
            'jenis_kelamin' => 'nullable|string',
            'birth_place' => 'nullable|string|max:100',
            'birth_date' => 'nullable|date',
            'tanggal_lahir' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Update user
            if ($request->has('name')) {
                $user->name = $request->name;
            }
            if ($request->has('email')) {
                $user->email = $request->email;
            }
            if ($request->has('phone')) {
                $user->phone = $request->phone;
            }
            // Map no_hp to user phone if needed, or just keep it in profile
            if ($request->has('no_hp') && empty($user->phone)) {
                $user->phone = $request->no_hp;
            }
            $user->save();

            // Update or create profile
            $profile = $user->profile;
            if (! $profile) {
                $profile = new Profile;
                $profile->user_id = $user->id;
            }

            // Map fields
            $fields = [
                'no_hp', 'nik', 'pekerjaan', 'instansi', 'jabatan', 'alamat',
                'province_id', 'regency_id', 'district_id', 'jenis_kelamin',
                'birth_place', 'birth_date',
            ];

            foreach ($fields as $field) {
                if ($request->has($field)) {
                    $profile->$field = $request->$field;
                }
            }

            if ($request->has('jenis_kelamin')) {
                $profile->jenis_kelamin = \App\Helpers\GenderHelper::normalize($request->jenis_kelamin);
            }

            // Handle aliases
            if ($request->has('tanggal_lahir')) {
                $profile->birth_date = $request->tanggal_lahir;
            }
            if ($request->has('tempat_lahir')) {
                $profile->birth_place = $request->tempat_lahir;
            }
            if ($request->has('phone')) {
                $profile->no_hp = $request->phone;
            }

            // Handle File Upload
            if ($request->hasFile('foto_file') || $request->hasFile('foto')) {
                $file = $request->file('foto_file') ?? $request->file('foto');
                if ($file && $file->isValid()) {
                    $path = ImageHelper::storeCompressedUploadedImage($file, 'profile-photos', 'public', [
                        'max_width' => 1200,
                        'max_height' => 1200,
                        'quality' => 82,
                        'format' => 'webp',
                    ]);
                    $profile->foto = $path;
                }
            }

            $profile->save();

            return response()->json([
                'success' => true,
                'message' => 'Profile updated successfully.',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'phone' => $user->phone,
                    ],
                    'profile' => $profile,
                ],
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal update profile',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
