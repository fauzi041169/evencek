<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\ResetPasswordMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;

class ForgotPasswordController extends Controller
{
    public function showLinkRequestForm()
    {
        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
            'hp_time' => time(),
        ]);
    }

    public function sendResetLinkEmail(Request $request)
    {
        // Honeypot: jika field tersembunyi terisi atau pengiriman terlalu cepat, kembalikan pesan umum
        $hpField = (string) $request->input('hp_field', '');
        $hpTime = (int) $request->input('hp_time', 0);
        if ($hpField !== '' || ($hpTime > 0 && (time() - $hpTime) < 3)) {
            \Log::warning('Honeypot triggered', [
                'hp_field' => $hpField,
                'hp_time' => $hpTime,
                'current_time' => time(),
                'diff' => time() - $hpTime,
                'email' => $request->email
            ]);
            return redirect()->route('login')
                ->with('status', 'Jika email yang Anda masukkan terdaftar, kami akan mengirimkan link reset password ke email Anda.');
        }

        $request->validate([
            'email' => 'required|email',
        ], [
            'email.required' => 'Email harus diisi.',
            'email.email' => 'Format email tidak valid.',
        ]);

        // Cari user berdasarkan email saja
        $user = User::where('email', $request->email)->first();

        if (! $user) {
            // Untuk keamanan, jangan beri tahu apakah email ada atau tidak
            // Tetap kirim response sukses untuk mencegah email enumeration
            return redirect()->route('login')
                ->with('status', 'Jika email yang Anda masukkan terdaftar, kami akan mengirimkan link reset password ke email Anda.');
        }

        // Generate password reset token
        $token = Password::createToken($user);

        // Send reset password email
        try {
            Mail::to($user->email)->send(new ResetPasswordMail($user, $token));

            \Log::info('Password reset email sent', [
                'user_id' => $user->id,
                'email' => $user->email,
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to send password reset email', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);

            return back()->withErrors(['email' => 'Gagal mengirim email. Silakan coba lagi atau hubungi administrator.']);
        }

        // Untuk keamanan, jangan beri tahu apakah email ada atau tidak
        // Setelah sukses, arahkan kembali ke halaman login
        return redirect()->route('login')
            ->with('status', 'Jika email yang Anda masukkan terdaftar, kami akan mengirimkan link reset password ke email Anda.');
    }
}
