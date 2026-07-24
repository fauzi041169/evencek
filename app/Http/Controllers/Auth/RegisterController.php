<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class RegisterController extends Controller
{
    public function store(Request $request)
    {
        // Honeypot sederhana: blokir jika field tersembunyi terisi atau submit terlalu cepat (<3 detik)
        $hpField = (string) $request->input('hp_field', '');
        $hpTime = (int) $request->input('hp_time', 0);
        if ($hpField !== '' || ($hpTime > 0 && (time() - $hpTime) < 3)) {
            return redirect()->back()
                ->withInput($request->except(['password', 'password_confirmation']))
                ->with('error', 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.');
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:2|max:255|regex:/^[a-zA-Z\s]+$/',
            'email' => 'required|email|max:255|unique:users|regex:/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/',
            'password' => 'required|string|min:8|max:255|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/',
            'password_confirmation' => 'required|same:password',
            'role' => 'required|in:user,creator',
        ], [
            'name.required' => 'Nama harus diisi',
            'name.string' => 'Nama harus berupa teks',
            'name.min' => 'Nama minimal 2 karakter',
            'name.max' => 'Nama tidak boleh lebih dari 255 karakter',
            'name.regex' => 'Nama hanya boleh berisi huruf dan spasi',

            'email.required' => 'Email harus diisi',
            'email.email' => 'Format email tidak valid',
            'email.max' => 'Email tidak boleh lebih dari 255 karakter',
            'email.unique' => 'Email sudah terdaftar dalam sistem',
            'email.regex' => 'Format email tidak sesuai standar',

            'password.required' => 'Password harus diisi',
            'password.string' => 'Password harus berupa teks',
            'password.min' => 'Password minimal 8 karakter',
            'password.max' => 'Password tidak boleh lebih dari 255 karakter',
            'password.regex' => 'Password harus mengandung huruf besar, huruf kecil, angka, dan simbol',

            'password_confirmation.required' => 'Konfirmasi password harus diisi',
            'password_confirmation.same' => 'Konfirmasi password tidak cocok dengan password',

            'role.required' => 'Pilih peran Anda (User atau Creator)',
            'role.in' => 'Peran yang dipilih tidak valid',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput($request->except(['password', 'password_confirmation']))
                ->with('error', 'Mohon perbaiki kesalahan berikut:');
        }

        try {
            // Validasi tambahan untuk email
            if (! filter_var($request->email, FILTER_VALIDATE_EMAIL)) {
                return redirect()->back()
                    ->withErrors(['email' => 'Format email tidak valid'])
                    ->withInput($request->except(['password', 'password_confirmation']))
                    ->with('error', 'Mohon perbaiki kesalahan berikut:');
            }

            // Validasi tambahan untuk password
            if (strlen($request->password) < 8) {
                return redirect()->back()
                    ->withErrors(['password' => 'Password minimal 8 karakter'])
                    ->withInput($request->except(['password', 'password_confirmation']))
                    ->with('error', 'Mohon perbaiki kesalahan berikut:');
            }

            // Validasi kompleksitas tambahan (huruf besar, huruf kecil, angka, simbol)
            $hasUpper = preg_match('/[A-Z]/', $request->password);
            $hasLower = preg_match('/[a-z]/', $request->password);
            $hasDigit = preg_match('/\d/', $request->password);
            $hasSymbol = preg_match('/[^A-Za-z\d]/', $request->password);
            if (! $hasUpper || ! $hasLower || ! $hasDigit || ! $hasSymbol) {
                return redirect()->back()
                    ->withErrors(['password' => 'Password harus mengandung huruf besar, huruf kecil, angka, dan simbol'])
                    ->withInput($request->except(['password', 'password_confirmation']))
                    ->with('error', 'Mohon perbaiki kesalahan berikut:');
            }

            // Cek apakah password dan konfirmasi password sama
            if ($request->password !== $request->password_confirmation) {
                return redirect()->back()
                    ->withErrors(['password_confirmation' => 'Konfirmasi password tidak cocok'])
                    ->withInput($request->except(['password', 'password_confirmation']))
                    ->with('error', 'Mohon perbaiki kesalahan berikut:');
            }

            $validatedData = $validator->validated();
            $validatedData['password'] = Hash::make($validatedData['password']);
            unset($validatedData['password_confirmation']);

            // Pastikan role selalu diambil dari request dan disimpan
            // Ambil langsung dari request input karena validator mungkin tidak menyertakan role
            $role = $request->input('role');

            // Jika tidak ada, cek di validated data
            if (empty($role) && isset($validatedData['role'])) {
                $role = $validatedData['role'];
            }

            // Jika masih tidak ada, cek di request all
            if (empty($role)) {
                $allRequest = $request->all();
                $role = $allRequest['role'] ?? null;
            }

            // Jika masih kosong, ambil dari request->get atau request->post
            if (empty($role)) {
                $role = $request->get('role') ?? $request->post('role') ?? null;
            }

            // Debug: Log role yang diterima
            \Log::info('Registration role check', [
                'request_role' => $role,
                'request_input_role' => $request->input('role'),
                'request_get_role' => $request->get('role'),
                'request_post_role' => $request->post('role'),
                'request_all' => $request->all(),
                'validated_data_role' => $validatedData['role'] ?? 'not set',
            ]);

            // Pastikan role valid (double check)
            if (empty($role) || ! in_array($role, ['user', 'creator'])) {
                \Log::warning('Invalid role detected, defaulting to user', [
                    'role' => $role,
                    'role_type' => gettype($role),
                    'request_all_keys' => array_keys($request->all()),
                ]);
                $role = 'user';
            }

            // Pastikan role disertakan dalam data yang akan disimpan
            $validatedData['role'] = $role;

            // Generate token untuk verifikasi email
            $emailVerificationToken = \Illuminate\Support\Str::random(64);

            // Create user dengan role yang sudah dipastikan
            // Gunakan User::create untuk memanfaatkan HasCustomUid trait
            $user = User::create([
                'name' => $validatedData['name'],
                'email' => $validatedData['email'],
                'password' => $validatedData['password'],
            ]);
            $user->forceFill([
                'role' => $role,
                'email_verification_token' => $emailVerificationToken,
                'email_verified_at' => null,
            ])->save();

            $userId = $user->id;

            // Ambil user dari database (sudah ada di $user)
            // $user = User::find($userId);

            // Verifikasi role tersimpan dengan benar
            $user->refresh(); // Refresh dari database untuk memastikan

            // Debug: Log hasil penyimpanan
            \Log::info('User created', [
                'user_id' => $user->id,
                'email' => $user->email,
                'intended_role' => $role,
                'saved_role' => $user->role,
                'fresh_role' => $user->fresh()->role,
                'direct_db_role' => DB::table('users')->where('id', $user->id)->value('role'),
            ]);

            // Double check: jika role masih tidak sesuai, update langsung dengan DB::table
            $dbRole = DB::table('users')->where('id', $user->id)->value('role');
            if ($dbRole !== $role) {
                \Log::error('Role mismatch detected, fixing with DB::table...', [
                    'intended' => $role,
                    'saved_via_model' => $user->role,
                    'saved_via_db' => $dbRole,
                ]);
                DB::table('users')->where('id', $user->id)->update(['role' => $role]);
                $user->refresh();
            }

            // Buat profile kosong jika belum ada
            $user->load('profile');
            if (! $user->profile) {
                $user->profile()->create([]);
            }

            // Kirim email verifikasi
            try {
                \Mail::to($user->email)->send(new \App\Mail\VerifyEmailMail($user, $emailVerificationToken));
                \Log::info('Verification email sent', ['user_id' => $user->id, 'email' => $user->email]);
            } catch (\Exception $e) {
                \Log::error('Failed to send verification email', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'error' => $e->getMessage(),
                ]);
            }

            // TIDAK login otomatis - user harus verifikasi email dulu
            // Redirect ke halaman login dengan pesan
            return redirect()->route('home', ['login' => 'true'])->with('success', 'Registrasi berhasil! Silakan cek email Anda untuk verifikasi akun. Setelah verifikasi, Anda dapat login.');

        } catch (\Illuminate\Database\QueryException $e) {
            // Handle database errors
            if ($e->getCode() == 23000) { // Duplicate entry
                if (strpos($e->getMessage(), 'users_email_unique') !== false) {
                    return redirect()->route('home', ['register' => 'true'])
                        ->withErrors(['email' => 'Email sudah terdaftar dalam sistem'])
                        ->withInput($request->except(['password', 'password_confirmation']))
                        ->with('error', 'Mohon perbaiki kesalahan berikut:');
                }
            }

            return redirect()->route('home', ['register' => 'true'])
                ->withInput($request->except(['password', 'password_confirmation']))
                ->with('error', 'Terjadi kesalahan pada database. Silakan coba lagi atau hubungi administrator.');

        } catch (\Exception $e) {
            return redirect()->route('home', ['register' => 'true'])
                ->withInput($request->except(['password', 'password_confirmation']))
                ->with('error', 'Terjadi kesalahan saat mendaftar. Silakan coba lagi atau hubungi administrator.');
        }
    }

    public function showRegistrationForm()
    {
        return redirect()->route('home', ['register' => 'true']);
    }

    protected function create(array $data)
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);
        $user->forceFill(['role' => 'user'])->save();

        // Buat profile kosong
        $user->profile()->create([]);

        return $user;
    }
}
