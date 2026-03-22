<?php

namespace App\Http\Controllers;

use App\Helpers\ImageHelper;
use App\Models\District;
use App\Models\Profile;
use App\Models\Province;
use App\Models\Regency;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Inertia\Inertia;

class UserController extends Controller
{
    public function dashboard()
    {
        // Alihkan ke dashboard baru yang terpusat
        return redirect()->route('dashboard.index');
    }

    public function edit($id)
    {
        // Load user with all necessary relationships
        $user = User::with(['profile.province', 'profile.regency', 'profile.district'])->findOrFail($id);

        // Load all provinces
        $provinces = Province::orderBy('name')->get();

        // Initialize empty collections for regencies and districts
        $regencies = collect();
        $districts = collect();

        // Load regencies if user has a province selected
        if ($user->profile && $user->profile->province_id) {
            $regencies = Regency::where('province_id', $user->profile->province_id)
                ->orderBy('name')
                ->get();
        }

        // Load districts if user has a regency selected
        if ($user->profile && $user->profile->regency_id) {
            $districts = District::where('regency_id', $user->profile->regency_id)
                ->orderBy('name')
                ->get();
        }

        return Inertia::render('Users/Edit', [
            'user' => $user,
            'provinces' => $provinces,
            'regencies' => $regencies,
            'districts' => $districts,
            'activity_id' => request('activity_id'),
        ]);
    }

    public function update(Request $request, User $user)
    {
        Log::info('Update User Request Data:', $request->all());

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,'.$user->id,
            'no_hp' => 'nullable|string|max:20',
            'pekerjaan' => 'nullable|string|max:100',
            'instansi' => 'nullable|string|max:100',
            'jabatan' => 'nullable|string|max:100',
            'province_id' => 'required|exists:provinces,id',
            'regency_id' => 'required|exists:regencies,id',
            'district_id' => 'required|exists:districts,id',
            'alamat' => 'required|string',
            'jenis_kelamin' => 'required|in:Laki-laki,Perempuan',
            'foto_file' => 'nullable|image|mimes:jpeg,png,jpg|max:20480',
            'foto_data' => 'nullable|string',
        ], [
            'province_id.exists' => 'Kode Provinsi tidak valid atau tidak ditemukan di database. Silakan pilih ulang provinsi.',
            'regency_id.exists' => 'Kode Kabupaten/Kota tidak valid atau tidak ditemukan. Silakan pilih ulang kota.',
            'district_id.exists' => 'Kode Kecamatan tidak valid atau tidak ditemukan. Silakan pilih ulang kecamatan.',
            'province_id.required' => 'Provinsi wajib dipilih.',
            'regency_id.required' => 'Kabupaten/Kota wajib dipilih.',
            'district_id.required' => 'Kecamatan wajib dipilih.',
        ]);

        if ($validator->fails()) {
            Log::error('Validation failed:', $validator->errors()->toArray());

            // Return JSON response for AJAX requests
            if ($request->ajax() || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validasi gagal',
                    'errors' => $validator->errors(),
                ], 422);
            }

            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            DB::beginTransaction();

            // Update user data
            $user->update([
                'name' => $request->name,
                'email' => $request->email,
            ]);

            Log::info('User data updated:', $user->toArray());

            // Handle photo logic
            $currentPhoto = $user->profile->foto ?? null;
            $newPhoto = $currentPhoto;

            if ($request->hasFile('foto_file')) {
                // Delete old photo if exists
                if ($currentPhoto) {
                    if (Storage::disk('public')->exists($currentPhoto)) {
                        Storage::disk('public')->delete($currentPhoto);
                    } elseif (file_exists(public_path('assets/images/profilefoto/'.$currentPhoto))) {
                        @unlink(public_path('assets/images/profilefoto/'.$currentPhoto));
                    }
                }

                $foto = $request->file('foto_file');
                $newPhoto = ImageHelper::storeCompressedUploadedImage($foto, 'profile-photos', 'public', [
                    'max_width' => 1200,
                    'max_height' => 1200,
                    'quality' => 82,
                    'format' => 'webp',
                ]);
            }
            // Handle base64 image from camera
            elseif ($request->filled('foto_data') && $request->foto_data != 'delete') {
                $image_data = $request->foto_data;
                $image_array_1 = explode(';', $image_data);
                $image_array_2 = explode(',', $image_array_1[1]);
                $image_data = base64_decode($image_array_2[1]);

                // Validate Base64 image content
                $finfo = new \finfo(FILEINFO_MIME_TYPE);
                $mimeType = $finfo->buffer($image_data);
                
                if (!in_array($mimeType, ['image/jpeg', 'image/png', 'image/jpg'])) {
                    if ($request->ajax() || $request->expectsJson()) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Format gambar dari kamera tidak valid.',
                        ], 422);
                    }
                    return redirect()->back()
                        ->withErrors(['foto_file' => 'Format gambar dari kamera tidak valid.'])
                        ->withInput();
                }

                // Delete old photo if exists
                if ($currentPhoto) {
                    if (Storage::disk('public')->exists($currentPhoto)) {
                        Storage::disk('public')->delete($currentPhoto);
                    } elseif (file_exists(public_path('assets/images/profilefoto/'.$currentPhoto))) {
                        @unlink(public_path('assets/images/profilefoto/'.$currentPhoto));
                    }
                }

                $stored = ImageHelper::storeCompressedImageBinary($image_data, 'profile-photos', 'public', [
                    'source_mime' => $mimeType,
                    'max_width' => 1200,
                    'max_height' => 1200,
                    'quality' => 82,
                    'format' => 'webp',
                ]);

                if (empty($stored['path'])) {
                    if ($request->ajax() || $request->expectsJson()) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Gagal memproses gambar dari kamera.',
                        ], 500);
                    }
                    return redirect()->back()
                        ->withErrors(['foto_file' => 'Gagal memproses gambar dari kamera.'])
                        ->withInput();
                }

                $newPhoto = $stored['path'];
            }
            // Handle photo deletion
            elseif ($request->filled('foto_data') && $request->foto_data === 'delete') {
                if ($currentPhoto) {
                    if (Storage::disk('public')->exists($currentPhoto)) {
                        Storage::disk('public')->delete($currentPhoto);
                    } elseif (file_exists(public_path('assets/images/profilefoto/'.$currentPhoto))) {
                        @unlink(public_path('assets/images/profilefoto/'.$currentPhoto));
                    }
                }
                $newPhoto = null;
            }

            // Normalisasi jenis kelamin
            $jk = strtolower($request->jenis_kelamin);
            if (in_array($jk, ['l', 'laki-laki', 'laki laki', 'laki', 'laki-laki', 'laki-laki'])) {
                $jenis_kelamin = 'Laki-laki';
            } elseif (in_array($jk, ['p', 'perempuan', 'wanita'])) {
                $jenis_kelamin = 'Perempuan';
            } else {
                $jenis_kelamin = null;
            }

            // Update or create profile
            $profileData = [
                'no_hp' => $request->no_hp,
                'pekerjaan' => $request->pekerjaan,
                'instansi' => $request->instansi,
                'jabatan' => $request->jabatan,
                'province_id' => $request->province_id,
                'regency_id' => $request->regency_id,
                'district_id' => $request->district_id,
                'alamat' => $request->alamat,
                'jenis_kelamin' => $jenis_kelamin,
                'foto' => $newPhoto,
            ];

            if ($user->profile) {
                $user->profile->update($profileData);
            } else {
                $user->profile()->create($profileData);
            }

            DB::commit();

            // Return JSON response for AJAX requests (from modal)
            if ($request->ajax() || $request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Profil berhasil diperbarui',
                ]);
            }

            // Redirect ke halaman detail aktivitas jika activity_id ada, jika tidak ke halaman edit user
            if ($request->filled('activity_id')) {
                $activityId = $request->activity_id;

                return redirect()->route('activity.detail', ['activity' => $activityId])
                    ->with('success', 'Profil berhasil diperbarui');
            } else {
                return redirect()->route('users.edit', $user->id)
                    ->with('success', 'Profil berhasil diperbarui');
            }
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating user profile: '.$e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString(),
            ]);

            // Return JSON response for AJAX requests on error
            if ($request->ajax() || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Terjadi kesalahan: '.$e->getMessage(),
                ], 422);
            }

            return redirect()->back()
                ->withErrors(['error' => 'Terjadi kesalahan: '.$e->getMessage()])
                ->withInput();
        }
    }

    public function index()
    {
        if (auth()->user()->isAdmin() || auth()->user()->isSuperAdmin()) {
            return redirect()->action([UserManagementController::class, 'index']);
        }
        abort(403);
    }

    public function create()
    {
        return Inertia::render('Users/Create');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:8',
        ]);
        
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => bcrypt($data['password']),
            'role' => 'user',
        ]);
        
        return redirect()->route('users.index')->with('success', 'User created successfully.');
    }

    public function show(User $user)
    {
        return Inertia::render('Users/Show', compact('user'));
    }

    public function destroy(User $user)
    {
        if (auth()->user()->id === $user->id) {
            return back()->with('error', 'Cannot delete yourself.');
        }
        $user->delete();
        return back()->with('success', 'User deleted successfully.');
    }

    public function export(Request $request)
    {
        return redirect()->back()->with('success', 'Export functionality is not fully implemented yet.');
    }


}
