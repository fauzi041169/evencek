<?php

namespace App\Http\Controllers;

use App\Models\District;
use App\Models\Profile;
use App\Models\Province;
use App\Models\Regency;
use App\Models\User;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    public function index()
    {
        $user = Auth::user()->load(['profile.province', 'profile.regency', 'profile.district']);

        // Ambil semua langganan aktif maupun pending untuk ditampilkan di profil
        $subscriptions = $user->subscriptions()
            ->with('plan')
            ->whereIn('status', ['active', 'pending'])
            ->orderBy('created_at', 'desc')
            ->get();

        $provinces = Province::orderBy('name')->get();

        return Inertia::render('Profile/Show', [
            'user' => $user,
            'subscriptions' => $subscriptions,
            'provinces' => $provinces,
        ]);
    }

    public function show($user = null)
    {
        // Jika parameter user diberikan, gunakan itu, jika tidak gunakan user yang sedang login
        if ($user) {
            $user = User::with(['profile.province', 'profile.regency', 'profile.district'])->findOrFail($user);

            // Perbaiki otorisasi: izinkan admin dan superadmin melihat profil siapa pun
            if (! auth()->check() || (auth()->id() !== $user->id && ! (method_exists(auth()->user(), 'isAdmin') && auth()->user()->isAdmin()) && ! (method_exists(auth()->user(), 'isSuperAdmin') && auth()->user()->isSuperAdmin()))) {
                abort(403, 'Unauthorized action.');
            }
        } else {
            $user = auth()->user()->load(['profile.province', 'profile.regency', 'profile.district']);
        }
        // Ambil semua langganan aktif maupun pending untuk ditampilkan di profil
        $subscriptions = $user->subscriptions()
            ->with('plan')
            ->whereIn('status', ['active', 'pending'])
            ->orderBy('created_at', 'desc')
            ->get();

        $provinces = Province::orderBy('name')->get();

        return Inertia::render('Profile/Show', [
            'user' => $user,
            'subscriptions' => $subscriptions,
            'provinces' => $provinces,
        ]);
    }

    public function edit(Request $request, $id)
    {
        $user = User::with('profile')->findOrFail($id);

        // Perbaiki otorisasi: izinkan admin dan superadmin mengedit profil siapa pun
        if (! auth()->check() || (auth()->id() !== $user->id && ! (method_exists(auth()->user(), 'isAdmin') && auth()->user()->isAdmin()) && ! (method_exists(auth()->user(), 'isSuperAdmin') && auth()->user()->isSuperAdmin()))) {
            abort(403, 'Unauthorized action.');
        }

        $provinces = Province::orderBy('name')->get();
        $regencies = collect();
        $districts = collect();

        if ($user->profile) {
            if ($user->profile->province_id) {
                $regencies = Regency::where('province_id', $user->profile->province_id)->orderBy('name')->get();
            }
            if ($user->profile->regency_id) {
                $districts = District::where('regency_id', $user->profile->regency_id)->orderBy('name')->get();
            }
        }

        return Inertia::render('Profile/Edit', [
            'user' => $user,
            'provinces' => $provinces,
            'regencies' => $regencies,
            'districts' => $districts,
            'redirect_to' => $request->input('redirect_to'),
        ]);
    }

    public function update(Request $request, $id = null)
    {
        $id = $id ?? Auth::id();
        $user = User::findOrFail($id);

        if (! auth()->check() || (auth()->id() !== $user->id && ! (method_exists(auth()->user(), 'isAdmin') && auth()->user()->isAdmin()) && ! (method_exists(auth()->user(), 'isSuperAdmin') && auth()->user()->isSuperAdmin()))) {
            abort(403, 'Unauthorized action.');
        }

        try {
            // Sanitize region inputs to ensures they are null if empty/invalid string
            $cleanRegions = [];
            foreach (['province_id', 'regency_id', 'district_id'] as $key) {
                 if ($request->has($key)) {
                     $val = $request->input($key);
                     // Check for various empty/invalid states
                     if ($val === '' || $val === 'null' || $val === 'undefined' || is_null($val)) {
                         $cleanRegions[$key] = null;
                     }
                 }
            }
            if (!empty($cleanRegions)) {
                $request->merge($cleanRegions);
            }

            $request->validate([
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
                'cover_file' => 'nullable|image|mimes:jpeg,png,jpg|max:20480',
                'foto_data' => 'nullable|string',
                'jenis_kelamin' => 'nullable|string',
                'birth_place' => 'nullable|string|max:100',
                'birth_date' => 'nullable|date',
            ], [
                'name.required' => 'Nama harus diisi',
                'name.max' => 'Nama tidak boleh lebih dari 255 karakter',
                'email.required' => 'Email harus diisi',
                'email.email' => 'Format email tidak valid',
                'email.unique' => 'Email sudah terdaftar oleh user lain',
                'no_hp.max' => 'Nomor HP tidak boleh lebih dari 20 karakter',
                'nik.max' => 'NIK tidak boleh lebih dari 20 karakter',
                'pekerjaan.max' => 'Pekerjaan tidak boleh lebih dari 100 karakter',
                'instansi.max' => 'Instansi tidak boleh lebih dari 100 karakter',
                'jabatan.max' => 'Jabatan tidak boleh lebih dari 100 karakter',
                'province_id.exists' => 'Provinsi tidak valid',
                'regency_id.exists' => 'Kabupaten/Kota tidak valid',
                'district_id.exists' => 'Kecamatan tidak valid',
                'foto_file.image' => 'File harus berupa gambar',
                'foto_file.mimes' => 'Format gambar harus jpeg, png, atau jpg',
                'foto_file.max' => 'Ukuran gambar maksimal 20MB',
                'cover_file.image' => 'File sampul harus berupa gambar',
                'cover_file.mimes' => 'Format sampul harus jpeg, png, atau jpg',
                'cover_file.max' => 'Ukuran sampul maksimal 20MB',
                'birth_date.date' => 'Format tanggal lahir tidak valid',
            ]);

            $profile = $user->profile;
            $requiresPhoto = $request->boolean('require_photo');
            $existingPhoto = $profile ? trim((string) $profile->foto) : '';
            $hasExistingPhoto = $existingPhoto !== '' && $existingPhoto !== 'default-profile.png';
            $incomingDeletesPhoto = $request->foto_data === 'delete';
            $incomingHasPhoto = $request->hasFile('foto_file') || ($request->filled('foto_data') && $request->foto_data !== 'delete');

            if ($requiresPhoto) {
                if ($incomingDeletesPhoto) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Foto Profil wajib diunggah.',
                        'errors' => ['foto_file' => ['Foto Profil wajib diunggah.']],
                    ], 422);
                }

                if (! $hasExistingPhoto && ! $incomingHasPhoto) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Foto Profil wajib diunggah.',
                        'errors' => ['foto_file' => ['Foto Profil wajib diunggah.']],
                    ], 422);
                }
            }

            // Update user data including email if present
            $userData = [];
            if ($request->has('name')) {
                $userData['name'] = $request->name;
            }
            if ($request->has('email')) {
                $userData['email'] = $request->email;
            }

            if ($request->hasFile('cover_file')) {
                $request->validate([
                    'cover_file' => 'image|mimes:jpeg,png,jpg|max:20480',
                ]);
            }

            if (! empty($userData)) {
                $user->update($userData);
            }

            // Handle profile update
            $profileData = $request->only([
                'no_hp', 'nik', 'pekerjaan', 'instansi', 'jabatan', 'alamat',
                'birth_place', 'birth_date',
                'province_id', 'regency_id', 'district_id',
                'jenis_kelamin',
            ]);

            // Support aliases
            if ($request->has('tempat_lahir') && empty($profileData['birth_place'])) {
                $profileData['birth_place'] = $request->tempat_lahir;
            }
            if ($request->has('tgl_lahir') && empty($profileData['birth_date'])) {
                $profileData['birth_date'] = $request->tgl_lahir;
            }

            // Filter out null values to prevent overwriting existing data with null
            $profileData = array_filter($profileData, function ($value) {
                return $value !== null;
            });

            // Explicitly handle region fields if they are null in the request (clearing the selection)
            if ($request->has('province_id') && is_null($request->province_id)) {
                $profileData['province_id'] = null;
            }
            if ($request->has('regency_id') && is_null($request->regency_id)) {
                $profileData['regency_id'] = null;
            }
            if ($request->has('district_id') && is_null($request->district_id)) {
                $profileData['district_id'] = null;
            }

            // Handle Custom Fields (Additional Data)
            $standardFields = [
                'name', 'email', 'password', 'password_confirmation',
                'no_hp', 'nik', 'pekerjaan', 'instansi', 'jabatan', 'alamat',
                'birth_place', 'birth_date', 'tempat_lahir', 'tgl_lahir',
                'province_id', 'regency_id', 'district_id',
                'jenis_kelamin', 'foto_file', 'foto_data', 'cover_file', '_token', '_method',
            ];

            $allInput = $request->except($standardFields);
            $additionalData = array_filter($allInput, function ($value) {
                return ! is_null($value) && $value !== '';
            });

            if (! empty($additionalData)) {
                $existingAdditionalData = $profile->additional_data ?? [];
                if (! is_array($existingAdditionalData)) {
                    $existingAdditionalData = [];
                }
                $profileData['additional_data'] = array_merge($existingAdditionalData, $additionalData);
            }

            // Handle file upload
            if ($request->hasFile('foto_file')) {
                $foto = $request->file('foto_file');
                $path = $foto->store('profile-photos', 'public');
                if (! $profile) {
                    $profile = new Profile;
                    $profile->user_id = $user->id;
                }
                $profile->foto = $path;
            } elseif ($request->filled('foto_data') && $request->foto_data != 'delete') {
                $image_data = $request->foto_data;
                $image_array_1 = explode(';', $image_data);
                $image_array_2 = explode(',', $image_array_1[1]);
                $image_data = base64_decode($image_array_2[1]);

                $finfo = new \finfo(FILEINFO_MIME_TYPE);
                $mimeType = $finfo->buffer($image_data);
                
                if (!in_array($mimeType, ['image/jpeg', 'image/png', 'image/jpg'])) {
                     return redirect()->back()
                        ->withErrors(['foto_file' => 'Format gambar dari kamera tidak valid.'])
                        ->withInput();
                }

                $fotoName = 'profile-photos/'.time().'_'.uniqid().'.jpg';
                \Illuminate\Support\Facades\Storage::disk('public')->put($fotoName, $image_data);

                if (! $profile) {
                    $profile = new Profile;
                    $profile->user_id = $user->id;
                }
                $profile->foto = $fotoName;
            }

            if ($request->hasFile('cover_file')) {
                $cover = $request->file('cover_file');
                $path = $cover->store('profile-covers', 'public');
                if (! $profile) {
                    $profile = new Profile;
                    $profile->user_id = $user->id;
                }
                $profile->cover_image = $path;
            }

            if ($request->foto_data === 'delete') {
                if (! $profile) {
                    $profile = new Profile;
                    $profile->user_id = $user->id;
                }
                $profile->foto = null;
            }

            if (! $profile) {
                $profile = new Profile;
                $profile->user_id = $user->id;
            }

            $profile->fill($profileData);
            $profile->save();

            if ($request->wantsJson()) {
                return response()->json([
                    'status' => 'success',
                    'message' => 'Profile updated successfully.',
                    'user' => $user->load('profile'),
                ]);
            }

            if ($request->has('redirect_to') && $request->input('redirect_to')) {
                return redirect($request->input('redirect_to'))->with('success', 'Profile updated successfully.');
            }

            return redirect()->back()->with('success', 'Profile updated successfully.');
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Re-throw validation exceptions to let Laravel handle them (422)
            throw $e;
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Profile Update Critical Error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            
            if ($request->wantsJson()) {
                return response()->json([
                    'status' => 'error', 
                    'message' => 'Terjadi kesalahan server saat menyimpan profil: ' . $e->getMessage()
                ], 500);
            }
            
            return redirect()->back()
                ->withInput()
                ->with('error', 'Terjadi kesalahan sistem: ' . $e->getMessage());
        }
    }

    public function updatePhoto(Request $request)
    {
        if (! auth()->check()) {
            abort(403, 'Unauthorized action.');
        }

        $request->validate([
            'foto_file' => 'required|image|mimes:jpeg,png,jpg|max:20480',
        ], [
            'foto_file.required' => 'File foto harus dipilih',
            'foto_file.image' => 'File harus berupa gambar',
            'foto_file.mimes' => 'Format gambar harus jpeg, png, atau jpg',
            'foto_file.max' => 'Ukuran gambar maksimal 20MB',
        ]);

        $user = auth()->user();
        $profile = $user->profile;

        $foto = $request->file('foto_file');
        
        try {
            // Simpan menggunakan Storage facade
            $path = $foto->store('profile-photos', 'public');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('API Profile upload error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Gagal upload foto. Server error.',
                'error' => $e->getMessage()
            ], 500);
        }

        if (! $profile) {
            $profile = new \App\Models\Profile;
            $profile->user_id = $user->id;
        }

        // Model event will handle old file deletion (updating event)
        $profile->foto = $path;
        $profile->save();

        return response()->json([
            'success' => true,
            'foto_url' => $profile->foto_url,
            'message' => 'Foto berhasil diperbarui',
        ]);
    }

    // Ajax methods untuk dynamic select
    public function getProvinces()
    {
        try {
            $provinces = \App\Models\Province::orderBy('name')->get(['id', 'name']);
            return response()->json($provinces);
        } catch (\Exception $e) {
            \Log::error('Error fetching provinces: '.$e->getMessage());
            return response()->json(['error' => 'Failed to fetch provinces'], 500);
        }
    }

    public function getRegencies($provinceId)
    {
        try {
            \Log::info('Fetching regencies for province: '.$provinceId);

            $regencies = Regency::where('province_id', $provinceId)
                ->select('id', 'name')
                ->orderBy('name')
                ->get();

            if ($regencies->isEmpty()) {
                \Log::warning('No regencies found for province: '.$provinceId);

                return response()->json([]);
            }

            \Log::info('Found '.$regencies->count().' regencies');

            return response()->json($regencies);
        } catch (\Exception $e) {
            \Log::error('Error fetching regencies: '.$e->getMessage());

            return response()->json([]);
        }
    }

    public function getDistricts($regencyId)
    {
        try {
            \Log::info('Fetching districts for regency: '.$regencyId);

            $districts = District::where('regency_id', $regencyId)
                ->select('id', 'name')
                ->orderBy('name')
                ->get();

            if ($districts->isEmpty()) {
                \Log::warning('No districts found for regency: '.$regencyId);

                return response()->json([]);
            }

            \Log::info('Found '.$districts->count().' districts');

            return response()->json($districts);
        } catch (\Exception $e) {
            \Log::error('Error fetching districts: '.$e->getMessage());

            return response()->json([]);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'no_hp' => 'required|string|max:20',
            'pekerjaan' => 'required|string|max:100',
            'instansi' => 'required|string|max:100',
            'jabatan' => 'required|string|max:100',
            'alamat' => 'required|string',
            'province_id' => 'required|exists:provinces,id',
            'regency_id' => 'required|exists:regencies,id',
            'district_id' => 'required|exists:districts,id',
            'jenis_kelamin' => 'required|string',
            'foto' => 'nullable|image|max:20480',
        ]);

        $profile = Profile::create([
            'user_id' => auth()->id(),
            'no_hp' => $validated['no_hp'],
            'pekerjaan' => $validated['pekerjaan'],
            'jabatan' => $validated['jabatan'],
            'alamat' => $validated['alamat'],
            'province_id' => $validated['province_id'],
            'regency_id' => $validated['regency_id'],
            'district_id' => $validated['district_id'],
            'foto' => $request->hasFile('foto') ?
                $request->file('foto')->store('profile-photos', 'public') : null,
        ]);

        return redirect()->route('profile.show', auth()->id())
            ->with('success', 'Profile berhasil dibuat');
    }

    public function getProfilePhoto($userId)
    {
        $profile = Profile::where('user_id', $userId)->first();

        if ($profile && $profile->foto) {
            $path = storage_path('app/public/'.$profile->foto);

            if (file_exists($path)) {
                return response()->file($path);
            }
        }

        // Return default image if no profile photo found
        return response()->file(public_path('assets/images/profilefoto/default-profile.png'));
    }

    public function updatePassword(Request $request)
    {
        $user = auth()->user();
        $targetUserId = $request->input('user_id', $user->id);

        // Jika target berbeda dengan auth user, cek permission
        if ($targetUserId != $user->id) {
            // Hanya admin/superadmin yang boleh ganti password orang lain
            if (! ($user->isSuperAdmin() || $user->isAdmin())) {
                 abort(403, 'Unauthorized action.');
            }
            $user = User::findOrFail($targetUserId);
            
            // Validasi tanpa current_password
            $request->validate([
                'new_password' => ['required', 'min:8', 'confirmed'],
            ]);
        } else {
            // Ganti password sendiri butuh current_password
            $request->validate([
                'current_password' => ['required', 'current_password'],
                'new_password' => ['required', 'min:8', 'confirmed'],
            ]);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

        return redirect()->back()->with('success', 'Password berhasil diperbarui');
    }

    public function updateSubdomain(Request $request)
    {
        if (! auth()->check()) {
            abort(403, 'Unauthorized action.');
        }

        $user = auth()->user();
        if (! ($user->isCreator() || $user->isAdmin() || $user->isSuperAdmin())) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'subdomain' => [
                'nullable',
                'string',
                'min:3',
                'max:30',
                'regex:/^[a-z0-9-]+$/',
                'unique:users,subdomain,'.$user->id.',id',
            ],
            'creator_logo' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:20480',
        ]);

        $sub = $validated['subdomain'] ?? null;
        $sub = $sub ? strtolower($sub) : null;
        $reserved = ['www', 'admin', 'api', 'mail', 'eventcek', 'midtrans'];
        if ($sub && in_array($sub, $reserved, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Subdomain tidak tersedia',
            ], 422);
        }

        $user->subdomain = $sub;
        if ($request->hasFile('creator_logo')) {
            $file = $request->file('creator_logo');
            $name = time().'_'.$user->id.'.'.$file->getClientOriginalExtension();
            
            // Simpan ke storage (public disk)
            $path = $file->storeAs('subdomain_logos', $name, 'public');

            if ($user->subdomain_logo) {
                // Hapus file lama (support storage dan legacy path)
                if (str_contains($user->subdomain_logo, '/') || str_starts_with($user->subdomain_logo, 'subdomain_logos')) {
                    if (\Illuminate\Support\Facades\Storage::disk('public')->exists($user->subdomain_logo)) {
                        \Illuminate\Support\Facades\Storage::disk('public')->delete($user->subdomain_logo);
                    }
                } else {
                    // Legacy path fallback
                    $old = public_path('assets/images/creatorlogo/'.$user->subdomain_logo);
                    if (\Illuminate\Support\Facades\File::exists($old)) {
                        \Illuminate\Support\Facades\File::delete($old);
                    }
                }
            }
            $user->subdomain_logo = $path;
        }
        $user->save();

        $usePath = (bool) config('app.use_path_alias');
        $link = null;
        if ($sub) {
            $link = $usePath
                ? url('/'.$sub)
                : ('http://'.$sub.'.'.config('app.subdomain_host'));
        }

        return response()->json([
            'success' => true,
            'subdomain' => $sub,
            'link' => $link,
            'logo_url' => $user->subdomain_logo_url,
            'message' => 'Subdomain berhasil diperbarui',
        ]);
    }

    /**
     * Upgrade akun pengguna biasa menjadi creator (hanya untuk diri sendiri).
     */
    public function upgradeToCreator(Request $request)
    {
        if (! auth()->check()) {
            abort(403, 'Unauthorized action.');
        }

        $user = auth()->user();

        // Cegah upgrade jika admin/superadmin atau sudah creator
        if ($user->isAdmin() || $user->isSuperAdmin()) {
            return redirect()->route('profile.show', $user->id)
                ->with('error', 'Admin dan Superadmin tidak dapat mengubah role melalui fitur ini.');
        }

        if ($user->isCreator() || strtolower($user->role) === 'creator') {
            return redirect()->route('profile.show', $user->id)
                ->with('info', 'Anda sudah berstatus Creator.');
        }

        // Upgrade ke creator
        try {
            \DB::beginTransaction();

            $oldRole = $user->role;
            $user->role = 'creator';
            $user->save();

            \Log::info('User self-upgraded to creator', [
                'user_id' => $user->id,
                'name' => $user->name,
                'old_role' => $oldRole,
                'new_role' => $user->role,
            ]);

            \DB::commit();
        } catch (\Throwable $e) {
            \DB::rollBack();

            return redirect()->route('profile.show', $user->id)
                ->with('error', 'Terjadi kesalahan saat upgrade: '.$e->getMessage());
        }

        return redirect()->route('profile.show', $user->id)
            ->with('success', 'Selamat! Akun Anda telah diupgrade menjadi Creator.');
    }
}
