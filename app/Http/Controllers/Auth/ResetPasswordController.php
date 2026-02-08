<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;

class ResetPasswordController extends Controller
{
    public function showResetForm(Request $request, $token)
    {
        return Inertia::render('Auth/ResetPassword', [
            'token' => $token,
            'email' => $request->email,
        ]);
    }

    public function reset(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|string|min:8|max:255|confirmed|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).+$/',
        ], [
            'token.required' => 'Token reset password diperlukan.',
            'email.required' => 'Email harus diisi.',
            'email.email' => 'Format email tidak valid.',
            'password.required' => 'Password baru harus diisi.',
            'password.string' => 'Password harus berupa teks.',
            'password.min' => 'Password minimal 8 karakter.',
            'password.max' => 'Password tidak boleh lebih dari 255 karakter.',
            'password.confirmed' => 'Konfirmasi password tidak cocok.',
            'password.regex' => 'Password harus mengandung huruf besar, huruf kecil, angka, dan simbol.',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user) {
            return back()->withErrors(['email' => 'Email tidak ditemukan.']);
        }

        try {
            if (! Password::tokenExists($user, $request->token)) {
                return back()->withErrors(['email' => 'Token reset password tidak valid atau telah kadaluarsa. Silakan request reset password baru.']);
            }
        } catch (\Throwable $e) {
            \Log::error('Failed to verify password reset token', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);
            return back()->withErrors(['email' => 'Sistem reset password sedang bermasalah. Silakan coba lagi nanti atau hubungi administrator.']);
        }

        // Update password
        $user->password = Hash::make($request->password);
        $user->save();

        try {
            Password::deleteToken($user);
        } catch (\Throwable $e) {
            \Log::warning('Failed to delete password reset token after reset', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);
        }

        \Log::info('Password reset successful', [
            'user_id' => $user->id,
            'email' => $user->email,
        ]);

        return redirect()->route('login')->with('success', 'Password berhasil direset. Silakan login dengan password baru Anda.');
    }
}
