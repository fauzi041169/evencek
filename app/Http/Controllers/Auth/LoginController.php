<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use GuzzleHttp\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Facades\Socialite;
use Inertia\Inertia;

class LoginController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('guest')->except(['logout', 'redirectToGoogle', 'handleGoogleCallback']);
    }

    public function index()
    {
        return redirect()->route('home', ['login' => 'true']);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'login' => 'required', // email saja
            'password' => 'required',
        ]);

        // Jika ada parameter redirect dari form, set sebagai intended
        if ($request->filled('redirect')) {
            try {
                $redirectTarget = urldecode($request->input('redirect'));
                $appHost = $request->getSchemeAndHttpHost();
                if (str_starts_with($redirectTarget, $appHost) || str_starts_with($redirectTarget, '/')) {
                    $request->session()->put('url.intended', $redirectTarget);
                }
            } catch (\Throwable $e) {
                \Log::warning('Failed to set intended from login form', ['error' => $e->getMessage()]);
            }
        }

        $loginInput = $credentials['login'];
        $password = $credentials['password'];

        // Hanya dukung login via email
        if (filter_var($loginInput, FILTER_VALIDATE_EMAIL)) {
            // Cari user berdasarkan email di tabel users
            $user = User::where('email', $loginInput)->first();

            if ($user) {
                // Cek apakah email sudah diverifikasi (kecuali untuk user yang login dengan Google)
                if (! $user->email_verified_at && ! $user->google_id) {
                    // Jika Request adalah AJAX/API murni dan BUKAN Inertia
                    if (($request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest') && ! $request->header('X-Inertia')) {
                        return response()->json([
                            'errors' => [
                                'login' => ['Email Anda belum diverifikasi. Silakan cek email Anda untuk link verifikasi atau klik resend di halaman login.'],
                            ],
                        ], 422);
                    }

                    // Untuk Inertia atau standard request, gunakan back() with errors
                    return back()->withErrors([
                        'login' => 'Email Anda belum diverifikasi. Silakan cek email Anda untuk link verifikasi atau klik resend di halaman login.',
                    ])->onlyInput('login');
                }

                // Login menggunakan email dan password
                if (\Auth::attempt(['email' => $loginInput, 'password' => $password])) {
                    $request->session()->regenerate();
                    // Set last activity
                    session(['last_activity' => time()]);
                    // Update last_login_at
                    \Auth::user()->update(['last_login_at' => now()]);

                    // Jika AJAX request (bukan Inertia), return JSON dengan redirect URL
                    if (($request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest') && ! $request->header('X-Inertia')) {
                        $redirectUrl = $request->input('redirect');
                        if ($redirectUrl && (str_starts_with($redirectUrl, $request->getSchemeAndHttpHost()) || str_starts_with($redirectUrl, '/'))) {
                            return response()->json([
                                'success' => true,
                                'redirect' => urldecode($redirectUrl),
                            ]);
                        }

                        return response()->json([
                            'success' => true,
                            'redirect' => route('dashboard.index'),
                        ]);
                    }

                    if ($request->filled('redirect')) {
                        $redirectTarget = urldecode($request->input('redirect'));
                        $appHost = $request->getSchemeAndHttpHost();
                        if (str_starts_with($redirectTarget, $appHost) || str_starts_with($redirectTarget, '/')) {
                            return redirect()->to($redirectTarget);
                        }
                    }

                    if ($request->session()->has('post_login_redirect')) {
                        $target = $request->session()->pull('post_login_redirect');
                        if ($target && (str_starts_with($target, $request->getSchemeAndHttpHost()) || str_starts_with($target, '/'))) {
                            return redirect()->to($target);
                        }
                    }

                    return redirect()->intended($request->session()->get('url.intended', 'dashboard'));
                }
            }
        }
        // Log percobaan login gagal tanpa membocorkan detail ke pengguna
        try {
            $exists = User::where('email', $loginInput)->exists();

            \Log::warning('Login attempt failed', [
                'input_type' => 'email',
                'input' => (string) $loginInput,
                'exists' => $exists,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        } catch (\Exception $e) {
            // Silence logging failures to avoid debug noise
        }

        // Jika AJAX request (bukan Inertia), return JSON error
        if (($request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest') && ! $request->header('X-Inertia')) {
            return response()->json([
                'errors' => [
                    'login' => ['Email atau Password salah.'],
                ],
            ], 422);
        }

        return back()->withErrors([
            'login' => 'Email atau Password salah.',
        ])->onlyInput('login');
    }

    // Tambahkan method berikut untuk Google OAuth
    public function redirectToGoogle(Request $request)
    {
        // Tangkap parameter redirect (jika ada) agar setelah login kembali ke halaman asal
        if ($request->filled('redirect')) {
            try {
                $redirectTarget = urldecode($request->input('redirect'));
                // Validasi sederhana untuk mencegah open redirect ke domain lain
                $appHost = $request->getSchemeAndHttpHost();
                if (str_starts_with($redirectTarget, $appHost) || str_starts_with($redirectTarget, '/')) {
                    // Simpan sebagai intended URL dan fallback custom
                    $request->session()->put('url.intended', $redirectTarget);
                    $request->session()->put('post_login_redirect', $redirectTarget);
                }
            } catch (\Throwable $e) {
                // Abaikan jika terjadi kesalahan parsing redirect
                \Log::warning('Failed to store post_login_redirect', ['error' => $e->getMessage()]);
            }
        }
        // Jika user sudah login, redirect ke dashboard sesuai peran
        if (Auth::check()) {
            $user = Auth::user();
            if ($user->role === 'admin' || $user->role === 'superadmin') {
                return redirect()->route('dashboard.admin');
            }
            // User/guest diarahkan langsung ke Dashboard "Aktivitas Saya"
            if (in_array($user->role, ['user', 'guest'])) {
                return redirect()->route('dashboard.user');
            }

            // Creator tetap ke dashboard umum (index) yang menampilkan statistik aktivitasnya
            return redirect()->route('dashboard.index');
        }

        // Validasi Google OAuth credentials
        if (empty(config('services.google.client_id')) || empty(config('services.google.client_secret'))) {
            \Log::error('Google OAuth credentials tidak ditemukan');

            return redirect()->route('login')->withErrors([
                'login' => 'Konfigurasi Google OAuth belum lengkap. Silakan hubungi administrator.',
            ]);
        }

        // Konfigurasi HTTP client untuk development (nonaktifkan SSL verification hanya di local)
        $client = null;
        if (app()->environment('local') || in_array($request->getHost(), ['127.0.0.1', 'localhost'])) {
            // Hanya disable SSL verification di local development
            $client = new Client([
                'verify' => false,
            ]);
        }

        // Auto detect redirect URI dari request (otomatis untuk local dan production)
        // Menggunakan getSchemeAndHttpHost() untuk mendukung http di local dan https di production
        $redirectUri = $request->getSchemeAndHttpHost().'/auth/google/callback';

        // Override redirect URI di config dengan yang dari request
        config(['services.google.redirect' => $redirectUri]);

        \Log::info('Google OAuth redirect initiated', [
            'redirect_uri' => $redirectUri,
            'environment' => app()->environment(),
            'client_id' => substr(config('services.google.client_id'), 0, 20).'...',
        ]);

        $socialite = Socialite::driver('google')
            ->stateless()
            ->redirectUrl($redirectUri);

        if ($client) {
            $socialite->setHttpClient($client);
        }

        return $socialite->redirect();
    }

    public function handleGoogleCallback(Request $request)
    {
        try {
            // Validasi Google OAuth credentials
            if (empty(config('services.google.client_id')) || empty(config('services.google.client_secret'))) {
                \Log::error('Google OAuth credentials tidak ditemukan di callback');

                return redirect()->route('login')->withErrors([
                    'login' => 'Konfigurasi Google OAuth belum lengkap. Silakan hubungi administrator.',
                ]);
            }

            // Konfigurasi HTTP client untuk development (nonaktifkan SSL verification hanya di local)
            $client = null;
            if (app()->environment('local') || in_array($request->getHost(), ['127.0.0.1', 'localhost'])) {
                // Hanya disable SSL verification di local development
                $client = new Client([
                    'verify' => false,
                ]);
            }

            // Auto detect redirect URI dari request (otomatis untuk local dan production)
            // Menggunakan getSchemeAndHttpHost() untuk mendukung http di local dan https di production
            $redirectUri = $request->getSchemeAndHttpHost().'/auth/google/callback';

            // Override redirect URI di config dengan yang dari request
            config(['services.google.redirect' => $redirectUri]);

            \Log::info('Google OAuth callback received', [
                'redirect_uri' => $redirectUri,
                'environment' => app()->environment(),
                'request_url' => $request->fullUrl(),
                'has_code' => $request->has('code'),
                'has_error' => $request->has('error'),
            ]);

            // Cek jika ada error dari Google
            if ($request->has('error')) {
                $error = $request->get('error');
                \Log::warning('Google OAuth error received', ['error' => $error]);

                return redirect()->route('login')->withErrors([
                    'login' => 'Gagal login dengan Google: '.($error === 'access_denied' ? 'Akses ditolak' : $error),
                ]);
            }

            // Ambil data user dari Google
            $socialite = Socialite::driver('google')
                ->stateless()
                ->redirectUrl($redirectUri);

            if ($client) {
                $socialite->setHttpClient($client);
            }

            $googleUser = $socialite->user();

            // Cari user berdasarkan google_id dulu
            $user = User::where('google_id', $googleUser->getId())->first();

            // Jika tidak ada dengan google_id, cari berdasarkan email
            if (! $user) {
                $user = User::where('email', $googleUser->getEmail())->first();
            }

            if (! $user) {
                // Validasi data dari Google
                $email = $googleUser->getEmail();
                $name = $googleUser->getName() ?: 'User';
                $googleId = $googleUser->getId();

                if (! $email) {
                    throw new \Exception('Email tidak ditemukan dari akun Google Anda.');
                }

                // Buat user baru jika belum ada (register otomatis)
                $user = User::create([
                    'name' => $name,
                    'email' => $email,
                    'google_id' => $googleId,
                    'avatar' => $googleUser->getAvatar(),
                    'password' => Hash::make(uniqid().time()), // password random yang lebih unik
                    'role' => 'user',
                    'email_verified_at' => now(), // Email sudah diverifikasi oleh Google
                    'email_verification_token' => null, // Tidak perlu token karena sudah verified
                ]);

                // Buat profile kosong jika belum ada
                $user->load('profile');
                if (! $user->profile) {
                    $user->profile()->create([]);
                }
            } else {
                // Update google_id dan avatar jika belum ada atau berbeda
                $updateData = [];

                if (! $user->google_id) {
                    $updateData['google_id'] = $googleUser->getId();
                }

                if ($googleUser->getAvatar() && (! $user->avatar || $user->avatar !== $googleUser->getAvatar())) {
                    $updateData['avatar'] = $googleUser->getAvatar();
                }

                // Update name jika berbeda
                if ($googleUser->getName() && $user->name !== $googleUser->getName()) {
                    $updateData['name'] = $googleUser->getName();
                }

                if (! empty($updateData)) {
                    $user->update($updateData);
                }

                // Pastikan profile ada
                $user->load('profile');
                if (! $user->profile) {
                    $user->profile()->create([]);
                }
            }

            // Login user dengan remember me
            Auth::login($user, true);

            // Regenerate session untuk keamanan setelah login
            $request->session()->regenerate();

            // Set last activity
            $request->session()->put('last_activity', time());

            // Update last_login_at
            $user->update(['last_login_at' => now()]);

            // Pastikan session tersimpan sebelum redirect
            $request->session()->save();

            // Refresh user data dari database untuk memastikan data terbaru
            $user->refresh();

            // Redirect berdasarkan role dengan menggunakan intended untuk fallback yang lebih baik
            // Pesan sukses berbeda untuk login atau register
            $message = $user->wasRecentlyCreated
                ? 'Selamat datang! Akun Anda berhasil dibuat dan Anda sudah login dengan Google.'
                : 'Selamat datang kembali! Anda berhasil login dengan Google.';

            // Jika ada post_login_redirect di session, arahkan ke sana terlebih dahulu
            if ($request->session()->has('post_login_redirect')) {
                $target = $request->session()->pull('post_login_redirect'); // ambil sekaligus hapus
                if ($target && (str_starts_with($target, $request->getSchemeAndHttpHost()) || str_starts_with($target, '/'))) {
                    return redirect()->to($target)->with('success', $message);
                }
            }

            if ($user->role === 'admin' || $user->role === 'superadmin') {
                return redirect()->intended(route('dashboard.admin'))
                    ->with('success', $message);
            }

            // User/guest langsung ke Dashboard "Aktivitas Saya"
            if (in_array($user->role, ['user', 'guest'])) {
                return redirect()->intended(route('dashboard.user'))
                    ->with('success', $message);
            }

            // Creator ke dashboard index (statistik aktivitas buatan mereka)
            return redirect()->intended(route('dashboard.index'))
                ->with('success', $message);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            \Log::error('Google OAuth connection error', [
                'message' => $e->getMessage(),
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString(),
                'environment' => app()->environment(),
                'redirect_uri' => $request->getSchemeAndHttpHost().'/auth/google/callback',
            ]);

            return redirect()->route('login')->withErrors([
                'login' => 'Gagal terhubung ke Google. Pastikan koneksi internet Anda stabil dan coba lagi.',
            ]);
        } catch (\Laravel\Socialite\Two\InvalidStateException $e) {
            \Log::warning('Google OAuth invalid state error', [
                'message' => $e->getMessage(),
                'request_url' => $request->fullUrl(),
                'redirect_uri' => $request->getSchemeAndHttpHost().'/auth/google/callback',
            ]);

            return redirect()->route('login')->withErrors([
                'login' => 'Sesi login telah berakhir. Silakan coba login dengan Google lagi.',
            ]);
        } catch (\Exception $e) {
            $errorMessage = $e->getMessage();
            $logContext = [
                'message' => $errorMessage,
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString(),
                'request_url' => $request->fullUrl(),
                'redirect_uri' => $request->getSchemeAndHttpHost().'/auth/google/callback',
                'environment' => app()->environment(),
                'has_code' => $request->has('code'),
                'has_error' => $request->has('error'),
                'error_param' => $request->get('error'),
                'client_id_set' => ! empty(config('services.google.client_id')),
                'client_secret_set' => ! empty(config('services.google.client_secret')),
            ];

            \Log::error('Google login error', $logContext);

            // Pesan error yang lebih user-friendly
            $userFriendlyMessage = 'Gagal login dengan Google.';

            if (strpos($errorMessage, 'redirect_uri_mismatch') !== false) {
                $userFriendlyMessage .= ' Redirect URI tidak sesuai dengan yang terdaftar di Google Console.';
                $userFriendlyMessage .= ' Pastikan redirect URI di Google Console sudah dikonfigurasi: '.$logContext['redirect_uri'];
            } elseif (strpos($errorMessage, 'invalid_client') !== false) {
                $userFriendlyMessage .= ' Client ID atau Client Secret tidak valid.';
            } elseif (strpos($errorMessage, 'invalid_grant') !== false) {
                $userFriendlyMessage .= ' Kode autentikasi tidak valid atau sudah digunakan.';
            } elseif (strpos($errorMessage, 'access_denied') !== false) {
                $userFriendlyMessage .= ' Akses ditolak. Silakan coba lagi.';
            } elseif (app()->environment('local')) {
                // Di local, tampilkan error lebih detail untuk debugging
                $userFriendlyMessage .= ' Error: '.substr($errorMessage, 0, 100);
            }

            return redirect()->route('login')->withErrors(['login' => $userFriendlyMessage]);
        }
    }

    /**
     * Logout user and clear all session data
     */
    public function logout(Request $request)
    {
        // Log logout activity
        if (Auth::check()) {
            \Log::info('User logged out', [
                'user_id' => Auth::id(),
                'user_name' => Auth::user()->name,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        }

        // Logout user
        Auth::logout();

        // Invalidate session
        $request->session()->invalidate();

        // Regenerate CSRF token
        $request->session()->regenerateToken();

        // Clear any remember me cookies
        $request->session()->forget('remember_web');

        // Clear any cached user data
        if ($request->hasCookie('laravel_session')) {
            $cookie = \Cookie::forget('laravel_session');

            return redirect('/')->withCookie($cookie);
        }

        // Flash success message to the new session
        session()->flash('success', 'Anda berhasil logout.');
        
        // Force hard reload to update CSRF token
        return Inertia::location('/');
    }
}
