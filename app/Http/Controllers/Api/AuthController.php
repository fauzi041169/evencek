<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    /**
     * Register a new user via API
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Check database connection first
            try {
                \DB::connection()->getPdo();
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Database tidak tersedia. Silakan hubungi administrator.',
                    'error' => 'Database connection failed',
                ], 503);
            }

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'phone' => $request->phone,
            ]);
            $user->forceFill(['role' => 'user'])->save();

            // Create profile if needed
            if (! $user->profile) {
                $user->profile()->create([]);
            }

            // Create token
            $token = $user->createToken('mobile-app')->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Registrasi berhasil',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'phone' => $user->phone,
                        'role' => $user->role,
                        'avatar' => $user->avatar,
                    ],
                    'token' => $token,
                ],
            ], 201);
        } catch (\Illuminate\Database\QueryException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Database tidak tersedia. Silakan hubungi administrator.',
                'error' => 'Database connection failed',
            ], 503);
        } catch (\Exception $e) {
            \Log::error('Register error', [
                'email' => $request->email,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Registrasi gagal',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Login user via API
     */
    public function login(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|email',
                'password' => 'required',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validasi gagal',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Query user (akan otomatis throw exception jika database tidak tersedia)
            $user = User::where('email', $request->email)->first();

            if (! $user || ! Hash::check($request->password, $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Email atau password salah',
                ], 401);
            }

            // Check if email is verified (except Google users)
            if (! $user->email_verified_at && ! $user->google_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Email belum diverifikasi. Silakan cek email Anda untuk link verifikasi.',
                ], 403);
            }

            // Update last login
            try {
                $user->update(['last_login_at' => now()]);
            } catch (\Exception $e) {
                // Log error but continue with login
                \Log::warning('Failed to update last_login_at', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }

            // Create token
            $token = $user->createToken('mobile-app')->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Login berhasil',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'phone' => $user->phone,
                        'role' => $user->role,
                        'avatar' => $user->avatar,
                    ],
                    'token' => $token,
                ],
            ], 200);
        } catch (\Illuminate\Database\QueryException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Database tidak tersedia. Silakan hubungi administrator.',
                'error' => 'Database connection failed',
            ], 503);
        } catch (\Exception $e) {
            \Log::error('Login error', [
                'email' => $request->email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat login. Silakan coba lagi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Get authenticated user
     */
    public function user(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'avatar' => $user->avatar,
                'email_verified_at' => $user->email_verified_at,
            ],
        ], 200);
    }

    /**
     * Logout user
     */
    public function logout(Request $request)
    {
        // Revoke current token
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil',
        ], 200);
    }

    /**
     * Refresh token (optional - create new token)
     */
    public function refresh(Request $request)
    {
        $user = $request->user();

        // Revoke old token
        $request->user()->currentAccessToken()->delete();

        // Create new token
        $token = $user->createToken('mobile-app')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Token berhasil di-refresh',
            'data' => [
                'token' => $token,
            ],
        ], 200);
    }
}
