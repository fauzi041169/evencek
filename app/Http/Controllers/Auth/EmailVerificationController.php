<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EmailVerificationController extends Controller
{
    /**
     * Verify email dengan token
     */
    public function verify(Request $request, $token)
    {
        $email = $request->get('email');

        if (! $email || ! $token) {
            return redirect()->route('login')->withErrors([
                'login' => 'Link verifikasi tidak valid.',
            ]);
        }

        $user = User::where('email', $email)
            ->where('email_verification_token', $token)
            ->first();

        if (! $user) {
            return redirect()->route('login')->withErrors([
                'login' => 'Link verifikasi tidak valid atau sudah kadaluarsa. Silakan daftar ulang atau hubungi administrator.',
            ]);
        }

        // Cek apakah sudah diverifikasi sebelumnya
        if ($user->email_verified_at) {
            return redirect()->route('login')->with('success', 'Email Anda sudah diverifikasi sebelumnya. Silakan login.');
        }

        // Verifikasi email
        $user->email_verified_at = now();
        $user->email_verification_token = null;
        $user->save();
        \App\Models\ActivityUser::where('user_id', $user->id)
            ->where('status', \App\Models\ActivityUser::STATUS_VERIFICATION)
            ->update(['status' => \App\Models\ActivityUser::STATUS_ACTIVE]);

        // Auto login setelah verifikasi
        \Auth::login($user);

        return redirect()->route('home')->with('success', 'Email berhasil diverifikasi! Akun Anda telah aktif. Selamat datang!');
    }

    /**
     * Resend verification email
     */
    public function resend(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
        ], [
            'email.required' => 'Email harus diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.exists' => 'Email tidak ditemukan dalam sistem.',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user) {
            return back()->withErrors(['email' => 'Email tidak ditemukan.']);
        }

        // Cek apakah sudah diverifikasi
        if ($user->email_verified_at) {
            return back()->with('success', 'Email Anda sudah diverifikasi. Silakan login.');
        }

        // Generate token baru
        $token = Str::random(64);
        $user->email_verification_token = $token;
        $user->save();

        // Kirim email verifikasi
        \Mail::to($user->email)->send(new \App\Mail\VerifyEmailMail($user, $token));

        return back()->with('success', 'Email verifikasi telah dikirim ulang ke '.$user->email.'. Silakan cek inbox email Anda.');
    }

    /**
     * Verify email menggunakan signed URL (lebih kuat)
     */
    public function verifySigned(Request $request)
    {
        // Middleware 'signed' sudah memvalidasi signature, lakukan pemeriksaan tambahan
        if (! $request->hasValidSignature()) {
            return redirect()->route('login')->withErrors([
                'login' => 'Link verifikasi tidak valid atau telah berubah.',
            ]);
        }

        $email = $request->get('email');
        $token = $request->get('token');

        if (! $email || ! $token) {
            return redirect()->route('login')->withErrors([
                'login' => 'Link verifikasi tidak lengkap.',
            ]);
        }

        $user = User::where('email', $email)
            ->where('email_verification_token', $token)
            ->first();

        if (! $user) {
            return redirect()->route('login')->withErrors([
                'login' => 'Link verifikasi tidak valid atau sudah kadaluarsa.',
            ]);
        }

        if ($user->email_verified_at) {
            return redirect()->route('login')->with('success', 'Email Anda sudah diverifikasi sebelumnya. Silakan login.');
        }

        // Verifikasi email
        $user->email_verified_at = now();
        $user->email_verification_token = null;
        $user->save();
        \App\Models\ActivityUser::where('user_id', $user->id)
            ->where('status', \App\Models\ActivityUser::STATUS_VERIFICATION)
            ->update(['status' => \App\Models\ActivityUser::STATUS_ACTIVE]);

        \Auth::login($user);

        return redirect()->route('home')->with('success', 'Email berhasil diverifikasi! Akun Anda telah aktif. Selamat datang!');
    }
}
